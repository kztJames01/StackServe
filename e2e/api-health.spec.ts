import { test, expect } from '@playwright/test';

test('api health check', async ({ request }) => {
  const res = await request.get('http://localhost:4000/api/health');
  expect(res.ok()).toBeTruthy();

  const body = await res.json();
  expect(body.ok).toBe(true);
  expect(body.service).toBe('synthpass-api');
});
