const { query, pool } = require('./pool');

const typedTables = {
  users: { table: 'users', fields: { firebase_uid: 'id', email: 'email', name: 'name', roles: 'roles' } },
  profile: { table: 'profiles', fields: { handle: 'handle', name: 'name', bio: 'bio', avatar: 'avatar', student_status: 'studentStatus', employer_status: 'employerStatus', university_domain: 'universityDomain', company_domain: 'companyDomain' } },
  projects: { table: 'projects', fields: { owner_id: 'ownerId', slug: 'slug', title: 'title', description: 'description', status: 'status' } },
  project_members: { table: 'project_members', fields: { project_id: 'projectId', user_id: 'userId', role: 'role' } },
  feed: { table: 'posts', fields: { owner_id: 'userId', caption: 'caption', description: 'description', audience: 'audience' }, source: true },
  posts: { table: 'posts', fields: { owner_id: 'userId', caption: 'content', description: 'description', audience: 'audience' }, source: true },
  recruit: { table: 'recruit_listings', fields: { owner_id: 'postedBy', project_id: 'projectId', title: 'title', description: 'description' } },
  jobs: { table: 'jobs', fields: { owner_id: 'ownerId', title: 'title', company: 'company', description: 'description', is_active: 'isActive' } },
  investors: { table: 'investor_profiles', fields: { owner_id: 'userId', name: 'name', stage: 'stage', org_domain: 'orgDomain', check_size: 'checkSize', aum_range: 'aumRange', thesis: 'thesis', status: 'status', review_note: 'reviewNote', reviewed_by: 'reviewedBy', reviewed_at: 'reviewedAt' } },
  applications: { table: 'applications', fields: { user_id: 'userId', job_id: 'jobId', recruit_listing_id: 'recruitListingId', status: 'status' } },
  endorsements: { table: 'endorsements', fields: { author_id: 'authorId', recipient_id: 'recipientId', skill: 'skill' } },
};

