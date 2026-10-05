const { query, pool } = require('./pool');

// create a provenance job row (idempotent on asset+contract unique constraint)
async function createProvenanceJob({ id, assetId, contractId, workspaceId }) {
  const result = await query(
    `INSERT INTO media_provenance_jobs (id, asset_id, contract_id, workspace_id)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (asset_id, contract_id) DO UPDATE SET
       status = CASE
         WHEN media_provenance_jobs.status IN ('failed') THEN 'queued'
         ELSE media_provenance_jobs.status
       END
     RETURNING *`,
    [id, assetId, contractId, workspaceId],
  );
  return result.rows[0];
}

async function findProvenanceJob(id) {
  const result = await query('SELECT * FROM media_provenance_jobs WHERE id = $1', [id]);
  return result.rows[0] || null;
}

async function findJobByAssetContract(assetId, contractId) {
  const result = await query(
    'SELECT * FROM media_provenance_jobs WHERE asset_id = $1 AND contract_id = $2',
    [assetId, contractId],
  );
  return result.rows[0] || null;
}

async function setJobBullmqId(id, bullmqJobId) {
  await query(
    'UPDATE media_provenance_jobs SET bullmq_job_id = $2 WHERE id = $1',
    [id, bullmqJobId],
  );
}

async function setJobProcessing(id) {
  await query(
    `UPDATE media_provenance_jobs SET status = 'processing', started_at = NOW(),
       attempts = attempts + 1 WHERE id = $1`,
    [id],
  );
}

async function setJobFailed(id, errorMessage) {
  await query(
    `UPDATE media_provenance_jobs SET status = 'failed', last_error = $2,
       completed_at = NOW() WHERE id = $1`,
    [id, errorMessage],
  );
}

// atomically: update fingerprints on asset + mark job done + insert ledger
async function completeProvenanceJob({ jobId, assetId, contractId, fingerprints, ledger }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // write fingerprints and signed artifact references to asset
    await client.query(
      `UPDATE media_assets SET
         perceptual_hash_visual = $2,
         chromaprint_audio = $3,
         signed_asset_b2_key = $4,
         jumbf_manifest_b2_key = $5,
         clearance_status = 'approved',
         updated_at = NOW()
       WHERE id = $1`,
      [
        assetId,
        fingerprints.perceptualHashVisual || null,
        fingerprints.chromaprintAudio || null,
        ledger.signedAssetKey,
        ledger.jumbfManifestKey,
      ],
    );

    // mark job done
    await client.query(
      `UPDATE media_provenance_jobs SET status = 'done', completed_at = NOW() WHERE id = $1`,
      [jobId],
    );

    // insert immutable ledger record
    await client.query(
      `INSERT INTO c2pa_provenance_ledgers
         (id, media_asset_id, contract_id, provenance_job_id, c2pa_manifest_id,
          claim_generator, signing_mode, jumbf_manifest_key, signed_asset_key,
          actor_consent_assertion, tamper_verified)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,TRUE)`,
      [
        ledger.id,
        assetId,
        contractId,
        jobId,
        ledger.c2paManifestId,
        ledger.claimGenerator,
        ledger.signingMode,
        ledger.jumbfManifestKey,
        ledger.signedAssetKey,
        JSON.stringify(ledger.actorConsentAssertion),
      ],
    );

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// public verify: exact sha256 lookup - returns only public-safe fields
async function findLedgerBySha256(sha256Hash) {
  const result = await query(
    `SELECT
       l.id, l.c2pa_manifest_id, l.claim_generator, l.signing_mode,
       l.tamper_verified, l.issued_at, l.actor_consent_assertion,
       m.sha256_hash, m.mime_type, m.perceptual_hash_visual, m.chromaprint_audio,
       m.signed_asset_b2_key, m.jumbf_manifest_b2_key
     FROM c2pa_provenance_ledgers l
     JOIN media_assets m ON m.id = l.media_asset_id
     WHERE m.sha256_hash = $1`,
    [sha256Hash],
  );
  return result.rows[0] || null;
}

// pHash lookup candidates for Hamming distance check in app layer
async function findLedgersByPhash() {
  // return all ledgers that have perceptual hashes for Hamming search
  const result = await query(
    `SELECT
       l.id, l.c2pa_manifest_id, l.tamper_verified, l.issued_at,
       l.actor_consent_assertion,
       m.sha256_hash, m.perceptual_hash_visual, m.chromaprint_audio, m.mime_type
     FROM c2pa_provenance_ledgers l
     JOIN media_assets m ON m.id = l.media_asset_id
     WHERE m.perceptual_hash_visual IS NOT NULL
       OR m.chromaprint_audio IS NOT NULL`,
  );
  return result.rows;
}

module.exports = {
  createProvenanceJob,
  findProvenanceJob,
  findJobByAssetContract,
  setJobBullmqId,
  setJobProcessing,
  setJobFailed,
  completeProvenanceJob,
  findLedgerBySha256,
  findLedgersByPhash,
};
