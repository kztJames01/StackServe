const { query } = require('./pool');

function toIsoDate(value) {
  if (!value) {
    return new Date().toISOString();
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function getCreatedAt(entity) {
  return toIsoDate(entity.createdAt || entity.timestamp || entity.date);
}

function getOwnerId(entity) {
  return entity.ownerId || entity.userId || entity.postedBy || entity.assignedTo || entity.senderId || null;
}

function getSlug(entity) {
  return entity.slug || null;
}

function getTeamId(entity) {
  return entity.teamId || null;
}

function getConversationId(entity) {
  return entity.conversationId || null;
}

function applyPagination(items, page = 1, limit = 10) {
  const safePage = Math.max(1, Number.parseInt(page, 10) || 1);
  const safeLimit = Math.min(100, Math.max(1, Number.parseInt(limit, 10) || 10));
  const start = (safePage - 1) * safeLimit;
  return items.slice(start, start + safeLimit);
}

async function ensureSchema() {
  await query(`
    CREATE TABLE IF NOT EXISTS app_entities (
      kind TEXT NOT NULL,
      id TEXT NOT NULL,
      owner_id TEXT,
      slug TEXT,
      team_id TEXT,
      conversation_id TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      data JSONB NOT NULL,
      PRIMARY KEY (kind, id)
    );
  `);

  await query('CREATE INDEX IF NOT EXISTS idx_app_entities_kind_created ON app_entities (kind, created_at DESC);');
  await query('CREATE INDEX IF NOT EXISTS idx_app_entities_kind_slug ON app_entities (kind, slug);');
  await query('CREATE INDEX IF NOT EXISTS idx_app_entities_kind_owner ON app_entities (kind, owner_id);');
  await query('CREATE INDEX IF NOT EXISTS idx_app_entities_kind_team ON app_entities (kind, team_id);');
  await query('CREATE INDEX IF NOT EXISTS idx_app_entities_kind_conversation ON app_entities (kind, conversation_id);');
}

async function countEntities(kind) {
  const result = await query('SELECT COUNT(*)::int AS count FROM app_entities WHERE kind = $1', [kind]);
  return result.rows[0].count;
}

async function upsertEntity(kind, entity) {
  const payload = { ...entity };
  const now = new Date().toISOString();
  const createdAt = getCreatedAt(payload);
  if (!payload.createdAt && !payload.timestamp && !payload.date) {
    payload.createdAt = createdAt;
  }

  await query(
    `
      INSERT INTO app_entities (kind, id, owner_id, slug, team_id, conversation_id, created_at, updated_at, data)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)
      ON CONFLICT (kind, id)
      DO UPDATE SET
        owner_id = EXCLUDED.owner_id,
        slug = EXCLUDED.slug,
        team_id = EXCLUDED.team_id,
        conversation_id = EXCLUDED.conversation_id,
        updated_at = EXCLUDED.updated_at,
        data = EXCLUDED.data
    `,
    [
      kind,
      String(payload.id),
      getOwnerId(payload),
      getSlug(payload),
      getTeamId(payload),
      getConversationId(payload),
      createdAt,
      now,
      JSON.stringify(payload),
    ]
  );

  return payload;
}

async function insertMany(kind, items) {
  for (const item of items) {
    await upsertEntity(kind, item);
  }
}

async function listEntities(kind, options = {}) {
  const result = await query(
    'SELECT data FROM app_entities WHERE kind = $1 ORDER BY created_at DESC, id ASC',
    [kind]
  );

  let items = result.rows.map((row) => row.data);

  if (typeof options.filter === 'function') {
    items = items.filter(options.filter);
  }

  if (typeof options.sort === 'function') {
    items = items.sort(options.sort);
  }

  if (options.paginate !== false) {
    return applyPagination(items, options.page, options.limit);
  }

  return items;
}

async function getEntityById(kind, id) {
  const result = await query('SELECT data FROM app_entities WHERE kind = $1 AND id = $2', [kind, String(id)]);
  return result.rows[0] ? result.rows[0].data : null;
}

async function getEntityBySlug(kind, slug) {
  const result = await query('SELECT data FROM app_entities WHERE kind = $1 AND slug = $2', [kind, slug]);
  return result.rows[0] ? result.rows[0].data : null;
}

async function patchEntity(kind, id, updater) {
  const existing = await getEntityById(kind, id);
  if (!existing) {
    return null;
  }

  const nextValue = typeof updater === 'function' ? updater({ ...existing }) : { ...existing, ...updater };
  return upsertEntity(kind, { ...existing, ...nextValue, id: existing.id });
}

async function deleteEntity(kind, id) {
  const result = await query('DELETE FROM app_entities WHERE kind = $1 AND id = $2', [kind, String(id)]);
  return result.rowCount > 0;
}

module.exports = {
  ensureSchema,
  countEntities,
  insertMany,
  listEntities,
  getEntityById,
  getEntityBySlug,
  upsertEntity,
  patchEntity,
  deleteEntity,
  applyPagination,
};
