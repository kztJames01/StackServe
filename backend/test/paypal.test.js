const { before, after, describe, test } = require('node:test');
const assert = require('node:assert/strict');
const paypal = require('../src/services/paypal');

const origEnv = { ...process.env };

function mockFetch(handler) {
  paypal.setFetchForTests(handler);
}

before(() => {
  process.env.PAYPAL_CLIENT_ID = 'test-client';
  process.env.PAYPAL_CLIENT_SECRET = 'test-secret';
  process.env.PAYPAL_ENV = 'sandbox';
  process.env.PAYPAL_WEBHOOK_ID = 'wh-test';
  process.env.PAYPAL_PLAN_ID = 'P-TEST';
});

after(() => {
  process.env.PAYPAL_CLIENT_ID = origEnv.PAYPAL_CLIENT_ID;
  process.env.PAYPAL_CLIENT_SECRET = origEnv.PAYPAL_CLIENT_SECRET;
  process.env.PAYPAL_WEBHOOK_ID = origEnv.PAYPAL_WEBHOOK_ID;
  process.env.PAYPAL_PLAN_ID = origEnv.PAYPAL_PLAN_ID;
  paypal.setFetchForTests((...args) => globalThis.fetch(...args));
});

function jsonRes(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(body),
    json: async () => body,
  };
}

describe('PayPal token cache', () => {
  test('caches access token until near expiry', async () => {
    let tokenCalls = 0;
    mockFetch(async (url) => {
      if (String(url).includes('/v1/oauth2/token')) {
        tokenCalls += 1;
        return jsonRes(200, { access_token: 'tok-1', expires_in: 3600 });
      }
      return jsonRes(200, {});
    });
    const a = await paypal.getAccessToken();
    const b = await paypal.getAccessToken();
    assert.equal(a, 'tok-1');
    assert.equal(b, 'tok-1');
    assert.equal(tokenCalls, 1);
  });

  test('503 when credentials missing', async () => {
    const id = process.env.PAYPAL_CLIENT_ID;
    delete process.env.PAYPAL_CLIENT_ID;
    paypal.setFetchForTests(async () => jsonRes(200, {}));
    await assert.rejects(() => paypal.getAccessToken(), /not configured/);
    process.env.PAYPAL_CLIENT_ID = id;
  });
});

