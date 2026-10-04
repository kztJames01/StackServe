const { Router } = require('express');
const { getEntityById, listEntities, upsertEntity } = require('../db/repository');
const { requireAuth } = require('../middleware/validate');
const { getUserId } = require('../middleware/authUser');
const { getStripe } = require('../stripeClient');
const { query } = require('../db/pool');
const { FREE_SEAT_LIMIT } = require('../middleware/tiers');

const router = Router();

function planFromPriceId(priceId) {
  if (priceId && priceId === process.env.STRIPE_STUDIO_PRICE_ID) return 'studio';
  return 'agency';
}

async function getSeats(workspaceId) {
  const result = await query('SELECT * FROM seat_counts WHERE workspace_id = $1', [workspaceId]);
  return result.rows[0]?.seats ?? FREE_SEAT_LIMIT;
}

async function saveSeats(workspaceId, seats, subscriptionId) {
  await query(
    `INSERT INTO seat_counts (workspace_id, seats, stripe_subscription_id, updated_at)
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT (workspace_id) DO UPDATE SET seats = EXCLUDED.seats,
     stripe_subscription_id = COALESCE(EXCLUDED.stripe_subscription_id, seat_counts.stripe_subscription_id),
     updated_at = NOW()`,
    [workspaceId, seats, subscriptionId || null],
  );
}

function getAppUrl(req) {
  return process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
}

function defaultBilling() {
  return {
    plan: 'free',
    subscriptionStatus: 'inactive',
    currentPeriodEnd: null,
    customerId: null,
    subscriptionId: null,
    priceId: null,
  };
}

async function findOrCreateUser(userId, reqUser) {
  let user = await getEntityById('users', userId);
  if (!user) {
    user = {
      id: userId,
      userId,
      name: reqUser?.name || reqUser?.email || userId,
      email: reqUser?.email || null,
      billing: defaultBilling(),
    };
  }
  if (!user.billing) user.billing = defaultBilling();
  if (!user.email && reqUser?.email) user.email = reqUser.email;
  return user;
}

async function getUserByCustomerId(customerId) {
  const users = await listEntities('users', {
    paginate: false,
    filter: (u) => u.stripeCustomerId === customerId || u.billing?.customerId === customerId,
  });
  return users[0] || null;
}

async function saveBillingForUser(userId, billingPatch) {
  const user = await getEntityById('users', userId);
  if (!user) return;
  const nextBilling = {
    ...defaultBilling(),
    ...(user.billing || {}),
    ...billingPatch,
  };
  const nextUser = {
    ...user,
    stripeCustomerId: nextBilling.customerId || user.stripeCustomerId || null,
    billing: nextBilling,
  };
  await upsertEntity('users', nextUser);
  await upsertEntity('billing', {
    id: userId,
    userId,
    ...nextBilling,
    updatedAt: new Date().toISOString(),
  });
}

async function getOrCreateCustomer(stripe, user) {
  if (user.stripeCustomerId) return user.stripeCustomerId;
  if (!user.email) {
    const err = new Error('Email is required for billing');
    err.status = 400;
    throw err;
  }

  const customer = await stripe.customers.create({
    email: user.email,
    name: user.name || undefined,
    metadata: { userId: user.id },
  });
  user.stripeCustomerId = customer.id;
  user.billing = {
    ...defaultBilling(),
    ...(user.billing || {}),
    customerId: customer.id,
  };
  await upsertEntity('users', user);
  return customer.id;
}

router.get('/billing/status', requireAuth, async (req, res) => {
  const userId = getUserId(req);
  const user = await getEntityById('users', userId);
  res.json(user?.billing || defaultBilling());
});

router.post('/billing/create-checkout-session', requireAuth, async (req, res, next) => {
  try {
    const stripe = getStripe();
    if (!stripe) return res.status(503).json({ message: 'Stripe is not configured' });

    const userId = getUserId(req);
    const user = await findOrCreateUser(userId, req.user);
    const customerId = await getOrCreateCustomer(stripe, user);
    const priceId = req.body?.priceId || process.env.STRIPE_PRICE_ID;
    if (!priceId) return res.status(400).json({ message: 'Missing Stripe price id' });

    // per-seat quantity, defaults to whatever the workspace already has
    const seats = Math.max(1, parseInt(req.body?.seats) || (await getSeats(userId)));

    const appUrl = getAppUrl(req);
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: priceId, quantity: seats }],
      success_url: `${appUrl}/billing?status=success`,
      cancel_url: `${appUrl}/billing?status=cancelled`,
      allow_promotion_codes: true,
      metadata: { userId, seats: String(seats) },
    });

    res.json({ url: session.url });
  } catch (err) {
    next(err);
  }
});

