import { expect, test } from '@playwright/test';
import { API_URL, CSRF_HEADER } from '../../support/env';

test.describe('API: Tables Management (T04-QA-01)', () => {
  let adminToken = '';

  test.beforeAll(async ({ request }) => {
    const resp = await request.post(`${API_URL}/api/auth/login`, {
      headers: CSRF_HEADER,
      data: { username: 'admin', password: 'Password123!' },
    });
    adminToken = (await resp.json()).data.access_token;
  });

  test('BR-TBL-01 Admin/Cashier can list tables with occupancy', async ({ request }) => {
    const resp = await request.get(`${API_URL}/api/tables`, {
      headers: { ...CSRF_HEADER, Authorization: `Bearer ${adminToken}` },
    });
    expect(resp.status()).toBe(200);
    const body = await resp.json();
    expect(body.data.items).toBeDefined();
    expect(body.data.counts).toBeDefined();
  });

  test('BR-TBL-06 Admin can create a new table', async ({ request }) => {
    const tableNum = Math.floor(Math.random() * 1000) + 100;
    const resp = await request.post(`${API_URL}/api/tables`, {
      headers: { ...CSRF_HEADER, Authorization: `Bearer ${adminToken}` },
      data: {
        number: tableNum,
        is_active: true,
      },
    });

    expect(resp.status()).toBe(201);
    const body = await resp.json();
    expect(body.data.number).toBe(tableNum);
  });
});
