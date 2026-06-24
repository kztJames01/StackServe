import { test, expect } from '@playwright/test';

test('landing page loads', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'NxtGen' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Join the Community' })).toBeVisible();
});

test('sign-in page loads', async ({ page }) => {
  await page.goto('/sign-in');
  await expect(page.getByRole('heading', { name: 'Hop into the MakerSpace' })).toBeVisible();
  await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
});

test('protected route redirects to sign-in', async ({ page }) => {
  await page.goto('/explore');
  await expect(page).toHaveURL(/sign-in/);
});
