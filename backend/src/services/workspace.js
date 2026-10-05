const crypto = require('crypto');
const { query } = require('../db/pool');
const WORKSPACE_ROLES = ['admin', 'producer', 'clearance_counsel', 'performer'];

// get all workspaces the user belongs to
async function listWorkspaces(userId) {
  const result = await query(
    `SELECT aw.*, wm.role AS member_role
     FROM agency_workspaces aw
     JOIN workspace_members wm ON wm.workspace_id = aw.id
     WHERE wm.user_id = $1
     ORDER BY aw.created_at DESC`,
    [userId]
  );
  return result.rows;
}

async function getWorkspace(workspaceId) {
  const result = await query('SELECT * FROM agency_workspaces WHERE id = $1', [workspaceId]);
  return result.rows[0] || null;
}

async function createWorkspace(userId, { name, description }) {
  const id = `ws-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
  const client = await require('../db/pool').pool.connect();
  try {
    await client.query('BEGIN');
    const res = await client.query(
      `INSERT INTO agency_workspaces (id, name, description, owner_id)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [id, name, description || '', userId]
    );
    await client.query(
      `INSERT INTO workspace_members (workspace_id, user_id, role) VALUES ($1, $2, 'admin')`,
      [id, userId]
    );
    await client.query('COMMIT');
    return { ...res.rows[0], member_role: 'admin' };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function updateWorkspace(workspaceId, { name, description }) {
  const fields = [];
  const values = [];
  if (name !== undefined) { fields.push(`name = $${fields.length + 1}`); values.push(name); }
  if (description !== undefined) { fields.push(`description = $${fields.length + 1}`); values.push(description); }
  if (!fields.length) return getWorkspace(workspaceId);
  fields.push(`updated_at = NOW()`);
  values.push(workspaceId);
  const result = await query(
    `UPDATE agency_workspaces SET ${fields.join(', ')} WHERE id = $${values.length} RETURNING *`,
    values
  );
  return result.rows[0];
}

async function getMemberRole(workspaceId, userId) {
  const result = await query(
    'SELECT role FROM workspace_members WHERE workspace_id = $1 AND user_id = $2',
    [workspaceId, userId]
  );
  return result.rows[0]?.role || null;
}

async function listMembers(workspaceId) {
  const result = await query(
    `SELECT wm.user_id, wm.role, wm.joined_at,
            u.email, u.name,
            p.handle, p.avatar
     FROM workspace_members wm
     JOIN users u ON u.id = wm.user_id
     LEFT JOIN profiles p ON p.id = wm.user_id
     WHERE wm.workspace_id = $1
     ORDER BY wm.joined_at ASC`,
    [workspaceId]
  );
  return result.rows;
}

async function updateMemberRole(workspaceId, userId, role) {
  if (!WORKSPACE_ROLES.includes(role)) throw Object.assign(new Error('Invalid role'), { status: 400 });
  const result = await query(
    `UPDATE workspace_members SET role = $3 WHERE workspace_id = $1 AND user_id = $2 RETURNING *`,
    [workspaceId, userId, role]
  );
  if (!result.rows[0]) throw Object.assign(new Error('Member not found'), { status: 404 });
  return result.rows[0];
}

async function removeMember(workspaceId, userId) {
  const result = await query(
    'DELETE FROM workspace_members WHERE workspace_id = $1 AND user_id = $2 RETURNING user_id',
    [workspaceId, userId]
  );
  return result.rowCount > 0;
}

async function createInvite(workspaceId, invitedBy, { email, role = 'performer' }) {
  if (!WORKSPACE_ROLES.includes(role)) throw Object.assign(new Error('Invalid role'), { status: 400 });
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    throw Object.assign(new Error('A valid email is required'), { status: 400 });
  }
  const id = `inv-${Date.now()}`;
  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const result = await query(
    `INSERT INTO workspace_invites (id, workspace_id, invited_by, email, role, token, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [id, workspaceId, invitedBy, normalizedEmail, role, token, expiresAt]
  );
  return result.rows[0];
}

async function acceptInvite(token, userId, userEmail) {
  const result = await query(
    `SELECT * FROM workspace_invites
     WHERE token = $1 AND accepted_at IS NULL AND expires_at > NOW()`,
    [token]
  );
  const invite = result.rows[0];
  if (!invite) throw Object.assign(new Error('Invite not found or expired'), { status: 404 });
  if (invite.email !== userEmail.toLowerCase()) {
    throw Object.assign(new Error('This invite was sent to a different email address'), { status: 403 });
  }
  const client = await require('../db/pool').pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `INSERT INTO workspace_members (workspace_id, user_id, role) VALUES ($1, $2, $3)
       ON CONFLICT (workspace_id, user_id) DO UPDATE SET role = EXCLUDED.role`,
      [invite.workspace_id, userId, invite.role]
    );
    await client.query(
      'UPDATE workspace_invites SET accepted_at = NOW() WHERE id = $1',
      [invite.id]
    );
    await client.query('COMMIT');
    return invite;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function listRateCards() {
  const result = await query(
    'SELECT * FROM rate_cards WHERE is_active = TRUE ORDER BY job_category, union_code',
    []
  );
  return result.rows;
}

module.exports = {
  WORKSPACE_ROLES,
  listWorkspaces, getWorkspace, createWorkspace, updateWorkspace,
  getMemberRole, listMembers, updateMemberRole, removeMember,
  createInvite, acceptInvite, listRateCards,
};
