// test/provenance.test.js
const { before, after, describe, test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const express = require('express');
const crypto = require('node:crypto');
require('dotenv').config({ path: path.resolve(__dirname, '../.env'), quiet: true });
require('dotenv').config({ quiet: true });
const { pool, query } = require('../src/db/pool');
const { Pool } = require('pg');
const { runMigrations } = require('../src/db/migrate');

const schema = `provenance_test_${process.pid}_${Date.now()}`;
const adminPool = new Pool({ connectionString: pool.options.connectionString });

const users = {
  alice: { uid: 'p-alice', email: 'alice@prov.test', name: 'Alice', verifiedToken: true, emailVerified: true },
  bob:   { uid: 'p-bob',   email: 'bob@prov.test',   name: 'Bob',   verifiedToken: true, emailVerified: true },
  carl:  { uid: 'p-carl',  email: 'carl@prov.test',  name: 'Carl',  verifiedToken: true, emailVerified: true },
};

let server, base;
let wsA, wsB; // workspace IDs
let shootId, contractId, assetId;

function makeId() { return crypto.randomUUID(); }
function sha(ch) { return ch.repeat(64); }

async function api(p, user, body, method) {
  const m = method || (body !== undefined ? 'POST' : 'GET');
  const res = await fetch(`${base}/api${p}`, {
    method: m,
    headers: { 'Content-Type': 'application/json', ...(user ? { 'x-test-user': user } : {}) },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  return { status: res.status, body: await res.json() };
}

// helpers to seed fixture data
async function seedSignedContract(opts = {}) {
  const id = opts.id || makeId();
  await query(`
    INSERT INTO digital_replica_contracts (
      id, workspace_id, shoot_id, performer_name, performer_email, union_status,
      replica_type, permitted_media, geographic_territory, intended_use_description,
      exclusionary_clauses, starts_at, expires_at, base_scale_rate_cents,
      total_session_fee_cents, pension_health_cents, status, performer_signature_hash,
      signed_at, advance_notice_given_at
    ) VALUES (
      $1,$2,$3,'Jane Talent','jane@talent.test','SAG-AFTRA',
      'VISUAL_LIKENESS',ARRAY['BROADCAST_TV','DIGITAL_SOCIAL'],ARRAY['US','CA'],
      'Use for Acme spring 2026 campaign broadcast only.',
      ARRAY['NO_POLITICAL'],
      NOW() - INTERVAL '1 day', NOW() + INTERVAL '30 days',
      100000, 150000, 31500,
      $4, $5, NOW(), NOW() - INTERVAL '49 hours'
    )`,
    [id, opts.workspaceId || wsA, opts.shootId || shootId, opts.status || 'SIGNED', opts.sigHash || sha('f')],
  );
  return id;
}

async function seedVerifiedAsset(opts = {}) {
  const id = opts.id || makeId();
  await query(`
    INSERT INTO media_assets (
      id, workspace_id, shoot_id, uploader_id, filename, mime_type,
      file_size_bytes, sha256_hash, b2_storage_key, upload_state,
      ai_generated, ai_model_name
    ) VALUES ($1,$2,$3,$4,'spot.mp4','video/mp4',
      1048576, $5, $6, $7, true, 'Runway Gen-3')`,
    [id, opts.workspaceId || wsA, opts.shootId || shootId, 'p-alice',
     opts.sha256 || sha('e'), opts.b2Key || `media/${wsA}/${id}.mp4`,
     opts.state || 'verified'],
  );
  return id;
}

before(async () => {
  await adminPool.query(`CREATE SCHEMA ${schema}`);
  pool.options.options = `-c search_path=${schema}`;

  await query(fs.readFileSync(path.resolve(__dirname, '../src/db/migrations/001_initial_schema.sql'), 'utf8'));
  await runMigrations();

  for (const u of Object.values(users)) {
    await query('INSERT INTO users (id, firebase_uid, email, name) VALUES ($1,$1,$2,$3) ON CONFLICT DO NOTHING',
      [u.uid, u.email, u.name]);
  }

  // workspace A: alice=admin, carl=clearance_counsel
  wsA = makeId();
  await query(`INSERT INTO agency_workspaces (id, name, owner_id) VALUES ($1,'Prov WS A','p-alice')`, [wsA]);
  await query(`INSERT INTO workspace_members (workspace_id, user_id, role) VALUES ($1,'p-alice','admin')`, [wsA]);
  await query(`INSERT INTO workspace_members (workspace_id, user_id, role) VALUES ($1,'p-carl','clearance_counsel')`, [wsA]);

  // workspace B: bob=admin — for cross-tenant tests
  wsB = makeId();
  await query(`INSERT INTO agency_workspaces (id, name, owner_id) VALUES ($1,'Prov WS B','p-bob')`, [wsB]);
  await query(`INSERT INTO workspace_members (workspace_id, user_id, role) VALUES ($1,'p-bob','admin')`, [wsB]);

  shootId = makeId();
  await query(`INSERT INTO projects (id, workspace_id, title, description, status, slug)
    VALUES ($1,$2,'Acme campaign','','active','acme-prov')`, [shootId, wsA]);

  contractId = await seedSignedContract();
  assetId = await seedVerifiedAsset();

  // mock queue — capture enqueue calls without requiring live Redis
  const { setQueueForTests } = require('../src/queue/queues');
  if (setQueueForTests) {
    setQueueForTests({
      add: async (_name, _data, _opts) => ({ id: 'mock-bullmq-id' }),
    });
  }

  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => { req.user = users[req.headers['x-test-user']] || null; next(); });
  app.use('/api', require('../src/routes/workspaces'));
  app.use('/api', require('../src/routes/media'));
  app.use('/api', require('../src/routes/provenance'));
  app.use((err, _req, res, _next) => res.status(err.status || 500).json({ message: err.message }));

  server = await new Promise((r) => {
    const s = app.listen(0, '127.0.0.1', () => r(s));
  });
  base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (server) await new Promise((r) => server.close(r));
  await pool.end();
  await adminPool.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
  await adminPool.end();
});

// ── Unit: pHash ──────────────────────────────────────────────────────────────

describe('pHash unit tests', () => {
  const { hammingDistance, isPhashMatch, PHASH_THRESHOLD } = require('../src/services/provenance/phash');

  test('identical hashes have Hamming distance 0', () => {
    assert.equal(hammingDistance('ffffffffffffffff', 'ffffffffffffffff'), 0);
  });

  test('completely different hashes have Hamming distance 64', () => {
    assert.equal(hammingDistance('0000000000000000', 'ffffffffffffffff'), 64);
  });

  test('hashes differing by 1 bit have Hamming distance 1', () => {
    assert.equal(hammingDistance('0000000000000001', '0000000000000000'), 1);
  });

  test('isPhashMatch returns true when distance <= threshold', () => {
    // same hash = 0 bits diff
    assert.equal(isPhashMatch('aabbccdd11223344', 'aabbccdd11223344'), true);
  });

  test('isPhashMatch returns false when distance > threshold', () => {
    // 64 bits differ
    assert.equal(isPhashMatch('0000000000000000', 'ffffffffffffffff'), false);
  });

  test('PHASH_THRESHOLD default is 8', () => {
    assert.equal(PHASH_THRESHOLD, 8);
  });

  test('invalid hash inputs return Infinity distance', () => {
    assert.equal(hammingDistance(null, 'ffffffffffffffff'), Infinity);
    assert.equal(hammingDistance('short', 'ffffffffffffffff'), Infinity);
  });
});

// ── Unit: Chromaprint ────────────────────────────────────────────────────────

describe('Chromaprint unit tests', () => {
  const { chromaprintSimilarity, isChromaprintMatch } = require('../src/services/provenance/chromaprint');

  test('identical fingerprints score 1.0', () => {
    const fp = '1,2,3,4,5,6,7,8';
    assert.equal(chromaprintSimilarity(fp, fp), 1.0);
  });

  test('completely different fingerprints score 0', () => {
    assert.equal(chromaprintSimilarity('1,2,3,4', '5,6,7,8'), 0);
  });

  test('partial match scores intermediate value', () => {
    const sim = chromaprintSimilarity('1,2,3,4', '1,2,5,6');
    assert.ok(sim > 0 && sim < 1, `expected between 0 and 1, got ${sim}`);
  });

  test('null inputs return -1', () => {
    assert.equal(chromaprintSimilarity(null, '1,2,3'), -1);
    assert.equal(chromaprintSimilarity('1,2,3', null), -1);
  });

  test('isChromaprintMatch returns true for identical fingerprints', () => {
    const fp = '10,20,30,40,50,60';
    assert.equal(isChromaprintMatch(fp, fp), true);
  });

  test('isChromaprintMatch returns false for completely different fingerprints', () => {
    assert.equal(isChromaprintMatch('1,2,3,4', '5,6,7,8'), false);
  });
});

// ── Unit: C2PA assertion redaction ───────────────────────────────────────────

describe('C2PA assertion data minimization', () => {
  const { buildConsentAssertion } = require('../src/services/provenance/c2pa');

  const sampleContract = {
    performer_signature_hash: sha('f'),
    performer_name: 'Jane Talent',
    performer_email: 'jane@talent.test',
    agent_email: 'agent@agency.test',
    replica_type: 'VISUAL_LIKENESS',
    permitted_media: ['BROADCAST_TV'],
    geographic_territory: ['US'],
    exclusionary_clauses: ['NO_POLITICAL'],
    starts_at: '2026-01-01',
    expires_at: '2026-12-31',
    union_status: 'SAG-AFTRA',
    base_scale_rate_cents: 100000,
    total_session_fee_cents: 150000,
    pension_health_cents: 31500,
  };

  test('assertion includes contract hash and permitted territory', () => {
    const a = buildConsentAssertion(sampleContract);
    assert.equal(a.data.contract_hash, sampleContract.performer_signature_hash);
    assert.deepEqual(a.data.permitted_media, ['BROADCAST_TV']);
    assert.deepEqual(a.data.geographic_territory, ['US']);
  });

  test('assertion strips performer PII', () => {
    const a = buildConsentAssertion(sampleContract);
    assert.equal(a.data.performer_name, undefined, 'should not have performer_name');
    assert.equal(a.data.performer_email, undefined, 'should not have performer_email');
    assert.equal(a.data.agent_email, undefined, 'should not have agent_email');
  });

  test('assertion strips compensation fields', () => {
    const a = buildConsentAssertion(sampleContract);
    assert.equal(a.data.base_scale_rate_cents, undefined);
    assert.equal(a.data.total_session_fee_cents, undefined);
    assert.equal(a.data.pension_health_cents, undefined);
  });

  test('assertion includes sunset date and union status', () => {
    const a = buildConsentAssertion(sampleContract);
    assert.equal(a.data.expires_at, '2026-12-31');
    assert.equal(a.data.union_status, 'SAG-AFTRA');
  });

  test('assertion uses org.synthpass.consent.v1 label', () => {
    const a = buildConsentAssertion(sampleContract);
    assert.equal(a.label, 'org.synthpass.consent.v1');
  });
});

// ── API: bind-c2pa ───────────────────────────────────────────────────────────

describe('POST /api/v1/media/:id/bind-c2pa', () => {
  test('missing contract_id returns 400', async () => {
    const res = await api(`/v1/media/${assetId}/bind-c2pa`, 'alice', {});
    assert.equal(res.status, 400);
    assert.ok(res.body.message);
  });

  test('non-member cannot bind c2pa', async () => {
    const res = await api(`/v1/media/${assetId}/bind-c2pa`, 'bob', { contract_id: contractId });
    assert.equal(res.status, 403);
  });

  test('asset in wrong workspace returns 403', async () => {
    const otherAssetId = await seedVerifiedAsset({ workspaceId: wsB, sha256: sha('1') });
    const res = await api(`/v1/media/${otherAssetId}/bind-c2pa`, 'alice', { contract_id: contractId });
    assert.equal(res.status, 403);
  });

  test('unknown asset returns 404', async () => {
    const res = await api(`/v1/media/nonexistent-id/bind-c2pa`, 'alice', { contract_id: contractId });
    assert.equal(res.status, 404);
  });

  test('unknown contract returns 404', async () => {
    const res = await api(`/v1/media/${assetId}/bind-c2pa`, 'alice', { contract_id: 'nonexistent' });
    assert.equal(res.status, 404);
  });

  test('unverified asset upload returns 409', async () => {
    const pendingId = await seedVerifiedAsset({ sha256: sha('d'), state: 'pending' });
    const cId = await seedSignedContract({ shootId: shootId, workspaceId: wsA });
    const res = await api(`/v1/media/${pendingId}/bind-c2pa`, 'alice', { contract_id: cId });
    assert.equal(res.status, 409);
  });

  test('unsigned contract returns 409', async () => {
    const unsignedId = await seedSignedContract({
      id: makeId(), workspaceId: wsA, shootId, status: 'NOTICE_SENT', sigHash: null,
    });
    const res = await api(`/v1/media/${assetId}/bind-c2pa`, 'alice', { contract_id: unsignedId });
    assert.equal(res.status, 409);
  });

  test('contract from different workspace returns 403', async () => {
    // create a signed contract in workspace B
    const crossId = await seedSignedContract({ workspaceId: wsB, shootId });
    const res = await api(`/v1/media/${assetId}/bind-c2pa`, 'alice', { contract_id: crossId });
    assert.equal(res.status, 403);
  });

  test('clearance_counsel role can bind c2pa', async () => {
    // carl is clearance_counsel in wsA
    const a2 = await seedVerifiedAsset({ sha256: sha('a'), b2Key: `media/${wsA}/a2.mp4` });
    const c2 = await seedSignedContract({ id: makeId(), workspaceId: wsA, shootId });
    const res = await api(`/v1/media/${a2}/bind-c2pa`, 'carl', { contract_id: c2 });
    // should be 202 (queued) or 503 (queue unavailable) — both are acceptable in test env
    assert.ok([202, 503].includes(res.status), `expected 202 or 503, got ${res.status}`);
  });

  test('admin can queue bind-c2pa and gets 202 or 503', async () => {
    const a3 = await seedVerifiedAsset({ sha256: sha('b'), b2Key: `media/${wsA}/a3.mp4` });
    const c3 = await seedSignedContract({ id: makeId(), workspaceId: wsA, shootId });
    const res = await api(`/v1/media/${a3}/bind-c2pa`, 'alice', { contract_id: c3 });
    assert.ok([202, 503].includes(res.status), `expected 202 or 503, got ${res.status}`);
    if (res.status === 202) {
      assert.ok(res.body.job_id, 'job_id in response');
      assert.equal(res.body.status, 'queued');
    }
  });
});

// ── API: public verify — exact hash ─────────────────────────────────────────

describe('GET /api/v1/verify/:sha256_hash', () => {
  test('returns 400 for invalid sha256 format', async () => {
    const res = await api('/v1/verify/toolong0000000000000000', null);
    assert.equal(res.status, 400);
  });

  test('returns 400 for non-hex sha256', async () => {
    const res = await api(`/v1/verify/${'z'.repeat(64)}`, null);
    assert.equal(res.status, 400);
  });

  test('returns 404 for unknown hash', async () => {
    const res = await api(`/v1/verify/${sha('c')}`, null);
    assert.equal(res.status, 404);
  });

  test('no auth header required', async () => {
    const res = await api(`/v1/verify/${sha('c')}`, null);
    // 404 is fine — just confirm no 401/403
    assert.ok(res.status !== 401 && res.status !== 403, `got ${res.status}`);
  });

  test('returns public-safe fields when ledger exists', async () => {
    // seed a full ledger record
    const ledgerAssetId = await seedVerifiedAsset({ sha256: sha('9'), b2Key: `media/${wsA}/ledger.mp4` });
    const ledgerContractId = await seedSignedContract({ id: makeId(), workspaceId: wsA, shootId });
    const jobId = makeId();
    await query(
      `INSERT INTO media_provenance_jobs (id, asset_id, contract_id, workspace_id, status)
       VALUES ($1,$2,$3,$4,'done')`,
      [jobId, ledgerAssetId, ledgerContractId, wsA],
    );
    const consentData = {
      permitted_media: ['BROADCAST_TV'],
      geographic_territory: ['US'],
      expires_at: '2026-12-31',
      union_status: 'SAG-AFTRA',
      replica_type: 'VISUAL_LIKENESS',
      contract_hash: sha('f'),
    };
    await query(
      `INSERT INTO c2pa_provenance_ledgers (
         id, media_asset_id, contract_id, provenance_job_id,
         c2pa_manifest_id, signing_mode, jumbf_manifest_key, signed_asset_key,
         actor_consent_assertion, tamper_verified
       ) VALUES ($1,$2,$3,$4,$5,'test','manifests/m.c2pa','media/signed.mp4',$6,true)`,
      [makeId(), ledgerAssetId, ledgerContractId, jobId,
       `urn:uuid:${makeId()}`, JSON.stringify(consentData)],
    );

    const res = await api(`/v1/verify/${sha('9')}`, null);
    assert.equal(res.status, 200);
    const d = res.body.data;
    assert.ok(d.verified);
    assert.ok(d.manifest_id);
    assert.ok(d.issued_at);
    assert.equal(d.sha256_hash, sha('9'));
    assert.deepEqual(d.permitted_media, ['BROADCAST_TV']);
    assert.deepEqual(d.geographic_territory, ['US']);
    assert.equal(d.expires_at, '2026-12-31');
    // confirm no PII or internal fields
    assert.equal(d.performer_name, undefined);
    assert.equal(d.performer_email, undefined);
    assert.equal(d.base_scale_rate_cents, undefined);
    assert.equal(d.signed_asset_b2_key, undefined);
    assert.equal(d.jumbf_manifest_b2_key, undefined);
  });
});

// ── API: public verify — fingerprint ────────────────────────────────────────

describe('POST /api/v1/verify/fingerprint', () => {
  test('returns 400 when no fingerprint provided', async () => {
    const res = await api('/v1/verify/fingerprint', null, {});
    assert.equal(res.status, 400);
  });

  test('returns 400 for invalid visual_phash length', async () => {
    const res = await api('/v1/verify/fingerprint', null, { visual_phash: 'abcd' });
    assert.equal(res.status, 400);
  });

  test('returns 400 for non-hex visual_phash', async () => {
    const res = await api('/v1/verify/fingerprint', null, { visual_phash: 'zzzzzzzzzzzzzzzz' });
    assert.equal(res.status, 400);
  });

  test('no auth header required', async () => {
    const res = await api('/v1/verify/fingerprint', null, { visual_phash: 'a'.repeat(16) });
    assert.ok(res.status !== 401 && res.status !== 403);
    assert.ok(Array.isArray(res.body.matches));
  });

  test('returns empty matches for unknown phash', async () => {
    const res = await api('/v1/verify/fingerprint', null, { visual_phash: '0000000000000000' });
    assert.equal(res.status, 200);
    assert.deepEqual(res.body.matches, []);
    assert.equal(res.body.count, 0);
  });

  test('returns thresholds in response', async () => {
    const res = await api('/v1/verify/fingerprint', null, { visual_phash: '0000000000000000' });
    assert.equal(res.status, 200);
    assert.ok(typeof res.body.thresholds.phash_hamming === 'number');
    assert.ok(typeof res.body.thresholds.chromaprint_similarity === 'number');
  });

  test('matches ledger by exact phash', async () => {
    // seed an asset with a perceptual hash
    const hashableAssetId = await seedVerifiedAsset({ sha256: sha('7'), b2Key: `media/${wsA}/phash.mp4` });
    await query(`UPDATE media_assets SET perceptual_hash_visual = 'deadbeef12345678' WHERE id = $1`, [hashableAssetId]);
    const hContractId = await seedSignedContract({ id: makeId(), workspaceId: wsA, shootId });
    const hJobId = makeId();
    await query(
      `INSERT INTO media_provenance_jobs (id, asset_id, contract_id, workspace_id, status)
       VALUES ($1,$2,$3,$4,'done')`,
      [hJobId, hashableAssetId, hContractId, wsA],
    );
    await query(
      `INSERT INTO c2pa_provenance_ledgers (
         id, media_asset_id, contract_id, provenance_job_id,
         c2pa_manifest_id, signing_mode, jumbf_manifest_key, signed_asset_key,
         actor_consent_assertion, tamper_verified
       ) VALUES ($1,$2,$3,$4,$5,'test','mf.c2pa','s.mp4',$6,true)`,
      [makeId(), hashableAssetId, hContractId, hJobId,
       `urn:uuid:${makeId()}`, JSON.stringify({ permitted_media: ['BROADCAST_TV'] })],
    );
    const res = await api('/v1/verify/fingerprint', null, { visual_phash: 'deadbeef12345678' });
    assert.equal(res.status, 200);
    assert.ok(res.body.count >= 1);
    const match = res.body.matches.find((m) => m.sha256_hash === sha('7'));
    assert.ok(match, 'should find the seeded ledger');
    assert.equal(match.performer_name, undefined, 'should not expose PII');
  });
});

// ── DB: provenance repository ────────────────────────────────────────────────

describe('provenanceRepository', () => {
  const repo = require('../src/db/provenanceRepository');

  test('createProvenanceJob creates a queued job row', async () => {
    const id = makeId();
    const a = await seedVerifiedAsset({ sha256: sha('8'), b2Key: `media/${wsA}/repo.mp4` });
    const c = await seedSignedContract({ id: makeId(), workspaceId: wsA, shootId });
    const row = await repo.createProvenanceJob({ id, assetId: a, contractId: c, workspaceId: wsA });
    assert.equal(row.id, id);
    assert.equal(row.status, 'queued');
  });

  test('findJobByAssetContract returns existing job', async () => {
    const id = makeId();
    const a = await seedVerifiedAsset({ sha256: sha('6'), b2Key: `media/${wsA}/fba.mp4` });
    const c = await seedSignedContract({ id: makeId(), workspaceId: wsA, shootId });
    await repo.createProvenanceJob({ id, assetId: a, contractId: c, workspaceId: wsA });
    const found = await repo.findJobByAssetContract(a, c);
    assert.equal(found.id, id);
  });

  test('setJobProcessing increments attempts and sets started_at', async () => {
    const id = makeId();
    const a = await seedVerifiedAsset({ sha256: sha('5'), b2Key: `media/${wsA}/proc.mp4` });
    const c = await seedSignedContract({ id: makeId(), workspaceId: wsA, shootId });
    await repo.createProvenanceJob({ id, assetId: a, contractId: c, workspaceId: wsA });
    await repo.setJobProcessing(id);
    const row = await repo.findProvenanceJob(id);
    assert.equal(row.status, 'processing');
    assert.equal(Number(row.attempts), 1);
    assert.ok(row.started_at);
  });

  test('setJobFailed records error message', async () => {
    const id = makeId();
    const a = await seedVerifiedAsset({ sha256: sha('4'), b2Key: `media/${wsA}/fail.mp4` });
    const c = await seedSignedContract({ id: makeId(), workspaceId: wsA, shootId });
    await repo.createProvenanceJob({ id, assetId: a, contractId: c, workspaceId: wsA });
    await repo.setJobFailed(id, 'some error message');
    const row = await repo.findProvenanceJob(id);
    assert.equal(row.status, 'failed');
    assert.equal(row.last_error, 'some error message');
  });

  test('completeProvenanceJob atomically writes fingerprints, job done, and ledger', async () => {
    const id = makeId();
    const a = await seedVerifiedAsset({ sha256: sha('3'), b2Key: `media/${wsA}/comp.mp4` });
    const c = await seedSignedContract({ id: makeId(), workspaceId: wsA, shootId });
    await repo.createProvenanceJob({ id, assetId: a, contractId: c, workspaceId: wsA });
    const ledgerId = makeId();
    await repo.completeProvenanceJob({
      jobId: id,
      assetId: a,
      contractId: c,
      fingerprints: { perceptualHashVisual: 'aabb112233445566', chromaprintAudio: '1,2,3,4' },
      ledger: {
        id: ledgerId,
        c2paManifestId: `urn:uuid:${makeId()}`,
        claimGenerator: 'SynthPass v2.1',
        signingMode: 'test',
        jumbfManifestKey: 'media/ws/manifest.c2pa',
        signedAssetKey: 'media/ws/signed.mp4',
        actorConsentAssertion: { permitted_media: ['BROADCAST_TV'], expires_at: '2026-12-31' },
      },
    });

    // verify asset updated
    const assetRow = await query('SELECT * FROM media_assets WHERE id = $1', [a]);
    assert.equal(assetRow.rows[0].perceptual_hash_visual, 'aabb112233445566');
    assert.equal(assetRow.rows[0].chromaprint_audio, '1,2,3,4');
    assert.equal(assetRow.rows[0].clearance_status, 'approved');

    // verify job done
    const jobRow = await query('SELECT * FROM media_provenance_jobs WHERE id = $1', [id]);
    assert.equal(jobRow.rows[0].status, 'done');

    // verify ledger written
    const ledgerRow = await query('SELECT * FROM c2pa_provenance_ledgers WHERE id = $1', [ledgerId]);
    assert.equal(ledgerRow.rows[0].signing_mode, 'test');
    assert.equal(ledgerRow.rows[0].tamper_verified, true);
  });

  test('duplicate completeProvenanceJob throws on unique constraint', async () => {
    const id = makeId();
    const a = await seedVerifiedAsset({ sha256: sha('2'), b2Key: `media/${wsA}/dup.mp4` });
    const c = await seedSignedContract({ id: makeId(), workspaceId: wsA, shootId });
    await repo.createProvenanceJob({ id, assetId: a, contractId: c, workspaceId: wsA });
    const firstLedger = {
      id: makeId(), c2paManifestId: `urn:uuid:${makeId()}`, claimGenerator: 'test',
      signingMode: 'test', jumbfManifestKey: 'k1', signedAssetKey: 'k2',
      actorConsentAssertion: {},
    };
    await repo.completeProvenanceJob({
      jobId: id, assetId: a, contractId: c,
      fingerprints: { perceptualHashVisual: null, chromaprintAudio: null },
      ledger: firstLedger,
    });
    // second completion should throw (unique constraint on asset+contract)
    await assert.rejects(
      () => repo.completeProvenanceJob({
        jobId: id, assetId: a, contractId: c,
        fingerprints: {},
        ledger: { ...firstLedger, id: makeId(), c2paManifestId: `urn:uuid:${makeId()}` },
      }),
    );
  });
});
