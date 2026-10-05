const { before, after, test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');
const express = require('express');
require('dotenv').config({ path: path.resolve(__dirname, '../.env'), quiet: true });
require('dotenv').config({ quiet: true });
const { pool, query } = require('../src/db/pool');
const { Pool } = require('pg');
const { runMigrations } = require('../src/db/migrate');
const contracts = require('../src/services/contracts');

const schema = `contract_test_${process.pid}_${Date.now()}`;
const adminPool = new Pool({ connectionString: pool.options.connectionString });
const stored = [];

const users = {
  ada: { uid: 'c-ada', email: 'ada@agency.test', name: 'Ada', verifiedToken: true, emailVerified: true },
  outsider: { uid: 'c-out', email: 'out@nope.test', name: 'Out', verifiedToken: true, emailVerified: true },
};

let server, base;

function later(days) {
  return new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
}

function riderBody(extra) {
  return {
    workspace_id: 'ws-contract',
    shoot_id: 'shoot-contract',
    performer_name: 'Alex Johnson',
    performer_email: 'alex@talent.test',
    agent_email: 'agent@talent.test',
    union_status: 'SAG-AFTRA',
    replica_type: 'VISUAL_LIKENESS',
    permitted_media: ['BROADCAST_TV', 'DIGITAL_SOCIAL'],
    geographic_territory: ['US', 'CA'],
    intended_use_description: 'Hero visual replica for the Acme spring commercial, broadcast and social cutdowns only.',
    exclusionary_clauses: ['NO_SEXUAL', 'NO_POLITICAL', 'NO_DEFAMATION'],
    starts_at: later(10),
    duration_months: 12,
    base_scale_rate_cents: 100000,
    ...extra,
  };
}

async function api(urlPath, user, body, method) {
  method = method || (body ? 'POST' : 'GET');
  const res = await fetch(`${base}/api${urlPath}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'user-agent': 'synthpass-test',
      ...(user ? { 'x-test-user': user } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
}

before(async () => {
  await adminPool.query(`CREATE SCHEMA ${schema}`);
  pool.options.options = `-c search_path=${schema}`;
  await query(fs.readFileSync(path.resolve(__dirname, '../src/db/migrations/001_initial_schema.sql'), 'utf8'));
  await runMigrations();

  for (const u of Object.values(users)) {
    await query(
      'INSERT INTO users (id, firebase_uid, email, name) VALUES ($1,$1,$2,$3) ON CONFLICT DO NOTHING',
      [u.uid, u.email, u.name],
    );
  }
  await query(`INSERT INTO agency_workspaces (id, name, owner_id) VALUES ('ws-contract', 'Contract WS', 'c-ada')`);
  await query(`INSERT INTO workspace_members (workspace_id, user_id, role) VALUES ('ws-contract', 'c-ada', 'admin')`);
  await query(
    `INSERT INTO projects (id, owner_id, workspace_id, slug, title) VALUES ('shoot-contract', 'c-ada', 'ws-contract', 'acme-shoot', 'Acme Spring')`,
  );

  contracts.setStorageForTests({
    uploadArtifact: async ({ folder, key, body, contentType }) => {
      stored.push({ folder, key, body, contentType });
      return { key };
    },
  });

  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => { req.user = users[req.headers['x-test-user']] || null; next(); });
  app.use('/api', require('../src/routes/contracts'));
  app.use((err, _req, res, _next) => res.status(err.status || 500).json({ message: err.message }));
  server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
  await pool.end();
  await adminPool.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
  await adminPool.end();
});

test('1.5x scale and 21 percent pension are calculated', () => {
  const fees = contracts.calcFees(100000);
  assert.equal(fees.multiplier, 1.5);
  assert.equal(fees.total, 150000);
  assert.equal(fees.pension, 31500);
});

test('draft rejects a vague AB 2602 use and a start inside 48 hours', async () => {
  const vague = await api('/v1/contracts/draft', 'ada', riderBody({
    intended_use_description: 'unlimited use of the replica for any purpose we can think of today',
  }));
  assert.equal(vague.status, 400);

  const soon = await api('/v1/contracts/draft', 'ada', riderBody({ starts_at: later(1) }));
  assert.equal(soon.status, 422);
});

test('outsider cannot draft a rider', async () => {
  const res = await api('/v1/contracts/draft', 'outsider', riderBody());
  assert.equal(res.status, 403);
});

test('sample SAG-AFTRA rider can be noticed and signed into a stored PDF', async () => {
  const drafted = await api('/v1/contracts/draft', 'ada', riderBody());
  assert.equal(drafted.status, 201);
  assert.equal(drafted.body.data.total_session_fee_cents, 150000);
  assert.equal(drafted.body.data.pension_health_cents, 31500);
  assert.equal(drafted.body.data.status, 'DRAFT');
  assert.ok(drafted.body.data.expires_at);

  const noticed = await api(`/v1/contracts/${drafted.body.data.id}/send-notice`, 'ada', { workspace_id: 'ws-contract' });
  assert.equal(noticed.status, 200);
  assert.equal(noticed.body.data.status, 'NOTICE_SENT');
  assert.ok(noticed.body.data.notice_token);
  assert.ok(noticed.body.data.advance_notice_given_at);

  const review = await api(`/v1/contracts/review/${noticed.body.data.notice_token}`);
  assert.equal(review.status, 200);
  assert.equal(review.body.performer_name, 'Alex Johnson');
  assert.equal(review.body.notice_token, undefined);

  const signed = await api(`/v1/contracts/review/${noticed.body.data.notice_token}/sign`, null, {
    typed_name: 'Alex Johnson',
    signature_svg: '<svg></svg>',
  });
  assert.equal(signed.status, 200);
  assert.equal(signed.body.data.status, 'SIGNED');
  assert.equal(signed.body.data.typed_name, 'Alex Johnson');
  assert.match(signed.body.data.signed_pdf_ref, /^contracts\/ws-contract\/rider-/);

  assert.equal(stored.length, 1);
  assert.equal(stored[0].folder, 'contracts');
  assert.equal(stored[0].contentType, 'application/pdf');
  assert.equal(stored[0].body.subarray(0, 5).toString(), '%PDF-');
  const pdfText = stored[0].body.toString('utf8');
  assert.match(pdfText, /AB 2602/);
  assert.match(pdfText, /Alex Johnson/);
  assert.match(pdfText, /1500\.00/);
  assert.match(pdfText, /315\.00/);

  const events = await query('SELECT event_type, ip_address, user_agent FROM contract_audit_events WHERE contract_id = $1 ORDER BY created_at', [drafted.body.data.id]);
  assert.deepEqual(events.rows.map((row) => row.event_type), ['DRAFT', 'NOTICE_SENT', 'SIGNED']);
  assert.equal(events.rows[2].user_agent, 'synthpass-test');
});
