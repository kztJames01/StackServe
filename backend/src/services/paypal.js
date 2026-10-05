// thin PayPal REST client. credentials stay in env, never logged.
const crypto = require('crypto');

let fetchFn = (...args) => globalThis.fetch(...args);
let tokenCache = { token: null, expiresAt: 0 };
let planCache = null;

function setFetchForTests(fn) {
  fetchFn = fn;
  tokenCache = { token: null, expiresAt: 0 };
  planCache = null;
}

function paypalConfigured() {
  return Boolean(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET);
}

function paypalBaseUrl() {
  return process.env.PAYPAL_ENV === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';
}

function missingConfig() {
  const err = new Error('PayPal is not configured');
  err.status = 503;
  return err;
}

function dollarsFromCents(cents) {
  return (Number(cents || 0) / 100).toFixed(2);
}

async function paypalRequest(path, { method = 'GET', body, accessToken } = {}) {
  if (!paypalConfigured()) throw missingConfig();
  const token = accessToken || await getAccessToken();
  const res = await fetchFn(`${paypalBaseUrl()}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const text = await res.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
  if (!res.ok) {
    const err = new Error(data.message || data.error_description || `PayPal request failed (${res.status})`);
    err.status = res.status >= 400 && res.status < 500 ? res.status : 502;
    err.paypal = data;
    throw err;
  }
  return data;
}

async function getAccessToken() {
  if (!paypalConfigured()) throw missingConfig();
  if (tokenCache.token && Date.now() < tokenCache.expiresAt - 30000) {
    return tokenCache.token;
  }
  const basic = Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString('base64');
  const res = await fetchFn(`${paypalBaseUrl()}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  const data = await res.json();
  if (!res.ok || !data.access_token) {
    const err = new Error(data.error_description || 'PayPal token request failed');
    err.status = 502;
    throw err;
  }
  tokenCache = {
    token: data.access_token,
    expiresAt: Date.now() + (Number(data.expires_in || 300) * 1000),
  };
  return tokenCache.token;
}

async function getOrCreatePlan() {
  if (process.env.PAYPAL_PLAN_ID) return process.env.PAYPAL_PLAN_ID;
  if (planCache) return planCache;

  const product = await paypalRequest('/v1/catalogs/products', {
    method: 'POST',
    body: {
      name: 'SynthPass Agency Pro',
      type: 'SERVICE',
      description: 'Agency workspace seats for synthetic media clearance',
    },
  });

  const plan = await paypalRequest('/v1/billing/plans', {
    method: 'POST',
    body: {
      product_id: product.id,
      name: 'Agency Pro monthly',
      billing_cycles: [{
        frequency: { interval_unit: 'MONTH', interval_count: 1 },
        tenure_type: 'REGULAR',
        sequence: 1,
        total_cycles: 0,
        pricing_scheme: { fixed_price: { value: '499.00', currency_code: 'USD' } },
      }],
      payment_preferences: {
        auto_bill_outstanding: true,
        payment_failure_threshold: 2,
      },
    },
  });
  planCache = plan.id;
  return planCache;
}

async function createSubscription({ workspaceId, returnUrl, cancelUrl }) {
  const planId = await getOrCreatePlan();
  const sub = await paypalRequest('/v1/billing/subscriptions', {
    method: 'POST',
    body: {
      plan_id: planId,
      custom_id: workspaceId,
      application_context: {
        brand_name: 'SynthPass',
        user_action: 'SUBSCRIBE_NOW',
        return_url: returnUrl,
        cancel_url: cancelUrl,
      },
    },
  });
  const approve = (sub.links || []).find((l) => l.rel === 'approve');
  return {
    subscriptionId: sub.id,
    planId,
    status: sub.status || 'APPROVAL_PENDING',
    approveUrl: approve?.href || null,
  };
}

function invoiceLineItems(riders) {
  const items = [];
  for (const rider of riders) {
    items.push({
      name: `Digital replica session — ${rider.performer_name}`.slice(0, 120),
      description: `${rider.replica_type} / ${rider.union_status}`.slice(0, 120),
      quantity: '1',
      unit_amount: { currency_code: 'USD', value: dollarsFromCents(rider.total_session_fee_cents) },
    });
    items.push({
      name: `Pension & health 21% — ${rider.performer_name}`.slice(0, 120),
      description: rider.performer_email,
      quantity: '1',
      unit_amount: { currency_code: 'USD', value: dollarsFromCents(rider.pension_health_cents) },
    });
  }
  return items;
}

async function createAndSendInvoice({ workspaceName, recipientEmail, riders, invoiceNumber }) {
  const items = invoiceLineItems(riders);
  const created = await paypalRequest('/v2/invoicing/invoices', {
    method: 'POST',
    body: {
      detail: {
        invoice_number: invoiceNumber,
        currency_code: 'USD',
        note: `SynthPass session fees for ${workspaceName}`,
      },
      invoicer: { name: { given_name: 'SynthPass', surname: workspaceName || 'Agency' } },
      primary_recipients: [{ billing_info: { email_address: recipientEmail } }],
      items,
    },
  });
  const invoiceId = created.id || created.href?.split('/').pop();
  if (invoiceId) {
    await paypalRequest(`/v2/invoicing/invoices/${invoiceId}/send`, {
      method: 'POST',
      body: { send_to_invoicer: true },
    });
  }
  const totalCents = riders.reduce(
    (sum, r) => sum + Number(r.total_session_fee_cents || 0) + Number(r.pension_health_cents || 0),
    0,
  );
  return { invoiceId, status: 'SENT', totalCents, items };
}

async function listDisputes() {
  const data = await paypalRequest('/v1/customer/disputes?page_size=20');
  return data.items || [];
}

async function sendDisputeNote(disputeId, note) {
  return paypalRequest(`/v1/customer/disputes/${encodeURIComponent(disputeId)}/send-message`, {
    method: 'POST',
    body: { message: note },
  });
}

async function verifyWebhookSignature(headers, event) {
  if (!process.env.PAYPAL_WEBHOOK_ID) {
    const err = new Error('PAYPAL_WEBHOOK_ID is not configured');
    err.status = 500;
    throw err;
  }
  const body = {
    auth_algo: headers['paypal-auth-algo'],
    cert_url: headers['paypal-cert-url'],
    transmission_id: headers['paypal-transmission-id'],
    transmission_sig: headers['paypal-transmission-sig'],
    transmission_time: headers['paypal-transmission-time'],
    webhook_id: process.env.PAYPAL_WEBHOOK_ID,
    webhook_event: event,
  };
  if (!body.auth_algo || !body.cert_url || !body.transmission_id || !body.transmission_sig || !body.transmission_time) {
    const err = new Error('Missing PayPal webhook signature headers');
    err.status = 400;
    throw err;
  }
  const result = await paypalRequest('/v1/notifications/verify-webhook-signature', {
    method: 'POST',
    body,
  });
  return result.verification_status === 'SUCCESS';
}

function newId() {
  return crypto.randomUUID();
}

module.exports = {
  setFetchForTests,
  paypalConfigured,
  paypalBaseUrl,
  getAccessToken,
  getOrCreatePlan,
  createSubscription,
  invoiceLineItems,
  createAndSendInvoice,
  listDisputes,
  sendDisputeNote,
  verifyWebhookSignature,
  dollarsFromCents,
  newId,
};
