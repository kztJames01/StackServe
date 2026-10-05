const { before, after, test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const express = require('express');
require('dotenv').config({ path: path.resolve(__dirname, '../.env'), quiet: true });
require('dotenv').config({ quiet: true });
const { pool, query } = require('../src/db/pool');
const { Pool } = require('pg');
const { runMigrations } = require('../src/db/migrate');
const { Readable } = require('node:stream');
const { hashBody } = require('../src/services/storage');

const schema = `media_test_${process.pid}_${Date.now()}`;
const adminPool = new Pool({ connectionString: pool.options.connectionString });

const users = {
  alice: { uid: 'm-alice', email: 'alice@media.com', name: 'Alice', verifiedToken: true, emailVerified: true },
  bob:   { uid: 'm-bob',   email: 'bob@media.com',   name: 'Bob',   verifiedToken: true, emailVerified: true },
};

let server, base, workspaceId, uploadedAssetId;

async function api(path, user, body, method) {
  method = method || (body ? 'POST' : 'GET');
  const res = await fetch(`${base}/api${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(user ? { 'x-test-user': user } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return { status: res.status, body: await res.json() };
}

before(async () => {
  await adminPool.query(`CREATE SCHEMA ${schema}`);
  pool.options.options = `-c search_path=${schema}`;

  await query(fs.readFileSync(path.resolve(__dirname, '../src/db/migrations/001_initial_schema.sql'), 'utf8'));
  await runMigrations();

  for (const u of Object.values(users)) {
    await query('INSERT INTO users (id, firebase_uid, email, name) VALUES ($1,$1,$2,$3) ON CONFLICT DO NOTHING', [u.uid, u.email, u.name]);
  }

  // create a workspace for alice
  const wsRes = await query(
    `INSERT INTO agency_workspaces (id, name, owner_id) VALUES ('ws-media-test', 'Media Test WS', 'm-alice') RETURNING id`
  );
  workspaceId = wsRes.rows[0].id;
  await query(`INSERT INTO workspace_members (workspace_id, user_id, role) VALUES ($1, 'm-alice', 'admin')`, [workspaceId]);
  require('../src/services/media').setStorageForTests({
    createUploadUrl: async ({ filename }) => ({
      key: `media/ws-media-test/${filename}`,
      uploadUrl: 'https://storage.example/upload',
      fileUrl: null,
    }),
    verifyObjectSha256: async (_key, expectedHash, expectedSize) => ({
      matches: expectedHash === 'a'.repeat(64) && Number(expectedSize) === 524288000,
      actualHash: 'a'.repeat(64),
      size: Number(expectedSize),
    }),
  });

  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => { req.user = users[req.headers['x-test-user']] || null; next(); });
  app.use('/api', require('../src/routes/workspaces'));
  app.use('/api', require('../src/routes/media'));
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

test('request upload creates asset row with pending state', async () => {
  const sha = 'a'.repeat(64); // 64 hex chars (fake but valid format)
  const res = await api('/v1/media/request-upload', 'alice', {
    workspace_id: workspaceId,
    filename: 'test-spot.mp4',
    mime_type: 'video/mp4',
    file_size_bytes: 524288000, // 500MB
    sha256_hash: sha,
    ai_model_name: 'Sora 1.5',
  });
  assert.equal(res.status, 201);
  assert.ok(res.body.asset_id, 'asset_id in response');
  assert.ok(res.body.upload_url, 'upload_url in response');
  uploadedAssetId = res.body.asset_id;
  const stored = await query('SELECT * FROM media_assets WHERE id = $1', [uploadedAssetId]);
  assert.equal(stored.rows[0].sha256_hash, sha);
  assert.equal(stored.rows[0].file_size_bytes, '524288000');
  assert.equal(stored.rows[0].upload_state, 'pending');
});

test('complete upload verifies B2 hash and updates database state', async () => {
  const res = await api(`/v1/media/${uploadedAssetId}/complete`, 'alice', {}, 'POST');
  assert.equal(res.status, 200);
  assert.equal(res.body.data.upload_state, 'verified');
  assert.equal(res.body.data.sha256_hash, 'a'.repeat(64));
  const stored = await query('SELECT upload_state, sha256_hash FROM media_assets WHERE id = $1', [uploadedAssetId]);
  assert.equal(stored.rows[0].upload_state, 'verified');
  assert.equal(stored.rows[0].sha256_hash, 'a'.repeat(64));
});

test('invalid sha256 is rejected', async () => {
  const res = await api('/v1/media/request-upload', 'alice', {
    workspace_id: workspaceId,
    filename: 'bad.mp4',
    mime_type: 'video/mp4',
    file_size_bytes: 1000,
    sha256_hash: 'not-a-valid-hash',
  });
  assert.equal(res.status, 400);
});

test('unsupported mime type is rejected', async () => {
  const res = await api('/v1/media/request-upload', 'alice', {
    workspace_id: workspaceId,
    filename: 'script.sh',
    mime_type: 'application/x-sh',
    file_size_bytes: 100,
    sha256_hash: 'b'.repeat(64),
  });
  assert.equal(res.status, 400);
});

test('non-member cannot request upload', async () => {
  const res = await api('/v1/media/request-upload', 'bob', {
    workspace_id: workspaceId,
    filename: 'spy.mp4',
    mime_type: 'video/mp4',
    file_size_bytes: 100,
    sha256_hash: 'c'.repeat(64),
  });
  assert.equal(res.status, 403);
});

test('missing required fields returns 400', async () => {
  const res = await api('/v1/media/request-upload', 'alice', {
    workspace_id: workspaceId,
    filename: 'partial.mp4',
  });
  assert.equal(res.status, 400);
});

test('storage verifier hashes streamed B2 content incrementally', async () => {
  const digest = await hashBody(Readable.from([Buffer.from('Synth'), Buffer.from('Pass')]));
  assert.equal(digest, '1500bf9728f51f1f5acff7de8afe34dead4be7e33bebf078686f930097e2989b');
});
