import { expect, test } from '@playwright/test';
import { API_URL, CSRF_HEADER } from '../../support/env';

test.describe('API: Dashboards (T10-QA-01)', () => {
  test('BR-ROLE-01 Cashier dashboard requires cashier role', async ({ request }) => {
    const resp = await request.get(`${API_URL}/api/dashboard/cashier`, {
      headers: CSRF_HEADER,
    });
    expect(resp.status()).toBe(401);
  });

  test('BR-ROLE-05 Admin dashboard requires admin role', async ({ request }) => {
    const resp = await request.get(`${API_URL}/api/dashboard/admin`, {
      headers: CSRF_HEADER,
    });
    expect(resp.status()).toBe(401);
  });
});
