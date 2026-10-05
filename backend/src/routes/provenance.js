const { Router } = require('express');
const { apiRateLimit } = require('../middleware/rateLimit');
const provenanceRepo = require('../db/provenanceRepository');
const { isPhashMatch, PHASH_THRESHOLD } = require('../services/provenance/phash');
const { isChromaprintMatch, CHROMAPRINT_THRESHOLD } = require('../services/provenance/chromaprint');

const router = Router();
const route = (fn) => (req, res, next) => Promise.resolve(fn(req, res)).catch(next);

// shape a ledger row into the public-safe response format
// strips performer PII, compensation, storage credentials, internal IDs
function toPublicVerification(row) {
  if (!row) return null;
  const assertion = typeof row.actor_consent_assertion === 'string'
    ? JSON.parse(row.actor_consent_assertion)
    : row.actor_consent_assertion;
  return {
    verified: row.tamper_verified === true,
    manifest_id: row.c2pa_manifest_id,
    claim_generator: row.claim_generator,
    issued_at: row.issued_at,
    sha256_hash: row.sha256_hash,
    mime_type: row.mime_type,
    permitted_media: assertion?.permitted_media ?? null,
    geographic_territory: assertion?.geographic_territory ?? null,
    expires_at: assertion?.expires_at ?? null,
    union_status: assertion?.union_status ?? null,
    replica_type: assertion?.replica_type ?? null,
  };
}

// GET /api/v1/verify/:sha256_hash — exact hash lookup (public, no auth)
router.get('/v1/verify/:sha256_hash', apiRateLimit, route(async (req, res) => {
  const { sha256_hash } = req.params;
  if (!sha256_hash || sha256_hash.length !== 64 || !/^[0-9a-f]+$/i.test(sha256_hash)) {
    return res.status(400).json({ message: 'sha256_hash must be a 64-character hex string' });
  }
  const row = await provenanceRepo.findLedgerBySha256(sha256_hash.toLowerCase());
  if (!row) return res.status(404).json({ message: 'No C2PA provenance record found for this hash' });
  res.json({ data: toPublicVerification(row) });
}));

// POST /api/v1/verify/fingerprint — perceptual match (public, no auth)
// body: { visual_phash?, audio_chromaprint? }
router.post('/v1/verify/fingerprint', apiRateLimit, route(async (req, res) => {
  const { visual_phash, audio_chromaprint } = req.body || {};
  if (!visual_phash && !audio_chromaprint) {
    return res.status(400).json({ message: 'Provide visual_phash or audio_chromaprint' });
  }
  if (visual_phash && (visual_phash.length !== 16 || !/^[0-9a-f]+$/i.test(visual_phash))) {
    return res.status(400).json({ message: 'visual_phash must be a 16-character hex string (64 bits)' });
  }

  const candidates = await provenanceRepo.findLedgersByPhash();
  const matches = [];

  for (const row of candidates) {
    let matched = false;
    if (visual_phash && row.perceptual_hash_visual) {
      matched = isPhashMatch(visual_phash, row.perceptual_hash_visual);
    }
    if (!matched && audio_chromaprint && row.chromaprint_audio) {
      matched = isChromaprintMatch(audio_chromaprint, row.chromaprint_audio);
    }
    if (matched) matches.push(toPublicVerification(row));
  }

  res.json({
    matches,
    count: matches.length,
    thresholds: {
      phash_hamming: PHASH_THRESHOLD,
      chromaprint_similarity: CHROMAPRINT_THRESHOLD,
    },
  });
}));

module.exports = router;
