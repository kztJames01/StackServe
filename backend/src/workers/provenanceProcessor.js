// provenance job processor — runs inside the BullMQ worker process
// handles: B2 download → pHash → Chromaprint → C2PA sign → B2 upload → DB commit
const os = require('os');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const repo = require('../db/provenanceRepository');
const { query } = require('../db/pool');
const { downloadToTempFile, uploadWorkerArtifact } = require('../services/storage');
const { computePhashForFile } = require('../services/provenance/phash');
const { computeChromaprint } = require('../services/provenance/chromaprint');
const { signMediaFile } = require('../services/provenance/c2pa');

async function processProvenanceJob(job) {
  const { jobId, assetId, contractId, workspaceId } = job.data;

  await repo.setJobProcessing(jobId);

  let tmpAsset = null;
  let tmpSigned = null;
  let tmpManifest = null;

  try {
    // load asset and contract from DB
    const assetResult = await query('SELECT * FROM media_assets WHERE id = $1', [assetId]);
    const asset = assetResult.rows[0];
    if (!asset) throw new Error(`Asset ${assetId} not found`);
    if (asset.upload_state !== 'verified') throw new Error(`Asset ${assetId} is not verified`);

    const contractResult = await query('SELECT * FROM digital_replica_contracts WHERE id = $1', [contractId]);
    const contract = contractResult.rows[0];
    if (!contract) throw new Error(`Contract ${contractId} not found`);
    if (contract.status !== 'SIGNED') throw new Error(`Contract ${contractId} is not SIGNED`);

    // validate contract date window
    const now = new Date();
    if (new Date(contract.starts_at) > now) throw new Error('Contract has not started yet');
    if (new Date(contract.expires_at) < now) throw new Error('Contract has expired');

    // download source asset from B2
    tmpAsset = await downloadToTempFile(asset.b2_storage_key);

    // compute perceptual hash (best effort — null if ffmpeg/sharp not available)
    const perceptualHashVisual = await computePhashForFile(tmpAsset, asset.mime_type);

    // compute audio chromaprint (best effort)
    const chromaprintAudio = await computeChromaprint(tmpAsset, asset.mime_type);

    // sign with C2PA
    const ext = (asset.b2_storage_key.match(/\.([a-z0-9]+)$/i) || ['', 'bin'])[1];
    tmpSigned = path.join(os.tmpdir(), `sp-signed-${crypto.randomUUID()}.${ext}`);
    const signResult = await signMediaFile({
      inputPath: tmpAsset,
      outputPath: tmpSigned,
      asset,
      contract,
    });

    // write manifest bytes to a temp file then upload
    tmpManifest = path.join(os.tmpdir(), `sp-manifest-${crypto.randomUUID()}.c2pa`);
    if (signResult.manifestBytes) {
      fs.writeFileSync(tmpManifest, Buffer.from(signResult.manifestBytes));
    }

    // upload signed asset and manifest to B2
    const signedKey = `media/${workspaceId}/signed-${assetId}.${ext}`;
    const manifestKey = `media/${workspaceId}/manifest-${assetId}.c2pa`;

    await uploadWorkerArtifact({ key: signedKey, filePath: tmpSigned, contentType: asset.mime_type });
    if (signResult.manifestBytes && fs.existsSync(tmpManifest)) {
      await uploadWorkerArtifact({ key: manifestKey, filePath: tmpManifest, contentType: 'application/octet-stream' });
    }

    const ledgerId = crypto.randomUUID();

    await repo.completeProvenanceJob({
      jobId,
      assetId,
      contractId,
      fingerprints: {
        perceptualHashVisual,
        chromaprintAudio,
      },
      ledger: {
        id: ledgerId,
        c2paManifestId: signResult.c2paManifestId,
        claimGenerator: 'SynthPass Compliance Engine v2.1',
        signingMode: signResult.signingMode,
        jumbfManifestKey: signResult.manifestBytes ? manifestKey : signedKey,
        signedAssetKey: signedKey,
        actorConsentAssertion: signResult.consentAssertion?.data || {},
      },
    });

    console.log(`[provenance] job ${jobId} done — asset ${assetId}`);
  } catch (err) {
    await repo.setJobFailed(jobId, err.message);
    throw err; // rethrow so BullMQ handles retries
  } finally {
    for (const tmp of [tmpAsset, tmpSigned, tmpManifest]) {
      if (tmp) try { fs.unlinkSync(tmp); } catch {}
    }
  }
}

module.exports = { processProvenanceJob };
