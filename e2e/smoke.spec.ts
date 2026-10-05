import { test, expect } from '@playwright/test';

test('landing page loads', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'SynthPass' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Create Agency Workspace' })).toBeVisible();
});

test('sign-in page loads', async ({ page }) => {
  await page.goto('/sign-in');
  await expect(page.getByRole('heading', { name: 'Sign in to SynthPass' })).toBeVisible();
  await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
});

test('protected route redirects to sign-in', async ({ page }) => {
  await page.goto('/shoots');
  await expect(page).toHaveURL(/sign-in/);
});

test('appearance supports keyboard selection, persistence, and system changes', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/sign-in');
  const toggle = page.getByRole('button', { name: 'Change appearance' });
  await toggle.focus();
  await toggle.press('Enter');
  await expect(page.getByRole('menuitemradio', { name: 'Light', exact: true })).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(page.getByRole('menuitemradio', { name: 'Dark', exact: true })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('html')).toHaveClass(/dark/);
  await expect.poll(() => page.evaluate(() => localStorage.getItem('synthpass-theme'))).toBe('dark');
  await page.reload();
  await expect(page.locator('html')).toHaveClass(/dark/);
  await toggle.click();
  await page.getByRole('menuitemradio', { name: 'System' }).click();
  await expect(page.locator('html')).not.toHaveClass(/dark/);
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(page.locator('html')).toHaveClass(/dark/);
});

for (const theme of ['light', 'dark'] as const) {
  test(`${theme} theme semantic colors have readable contrast and responsive auth layouts`, async ({ page }) => {
    await page.addInitScript((value) => localStorage.setItem('synthpass-theme', value), theme);
    await page.goto('/sign-in');
    await expect.poll(() => page.evaluate(() => document.documentElement.style.colorScheme)).toBe(theme);
    const contrasts = await page.evaluate(() => {
      const luminance = (token: string) => {
        const probe = document.createElement('span');
        probe.style.color = `hsl(var(--${token}))`;
        document.body.append(probe);
        const rgb = getComputedStyle(probe).color.match(/[\d.]+/g)!.slice(0, 3).map(Number);
        probe.remove();
        const linear = rgb.map((value) => value / 255).map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
        return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
      };
      return [
        ['foreground', 'background'], ['card-foreground', 'card'], ['popover-foreground', 'popover'],
        ['primary-foreground', 'primary'], ['secondary-foreground', 'secondary'], ['accent-foreground', 'accent'],
        ['muted-foreground', 'muted'], ['primary', 'background'], ['destructive', 'background'],
        ['success', 'background'], ['warning', 'background'], ['info', 'background'], ['input', 'background'], ['ring', 'background'],
      ].map(([foreground, background]) => {
        const values = [luminance(foreground), luminance(background)].sort((a, b) => a - b);
        return { pair: `${foreground}/${background}`, ratio: (values[1] + 0.05) / (values[0] + 0.05) };
      });
    });
    for (const { pair, ratio } of contrasts) expect(ratio, pair).toBeGreaterThanOrEqual(pair.startsWith('input/') || pair.startsWith('ring/') ? 3 : 4.5);
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await expect(page.getByRole('button', { name: 'Sign In', exact: true })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    }
    await page.getByLabel('Email', { exact: true }).focus();
    await expect(page.getByLabel('Email', { exact: true })).toBeFocused();
    await page.screenshot({ path: `/tmp/synthpass-${theme}-desktop.png`, fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: `/tmp/synthpass-${theme}-mobile.png`, fullPage: true });
  });

  test(`${theme} workspace roles, invites, and rate cards are usable`, async ({ page, context }) => {
    await context.addCookies([{ name: 'auth_token', value: 'ui-test-only', url: 'http://localhost:3000' }]);
    await page.addInitScript(({ theme, workspace }) => {
      localStorage.setItem('synthpass-theme', theme);
      localStorage.setItem('synthpass-active-workspace', workspace);
    }, { theme, workspace: 'ws-test' });
    await page.route('**/api/**', async (route) => {
      const pathname = new URL(route.request().url()).pathname;
      if (pathname === '/api/users/me') return route.fulfill({ json: { name: 'Agency Admin', email: 'admin@agency.test', avatar: '' } });
      if (pathname === '/api/v1/workspaces') return route.fulfill({ json: [{ id: 'ws-test', name: 'North Agency', description: 'Commercial production', owner_id: 'admin', member_role: 'admin', created_at: new Date().toISOString() }] });
      if (pathname.endsWith('/members')) return route.fulfill({ json: [{ user_id: 'admin', role: 'admin', joined_at: new Date().toISOString(), email: 'admin@agency.test', name: 'Agency Admin', handle: null, avatar: null }] });
      if (pathname === '/api/v1/rate-cards') return route.fulfill({ json: [{ id: 'sag-principal-scale', job_category: 'Principal', union_code: 'SAG-AFTRA', scale_type: 'scale', day_rate_cents: 104700, half_day_rate_cents: null, session_rate_cents: null, notes: '' }] });
      if (pathname.endsWith('/invite')) return route.fulfill({ status: 201, json: { data: { token: 'invite-token', email: 'performer@example.com', role: 'performer' }, message: 'Invite created' } });
      if (pathname.endsWith('/shoots')) return route.fulfill({ json: [] });
      return route.fulfill({ json: {} });
    });
    await page.goto('/settings/workspace');
    await expect(page.getByRole('heading', { name: 'Workspace Settings' })).toBeVisible();
    await expect(page.getByText('Principal')).toBeVisible();
    await page.getByPlaceholder('member@agency.com').fill('performer@example.com');
    await page.getByRole('button', { name: 'Create Invite' }).click();
    await expect(page.getByLabel('Invite link')).toHaveValue(/invite-token/);
    for (const width of [320, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    }
    await page.screenshot({ path: `/tmp/synthpass-${theme}-workspace.png`, fullPage: true });
  });
}