describe('PayPal subscriptions and invoices', () => {
  test('createSubscription returns approve url', async () => {
    mockFetch(async (url, opts) => {
      if (String(url).includes('/oauth2/token')) return jsonRes(200, { access_token: 'tok', expires_in: 3600 });
      if (String(url).includes('/v1/billing/subscriptions') && opts.method === 'POST') {
        const body = JSON.parse(opts.body);
        assert.equal(body.plan_id, 'P-TEST');
        assert.equal(body.custom_id, 'ws-1');
        return jsonRes(201, {
          id: 'I-SUB',
          status: 'APPROVAL_PENDING',
          links: [{ rel: 'approve', href: 'https://paypal.test/approve' }],
        });
      }
      return jsonRes(404, { message: 'unexpected ' + url });
    });
    const sub = await paypal.createSubscription({
      workspaceId: 'ws-1',
      returnUrl: 'http://app/ok',
      cancelUrl: 'http://app/no',
    });
    assert.equal(sub.approveUrl, 'https://paypal.test/approve');
    assert.equal(sub.subscriptionId, 'I-SUB');
  });

  test('invoice line items include session fee and 21% P&H', () => {
    const items = paypal.invoiceLineItems([{
      performer_name: 'Alex Johnson',
      performer_email: 'alex@test.com',
      replica_type: 'VISUAL_LIKENESS',
      union_status: 'SAG-AFTRA',
      total_session_fee_cents: 150000,
      pension_health_cents: 31500,
    }]);
    assert.equal(items.length, 2);
    assert.equal(items[0].unit_amount.value, '1500.00');
    assert.equal(items[1].unit_amount.value, '315.00');
    assert.match(items[1].description, /alex@test.com/);
  });

  test('createAndSendInvoice posts invoice then send', async () => {
    const calls = [];
    mockFetch(async (url, opts) => {
      calls.push({ url: String(url), method: opts.method });
      if (String(url).includes('/oauth2/token')) return jsonRes(200, { access_token: 'tok', expires_in: 3600 });
      if (String(url).includes('/v2/invoicing/invoices') && opts.method === 'POST' && !String(url).endsWith('/send')) {
        return jsonRes(201, { id: 'INV-1' });
      }
      if (String(url).includes('/send')) return jsonRes(200, {});
      return jsonRes(404, { message: url });
    });
    const sent = await paypal.createAndSendInvoice({
      workspaceName: 'Acme',
      recipientEmail: 'billing@acme.test',
      invoiceNumber: 'SP-1',
      riders: [{
        performer_name: 'Alex',
        performer_email: 'a@t.com',
        replica_type: 'VOICE_SYNTHESIS',
        union_status: 'SAG-AFTRA',
        total_session_fee_cents: 1000,
        pension_health_cents: 210,
      }],
    });
    assert.equal(sent.invoiceId, 'INV-1');
    assert.equal(sent.totalCents, 1210);
    assert.ok(calls.some((c) => c.url.includes('/send')));
  });

  test('listDisputes returns items', async () => {
    mockFetch(async (url) => {
      if (String(url).includes('/oauth2/token')) return jsonRes(200, { access_token: 'tok', expires_in: 3600 });
      if (String(url).includes('/v1/customer/disputes')) {
        return jsonRes(200, { items: [{ dispute_id: 'PP-D-1', status: 'OPEN', reason: 'MERCHANDISE_OR_SERVICE_NOT_RECEIVED' }] });
      }
      return jsonRes(404, {});
    });
    const items = await paypal.listDisputes();
    assert.equal(items[0].dispute_id, 'PP-D-1');
  });
});

describe('PayPal webhook signature', () => {
  test('rejects missing headers', async () => {
    await assert.rejects(
      () => paypal.verifyWebhookSignature({}, { event_type: 'BILLING.SUBSCRIPTION.ACTIVATED' }),
      /Missing PayPal webhook/,
    );
  });

  test('returns false when PayPal says FAILURE', async () => {
    mockFetch(async (url) => {
      if (String(url).includes('/oauth2/token')) return jsonRes(200, { access_token: 'tok', expires_in: 3600 });
      if (String(url).includes('verify-webhook-signature')) return jsonRes(200, { verification_status: 'FAILURE' });
      return jsonRes(404, {});
    });
    const ok = await paypal.verifyWebhookSignature({
      'paypal-auth-algo': 'SHA256withRSA',
      'paypal-cert-url': 'https://api.paypal.com/cert',
      'paypal-transmission-id': 't1',
      'paypal-transmission-sig': 'sig',
      'paypal-transmission-time': '2026-01-01T00:00:00Z',
    }, { id: 'WH-1' });
    assert.equal(ok, false);
  });

  test('returns true when PayPal says SUCCESS', async () => {
    mockFetch(async (url) => {
      if (String(url).includes('/oauth2/token')) return jsonRes(200, { access_token: 'tok', expires_in: 3600 });
      if (String(url).includes('verify-webhook-signature')) return jsonRes(200, { verification_status: 'SUCCESS' });
      return jsonRes(404, {});
    });
    const ok = await paypal.verifyWebhookSignature({
      'paypal-auth-algo': 'SHA256withRSA',
      'paypal-cert-url': 'https://api.paypal.com/cert',
      'paypal-transmission-id': 't1',
      'paypal-transmission-sig': 'sig',
      'paypal-transmission-time': '2026-01-01T00:00:00Z',
    }, { id: 'WH-1' });
    assert.equal(ok, true);
  });
});
