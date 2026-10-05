import { test, expect, APIRequestContext } from '@playwright/test'

const apiBase = 'http://localhost:4000/api'

function devToken(uid: string, email: string) {
  const payload = Buffer.from(JSON.stringify({ sub: uid, email, name: uid })).toString('base64url')
  return `dev.${payload}.signature`
}

async function call(request: APIRequestContext, path: string, uid: string, email: string, options: { method?: string; data?: unknown } = {}) {
  return request.fetch(`${apiBase}${path}`, {
    method: options.method || (options.data ? 'POST' : 'GET'),
    data: options.data,
    headers: { Authorization: `Bearer ${devToken(uid, email)}` },
  })
}

test('workspace invite, role authorization, and tenant isolation use the real API', async ({ request }) => {
  await expect.poll(async () => (await request.get(`${apiBase}/health`)).status(), { timeout: 30_000 }).toBe(200)
  const suffix = Date.now()
  const admin = { uid: `e2e-admin-${suffix}`, email: `admin-${suffix}@agency.test` }
  const producer = { uid: `e2e-producer-${suffix}`, email: `producer-${suffix}@agency.test` }
  const outsider = { uid: `e2e-outsider-${suffix}`, email: `outsider-${suffix}@other.test` }

  const created = await call(request, '/v1/workspaces', admin.uid, admin.email, {
    data: { name: `E2E Agency ${suffix}` },
  })
  expect(created.status()).toBe(201)
  const workspace = (await created.json()).data

  const denied = await call(request, `/v1/workspaces/${workspace.id}`, outsider.uid, outsider.email)
  expect(denied.status()).toBe(403)

  const invited = await call(request, `/v1/workspaces/${workspace.id}/invite`, admin.uid, admin.email, {
    data: { email: producer.email, role: 'producer' },
  })
  expect(invited.status()).toBe(201)
  const invite = (await invited.json()).data

  const accepted = await call(request, `/v1/workspaces/invites/${invite.token}/accept`, producer.uid, producer.email, {
    method: 'POST',
    data: {},
  })
  expect(accepted.status()).toBe(200)

  const producerAccess = await call(request, `/v1/workspaces/${workspace.id}`, producer.uid, producer.email)
  expect(producerAccess.status()).toBe(200)

  const forbiddenRoleChange = await call(
    request,
    `/v1/workspaces/${workspace.id}/members/${admin.uid}/role`,
    producer.uid,
    producer.email,
    { method: 'PATCH', data: { role: 'performer' } },
  )
  expect(forbiddenRoleChange.status()).toBe(403)
})