router.get('/billing/seats', requireAuth, async (req, res) => {
  const userId = getUserId(req);
  const seats = await getSeats(userId);
  res.json({ seats, freeSeatLimit: FREE_SEAT_LIMIT });
});

// called when crew is added/removed so the subscription quantity follows
router.post('/billing/seats', requireAuth, async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const seats = parseInt(req.body?.seats);
    if (!seats || seats < 1) return res.status(400).json({ message: 'seats must be a positive number' });

    const user = await findOrCreateUser(userId, req.user);
    const subscriptionId = user.billing?.subscriptionId;
    // a paid plan without a live subscription id is stale, treat as free
    const plan = user.billing?.plan || 'free';
    const effectivePlan = plan !== 'free' && subscriptionId ? plan : 'free';

    // free workspaces are capped
    if (effectivePlan === 'free' && seats > FREE_SEAT_LIMIT) {
      return res.status(403).json({ message: `Free plan is limited to ${FREE_SEAT_LIMIT} seats`, plan: 'free' });
    }

    if (effectivePlan !== 'free') {
      const stripe = getStripe();
      if (!stripe) return res.status(503).json({ message: 'Stripe is not configured' });
      const sub = await stripe.subscriptions.retrieve(subscriptionId);
      const item = sub.items?.data?.[0];
      if (!item) return res.status(400).json({ message: 'No active subscription item to update' });
      // prorate the seat change into the current period, seats only save if this succeeds
      await stripe.subscriptionItems.update(item.id, {
        quantity: seats,
        proration_behavior: 'create_prorations',
      });
    }

    await saveSeats(userId, seats, subscriptionId || null);
    res.json({ seats, message: 'Seat count updated' });
  } catch (err) {
    next(err);
  }
});

router.post('/billing/create-portal-session', requireAuth, async (req, res, next) => {
  try {
    const stripe = getStripe();
    if (!stripe) return res.status(503).json({ message: 'Stripe is not configured' });

    const userId = getUserId(req);
    const user = await findOrCreateUser(userId, req.user);
    const customerId = await getOrCreateCustomer(stripe, user);
    const appUrl = getAppUrl(req);

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${appUrl}/billing`,
    });

    res.json({ url: session.url });
  } catch (err) {
    next(err);
  }
});

async function handleStripeEvent(event) {
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const userId = session.metadata?.userId;
    if (!userId) return;
    const seats = parseInt(session.metadata?.seats) || FREE_SEAT_LIMIT;
    await saveBillingForUser(userId, {
      plan: 'agency',
      subscriptionStatus: 'active',
      customerId: session.customer || null,
      subscriptionId: session.subscription || null,
    });
    await saveSeats(userId, seats, session.subscription || null);
    return;
  }

  if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
    const sub = event.data.object;
    const user = await getUserByCustomerId(sub.customer);
    if (!user) return;
    const priceId = sub.items?.data?.[0]?.price?.id || null;
    const quantity = sub.items?.data?.[0]?.quantity || null;
    const active = sub.status === 'active';
    await saveBillingForUser(user.id, {
      plan: active ? planFromPriceId(priceId) : 'free',
      subscriptionStatus: sub.status || 'inactive',
      customerId: sub.customer || null,
      subscriptionId: sub.id || null,
      priceId,
      currentPeriodEnd: sub.current_period_end
        ? new Date(sub.current_period_end * 1000).toISOString()
        : null,
    });
    // keep seat_counts in sync with stripe
    if (quantity) await saveSeats(user.id, active ? quantity : FREE_SEAT_LIMIT, sub.id);
  }
}

async function billingWebhookHandler(req, res) {
  const stripe = getStripe();
  if (!stripe) return res.status(503).json({ message: 'Stripe is not configured' });
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) return res.status(500).json({ message: 'Webhook secret is not configured' });

  const signature = req.headers['stripe-signature'];
  if (!signature) return res.status(400).json({ message: 'Missing stripe signature' });

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, signature, webhookSecret);
  } catch (err) {
    return res.status(400).json({ message: `Webhook Error: ${err.message}` });
  }

  try {
    await handleStripeEvent(event);
    return res.json({ received: true });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}

module.exports = {
  billingRouter: router,
  billingWebhookHandler,
};
