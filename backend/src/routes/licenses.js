const { Router } = require('express');
const { query } = require('../db/pool');
const { upsertEntity, getEntityById } = require('../db/repository');
const { requireAuth } = require('../middleware/validate');
const { getUserId } = require('../middleware/authUser');
const { uploadArtifact } = require('../services/storage');
const { requirePlan } = require('../middleware/tiers');
const { getMemberRole } = require('../services/workspace');

const router = Router();

const STATUSES = ['draft', 'sent', 'signed', 'expired', 'disputed'];
// allowed forward transitions, signing only happens through the sign endpoint
const NEXT = {
  draft: ['sent'],
  sent: ['signed', 'disputed'],
  signed: ['disputed', 'expired'],
  expired: [],
  disputed: ['draft'],
};

async function getLicense(id) {
  const result = await query('SELECT * FROM licenses WHERE id = $1', [id]);
  return result.rows[0] || null;
}

// caller must own the shoot (or be a collaborator on it)
async function getShootForWorkspace(shootId, workspaceId) {
  const project = await getEntityById('projects', shootId);
  return project?.workspaceId === workspaceId ? project : null;
}

function toCsv(rows) {
  const header = 'id,shoot_id,freelancer_id,media_ref,usage_type,territories,starts_at,expires_at,fee_cents,status,signed_name,signed_at';
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines = rows.map((r) => [
    r.id, r.shoot_id, r.freelancer_id, r.media_ref,
    (r.usage_type || []).join('|'), (r.territories || []).join('|'),
    r.starts_at, r.expires_at, r.fee_cents, r.status, r.signed_name, r.signed_at,
  ].map(esc).join(','));
  return [header, ...lines].join('\n');
}

