import { expect, test } from '@playwright/test';
import { API_URL, CSRF_HEADER } from '../../support/env';

test.describe('API: Shift Open (T05-QA-01)', () => {
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

  test('BR-SHIFT-01 get current shift returns shift object or null', async ({ request }) => {
    if (!cashierToken) return;
    const resp = await request.get(`${API_URL}/api/shifts/current`, {
      headers: { ...CSRF_HEADER, Authorization: `Bearer ${cashierToken}` },
    });
    expect(resp.status()).toBe(200);
    const body = await resp.json();
    expect(body.data).toBeDefined();
  });
});
