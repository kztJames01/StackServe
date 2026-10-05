const { query } = require('../db/pool');
const { listEntities, upsertEntity } = require('../db/repository');
const { listMembers } = require('./workspace');

async function notify(userId, id, type, message, actionUrl) {
  await upsertEntity('notifications', {
    id,
    userId,
    type,
    message,
    read: false,
    actionUrl: actionUrl || '/compliance',
    createdAt: new Date().toISOString(),
  });
}

async function evaluateCompliance(workspaceId, userId) {
  const memberIds = new Set((await listMembers(workspaceId)).map((m) => m.user_id));
  const [shoots, availability, licenses, riders] = await Promise.all([
    listEntities('projects', { paginate: false, filter: (shoot) => shoot.workspaceId === workspaceId }),
    listEntities('availability', { paginate: false, filter: (row) => memberIds.has(String(row.freelancerId)) }),
    query('SELECT * FROM licenses WHERE workspace_id = $1', [workspaceId]).then((r) => r.rows),
    query('SELECT * FROM digital_replica_contracts WHERE workspace_id = $1', [workspaceId]).then((r) => r.rows),
  ]);

  const red = [];
  const amber = [];
  const yellow = [];

  const licensesByShoot = {};
  for (const lic of licenses) {
    if (!licensesByShoot[lic.shoot_id]) licensesByShoot[lic.shoot_id] = [];
    licensesByShoot[lic.shoot_id].push(lic);
  }
  const ridersByShoot = {};
  for (const rider of riders) {
    if (!ridersByShoot[rider.shoot_id]) ridersByShoot[rider.shoot_id] = [];
    ridersByShoot[rider.shoot_id].push(rider);
  }

  for (const shoot of shoots) {
    if (shoot.status !== 'delivered') continue;
    const shootLicenses = licensesByShoot[String(shoot.id)] || [];
    const unsignedLic = shootLicenses.filter((l) => l.status !== 'signed');
    if (shootLicenses.length === 0) {
      red.push({ shootId: String(shoot.id), title: shoot.title, reason: 'Delivered with no licenses at all' });
    } else if (unsignedLic.length > 0) {
      red.push({
        shootId: String(shoot.id),
        title: shoot.title,
        reason: `${unsignedLic.length} asset(s) without a signed license`,
        licenseIds: unsignedLic.map((l) => l.id),
      });
    }

    const shootRiders = ridersByShoot[String(shoot.id)] || [];
    const unsignedRiders = shootRiders.filter((r) => r.status !== 'SIGNED');
    if (shootRiders.length === 0) {
      red.push({ shootId: String(shoot.id), title: shoot.title, reason: 'Delivered without a digital replica rider' });
    } else if (unsignedRiders.length > 0) {
      red.push({
        shootId: String(shoot.id),
        title: shoot.title,
        reason: `${unsignedRiders.length} digital replica rider(s) not signed`,
      });
    }
  }

  const soon = new Date();
  soon.setDate(soon.getDate() + 30);
  for (const lic of licenses) {
    if (lic.status !== 'signed' || !lic.expires_at) continue;
    if (new Date(lic.expires_at) <= soon) {
      amber.push({
        licenseId: lic.id,
        shootId: lic.shoot_id,
        freelancerId: lic.freelancer_id,
        expiresAt: lic.expires_at,
        reason: `Signed license expires ${String(lic.expires_at).slice(0, 10)}`,
      });
    }
  }
  for (const rider of riders) {
    if (rider.status !== 'SIGNED' || !rider.expires_at) continue;
    if (new Date(rider.expires_at) <= soon) {
      amber.push({
        licenseId: rider.id,
        shootId: rider.shoot_id,
        freelancerId: rider.performer_email,
        expiresAt: rider.expires_at,
        reason: `Digital replica rider expires ${String(rider.expires_at).slice(0, 10)}`,
      });
    }
  }

  const seen = new Set();
  for (const row of availability) {
    if (!row.shootId || !['hold', 'booked'].includes(row.status)) continue;
    const key = `${row.shootId}:${row.freelancerId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const hasLicense = (licensesByShoot[String(row.shootId)] || []).some(
      (l) => l.freelancer_id === String(row.freelancerId),
    );
    if (!hasLicense) {
      const shoot = shoots.find((s) => String(s.id) === String(row.shootId));
      yellow.push({
        shootId: String(row.shootId),
        title: shoot?.title || row.shootId,
        freelancerId: String(row.freelancerId),
        reason: 'Crew on call sheet with no license row',
      });
    }
  }

  const now = Date.now();
  for (const rider of riders) {
    if (rider.status !== 'NOTICE_SENT' || !rider.advance_notice_given_at) continue;
    const readyAt = new Date(rider.advance_notice_given_at).getTime() + (48 * 60 * 60 * 1000);
    if (readyAt > now) {
      const shoot = shoots.find((s) => String(s.id) === String(rider.shoot_id));
      yellow.push({
        shootId: String(rider.shoot_id),
        title: shoot?.title || rider.shoot_id,
        freelancerId: rider.performer_email,
        reason: 'Pending 48-hour statutory advance notice window',
      });
    }
  }

  if (userId) {
    await Promise.all([
      ...red.map((item) => notify(userId, `notif-red-${workspaceId}-${item.shootId}-${item.reason}`.slice(0, 80), 'compliance', `RED: ${item.title} — ${item.reason}`)),
      ...amber.map((item) => notify(userId, `notif-amber-${workspaceId}-${item.licenseId}`, 'compliance', `Clearance ${item.licenseId} expiring soon (${String(item.expiresAt).slice(0, 10)})`)),
      ...yellow.map((item) => notify(userId, `notif-yellow-${workspaceId}-${item.shootId}-${item.freelancerId}`.slice(0, 80), 'compliance', `Performer ${item.freelancerId} on "${item.title}" has no clearance record`)),
    ]);
  }

  return {
    red,
    amber,
    yellow,
    green: red.length === 0 && amber.length === 0 && yellow.length === 0,
    counts: { red: red.length, amber: amber.length, yellow: yellow.length },
  };
}

function emitCompliance(app, workspaceId, report) {
  const io = app?.get?.('io');
  if (!io) return;
  io.to(`workspace:${workspaceId}`).emit('compliance:update', {
    workspaceId,
    counts: report.counts,
    green: report.green,
  });
}

module.exports = { evaluateCompliance, emitCompliance };
