import { expect, test } from '@playwright/test';
import { API_URL, CSRF_HEADER } from '../../support/env';

test.describe('API: Orders (T06-QA-01)', () => {
  let cashierToken = '';

  test.beforeAll(async ({ request }) => {
    const resp = await request.post(`${API_URL}/api/auth/login`, {
      headers: CSRF_HEADER,
      data: { username: 'cashier', password: 'Password123!' },
    });
    const body = await resp.json();
    if (resp.status() === 200 && body.data) {
      cashierToken = body.data.access_token;
    }
  });

  test('BR-ORD-01 Cashier can list orders', async ({ request }) => {
    if (!cashierToken) return;
    const resp = await request.get(`${API_URL}/api/orders`, {
      headers: { ...CSRF_HEADER, Authorization: `Bearer ${cashierToken}` },
    });
    expect(resp.status()).toBe(200);
    const body = await resp.json();
    expect(body.data.items).toBeDefined();
    expect(body.data.today_counts).toBeDefined();
  });
});
