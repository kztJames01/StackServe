import { test, expect } from '@playwright/test';

test('landing page loads', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'StudioPass' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Start Free Workspace' })).toBeVisible();
});

test('sign-in page loads', async ({ page }) => {
  await page.goto('/sign-in');
  await expect(page.getByRole('heading', { name: 'Hop into StudioPass' })).toBeVisible();
  await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
});

test('protected route redirects to sign-in', async ({ page }) => {
  await page.goto('/explore');
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
  await expect.poll(() => page.evaluate(() => localStorage.getItem('makerspace-theme'))).toBe('dark');
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
    await page.addInitScript((value) => localStorage.setItem('makerspace-theme', value), theme);
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
    await page.screenshot({ path: `/tmp/makerspace-${theme}-desktop.png`, fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: `/tmp/makerspace-${theme}-mobile.png`, fullPage: true });
  });

  test(`${theme} account roles and verification forms work with mocked API responses`, async ({ page, context }) => {
    await context.addCookies([{ name: 'auth_token', value: 'ui-test-only', url: 'http://localhost:3000' }]);
    await page.addInitScript((value) => localStorage.setItem('makerspace-theme', value), theme);
    let profile = { name: 'Test Maker', bio: 'Building accessible tools', avatar: '', handle: 'test-maker', roles: ['maker'], skills: [], socials: {}, studentStatus: 'unverified', employerStatus: 'unverified' };
    await page.route('**/api/**', async (route) => {
      const pathname = new URL(route.request().url()).pathname;
      if (pathname === '/api/users/me') {
        if (route.request().method() === 'PATCH') {
          profile = { ...profile, ...route.request().postDataJSON() };
          return route.fulfill({ json: { data: profile, message: 'Profile updated' } });
        }
        return route.fulfill({ json: profile });
      }
      if (pathname === '/api/verification') return route.fulfill({ json: { studentStatus: 'unverified', employerStatus: 'unverified', investor: null, isAdmin: false, providers: { sheerId: false, employer: false } } });
      if (pathname === '/api/verification/investor') return route.fulfill({ status: 202, json: { message: 'Submitted for staff review' } });
      if (pathname === '/api/verification/student') return route.fulfill({ status: 400, json: { message: 'Verify your university .edu email first.' } });
      return route.fulfill({ json: { plan: 'free', subscriptionStatus: 'inactive' } });
    });
    await page.goto('/account');
    await expect(page.getByLabel('Display name')).toHaveValue('Test Maker');
    await page.getByRole('checkbox', { name: 'investor', exact: true }).check();
    await page.getByRole('checkbox', { name: 'educator', exact: true }).check();
    await page.getByRole('button', { name: 'Save changes', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('Your profile changes have been saved.');
    expect(profile.roles).toEqual(['maker', 'investor', 'educator']);
    await expect(page.getByText('Provider access has not been configured', { exact: false })).toBeVisible();
    await page.getByRole('button', { name: 'Check university email' }).click();
    await expect(page.getByRole('alert').filter({ hasText: 'Verify your university .edu email first.' })).toBeVisible();
    await page.getByLabel('Organization domain').fill('fund.example');
    await page.getByLabel('Check size range').fill('$25k–$100k');
    await page.getByLabel('Investment stage').fill('Seed');
    await page.getByLabel('AUM range (self-declared)').fill('$1m–$5m');
    await page.getByLabel('Investment thesis').fill('Accessible developer tooling for independent makers.');
    await page.getByRole('button', { name: 'Submit for review' }).click();
    await expect(page.getByText('Submitted for staff review. You will not be featured until approved.', { exact: true })).toBeVisible();
    for (const width of [320, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    }
    await page.screenshot({ path: `/tmp/makerspace-${theme}-account.png`, fullPage: true });
  });
}
