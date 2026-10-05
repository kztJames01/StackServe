const { runMigrations } = require('./migrate');
const seed = require('../seed');
const { countEntities, insertMany } = require('./repository');
const { query } = require('./pool');

function buildUsers() {
  const users = new Map();

  users.set('current-user', {
    id: 'current-user',
    userId: 'current-user',
    name: seed.profile.name,
    bio: seed.profile.bio,
    avatar: seed.profile.avatar,
    skills: seed.profile.skills,
    socials: seed.profile.socials,
  });

  return [...users.values()];
}

async function seedKind(kind, items) {
  const total = await countEntities(kind);
  if (total > 0) return;
  await insertMany(kind, items);
}

async function seedDatabase() {
  if (process.env.SEED_DB === 'false') return;

  await seedKind('users', buildUsers());
  await seedKind('profile', [seed.profile]);
  await query(`INSERT INTO agency_workspaces (id, name, description, owner_id)
    VALUES ('workspace-demo', 'SynthPass Demo Agency', 'Local development workspace', 'current-user')
    ON CONFLICT (id) DO NOTHING`);
  await query(`INSERT INTO workspace_members (workspace_id, user_id, role)
    VALUES ('workspace-demo', 'current-user', 'admin')
    ON CONFLICT (workspace_id, user_id) DO NOTHING`);
  await seedKind('projects', [{
    id: 'shoot-demo',
    slug: 'ai-commercial-demo',
    workspaceId: 'workspace-demo',
    ownerId: 'current-user',
    title: 'AI Commercial Demo',
    description: 'Sample commercial shoot for local SynthPass development.',
    image: '/home.jpg',
    tags: ['AI media', 'Commercial'],
    collaborators: [],
    status: 'active',
  }]);
}

async function bootstrapDatabase() {
  await runMigrations();
  await seedDatabase();
}

module.exports = { bootstrapDatabase, runMigrations, seedDatabase };
