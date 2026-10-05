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

const schema = `workspace_test_${process.pid}_${Date.now()}`;
const adminPool = new Pool({ connectionString: pool.options.connectionString });

const users = {
  alice: { uid: 'w-alice', email: 'alice@agency.com', name: 'Alice', verifiedToken: true, emailVerified: true },
  bob:   { uid: 'w-bob',   email: 'bob@agency.com',   name: 'Bob',   verifiedToken: true, emailVerified: true },
  carol: { uid: 'w-carol', email: 'carol@other.com',  name: 'Carol', verifiedToken: true, emailVerified: true },
};

let server, base;

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

  // bootstrap base schema then run all migrations
  await query(fs.readFileSync(path.resolve(__dirname, '../src/db/migrations/001_initial_schema.sql'), 'utf8'));
  await runMigrations();

  // seed test users
  for (const u of Object.values(users)) {
    await query('INSERT INTO users (id, firebase_uid, email, name) VALUES ($1,$1,$2,$3) ON CONFLICT DO NOTHING', [u.uid, u.email, u.name]);
  }

  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => { req.user = users[req.headers['x-test-user']] || null; next(); });
  app.use('/api', require('../src/routes/workspaces'));
  app.use('/api', require('../src/routes/projects'));
  app.use((err, _req, res, _next) => res.status(err.status || 500).json({ message: err.message }));

  server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (server) await new Promise((r) => server.close(r));
  await pool.end();
  await adminPool.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
  await adminPool.end();
});

test('create workspace and become admin', async () => {
  const res = await api('/v1/workspaces', 'alice', { name: 'Goldfish Agency', description: 'SAG-AFTRA commercial' });
  assert.equal(res.status, 201);
  assert.equal(res.body.data.name, 'Goldfish Agency');
  assert.equal(res.body.data.member_role, 'admin');
});

test('list workspaces scoped to user', async () => {
  const alice = await api('/v1/workspaces', 'alice');
  const bob = await api('/v1/workspaces', 'bob');
  assert.ok(alice.body.length >= 1);
  assert.equal(bob.body.length, 0, 'Bob has no workspaces yet');
});

test('non-member cannot access workspace', async () => {
  const alice = await api('/v1/workspaces', 'alice');
  const wsId = alice.body[0].id;
  const res = await api(`/v1/workspaces/${wsId}`, 'bob');
  assert.equal(res.status, 403);
});

test('invite, accept, and verify membership isolation', async () => {
  const alice = await api('/v1/workspaces', 'alice');
  const wsId = alice.body[0].id;

  // alice invites bob with producer role
  const inviteRes = await api(`/v1/workspaces/${wsId}/invite`, 'alice', { email: 'bob@agency.com', role: 'producer' });
  assert.equal(inviteRes.status, 201);
  const token = inviteRes.body.data.token;

  // bob accepts
  const acceptRes = await api(`/v1/workspaces/invites/${token}/accept`, 'bob', {}, 'POST');
  assert.equal(acceptRes.status, 200);

  // bob can now see workspace
  const bobWS = await api(`/v1/workspaces/${wsId}`, 'bob');
  assert.equal(bobWS.status, 200);
  assert.equal(bobWS.body.members.find(m => m.user_id === 'w-bob')?.role, 'producer');

  // carol is still isolated
  const carol = await api(`/v1/workspaces/${wsId}`, 'carol');
  assert.equal(carol.status, 403);
});

test('role authorization: producer cannot change member roles', async () => {
  const alice = await api('/v1/workspaces', 'alice');
  const wsId = alice.body[0].id;
  const res = await api(`/v1/workspaces/${wsId}/members/w-alice/role`, 'bob', { role: 'performer' }, 'PATCH');
  assert.equal(res.status, 403, 'producer cannot change roles');
});

test('rate cards are seeded', async () => {
  const res = await api('/v1/rate-cards', 'alice');
  assert.equal(res.status, 200);
  assert.ok(res.body.length >= 3);
  const categories = res.body.map(r => r.job_category);
  assert.ok(categories.includes('Voiceover'));
  assert.ok(categories.includes('Principal'));
  assert.ok(categories.includes('Background Actor'));
});

test('shoots are created and listed only inside their workspace', async () => {
  const alice = await api('/v1/workspaces', 'alice');
  const wsId = alice.body[0].id;
  const created = await api(`/v1/workspaces/${wsId}/shoots`, 'alice', { title: 'AI Beverage Spot', description: 'Commercial shoot' });
  assert.equal(created.status, 201);
  assert.equal(created.body.data.workspaceId, wsId);
  const list = await api(`/v1/workspaces/${wsId}/shoots`, 'alice');
  assert.equal(list.status, 200);
  assert.ok(list.body.some((shoot) => shoot.id === created.body.data.id));
  const isolated = await api(`/v1/workspaces/${wsId}/shoots`, 'carol');
  assert.equal(isolated.status, 403);
});

test('unauthenticated requests are rejected', async () => {
  const res = await api('/v1/workspaces', null);
  assert.equal(res.status, 401);
});
