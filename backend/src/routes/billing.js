const { Router } = require('express');
const { getEntityById, listEntities, upsertEntity } = require('../db/repository');
const { requireAuth } = require('../middleware/validate');
const { getUserId } = require('../middleware/authUser');
const { getStripe } = require('../stripeClient');

const router = Router();

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

    const appUrl = getAppUrl(req);
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/billing?status=success`,
      cancel_url: `${appUrl}/billing?status=cancelled`,
      allow_promotion_codes: true,
      metadata: { userId },
    });

    res.json({ url: session.url });
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
    await saveBillingForUser(userId, {
      plan: 'pro',
      subscriptionStatus: 'active',
      customerId: session.customer || null,
      subscriptionId: session.subscription || null,
    });
    return;
  }

  if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
    const sub = event.data.object;
    const user = await getUserByCustomerId(sub.customer);
    if (!user) return;
    await saveBillingForUser(user.id, {
      plan: sub.status === 'active' ? 'pro' : 'free',
      subscriptionStatus: sub.status || 'inactive',
      customerId: sub.customer || null,
      subscriptionId: sub.id || null,
      priceId: sub.items?.data?.[0]?.price?.id || null,
      currentPeriodEnd: sub.current_period_end
        ? new Date(sub.current_period_end * 1000).toISOString()
        : null,
    });
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