function toIsoDate(value) {
  const date = value ? new Date(value) : new Date();
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function getCreatedAt(entity) {
  return toIsoDate(entity.createdAt || entity.timestamp || entity.date);
}

function getOwnerId(entity) {
  return entity.ownerId || entity.userId || entity.postedBy || entity.user?.id || entity.assignedTo || entity.senderId || null;
}

function applyPagination(items, page = 1, limit = 10) {
  const safePage = Math.max(1, Number.parseInt(page, 10) || 1);
  const safeLimit = Math.min(100, Math.max(1, Number.parseInt(limit, 10) || 10));
  return items.slice((safePage - 1) * safeLimit, safePage * safeLimit);
}

function fromRow(config, row) {
  if (!row) return null;
  const entity = { ...row.data };
  for (const [column, field] of Object.entries(config.fields)) entity[field] = row[column];
  entity.id = row.data.id ?? row.id;
  entity.createdAt = row.created_at.toISOString();
  if (config.table === 'profiles') entity.userId = row.id;
  return entity;
}

async function countEntities(kind) {
  const config = typedTables[kind];
  const result = config
    ? await query(`SELECT COUNT(*)::int AS count FROM ${config.table}${config.source ? ' WHERE source_kind = $1' : ''}`, config.source ? [kind] : [])
    : await query('SELECT COUNT(*)::int AS count FROM app_entities WHERE kind = $1', [kind]);
  return result.rows[0].count;
}

async function upsertEntity(kind, entity) {
  const payload = { ...entity };
  const createdAt = getCreatedAt(payload);
  if (!payload.createdAt && !payload.timestamp && !payload.date) payload.createdAt = createdAt;
  const config = typedTables[kind];
  if (config) {
    if (kind === 'profile') payload.id = payload.userId || payload.id;
    if (config.table === 'posts') payload.userId = getOwnerId(payload);
    if (kind === 'users') payload.roles ??= ['maker'];
    const fields = Object.entries(config.fields).filter(([, field]) => payload[field] !== undefined);
    const columns = ['id', ...(config.source ? ['source_kind'] : []), ...fields.map(([column]) => column), 'created_at', 'updated_at', 'data'];
    const values = [String(payload.id), ...(config.source ? [kind] : []), ...fields.map(([, field]) => payload[field]), createdAt, new Date().toISOString(), JSON.stringify(payload)];
    const conflict = config.source ? 'source_kind, id' : 'id';
    const updates = columns.filter((column) => !['id', 'source_kind', 'created_at'].includes(column)).map((column) => `${column} = EXCLUDED.${column}`);
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const userIds = new Set();
      if (kind === 'profile') userIds.add(String(payload.id));
      for (const [column, field] of fields) {
        if (['owner_id', 'user_id', 'author_id', 'recipient_id', 'reviewed_by'].includes(column) && payload[field]) userIds.add(String(payload[field]));
      }
      for (const uid of userIds) {
        await client.query('INSERT INTO users (id, firebase_uid) VALUES ($1, $1) ON CONFLICT DO NOTHING', [uid]);
      }
      const result = await client.query(`INSERT INTO ${config.table} (${columns.join(', ')}) VALUES (${values.map((_, i) => `$${i + 1}`).join(', ')}) ON CONFLICT (${conflict}) DO UPDATE SET ${updates.join(', ')} RETURNING *`, values);
      if (kind === 'projects') {
        const members = new Set([payload.ownerId, ...(Array.isArray(payload.collaborators) ? payload.collaborators : [])].filter((uid) => typeof uid === 'string' && uid));
        await client.query("DELETE FROM project_members WHERE project_id = $1 AND data->>'membershipSource' = 'project' AND NOT (user_id = ANY($2::text[]))", [String(payload.id), [...members]]);
        for (const uid of members) {
          await client.query('INSERT INTO users (id, firebase_uid) VALUES ($1, $1) ON CONFLICT DO NOTHING', [uid]);
          await client.query(`INSERT INTO project_members (id, project_id, user_id, role, data) VALUES ($1, $2, $3, $4, '{"membershipSource":"project"}'::jsonb)
            ON CONFLICT (project_id, user_id) DO UPDATE SET role = CASE
              WHEN EXCLUDED.role = 'owner' THEN 'owner'
              WHEN project_members.role = 'owner' THEN 'member'
              ELSE project_members.role END, updated_at = NOW()`, [`${payload.id}:${uid}`, String(payload.id), uid, uid === payload.ownerId ? 'owner' : 'member']);
        }
      }
      await client.query('COMMIT');
      return fromRow(config, result.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
  await query(`INSERT INTO app_entities (kind, id, owner_id, slug, team_id, conversation_id, created_at, updated_at, data)
    VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), $8::jsonb)
    ON CONFLICT (kind, id) DO UPDATE SET owner_id = EXCLUDED.owner_id, slug = EXCLUDED.slug,
    team_id = EXCLUDED.team_id, conversation_id = EXCLUDED.conversation_id, updated_at = NOW(), data = EXCLUDED.data`,
  [kind, String(payload.id), getOwnerId(payload), payload.slug || null, payload.teamId || null, payload.conversationId || null, createdAt, JSON.stringify(payload)]);
  return payload;
}

async function insertMany(kind, items) {
  for (const item of items) await upsertEntity(kind, item);
}

async function listEntities(kind, options = {}) {
  const config = typedTables[kind];
  const result = config
    ? await query(`SELECT * FROM ${config.table}${config.source ? ' WHERE source_kind = $1' : ''} ORDER BY created_at DESC, id ASC`, config.source ? [kind] : [])
    : await query('SELECT data FROM app_entities WHERE kind = $1 ORDER BY created_at DESC, id ASC', [kind]);
  let items = result.rows.map((row) => config ? fromRow(config, row) : row.data);
  if (typeof options.filter === 'function') items = items.filter(options.filter);
  if (typeof options.sort === 'function') items = items.sort(options.sort);
  return options.paginate === false ? items : applyPagination(items, options.page, options.limit);
}

async function getEntityById(kind, id) {
  const config = typedTables[kind];
  const result = config
    ? await query(`SELECT * FROM ${config.table} WHERE id = $1${config.source ? ' AND source_kind = $2' : ''}`, config.source ? [String(id), kind] : [String(id)])
    : await query('SELECT data FROM app_entities WHERE kind = $1 AND id = $2', [kind, String(id)]);
  return config ? fromRow(config, result.rows[0]) : result.rows[0]?.data || null;
}

async function getEntityBySlug(kind, slug) {
  if (kind === 'projects') {
    const result = await query('SELECT * FROM projects WHERE slug = $1', [slug]);
    return fromRow(typedTables.projects, result.rows[0]);
  }
  const result = await query('SELECT data FROM app_entities WHERE kind = $1 AND slug = $2', [kind, slug]);
  return result.rows[0]?.data || null;
}

async function patchEntity(kind, id, updater) {
  const existing = await getEntityById(kind, id);
  if (!existing) return null;
  const nextValue = typeof updater === 'function' ? updater({ ...existing }) : updater;
  return upsertEntity(kind, { ...existing, ...nextValue, id: existing.id });
}

async function deleteEntity(kind, id) {
  const config = typedTables[kind];
  const result = config
    ? await query(`DELETE FROM ${config.table} WHERE id = $1${config.source ? ' AND source_kind = $2' : ''}`, config.source ? [String(id), kind] : [String(id)])
    : await query('DELETE FROM app_entities WHERE kind = $1 AND id = $2', [kind, String(id)]);
  return result.rowCount > 0;
}

module.exports = { countEntities, insertMany, listEntities, getEntityById, getEntityBySlug, upsertEntity, patchEntity, deleteEntity, applyPagination };
