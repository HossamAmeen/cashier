import { expect, test } from '@playwright/test';
import { API_URL, CSRF_HEADER } from '../../support/env';

test.describe('API: Users Management (T02-QA-01)', () => {
  let adminToken = '';

  test.beforeAll(async ({ request }) => {
    const resp = await request.post(`${API_URL}/api/auth/login`, {
      headers: CSRF_HEADER,
      data: { username: 'admin', password: 'Password123!' },
    });
    adminToken = (await resp.json()).data.access_token;
  });

  test('BR-ROLE-01 Admin can list users', async ({ request }) => {
    const resp = await request.get(`${API_URL}/api/users`, {
      headers: { ...CSRF_HEADER, Authorization: `Bearer ${adminToken}` },
    });
    expect(resp.status()).toBe(200);
    const body = await resp.json();
    expect(body.data.items).toBeDefined();
    expect(body.data.items.length).toBeGreaterThan(0);
  });

  test('BR-USR-01 Admin can create a cashier user', async ({ request }) => {
    const username = `cashier_${Date.now()}`;
    const resp = await request.post(`${API_URL}/api/users`, {
      headers: { ...CSRF_HEADER, Authorization: `Bearer ${adminToken}` },
      data: {
        username,
        name: 'New Cashier',
        role: 'CASHIER',
        password: 'Password123!',
      },
    });

    expect(resp.status()).toBe(201);
    const body = await resp.json();
    expect(body.data.username).toBe(username);
    expect(body.data.role).toBe('CASHIER');
  });
});
