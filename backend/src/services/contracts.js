const crypto = require('crypto');
const { query } = require('../db/pool');
const { buildRiderPdf } = require('./contractPdf');

let storage = require('./storage');

const MEDIA = ['BROADCAST_TV', 'DIGITAL_SOCIAL', 'THEATRICAL', 'PRINT'];
const REPLICA = ['VOICE_SYNTHESIS', 'VISUAL_LIKENESS', 'FULL_DIGITAL_TWIN'];
const UNIONS = ['SAG-AFTRA', 'ACTRA', 'NON_UNION'];
const EXCLUSIONS = ['NO_POLITICAL', 'NO_SEXUAL', 'NO_ALCOHOL_TOBACCO', 'NO_DEFAMATION'];
const VAGUE = /\b(any purpose|all purposes|unlimited use|general use|whatever we want)\b/i;

function fail(status, message) {
  const err = new Error(message);
  err.status = status;
  throw err;
}

function dateOnly(value) {
  if (value instanceof Date) {
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${value.getFullYear()}-${month}-${day}`;
  }
  return String(value).slice(0, 10);
}

function dayMs(value) {
  return new Date(`${dateOnly(value)}T00:00:00Z`).getTime();
}

function addMonths(dateStr, months) {
  const d = new Date(`${String(dateStr).slice(0, 10)}T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + Number(months));
  return d.toISOString().slice(0, 10);
}

function noticeFits(startsAt, fromMs = Date.now()) {
  return dayMs(startsAt) - fromMs >= 48 * 60 * 60 * 1000;
}

function calcFees(baseCents) {
  const multiplier = 1.5;
  const total = Math.round(Number(baseCents) * multiplier);
  const pension = Math.round(total * 0.21);
  return { multiplier, total, pension };
}

function asList(value, allowed, label) {
  if (!Array.isArray(value) || value.length === 0) fail(400, `${label} is required`);
  const clean = [...new Set(value.map((item) => String(item).trim()).filter(Boolean))];
  const bad = clean.filter((item) => !allowed.includes(item));
  if (bad.length) fail(400, `${label} has unsupported value: ${bad.join(', ')}`);
  return clean;
}

function publicRider(row) {
  if (!row) return null;
  return {
    id: row.id,
    shoot_id: row.shoot_id,
    performer_name: row.performer_name,
    performer_email: row.performer_email,
    agent_email: row.agent_email,
    union_status: row.union_status,
    replica_type: row.replica_type,
    permitted_media: row.permitted_media,
    geographic_territory: row.geographic_territory,
    intended_use_description: row.intended_use_description,
    exclusionary_clauses: row.exclusionary_clauses,
    advance_notice_given_at: row.advance_notice_given_at,
    starts_at: row.starts_at,
    expires_at: row.expires_at,
    base_scale_rate_cents: row.base_scale_rate_cents,
    replica_multiplier: row.replica_multiplier,
    total_session_fee_cents: row.total_session_fee_cents,
    pension_health_cents: row.pension_health_cents,
    compensation_status: row.compensation_status,
    status: row.status,
    typed_name: row.typed_name,
    signed_at: row.signed_at,
    signed_pdf_ref: row.signed_pdf_ref,
    notice_token: row.notice_token,
  };
}

