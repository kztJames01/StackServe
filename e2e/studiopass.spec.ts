import { test, expect } from '@playwright/test';

// happy path: book a shoot, create a license draft, sign it with a typed name
test('book shoot then sign a license', async ({ page, context }) => {
  await context.addCookies([{ name: 'auth_token', value: 'ui-test-only', url: 'http://localhost:3000' }]);

  // in-memory fake backend state
  const projects: Record<string, unknown>[] = [];
  const licenses: Record<string, unknown>[] = [];
  const holds: Record<string, unknown>[] = [];

  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url());
    const pathname = url.pathname;
    const method = route.request().method();

    if (pathname === '/api/projects' && method === 'GET') return route.fulfill({ json: projects });
    if (pathname === '/api/projects' && method === 'POST') {
      const body = route.request().postDataJSON();
      const project = { id: 999, slug: 'test-shoot-999', status: 'active', ...body };
      projects.push(project);
      return route.fulfill({ status: 201, json: { data: project, message: 'Project created' } });
    }
    if (pathname === '/api/projects/999' && method === 'GET') return route.fulfill({ json: projects[0] });
    if (pathname === '/api/availability' && method === 'POST') {
      const body = route.request().postDataJSON();
      holds.push(body);
      return route.fulfill({ status: 201, json: { data: { id: `avail-${holds.length}`, ...body }, message: 'Availability saved' } });
    }
    if (pathname === '/api/availability' && method === 'GET') return route.fulfill({ json: holds });
    if (pathname === '/api/licenses' && method === 'GET') {
      const shootId = url.searchParams.get('shootId');
      return route.fulfill({ json: licenses.filter((l) => !shootId || l.shoot_id === shootId) });
    }
    if (pathname === '/api/licenses' && method === 'POST') {
      const body = route.request().postDataJSON();
      const license = {
        id: 'lic-1',
        workspace_id: 'current-user',
        shoot_id: body.shootId,
        freelancer_id: body.freelancerId,
        media_ref: body.mediaRef || 'untagged',
        usage_type: body.usageType || ['web'],
        territories: body.territories || ['worldwide'],
        duration_months: body.durationMonths ?? null,
        starts_at: body.startsAt,
        expires_at: null,
        fee_cents: body.feeCents ?? null,
        status: 'draft',
        signed_pdf_ref: null,
        signed_name: null,
        signed_at: null,
      };
      licenses.push(license);
      return route.fulfill({ status: 201, json: { data: license, message: 'License draft created' } });
    }
    if (pathname === '/api/licenses/lic-1' && method === 'PATCH') {
      const body = route.request().postDataJSON();
      licenses[0] = { ...licenses[0], ...body };
      return route.fulfill({ json: { data: licenses[0], message: 'License updated' } });
    }
    if (pathname === '/api/licenses/lic-1/sign' && method === 'POST') {
      const body = route.request().postDataJSON();
      licenses[0] = {
        ...licenses[0],
        status: 'signed',
        signed_name: body.typedName,
        signed_at: new Date().toISOString(),
        signed_pdf_ref: 'licenses/current-user/lic-1.pdf',
      };
      return route.fulfill({ json: { data: licenses[0], message: 'License signed' } });
    }
    if (pathname === '/api/users/me') {
      return route.fulfill({ json: { name: 'Test Agent', handle: 'test-agent', roles: ['maker'], skills: [], socials: {}, avatar: '', bio: '' } });
    }
    if (pathname === '/api/billing/status') return route.fulfill({ json: { plan: 'agency', subscriptionStatus: 'active' } });
    if (pathname === '/api/billing/seats') return route.fulfill({ json: { seats: 3, freeSeatLimit: 3 } });
    return route.fulfill({ json: [] });
  });

  // book the shoot
  await page.goto('/shoots');
  await page.getByRole('button', { name: /new shoot/i }).click();
  await page.getByPlaceholder('Shoot title').fill('Test Campaign Shoot');
  await page.getByPlaceholder('Client').fill('Acme Corp');
  await page.locator('input[type=date]').first().fill('2026-10-10');
  await page.locator('input[type=date]').nth(1).fill('2026-10-12');
  await page.getByRole('button', { name: /Alex Johnson/ }).click();
  await page.getByRole('button', { name: 'Book Shoot' }).click();

  // crew pick should auto-hold dates
  await expect.poll(() => holds.length).toBe(1);
  expect(holds[0]).toMatchObject({ freelancerId: '1', status: 'hold', shootId: '999' });

  // open the shoot and create a license draft
  // the app clears the fake auth cookie once firebase resolves to signed-out,
  // so re-add it before navigating (goto, not link click, same reason)
  await context.addCookies([{ name: 'auth_token', value: 'ui-test-only', url: 'http://localhost:3000' }]);
  await page.goto('/projects/999');
  await page.getByRole('button', { name: 'New License' }).click();
  await page.getByPlaceholder('e.g. hero-shot-01').fill('hero-01');
  await page.locator('input[type=date]').first().fill('2026-10-10');
  await page.getByRole('button', { name: 'Create Draft' }).click();
  await expect(page.getByText('hero-01')).toBeVisible();

  // backend only signs licenses that were sent first
  await page.getByRole('button', { name: 'Send', exact: true }).click();
  await expect(page.getByText('sent', { exact: true })).toBeVisible();

  // sign it with a typed name
  await page.getByRole('button', { name: 'Sign', exact: true }).click();
  await page.getByPlaceholder('Type your full legal name to sign').fill('Alex Johnson');
  await page.getByRole('button', { name: 'Confirm Signature' }).click();
  await expect(page.getByText('signed', { exact: true })).toBeVisible();
  await expect(page.getByText(/Signed by Alex Johnson/)).toBeVisible();
});
