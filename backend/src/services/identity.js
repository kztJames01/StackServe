const { z } = require('zod');
const { pool, query } = require('../db/pool');

const accountRoles = ['maker', 'employer', 'investor', 'educator'];
const safeUrl = z.string().max(2048).refine((value) => {
  if (value === '') return true;
  try { return ['http:', 'https:'].includes(new URL(value).protocol); } catch { return false; }
}, 'Use an http or https URL');
const profileSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  bio: z.string().trim().max(2000).optional(),
  avatar: z.union([safeUrl, z.literal('/home.jpg')]).optional(),
  handle: z.string().trim().toLowerCase().regex(/^[a-z0-9][a-z0-9_-]{2,29}$/, 'Use 3–30 lowercase letters, numbers, underscores or hyphens').optional(),
  roles: z.array(z.enum(accountRoles)).min(1).max(4).transform((roles) => [...new Set(roles)]).optional(),
  skills: z.array(z.string().trim().min(1).max(80)).max(30).optional(),
  socials: z.object({ github: safeUrl.optional(), linkedin: safeUrl.optional(), twitter: safeUrl.optional() }).optional(),
}).strict();

async function ensureIdentity(user) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const displayName = (user.name && String(user.name).trim()) || 'Maker';
    await client.query(`INSERT INTO users (id, firebase_uid, email, name) VALUES ($1, $1, $2, $3)
      ON CONFLICT (id) DO UPDATE SET
        email = COALESCE(EXCLUDED.email, users.email),
        name = CASE
          WHEN users.name IS NULL OR users.name = '' OR users.name = 'Maker' THEN COALESCE(NULLIF(EXCLUDED.name, 'Maker'), users.name)
          ELSE users.name
        END`, [user.uid, user.email, displayName]);
    await client.query(`INSERT INTO profiles (id, name, data) VALUES ($1, $2, $3::jsonb)
      ON CONFLICT (id) DO UPDATE SET
        name = CASE
          WHEN profiles.name IS NULL OR profiles.name = '' OR profiles.name = 'Maker' THEN EXCLUDED.name
          ELSE profiles.name
        END`, [user.uid, displayName, JSON.stringify({ skills: [], socials: { github: '', linkedin: '', twitter: '' } })]);
    if (user.verifiedToken) {
      const domain = (user.email || '').split('@')[1]?.toLowerCase() || '';
      await client.query("UPDATE profiles SET student_status = 'unverified', university_domain = NULL WHERE id = $1 AND student_status = 'verified' AND (university_domain <> $2 OR $3 = FALSE)", [user.uid, domain, user.emailVerified === true]);
      await client.query("UPDATE investor_profiles SET status = 'unverified', updated_at = NOW() WHERE owner_id = $1 AND status IN ('pending', 'verified') AND (org_domain <> $2 OR $3 = FALSE)", [user.uid, domain, user.emailVerified === true]);
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { client.release(); }
}

function publicProfile(row) {
  return {
    handle: row.handle,
    name: row.name,
    bio: row.bio,
    avatar: row.avatar,
    skills: row.data.skills || [],
    socials: row.data.socials || {},
    roles: row.roles,
    studentStatus: row.student_status,
    employerStatus: row.employer_status,
  };
}

async function getOwnProfile(user) {
  await ensureIdentity(user);
  const result = await query('SELECT p.*, u.roles FROM profiles p JOIN users u ON u.id = p.id WHERE p.id = $1', [user.uid]);
  return { ...publicProfile(result.rows[0]), id: user.uid, email: user.email, isAdmin: user.verifiedToken === true && user.admin === true };
}

async function updateOwnProfile(user, body) {
  const parsed = profileSchema.safeParse(body);
  if (!parsed.success) return { error: parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ') };
  await ensureIdentity(user);
  const updates = parsed.data;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const fields = ['name', 'bio', 'avatar', 'handle'].filter((field) => updates[field] !== undefined);
    const extras = {};
    if (updates.skills !== undefined) extras.skills = updates.skills;
    if (updates.socials !== undefined) extras.socials = updates.socials;
    await client.query(`UPDATE profiles SET ${fields.map((field, i) => `${field} = $${i + 2},`).join(' ')}
      data = data || $${fields.length + 2}::jsonb, updated_at = NOW() WHERE id = $1`,
    [user.uid, ...fields.map((field) => updates[field]), JSON.stringify(extras)]);
    if (updates.roles) await client.query('UPDATE users SET roles = $2, updated_at = NOW() WHERE id = $1', [user.uid, updates.roles]);
    if (updates.name) await client.query('UPDATE users SET name = $2 WHERE id = $1', [user.uid, updates.name]);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    if (error.code === '23505') return { error: 'This handle is already in use.', status: 409 };
    throw error;
  } finally { client.release(); }
  return { data: await getOwnProfile(user), message: 'Profile updated' };
}

module.exports = { ensureIdentity, getOwnProfile, updateOwnProfile, publicProfile, safeUrl };