async function audit(contractId, eventType, actorId, ip, userAgent, payload) {
  await query(
    `INSERT INTO contract_audit_events (id, contract_id, event_type, actor_id, ip_address, user_agent, payload)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [`audit-${crypto.randomUUID()}`, contractId, eventType, actorId || null, ip || null, userAgent || null, payload || {}],
  );
}

async function findContract(id) {
  const result = await query('SELECT * FROM digital_replica_contracts WHERE id = $1', [id]);
  return result.rows[0] || null;
}

async function findByToken(token) {
  const result = await query('SELECT * FROM digital_replica_contracts WHERE notice_token = $1', [token]);
  return result.rows[0] || null;
}

async function listContracts(workspaceId, shootId) {
  const params = [workspaceId];
  let sql = 'SELECT * FROM digital_replica_contracts WHERE workspace_id = $1';
  if (shootId) {
    params.push(String(shootId));
    sql += ` AND shoot_id = $${params.length}`;
  }
  const result = await query(`${sql} ORDER BY created_at DESC`, params);
  return result.rows.map(publicRider);
}

async function draftContract(input, actorId) {
  const name = String(input.performer_name || '').trim();
  const email = String(input.performer_email || '').trim().toLowerCase();
  const use = String(input.intended_use_description || '').trim();
  const startsAt = String(input.starts_at || '').slice(0, 10);
  if (!input.workspace_id || !input.shoot_id) fail(400, 'workspace_id and shoot_id are required');
  if (name.length < 2) fail(400, 'performer_name is required');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail(400, 'performer_email is invalid');
  if (!UNIONS.includes(input.union_status || 'SAG-AFTRA')) fail(400, 'union_status is invalid');
  if (!REPLICA.includes(input.replica_type)) fail(400, 'replica_type is invalid');
  if (use.length < 40) fail(400, 'AB 2602 needs a specific intended use, at least 40 characters');
  if (VAGUE.test(use)) fail(400, 'Intended use is too vague for AB 2602. Name the commercial, the media, and what the replica does.');
  const media = asList(input.permitted_media, MEDIA, 'permitted_media');
  const territory = Array.isArray(input.geographic_territory)
    ? input.geographic_territory.map((item) => String(item).trim()).filter(Boolean)
    : String(input.geographic_territory || '').split(',').map((item) => item.trim()).filter(Boolean);
  if (!territory.length) fail(400, 'geographic_territory is required');
  const exclusions = asList(input.exclusionary_clauses, EXCLUSIONS, 'exclusionary_clauses');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOnly(startsAt))) fail(400, 'starts_at must be YYYY-MM-DD');
  let expiresAt = input.expires_at ? String(input.expires_at).slice(0, 10) : '';
  if (!expiresAt && input.duration_months) expiresAt = addMonths(startsAt, input.duration_months);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(expiresAt)) fail(400, 'AI replica riders need an expires_at or duration_months sunset');
  if (dayMs(expiresAt) <= dayMs(startsAt)) fail(400, 'expires_at must be after starts_at');
  if (!noticeFits(startsAt)) fail(422, 'Shoot start has to be at least 48 hours out so statutory advance notice can be given');
  const base = Number(input.base_scale_rate_cents);
  if (!Number.isInteger(base) || base <= 0) fail(400, 'base_scale_rate_cents must be a positive integer');

  const shoot = await query('SELECT id FROM projects WHERE id = $1 AND workspace_id = $2', [String(input.shoot_id), input.workspace_id]);
  if (!shoot.rows[0]) fail(404, 'Shoot not found in this workspace');

  const fees = calcFees(base);
  const id = `rider-${crypto.randomUUID()}`;
  const unionStatus = input.union_status || 'SAG-AFTRA';
  const result = await query(
    `INSERT INTO digital_replica_contracts
      (id, workspace_id, shoot_id, performer_id, performer_name, performer_email, agent_email,
       union_status, replica_type, permitted_media, geographic_territory, intended_use_description,
       exclusionary_clauses, starts_at, expires_at, base_scale_rate_cents, replica_multiplier,
       total_session_fee_cents, pension_health_cents)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
     RETURNING *`,
    [
      id, input.workspace_id, String(input.shoot_id), input.performer_id || null,
      name, email, input.agent_email ? String(input.agent_email).trim().toLowerCase() : null,
      unionStatus, input.replica_type, media, territory, use, exclusions,
      startsAt, expiresAt, base, fees.multiplier, fees.total, fees.pension,
    ],
  );
  await audit(id, 'DRAFT', actorId, null, null, { fees });
  return publicRider(result.rows[0]);
}

async function sendNotice(id, workspaceId, actorId) {
  const row = await findContract(id);
  if (!row || row.workspace_id !== workspaceId) fail(404, 'Contract not found');
  if (row.status === 'SIGNED') fail(409, 'This rider is already signed');
  if (!noticeFits(row.starts_at)) {
    fail(422, 'Advance notice is late. The shoot starts inside the 48-hour statutory window.');
  }
  if (row.status === 'NOTICE_SENT' && row.notice_token) return publicRider(row);

  const token = crypto.randomBytes(24).toString('hex');
  const result = await query(
    `UPDATE digital_replica_contracts
     SET status = 'NOTICE_SENT', notice_token = $2, advance_notice_given_at = NOW(), updated_at = NOW()
     WHERE id = $1 RETURNING *`,
    [id, token],
  );
  await audit(id, 'NOTICE_SENT', actorId, null, null, { token });
  return publicRider(result.rows[0]);
}

async function signRow(row, { typedName, signatureSvg, ip, userAgent, actorId }) {
  if (!row) fail(404, 'Contract not found');
  if (row.status !== 'NOTICE_SENT') fail(409, 'Send the 48-hour notice before this rider can be signed');
  const name = String(typedName || '').trim();
  if (name.length < 3) fail(400, 'Type your full legal name');
  const signedAt = new Date().toISOString();
  const signatureHash = crypto.createHash('sha256').update(JSON.stringify({
    contractId: row.id,
    typedName: name,
    signedAt,
    ip: ip || '',
    userAgent: userAgent || '',
  })).digest('hex');
  const pdf = buildRiderPdf({
    ...row,
    typed_name: name,
    signed_at: signedAt,
    performer_signature_hash: signatureHash,
    signer_ip: ip || '',
  });
  const key = `contracts/${row.workspace_id}/${row.id}.pdf`;
  const uploaded = await storage.uploadArtifact({
    folder: 'contracts',
    key,
    body: pdf,
    contentType: 'application/pdf',
  });
  if (!uploaded?.key) fail(503, 'Contract PDF storage is not configured');

  const result = await query(
    `UPDATE digital_replica_contracts
     SET status = 'SIGNED', typed_name = $2, performer_signature_hash = $3, signed_pdf_ref = $4,
         signer_ip = $5, signer_user_agent = $6, signed_at = $7, updated_at = NOW()
     WHERE id = $1 RETURNING *`,
    [row.id, name, signatureHash, uploaded.key, ip || null, userAgent || null, signedAt],
  );
  await audit(row.id, 'SIGNED', actorId, ip, userAgent, {
    signatureHash,
    pdfKey: uploaded.key,
    pdfBytes: pdf.length,
    hasSvg: Boolean(signatureSvg),
  });
  return publicRider(result.rows[0]);
}

async function signContract(id, workspaceId, signature) {
  const row = await findContract(id);
  if (!row || row.workspace_id !== workspaceId) fail(404, 'Contract not found');
  return signRow(row, signature);
}

async function reviewByToken(token) {
  const row = await findByToken(token);
  if (!row) fail(404, 'This review link is not valid');
  const view = publicRider(row);
  delete view.notice_token;
  delete view.signed_pdf_ref;
  return view;
}

async function signByToken(token, signature) {
  const row = await findByToken(token);
  if (!row) fail(404, 'This review link is not valid');
  const signed = await signRow(row, signature);
  delete signed.notice_token;
  return signed;
}

function setStorageForTests(overrides) {
  storage = { ...storage, ...overrides };
}

module.exports = {
  MEDIA,
  EXCLUSIONS,
  calcFees,
  draftContract,
  sendNotice,
  signContract,
  reviewByToken,
  signByToken,
  listContracts,
  setStorageForTests,
};
