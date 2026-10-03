const { before, after, test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { Pool } = require('pg');
const express = require('express');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
require('dotenv').config({ path: path.resolve(__dirname, '../.env'), quiet: true });
require('dotenv').config({ quiet: true });
const { pool, query } = require('../src/db/pool');
const { runMigrations } = require('../src/db/migrate');
const { getOwnProfile, updateOwnProfile } = require('../src/services/identity');
const { upsertEntity, getEntityById, listEntities } = require('../src/db/repository');
const schema = `phase_a_test_${process.pid}_${Date.now()}`;
const adminPool = new Pool({ connectionString: pool.options.connectionString });
const users = {
  alice: { uid: 'alice', email: 'alice@university.edu', name: 'Alice', verifiedToken: true, emailVerified: true },
  bob: { uid: 'bob', email: 'bob@fund.example', name: 'Bob', verifiedToken: true, emailVerified: true },
  staff: { uid: 'staff', email: 'staff@company.example', name: 'Staff', verifiedToken: true, emailVerified: true, admin: true },
  forged: { uid: 'forged', email: 'forged@university.edu', name: 'Forged', emailVerified: true, admin: true },
};
let server;
let base;

async function api(endpoint, user, body, method = body ? 'POST' : 'GET') {
  const response = await fetch(`${base}/api${endpoint}`, { method, headers: { 'Content-Type': 'application/json', ...(user ? { 'x-test-user': user } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  return { status: response.status, body: await response.json() };
}

before(async () => {
  await adminPool.query(`CREATE SCHEMA ${schema}`);
  pool.options.options = `-c search_path=${schema}`;
  await query(fs.readFileSync(path.resolve(__dirname, '../src/db/migrations/001_initial_schema.sql'), 'utf8'));
  const seed = require('../src/seed');
  for (const [kind, items] of Object.entries({ profile: [seed.profile], feed: seed.feed, posts: seed.posts, projects: seed.projects, recruit: seed.recruitListings, investors: seed.investors,
    jobs: [{ id: 'legacy-job', ownerId: 'legacy-employer', title: 'Engineer', company: 'Maker Co' }],
    project_members: [{ id: 'legacy-member', projectId: String(seed.projects[0].id), userId: 'legacy-member-user', role: 'maintainer', permissions: ['review'] }],
    applications: [{ id: 'legacy-application', userId: 'legacy-applicant', jobId: 'legacy-job', status: 'accepted', answers: { retained: true } }],
    endorsements: [{ id: 'legacy-endorsement', authorId: 'legacy-author', recipientId: 'legacy-recipient', skill: 'Accessibility', context: 'Project review' }],
  })) {
    for (const item of items) {
      const owner = item.ownerId || item.userId || item.postedBy || item.user?.id || null;
      await query('INSERT INTO app_entities (kind, id, owner_id, slug, data) VALUES ($1, $2, $3, $4, $5::jsonb)', [kind, String(item.id), owner, item.slug || null, JSON.stringify(item)]);
    }
  }
  await runMigrations();
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => { req.user = users[req.headers['x-test-user']] || null; next(); });
  for (const route of ['profile', 'users', 'verification', 'investors', 'feed']) app.use('/api', require(`../src/routes/${route}`));
  app.use((error, _req, res, _next) => res.status(500).json({ message: error.message }));
  server = await new Promise((resolve) => { const instance = app.listen(0, '127.0.0.1', () => resolve(instance)); });
  base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
  await pool.end();
  await adminPool.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
  await adminPool.end();
});

test('migrations preserve legacy data and are idempotent', async () => {
  const beforeCount = await query('SELECT COUNT(*)::int AS count FROM app_entities');
  await runMigrations();
  assert.equal((await query('SELECT COUNT(*)::int AS count FROM schema_migrations')).rows[0].count, 11);
  assert.equal((await query('SELECT COUNT(*)::int AS count FROM app_entities')).rows[0].count, beforeCount.rows[0].count);
  assert.ok((await listEntities('projects', { paginate: false })).length > 0);
  assert.equal((await getEntityById('profile', 'current-user')).userId, 'current-user');
  assert.ok((await query("SELECT COUNT(*)::int AS count FROM pg_indexes WHERE schemaname = $1 AND indexdef LIKE '%USING gin%'", [schema])).rows[0].count >= 11);
  assert.equal((await api('/investors')).body.length, 0);
  assert.equal((await getEntityById('applications', 'legacy-application')).status, 'accepted');
  assert.deepEqual((await getEntityById('applications', 'legacy-application')).answers, { retained: true });
  assert.equal((await getEntityById('endorsements', 'legacy-endorsement')).context, 'Project review');
  const member = await getEntityById('project_members', 'legacy-member');
  assert.equal(member.role, 'maintainer');
  await upsertEntity('projects', await getEntityById('projects', member.projectId));
  assert.deepEqual((await getEntityById('project_members', 'legacy-member')).permissions, ['review']);
});

test('fresh databases bootstrap all tables and per-user identity', async () => {
  const freshSchema = `${schema}_fresh`;
  await adminPool.query(`CREATE SCHEMA ${freshSchema}`);
  try {
    await promisify(execFile)(process.execPath, ['-e', `
      const assert = require('node:assert/strict');
      const { pool, query } = require('./backend/src/db/pool');
      const { runMigrations } = require('./backend/src/db/migrate');
      const { bootstrapDatabase } = require('./backend/src/db/bootstrap');
      const { getOwnProfile } = require('./backend/src/services/identity');
      (async () => {
        await runMigrations();
        await bootstrapDatabase();
        assert.equal((await query('SELECT COUNT(*)::int AS count FROM schema_migrations')).rows[0].count, 11);
        const profile = await getOwnProfile({ uid: 'fresh-user', email: null, name: 'Fresh Maker' });
        assert.equal(profile.id, 'fresh-user');
        assert.deepEqual(profile.roles, ['maker']);
        assert.ok((await query('SELECT COUNT(*)::int AS count FROM projects')).rows[0].count > 0);
        assert.equal((await query("SELECT COUNT(*)::int AS count FROM investor_profiles WHERE status = 'verified'")).rows[0].count, 0);
      })().then(() => pool.end()).catch(async (error) => { console.error(error); await pool.end(); process.exitCode = 1; });
    `], { cwd: path.resolve(__dirname, '../..'), env: { ...process.env, DATABASE_URL: pool.options.connectionString, SEED_DB: 'true', PGOPTIONS: `-c search_path=${freshSchema}` } });
  } finally {
    await adminPool.query(`DROP SCHEMA ${freshSchema} CASCADE`);
  }
});

test('profiles are isolated by UID and roles can overlap', async () => {
  await getOwnProfile(users.alice);
  await getOwnProfile(users.bob);
  const result = await updateOwnProfile(users.alice, { name: 'Alice Maker', bio: 'Building accessible tools', handle: 'alice-maker', roles: ['maker', 'educator', 'investor'] });
  assert.equal(result.data.name, 'Alice Maker');
  assert.deepEqual(result.data.roles, ['maker', 'educator', 'investor']);
  assert.equal((await getOwnProfile(users.bob)).name, 'Bob');
  assert.equal((await api('/profile')).status, 401);
  assert.equal((await api('/profiles/alice-maker')).body.email, undefined);
  assert.equal((await api('/profiles/alice-maker')).body.id, undefined);
  assert.equal((await updateOwnProfile(users.bob, { handle: 'alice-maker' })).status, 409);
  assert.ok((await updateOwnProfile(users.alice, { roles: ['admin'] })).error);
  assert.ok((await updateOwnProfile(users.alice, { studentStatus: 'verified' })).error);
  assert.ok((await updateOwnProfile(users.alice, { socials: { github: 'javascript:alert(1)' } })).error);
});

test('student verification requires signed, verified university email and gates discovery', async () => {
  assert.equal((await api('/verification/student', 'forged', {})).status, 503);
  assert.equal((await api('/verification/student', 'bob', {})).status, 400);
  assert.equal((await api('/feed?audience=students', 'alice')).status, 403);
  assert.equal((await api('/verification/student', 'alice', {})).status, 200);
  const created = await api('/posts', 'alice', { content: 'Student-only project update', audience: 'students' });
  assert.equal(created.status, 201);
  assert.equal((await api('/feed?audience=students', 'bob')).status, 403);
  assert.ok(!(await api('/feed')).body.some((post) => post.id === created.body.data.id));
  assert.ok((await api('/feed?audience=students', 'alice')).body.some((post) => post.id === created.body.data.id));
  assert.equal((await api(`/posts/${created.body.data.id}/like`, 'bob', {})).status, 403);
  assert.equal((await api(`/posts/${created.body.data.id}`, 'bob', undefined, 'DELETE')).status, 403);
  const changedEmail = { ...users.alice, email: 'alice@other.example' };
  assert.equal((await getOwnProfile(changedEmail)).studentStatus, 'unverified');
});

test('investors cannot feature themselves or review submissions', async () => {
  await updateOwnProfile(users.bob, { roles: ['maker', 'investor'], handle: 'bob-investor' });
  const credentials = { orgDomain: 'fund.example', checkSize: '$25k–$100k', stage: 'Seed', aumRange: '$1m–$5m', thesis: 'Developer tooling and accessible software for independent makers.', portfolio: ['Example Company'] };
  assert.equal((await api('/verification/investor', 'bob', { ...credentials, status: 'verified' })).status, 400);
  assert.equal((await api('/verification/investor', 'bob', credentials)).status, 202);
  assert.equal((await api('/investors')).body.length, 0);
  assert.equal((await api('/verification/investors/review', 'bob')).status, 403);
  assert.equal((await api('/verification/investors/review', 'forged')).status, 403);
  const queue = await api('/verification/investors/review', 'staff');
  assert.equal(queue.status, 200);
  const submission = queue.body.find((item) => item.id === 'bob');
  assert.ok(submission.submittedAt);
  assert.equal((await api('/verification/investors/bob/review', 'staff', { decision: 'verified', note: 'Organization email and submitted credentials reviewed.', submittedAt: 'stale' }, 'PATCH')).status, 409);
  assert.equal((await api('/verification/investors/bob/review', 'staff', { decision: 'verified', note: 'Organization email and submitted credentials reviewed.', submittedAt: submission.submittedAt }, 'PATCH')).status, 200);
  const featured = (await api('/investors')).body;
  assert.equal(featured.length, 1);
  assert.equal(featured[0].status, 'verified');
  assert.equal(featured[0].aumRange, credentials.aumRange);
  assert.equal(featured[0].reviewNote, undefined);
  assert.ok((await api('/profiles/bob-investor')).body.investor);
  assert.equal((await api('/verification/investor', 'bob', credentials)).status, 202);
  assert.equal((await api('/investors')).body.length, 0);
});

test('external providers fail closed until configured', async () => {
  assert.equal((await api('/verification/student/sheerid', 'alice', {})).status, 503);
  assert.equal((await api('/verification/employer', 'bob', {})).status, 503);
  assert.equal((await api('/verification/employer', undefined, {})).status, 401);
});

test('typed writes keep project membership synchronized and JSONB extensions intact', async () => {
  await upsertEntity('projects', { id: 'test-project', ownerId: 'alice', title: 'Project', collaborators: ['bob'], tags: ['accessibility'], customField: { retained: true } });
  const project = await getEntityById('projects', 'test-project');
  assert.deepEqual(project.customField, { retained: true });
  assert.equal((await query('SELECT COUNT(*)::int AS count FROM project_members WHERE project_id = $1', ['test-project'])).rows[0].count, 2);
  await upsertEntity('projects', { ...project, collaborators: [] });
  assert.equal((await query('SELECT COUNT(*)::int AS count FROM project_members WHERE project_id = $1', ['test-project'])).rows[0].count, 1);
});
