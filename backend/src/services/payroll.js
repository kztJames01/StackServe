const crypto = require('crypto');
const { query } = require('../db/pool');
const { uploadArtifact } = require('./storage');

function fail(status, message) {
  const err = new Error(message);
  err.status = status;
  throw err;
}

function csvEscape(value) {
  const s = String(value ?? '');
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function inWindow(rider, now = new Date()) {
  return new Date(rider.starts_at) <= now && new Date(rider.expires_at) >= now;
}

async function loadSignedRiders(workspaceId, shootId) {
  const shoot = await query(
    'SELECT id, title, status, workspace_id FROM projects WHERE id = $1',
    [shootId],
  );
  if (!shoot.rows[0] || shoot.rows[0].workspace_id !== workspaceId) {
    fail(404, 'Shoot not found in this workspace');
  }

  const riders = await query(
    'SELECT * FROM digital_replica_contracts WHERE workspace_id = $1 AND shoot_id = $2',
    [workspaceId, shootId],
  );
  const unsigned = riders.rows.filter((r) => r.status !== 'SIGNED');
  if (shoot.rows[0].status === 'delivered' && unsigned.length > 0) {
    fail(409, 'Cannot export payroll while a delivered shoot has unsigned riders');
  }

  const signed = riders.rows.filter((r) => r.status === 'SIGNED' && inWindow(r));
  if (signed.length === 0) {
    fail(409, 'No signed in-window riders to export');
  }
  return { shoot: shoot.rows[0], signed };
}

function buildWrapbookCsv(riders) {
  const header = [
    'performer_name', 'performer_email', 'union_status', 'replica_type',
    'session_fee_cents', 'pension_health_cents', 'contract_id',
  ];
  const lines = [header.join(',')];
  for (const r of riders) {
    lines.push([
      csvEscape(r.performer_name),
      csvEscape(r.performer_email),
      csvEscape(r.union_status),
      csvEscape(r.replica_type),
      Number(r.total_session_fee_cents || 0),
      Number(r.pension_health_cents || 0),
      csvEscape(r.id),
    ].join(','));
  }
  return lines.join('\n') + '\n';
}

function buildGreenslateJson(shoot, riders) {
  const session = riders.reduce((s, r) => s + Number(r.total_session_fee_cents || 0), 0);
  const ph = riders.reduce((s, r) => s + Number(r.pension_health_cents || 0), 0);
  return {
    shoot_id: shoot.id,
    shoot_title: shoot.title,
    performer_count: riders.length,
    total_session_fees_cents: session,
    total_pension_health_cents: ph,
    performers: riders.map((r) => ({
      name: r.performer_name,
      email: r.performer_email,
      union_status: r.union_status,
      replica_type: r.replica_type,
      session_fee_cents: Number(r.total_session_fee_cents || 0),
      pension_health_cents: Number(r.pension_health_cents || 0),
      contract_id: r.id,
    })),
  };
}

async function exportBatch({ workspaceId, shootId, format, createdBy }) {
  if (!['WRAPBOOK_CSV', 'GREENSLATE_JSON'].includes(format)) {
    fail(400, 'format must be WRAPBOOK_CSV or GREENSLATE_JSON');
  }
  const { shoot, signed } = await loadSignedRiders(workspaceId, shootId);
  const session = signed.reduce((s, r) => s + Number(r.total_session_fee_cents || 0), 0);
  const ph = signed.reduce((s, r) => s + Number(r.pension_health_cents || 0), 0);

  let body;
  let contentType;
  let filename;
  if (format === 'WRAPBOOK_CSV') {
    body = buildWrapbookCsv(signed);
    contentType = 'text/csv';
    filename = `wrapbook-${shootId}.csv`;
  } else {
    body = JSON.stringify(buildGreenslateJson(shoot, signed), null, 2);
    contentType = 'application/json';
    filename = `greenslate-${shootId}.json`;
  }

  const id = crypto.randomUUID();
  const key = `payroll/${workspaceId}/${id}-${filename}`;
  let stored = null;
  try {
    stored = await uploadArtifact({ folder: 'payroll', key, body, contentType });
  } catch {
    stored = null;
  }

  const row = await query(
    `INSERT INTO payroll_batches
       (id, workspace_id, shoot_id, export_format, total_session_fees_cents,
        total_pension_health_cents, performer_count, b2_export_key, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     RETURNING *`,
    [id, workspaceId, shootId, format, session, ph, signed.length, stored?.key || null, createdBy],
  );

  return {
    batch: row.rows[0],
    filename,
    contentType,
    body,
  };
}

module.exports = {
  exportBatch,
  buildWrapbookCsv,
  buildGreenslateJson,
  inWindow,
};
