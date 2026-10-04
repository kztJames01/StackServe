const { Router } = require('express');
const { query } = require('../db/pool');
const { listEntities, upsertEntity } = require('../db/repository');
const { requireAuth } = require('../middleware/validate');
const { getUserId } = require('../middleware/authUser');

const router = Router();

async function notify(userId, id, type, message, actionUrl) {
  // deterministic id so we dont spam duplicates on every dashboard load
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

// runs the rules engine on load, no cron needed for mvp
router.get('/compliance', requireAuth, async (req, res) => {
  const userId = getUserId(req);

  // tenant boundary = the caller's own rows only
  const [shoots, availability, licenses] = await Promise.all([
    listEntities('projects', { paginate: false, filter: (p) => p.ownerId === userId }),
    listEntities('availability', { paginate: false, filter: (row) => row.userId === userId }),
    query('SELECT * FROM licenses WHERE workspace_id = $1', [userId]).then((r) => r.rows),
  ]);

  const red = [];
  const amber = [];
  const yellow = [];

  const licensesByShoot = {};
  for (const lic of licenses) {
    if (!licensesByShoot[lic.shoot_id]) licensesByShoot[lic.shoot_id] = [];
    licensesByShoot[lic.shoot_id].push(lic);
  }

  // red: delivered shoot with assets missing a signed license
  for (const shoot of shoots) {
    if (shoot.status !== 'delivered') continue;
    const shootLicenses = licensesByShoot[String(shoot.id)] || [];
    const unsigned = shootLicenses.filter((l) => l.status !== 'signed');
    if (shootLicenses.length === 0) {
      red.push({ shootId: String(shoot.id), title: shoot.title, reason: 'Delivered with no licenses at all' });
    } else if (unsigned.length > 0) {
      red.push({
        shootId: String(shoot.id),
        title: shoot.title,
        reason: `${unsigned.length} asset(s) without a signed license`,
        licenseIds: unsigned.map((l) => l.id),
      });
    }
  }

  // amber: signed license expiring within 30 days
  const soon = new Date();
  soon.setDate(soon.getDate() + 30);
  for (const lic of licenses) {
    if (lic.status !== 'signed' || !lic.expires_at) continue;
    const expiry = new Date(lic.expires_at);
    if (expiry <= soon) {
      amber.push({
        licenseId: lic.id,
        shootId: lic.shoot_id,
        freelancerId: lic.freelancer_id,
        expiresAt: lic.expires_at,
        reason: `Signed license expires ${String(lic.expires_at).slice(0, 10)}`,
      });
    }
  }

  // yellow: crew on a call sheet (availability hold/booked) with no license row for that shoot
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

  // fire notifications for the stuff that needs attention
  await Promise.all([
    ...red.map((item) => notify(userId, `notif-red-${item.shootId}`, 'compliance', `RED: ${item.title} — ${item.reason}`)),
    ...amber.map((item) => notify(userId, `notif-amber-${item.licenseId}`, 'compliance', `License ${item.licenseId} expiring soon (${String(item.expiresAt).slice(0, 10)})`)),
    ...yellow.map((item) => notify(userId, `notif-yellow-${item.shootId}-${item.freelancerId}`, 'compliance', `Crew member ${item.freelancerId} on "${item.title}" has no license`)),
  ]);

  res.json({
    red,
    amber,
    yellow,
    green: red.length === 0 && amber.length === 0 && yellow.length === 0,
    counts: { red: red.length, amber: amber.length, yellow: yellow.length },
  });
});

module.exports = router;
