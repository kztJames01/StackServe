const { before, after, test } = require('node:test');
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
const { buildWrapbookCsv, buildGreenslateJson } = require('../src/services/payroll');
const { buildClearanceCertificate } = require('../src/services/clearanceCertificate');

const schema = `payroll_test_${process.pid}_${Date.now()}`;
const adminPool = new Pool({ connectionString: pool.options.connectionString });

const users = {
  alice: { uid: 'pay-alice', email: 'alice@pay.test', name: 'Alice', verifiedToken: true, emailVerified: true },
  bob: { uid: 'pay-bob', email: 'bob@pay.test', name: 'Bob', verifiedToken: true, emailVerified: true },
};

let server, base, wsId, shootId, deliveredId;

function id() { return crypto.randomUUID(); }

async function api(p, user, body, method) {
  const m = method || (body !== undefined ? 'POST' : 'GET');
  const res = await fetch(`${base}/api${p}`, {
    method: m,
    headers: { 'Content-Type': 'application/json', ...(user ? { 'x-test-user': user } : {}) },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const text = await res.text();
  let parsed;
  try { parsed = JSON.parse(text); } catch { parsed = text; }
  return { status: res.status, body: parsed };
}

async function seedRider(opts) {
  const rid = opts.id || id();
  await query(`
    INSERT INTO digital_replica_contracts (
      id, workspace_id, shoot_id, performer_name, performer_email, union_status,
      replica_type, permitted_media, geographic_territory, intended_use_description,
      exclusionary_clauses, starts_at, expires_at, base_scale_rate_cents,
      total_session_fee_cents, pension_health_cents, status, performer_signature_hash
    ) VALUES (
      $1,$2,$3,$4,$5,'SAG-AFTRA','VISUAL_LIKENESS',ARRAY['BROADCAST_TV'],ARRAY['US'],
      'Use for campaign broadcast only.', ARRAY['NO_POLITICAL'],
      $6,$7,100000,$8,$9,$10,$11
    )`,
    [
      rid, opts.workspaceId, opts.shootId, opts.name || 'Jane', opts.email || 'jane@t.test',
      opts.starts || new Date(Date.now() - 86400000),
      opts.expires || new Date(Date.now() + 20 * 86400000),
      opts.session || 150000, opts.ph || 31500, opts.status || 'SIGNED', opts.hash || 'f'.repeat(64),
    ],
  );
  return rid;
}

before(async () => {
  await adminPool.query(`CREATE SCHEMA ${schema}`);
  pool.options.options = `-c search_path=${schema}`;
  await query(fs.readFileSync(path.resolve(__dirname, '../src/db/migrations/001_initial_schema.sql'), 'utf8'));
  await runMigrations();

  for (const u of Object.values(users)) {
    await query('INSERT INTO users (id, firebase_uid, email, name) VALUES ($1,$1,$2,$3)', [u.uid, u.email, u.name]);
  }
  wsId = id();
  await query(`INSERT INTO agency_workspaces (id, name, owner_id) VALUES ($1,'Pay WS','pay-alice')`, [wsId]);
  await query(`INSERT INTO workspace_members (workspace_id, user_id, role) VALUES ($1,'pay-alice','admin')`, [wsId]);
  await query(`INSERT INTO workspace_members (workspace_id, user_id, role) VALUES ($1,'pay-bob','performer')`, [wsId]);

  shootId = id();
  await query(`INSERT INTO projects (id, workspace_id, title, description, status, slug)
    VALUES ($1,$2,'Spring spot','','active','spring-spot')`, [shootId, wsId]);
  deliveredId = id();
  await query(`INSERT INTO projects (id, workspace_id, title, description, status, slug)
    VALUES ($1,$2,'Delivered spot','','delivered','delivered-spot')`, [deliveredId, wsId]);

  await seedRider({ workspaceId: wsId, shootId, name: 'Alex Johnson', email: 'alex@t.test' });

  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => { req.user = users[req.headers['x-test-user']] || null; next(); });
  app.use('/api', require('../src/routes/compliance'));
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

test('wrapbook csv totals session fee and p&h columns', () => {
  const csv = buildWrapbookCsv([{
    id: 'c1', performer_name: 'Alex Johnson', performer_email: 'a@t.com',
    union_status: 'SAG-AFTRA', replica_type: 'VISUAL_LIKENESS',
    total_session_fee_cents: 150000, pension_health_cents: 31500,
  }]);
  assert.match(csv, /Alex Johnson/);
  assert.match(csv, /150000/);
  assert.match(csv, /31500/);
});

test('greenslate json aggregates totals', () => {
  const json = buildGreenslateJson({ id: 's1', title: 'Spot' }, [
    { id: 'c1', performer_name: 'A', performer_email: 'a@t.com', union_status: 'SAG-AFTRA', replica_type: 'VISUAL_LIKENESS', total_session_fee_cents: 1000, pension_health_cents: 210 },
    { id: 'c2', performer_name: 'B', performer_email: 'b@t.com', union_status: 'SAG-AFTRA', replica_type: 'VOICE_SYNTHESIS', total_session_fee_cents: 2000, pension_health_cents: 420 },
  ]);
  assert.equal(json.performer_count, 2);
  assert.equal(json.total_session_fees_cents, 3000);
  assert.equal(json.total_pension_health_cents, 630);
});

test('export wrapbook batch for signed riders', async () => {
  const res = await api('/v1/payroll/export-batch', 'alice', {
    workspace_id: wsId, shoot_id: shootId, format: 'WRAPBOOK_CSV',
  });
  assert.equal(res.status, 200);
  assert.equal(res.body.data.performer_count, 1);
  assert.equal(Number(res.body.data.total_session_fees_cents), 150000);
  assert.match(res.body.body, /Alex Johnson/);
});

test('export greenslate json', async () => {
  const res = await api('/v1/payroll/export-batch', 'alice', {
    workspace_id: wsId, shoot_id: shootId, format: 'GREENSLATE_JSON',
  });
  assert.equal(res.status, 200);
  const parsed = JSON.parse(res.body.body);
  assert.equal(parsed.performer_count, 1);
});

test('refuses delivered shoot with unsigned rider', async () => {
  await seedRider({
    workspaceId: wsId, shootId: deliveredId, status: 'DRAFT', hash: null, name: 'Unsigned',
  });
  const res = await api('/v1/payroll/export-batch', 'alice', {
    workspace_id: wsId, shoot_id: deliveredId, format: 'WRAPBOOK_CSV',
  });
  assert.equal(res.status, 409);
});

test('performer cannot export payroll', async () => {
  const res = await api('/v1/payroll/export-batch', 'bob', {
    workspace_id: wsId, shoot_id: shootId, format: 'WRAPBOOK_CSV',
  });
  assert.equal(res.status, 403);
});

test('clearance certificate is a pdf', async () => {
  const res = await fetch(`${base}/api/v1/workspaces/${wsId}/clearance-certificate`, {
    headers: { 'x-test-user': 'alice' },
  });
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type'), /pdf/);
  const buf = Buffer.from(await res.arrayBuffer());
  assert.equal(buf.subarray(0, 5).toString(), '%PDF-');
});

test('certificate helper includes red amber yellow counts', () => {
  const pdf = buildClearanceCertificate({
    workspaceName: 'Acme',
    report: {
      green: false,
      counts: { red: 1, amber: 0, yellow: 2 },
      red: [{ title: 'Spot', reason: 'missing rider' }],
      amber: [],
      yellow: [{ title: 'Spot', reason: 'notice window' }],
    },
  });
  assert.match(pdf.toString(), /Broadcast Clearance Certificate/);
  assert.match(pdf.toString(), /Red 1/);
});
