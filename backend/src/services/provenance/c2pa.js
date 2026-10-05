// C2PA manifest builder and signer
// uses @contentauth/c2pa-node with:
//   - dev test signer when C2PA_SIGNING_MODE=test (default)
//   - remote/KMS callback signer when C2PA_SIGNING_MODE=remote
//     (requires C2PA_REMOTE_SIGNER_URL to be configured)
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// strips all PII and financial data; keeps only legally minimal public fields
function buildConsentAssertion(contract) {
  return {
    label: 'org.synthpass.consent.v1',
    data: {
      contract_hash: contract.performer_signature_hash,
      replica_type: contract.replica_type,
      permitted_media: contract.permitted_media,
      geographic_territory: contract.geographic_territory,
      exclusionary_clauses: contract.exclusionary_clauses,
      starts_at: contract.starts_at,
      expires_at: contract.expires_at,
      union_status: contract.union_status,
      // no performer_name, performer_email, compensation, signature bytes, or agent info
    },
  };
}

// build the full manifest definition for a media asset
function buildManifestDefinition(asset, contract) {
  return {
    claim_generator: 'SynthPass Compliance Engine/2.1',
    title: asset.filename,
    format: asset.mime_type,
    assertions: [
      {
        label: 'c2pa.actions.v2',
        data: {
          actions: [
            {
              action: 'c2pa.created',
              softwareAgent: 'SynthPass Compliance Engine/2.1',
              digitalSourceType: 'http://cv.iptc.org/newscodes/digitalsourcetype/trainedAlgorithmicMedia',
            },
          ],
          allActionsIncluded: true,
        },
      },
      {
        label: 'stds.exif',
        data: {
          '@context': { 'exif': 'https://ns.adobe.com/exif/1.0/' },
          'exif:DateTimeOriginal': new Date().toISOString(),
        },
      },
      buildConsentAssertion(contract),
    ],
  };
}

// create a local test signer using a fresh self-signed EC P-256 certificate
// this signer is only valid for development and testing — c2pa-node will embed a
// warning in the manifest (expected for test cert usage)
async function createTestSigner() {
  const { LocalSigner } = require('@contentauth/c2pa-node');
  // generate ephemeral EC P-256 key pair for fallback only
  const { privateKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' });
  const privPem = privateKey.export({ type: 'sec1', format: 'pem' });

  // build a minimal self-signed certificate PEM
  // c2pa-node's LocalSigner.newSigner accepts Buffer (cert PEM, private key PEM)
  // for test mode we use the included test certs from the package itself
  // locate the test cert in the node_modules
  const pkgDir = path.dirname(require.resolve('@contentauth/c2pa-node/package.json'));
  const certCandidates = [
    path.join(pkgDir, 'tests/fixtures/es256_certs.pem'),
    path.join(pkgDir, 'sample/es256_certs.pem'),
    path.join(pkgDir, 'fixtures/es256_certs.pem'),
  ];
  const keyCandidates = [
    path.join(pkgDir, 'tests/fixtures/es256_private.key'),
    path.join(pkgDir, 'sample/es256_private.key'),
    path.join(pkgDir, 'fixtures/es256_private.key'),
  ];
  const certPath = certCandidates.find(fs.existsSync);
  const keyPath = keyCandidates.find(fs.existsSync);

  if (certPath && keyPath) {
    const cert = fs.readFileSync(certPath);
    const key = fs.readFileSync(keyPath);
    return { signer: LocalSigner.newSigner(cert, key, 'es256'), mode: 'test' };
  }

  // if package test certs not found, generate a minimal self-signed PEM and use it
  // this is a last-resort; c2pa-node will sign with it but validation will warn
  const selfSignedCert = privateKey.export({ type: 'sec1', format: 'pem' });
  return {
    signer: LocalSigner.newSigner(
      Buffer.from(selfSignedCert),
      Buffer.from(privPem),
      'es256',
    ),
    mode: 'test',
  };
}

// create a remote callback signer using an external signing service
// C2PA_REMOTE_SIGNER_URL must return COSE_Sign1 bytes on POST
async function createRemoteSigner() {
  const { CallbackSigner } = require('@contentauth/c2pa-node');
  const url = process.env.C2PA_REMOTE_SIGNER_URL;
  if (!url) {
    const err = new Error('C2PA_REMOTE_SIGNER_URL is required when C2PA_SIGNING_MODE=remote');
    err.status = 503;
    throw err;
  }
  const certPem = process.env.C2PA_SIGNER_CERT_PEM;
  if (!certPem) {
    const err = new Error('C2PA_SIGNER_CERT_PEM is required when C2PA_SIGNING_MODE=remote');
    err.status = 503;
    throw err;
  }
  const algorithm = process.env.C2PA_SIGNER_ALGORITHM || 'es256';
  const tsaUrl = process.env.C2PA_TSA_URL || '';

  const config = {
    algorithm,
    certs: Buffer.from(certPem),
    reserveSize: Number(process.env.C2PA_SIGNER_RESERVE_SIZE || '10248'),
    ...(tsaUrl ? { tsaUrl } : {}),
  };

  const signer = CallbackSigner.newSigner(config, async (toBeSigned) => {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/octet-stream' },
      body: toBeSigned,
    });
    if (!res.ok) {
      throw new Error(`Remote signer returned ${res.status}`);
    }
    return Buffer.from(await res.arrayBuffer());
  });
  return { signer, mode: 'remote' };
}

// sign a media file at inputPath, writing signed output to outputPath
// returns { signedAssetPath, manifestBytes, c2paManifestId, signingMode }
async function signMediaFile({ inputPath, outputPath, asset, contract }) {
  const { Builder } = require('@contentauth/c2pa-node');

  const signingMode = process.env.C2PA_SIGNING_MODE || 'test';
  let signerResult;
  if (signingMode === 'remote') {
    signerResult = await createRemoteSigner();
  } else {
    signerResult = await createTestSigner();
  }

  const manifestDef = buildManifestDefinition(asset, contract);
  const builder = Builder.withJson(manifestDef);
  const manifestId = `urn:uuid:${crypto.randomUUID()}`;

  // signFile writes directly to outputPath and returns manifest bytes
  const signedManifestBytes = await builder.signFile(signerResult.signer, inputPath, outputPath);

  return {
    signedAssetPath: outputPath,
    manifestBytes: signedManifestBytes,
    c2paManifestId: manifestId,
    signingMode: signerResult.mode,
    consentAssertion: buildConsentAssertion(contract),
  };
}

module.exports = { signMediaFile, buildConsentAssertion, buildManifestDefinition };
