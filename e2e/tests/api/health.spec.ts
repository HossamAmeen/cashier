import { expect, test } from '@playwright/test';

import { API_URL, HEALTH_TOKEN } from '../../support/env';

test('INFRA health endpoint is up with the token and refuses without it', async ({ request }) => {
  const ok = await request.get(`${API_URL}/api/health`, { headers: { 'X-Health-Check-Token': HEALTH_TOKEN } });
  expect(ok.status()).toBe(200);
  expect(await ok.json()).toEqual({ success: true, message: 'OK', data: { status: 'healthy' } });

  const denied = await request.get(`${API_URL}/api/health`);
  expect(denied.status()).toBe(401);
  expect((await denied.json()).code).toBe('UNAUTHENTICATED');
});
