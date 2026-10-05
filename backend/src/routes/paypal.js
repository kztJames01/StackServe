const { Router } = require('express');
const { requireAuth } = require('../middleware/validate');
const { getUserId } = require('../middleware/authUser');
const { getMemberRole } = require('../services/workspace');
const { query } = require('../db/pool');
const paypal = require('../services/paypal');

const router = Router();
const route = (fn) => (req, res, next) => Promise.resolve(fn(req, res)).catch(next);

const WRITERS = ['admin', 'producer'];

function getAppUrl(req) {
  return process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
}

async function requireWriter(workspaceId, userId) {
  const role = await getMemberRole(workspaceId, userId);
  if (!role) {
    const err = new Error('Not a workspace member');
    err.status = 403;
    throw err;
  }
  if (!WRITERS.includes(role)) {
    const err = new Error('Admin or producer role required');
    err.status = 403;
    throw err;
  }
  return role;
}

router.post('/v1/paypal/subscribe', requireAuth, route(async (req, res) => {
  const userId = getUserId(req);
  const workspaceId = req.body?.workspace_id;
  if (!workspaceId) return res.status(400).json({ message: 'workspace_id is required' });
  await requireWriter(workspaceId, userId);

  const appUrl = getAppUrl(req);
  const created = await paypal.createSubscription({
    workspaceId,
    returnUrl: `${appUrl}/billing?paypal=success`,
    cancelUrl: `${appUrl}/billing?paypal=cancelled`,
  });

  await query(
    `INSERT INTO paypal_subscriptions (id, workspace_id, paypal_subscription_id, paypal_plan_id, status, created_by)
     VALUES ($1,$2,$3,$4,$5,$6)
     ON CONFLICT (paypal_subscription_id) DO UPDATE SET status = EXCLUDED.status, updated_at = NOW()`,
    [paypal.newId(), workspaceId, created.subscriptionId, created.planId, created.status, userId],
  );

  res.status(201).json({
    url: created.approveUrl,
    subscription_id: created.subscriptionId,
    status: created.status,
  });
}));

router.get('/v1/paypal/invoices', requireAuth, route(async (req, res) => {
  const userId = getUserId(req);
  const workspaceId = String(req.query.workspaceId || '');
  if (!workspaceId) return res.status(400).json({ message: 'workspaceId is required' });
  if (!await getMemberRole(workspaceId, userId)) return res.status(403).json({ message: 'Not a workspace member' });
  const rows = await query(
    'SELECT * FROM paypal_invoices WHERE workspace_id = $1 ORDER BY created_at DESC',
    [workspaceId],
  );
  res.json(rows.rows);
}));

router.post('/v1/workspaces/:id/invoices', requireAuth, route(async (req, res) => {
  const userId = getUserId(req);
  const workspaceId = req.params.id;
  await requireWriter(workspaceId, userId);
  const shootId = req.body?.shoot_id;
  if (!shootId) return res.status(400).json({ message: 'shoot_id is required' });

  const riders = await query(
    `SELECT * FROM digital_replica_contracts
     WHERE workspace_id = $1 AND shoot_id = $2 AND status = 'SIGNED'`,
    [workspaceId, shootId],
  );
  if (riders.rows.length === 0) {
    return res.status(409).json({ message: 'No signed riders on this shoot to invoice' });
  }

  const ws = await query('SELECT name FROM agency_workspaces WHERE id = $1', [workspaceId]);
  const recipient = req.body?.recipient_email || req.user?.email;
  if (!recipient) return res.status(400).json({ message: 'recipient_email is required' });

  const invoiceNumber = `SP-${shootId.slice(0, 8)}-${Date.now()}`;
  const sent = await paypal.createAndSendInvoice({
    workspaceName: ws.rows[0]?.name || 'Workspace',
    recipientEmail: recipient,
    riders: riders.rows,
    invoiceNumber,
  });

  const row = await query(
    `INSERT INTO paypal_invoices
       (id, workspace_id, shoot_id, paypal_invoice_id, recipient_email, status, total_cents, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     RETURNING *`,
    [paypal.newId(), workspaceId, shootId, sent.invoiceId, recipient, sent.status, sent.totalCents, userId],
  );
  res.status(201).json({ data: row.rows[0], message: 'Invoice sent' });
}));