// hand-rolled one page PDF, good enough for the MVP stamp
function buildLicensePdf(license, signedName) {
  const esc = (s) => String(s).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
  const lines = [
    'SynthPass Performer Usage Record',
    `License: ${license.id}`,
    `Shoot: ${license.shoot_id}`,
    `Freelancer: ${license.freelancer_id}`,
    `Media: ${license.media_ref}`,
    `Usage: ${(license.usage_type || []).join(', ')}`,
    `Territories: ${(license.territories || []).join(', ')}`,
    `Starts: ${license.starts_at}  Expires: ${license.expires_at || 'perpetual'}`,
    `Fee (cents): ${license.fee_cents ?? 0}`,
    '',
    `Signed by: ${signedName}`,
    `Signed at: ${new Date().toISOString()}`,
  ];
  const content = lines
    .map((line, i) => `BT /F1 12 Tf 50 ${750 - i * 20} Td (${esc(line)}) Tj ET`)
    .join('\n');
  const objects = [];
  objects[0] = '<< /Type /Catalog /Pages 2 0 R >>';
  objects[1] = '<< /Type /Pages /Kids [3 0 R] /Count 1 >>';
  objects[2] = '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>';
  objects[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>';
  objects[4] = `<< /Length ${content.length} >>\nstream\n${content}\nendstream`;
  let pdf = '%PDF-1.4\n';
  const offsets = [];
  objects.forEach((body, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.forEach((off) => { pdf += `${String(off).padStart(10, '0')} 00000 n \n`; });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(pdf, 'utf8');
}

// only ever returns the caller's own workspace licenses
router.get('/licenses', async (req, res) => {
  const userId = getUserId(req);
  if (!req.user || !userId) return res.status(401).json({ message: 'Authentication required' });
  const { shootId, workspaceId } = req.query;
  if (!workspaceId) return res.status(400).json({ message: 'workspaceId is required' });
  if (!await getMemberRole(workspaceId, userId)) return res.status(403).json({ message: 'Not a workspace member' });
  const params = [workspaceId];
  let sql = 'SELECT * FROM licenses WHERE workspace_id = $1';
  if (shootId) {
    params.push(String(shootId));
    sql += ` AND shoot_id = $${params.length}`;
  }
  sql += ' ORDER BY created_at DESC';

  const result = await query(sql, params);
  res.json(result.rows);
});

router.post('/licenses', requireAuth, async (req, res) => {
  const userId = getUserId(req);
  const {
    workspaceId, shootId, freelancerId, mediaRef, usageType, territories,
    durationMonths, startsAt, feeCents,
  } = req.body || {};

  if (!workspaceId || !shootId || !freelancerId || !startsAt) {
    return res.status(400).json({ message: 'workspaceId, shootId, freelancerId and startsAt are required' });
  }

  const memberRole = await getMemberRole(workspaceId, userId);
  if (!['admin', 'producer', 'clearance_counsel'].includes(memberRole)) {
    return res.status(403).json({ message: 'Workspace clearance role required' });
  }
  const shoot = await getShootForWorkspace(String(shootId), workspaceId);
  if (!shoot) return res.status(404).json({ message: 'Shoot not found' });

  const id = `lic-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const months = durationMonths ? parseInt(durationMonths) : null;
  // expires = start + duration, null means perpetual
  const expiresAt = months
    ? new Date(new Date(startsAt).setMonth(new Date(startsAt).getMonth() + months)).toISOString().slice(0, 10)
    : null;

  const result = await query(
    `INSERT INTO licenses (id, workspace_id, shoot_id, freelancer_id, media_ref, usage_type, territories, duration_months, starts_at, expires_at, fee_cents, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'draft') RETURNING *`,
    [
      id, workspaceId, String(shootId), String(freelancerId),
      mediaRef || 'untagged', usageType?.length ? usageType : ['web'],
      territories?.length ? territories : ['worldwide'], months, startsAt, expiresAt,
      feeCents != null ? parseInt(feeCents) : null,
    ],
  );
  return res.status(201).json({ data: result.rows[0], message: 'License draft created' });
});

router.patch('/licenses/:id', requireAuth, async (req, res) => {
  const userId = getUserId(req);
  const license = await getLicense(req.params.id);
  // 404 instead of 403 so ids cant be enumerated
  if (!license || !['admin', 'producer', 'clearance_counsel'].includes(await getMemberRole(license.workspace_id, userId))) {
    return res.status(404).json({ message: 'License not found' });
  }

  const { status, feeCents, usageType, territories, durationMonths, mediaRef } = req.body || {};

  if (status) {
    if (!STATUSES.includes(status)) return res.status(400).json({ message: 'Invalid status' });
    if (status === 'signed') return res.status(400).json({ message: 'Use the sign endpoint to sign' });
    if (!NEXT[license.status].includes(status)) {
      return res.status(400).json({ message: `Cant go from ${license.status} to ${status}` });
    }
  } else if (license.status !== 'draft') {
    // only drafts can be edited
    return res.status(400).json({ message: 'Only draft licenses can be edited' });
  }

  const months = durationMonths !== undefined ? (durationMonths ? parseInt(durationMonths) : null) : license.duration_months;
  const expiresAt = months
    ? new Date(new Date(license.starts_at).setMonth(new Date(license.starts_at).getMonth() + months)).toISOString().slice(0, 10)
    : (durationMonths === null ? null : license.expires_at);

  const result = await query(
    `UPDATE licenses SET status = $2, fee_cents = $3, usage_type = $4, territories = $5, duration_months = $6, expires_at = $7, media_ref = $8, updated_at = NOW()
     WHERE id = $1 RETURNING *`,
    [
      req.params.id,
      status || license.status,
      feeCents !== undefined ? (feeCents != null ? parseInt(feeCents) : null) : license.fee_cents,
      usageType || license.usage_type,
      territories || license.territories,
      months,
      expiresAt,
      mediaRef || license.media_ref,
    ],
  );
  return res.json({ data: result.rows[0], message: 'License updated' });
});

// typed-name e-sign, freelancer or workspace owner only
router.post('/licenses/:id/sign', requireAuth, async (req, res) => {
  const userId = getUserId(req);
  const { typedName } = req.body || {};
  if (!typedName || !typedName.trim()) {
    return res.status(400).json({ message: 'typedName is required' });
  }

  const license = await getLicense(req.params.id);
  if (!license) return res.status(404).json({ message: 'License not found' });
  const isOwner = ['admin', 'producer', 'clearance_counsel'].includes(await getMemberRole(license.workspace_id, userId));
  const isFreelancer = license.freelancer_id === userId;
  if (!isOwner && !isFreelancer) {
    return res.status(404).json({ message: 'License not found' });
  }
  // has to be sent to the freelancer first
  if (license.status !== 'sent') {
    return res.status(400).json({ message: `Cant sign a license in ${license.status} state` });
  }

  // stamp a pdf and push it to b2, fall back to a local ref if storage isnt set up
  const pdf = buildLicensePdf(license, typedName.trim());
  let pdfRef = `licenses/local/${license.id}.pdf`;
  try {
    const uploaded = await uploadArtifact({
      folder: 'licenses',
      key: `licenses/${license.workspace_id}/${license.id}.pdf`,
      body: pdf,
      contentType: 'application/pdf',
    });
    if (uploaded) pdfRef = uploaded.key;
  } catch (err) {
    console.error('license pdf upload failed, keeping local ref', err.message);
  }

  const result = await query(
    `UPDATE licenses SET status = 'signed', signed_name = $2, signed_by = $3, signed_at = NOW(), signed_pdf_ref = $4, updated_at = NOW()
     WHERE id = $1 RETURNING *`,
    [req.params.id, typedName.trim(), userId, pdfRef],
  );
  const signed = result.rows[0];

  // archive it in past shoots
  await upsertEntity('history', {
    id: `hist-lic-${license.id}`,
    userId: license.workspace_id,
    projectId: license.shoot_id,
    title: `License signed by ${typedName.trim()}`,
    description: `Usage rights for ${license.media_ref} on shoot ${license.shoot_id}`,
    type: 'license',
    date: new Date().toISOString(),
  });

  return res.json({ data: signed, message: 'License signed' });
});

// audit export, studio tier only, caller's own workspace
router.get('/licenses/export', requireAuth, requirePlan('studio'), async (req, res) => {
  const userId = getUserId(req);
  const { shootId, workspaceId } = req.query;
  if (!workspaceId) return res.status(400).json({ message: 'workspaceId is required' });
  if (!await getMemberRole(workspaceId, userId)) return res.status(403).json({ message: 'Not a workspace member' });

  const params = [workspaceId];
  let sql = 'SELECT * FROM licenses WHERE workspace_id = $1';
  if (shootId) {
    const shoot = await getShootForWorkspace(String(shootId), workspaceId);
    if (!shoot) return res.status(404).json({ message: 'Shoot not found' });
    params.push(String(shootId));
    sql += ` AND shoot_id = $${params.length}`;
  }
  sql += ' ORDER BY created_at DESC';
  const result = await query(sql, params);

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="licenses${shootId ? `-${shootId}` : ''}.csv"`);
  res.send(toCsv(result.rows));
});

router.delete('/licenses/:id', requireAuth, async (req, res) => {
  const userId = getUserId(req);
  const license = await getLicense(req.params.id);
  if (!license || !['admin', 'producer', 'clearance_counsel'].includes(await getMemberRole(license.workspace_id, userId))) {
    return res.status(404).json({ message: 'License not found' });
  }
  await query('DELETE FROM licenses WHERE id = $1', [req.params.id]);
  return res.json({ message: 'License deleted' });
});

module.exports = { licensesRouter: router, licensesCsv: toCsv };
