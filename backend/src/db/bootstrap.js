const seed = require('../seed');
const {
  ensureSchema,
  countEntities,
  insertMany,
} = require('./repository');

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

  for (const feedItem of seed.feed) {
    if (!feedItem.user?.id) {
      continue;
    }

    users.set(feedItem.user.id, {
      id: feedItem.user.id,
      userId: feedItem.user.id,
      name: feedItem.user.name,
      bio: `${feedItem.user.name} is active in the MakerSpace network.`,
      avatar: feedItem.user.avatar,
      rating: feedItem.user.rating,
      skills: [],
      socials: {},
    });
  }

  return [...users.values()];
}

async function seedKind(kind, items) {
  const total = await countEntities(kind);
  if (total > 0) {
    return;
  }

  await insertMany(kind, items);
}

async function bootstrapDatabase() {
  await ensureSchema();

  await seedKind('feed', seed.feed);
  await seedKind('posts', seed.posts);
  await seedKind('profile', [seed.profile]);
  await seedKind('projects', seed.projects);
  await seedKind('tasks', seed.tasks);
  await seedKind('teams', seed.teams);
  await seedKind('messages', seed.messages);
  await seedKind('conversations', seed.conversations);
  await seedKind('notifications', seed.notifications);
  await seedKind('recruit', seed.recruitListings);
  await seedKind('investors', seed.investors);
  await seedKind('history', seed.history);
  await seedKind('users', buildUsers());
}

module.exports = {
  bootstrapDatabase,
};