router.get('/v1/paypal/disputes', requireAuth, route(async (req, res) => {
  const userId = getUserId(req);
  const workspaceId = String(req.query.workspaceId || '');
  if (!workspaceId) return res.status(400).json({ message: 'workspaceId is required' });
  if (!await getMemberRole(workspaceId, userId)) return res.status(403).json({ message: 'Not a workspace member' });

  const remote = await paypal.listDisputes();
  for (const item of remote) {
    const amount = item.dispute_amount?.value
      ? Math.round(Number(item.dispute_amount.value) * 100)
      : null;
    await query(
      `INSERT INTO paypal_disputes (id, workspace_id, paypal_dispute_id, reason, status, amount_cents)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (paypal_dispute_id) DO UPDATE SET
         status = EXCLUDED.status, reason = EXCLUDED.reason, amount_cents = EXCLUDED.amount_cents, updated_at = NOW()`,
      [paypal.newId(), workspaceId, item.dispute_id, item.reason || null, item.status || null, amount],
    );
  }

  const rows = await query(
    'SELECT * FROM paypal_disputes WHERE workspace_id = $1 ORDER BY updated_at DESC',
    [workspaceId],
  );
  res.json(rows.rows);
}));

router.post('/v1/paypal/disputes/:id/note', requireAuth, route(async (req, res) => {
  const userId = getUserId(req);
  const note = String(req.body?.note || '').trim();
  if (!note) return res.status(400).json({ message: 'note is required' });

  const found = await query('SELECT * FROM paypal_disputes WHERE id = $1 OR paypal_dispute_id = $1', [req.params.id]);
  const row = found.rows[0];
  if (!row) return res.status(404).json({ message: 'Dispute not found' });
  await requireWriter(row.workspace_id, userId);

  await paypal.sendDisputeNote(row.paypal_dispute_id, note);
  await query(
    'UPDATE paypal_disputes SET last_note = $2, updated_at = NOW() WHERE id = $1',
    [row.id, note],
  );
  res.json({ message: 'Note sent', dispute_id: row.paypal_dispute_id });
}));

async function paypalWebhookHandler(req, res) {
  let event = req.body;
  if (Buffer.isBuffer(event)) {
    try { event = JSON.parse(event.toString('utf8')); } catch {
      return res.status(400).json({ message: 'Invalid webhook payload' });
    }
  }
  try {
    const ok = await paypal.verifyWebhookSignature(req.headers, event);
    if (!ok) return res.status(400).json({ message: 'PayPal webhook signature rejected' });
  } catch (err) {
    return res.status(err.status || 400).json({ message: err.message });
  }

  const resource = event.resource || {};
  const eventType = event.event_type || '';
  if (eventType.startsWith('BILLING.SUBSCRIPTION.') && resource.id) {
    const status = resource.status || eventType.split('.').pop();
    await query(
      `UPDATE paypal_subscriptions SET status = $2, updated_at = NOW()
       WHERE paypal_subscription_id = $1`,
      [resource.id, status],
    );
  }
  if (eventType.startsWith('CUSTOMER.DISPUTE.') && resource.dispute_id) {
    const amount = resource.dispute_amount?.value
      ? Math.round(Number(resource.dispute_amount.value) * 100)
      : null;
    await query(
      `UPDATE paypal_disputes SET status = $2, reason = COALESCE($3, reason), amount_cents = COALESCE($4, amount_cents), updated_at = NOW()
       WHERE paypal_dispute_id = $1`,
      [resource.dispute_id, resource.status || null, resource.reason || null, amount],
    );
  }
  return res.json({ received: true });
}

module.exports = { paypalRouter: router, paypalWebhookHandler };
