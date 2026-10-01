import { expect, test } from '@playwright/test';
import { API_URL, CSRF_HEADER } from '../../support/env';

test.describe('API: Catalog Categories and Items (T03-QA-01)', () => {
  let adminToken = '';

  test.beforeAll(async ({ request }) => {
    const resp = await request.post(`${API_URL}/api/auth/login`, {
      headers: CSRF_HEADER,
      data: { username: 'admin', password: 'Password123!' },
    });
    adminToken = (await resp.json()).data.access_token;
  });

  test('BR-ITEM-06 Cashier/Admin can get catalog', async ({ request }) => {
    const resp = await request.get(`${API_URL}/api/catalog`, {
      headers: { ...CSRF_HEADER, Authorization: `Bearer ${adminToken}` },
    });
    expect(resp.status()).toBe(200);
    const body = await resp.json();
    expect(Array.isArray(body.data.categories)).toBe(true);
  });

  test('BR-ITEM-07 Admin can create category', async ({ request }) => {
    const categoryName = `تصنيف_${Date.now()}`;
    const resp = await request.post(`${API_URL}/api/categories`, {
      headers: { ...CSRF_HEADER, Authorization: `Bearer ${adminToken}` },
      data: {
        name: categoryName,
        icon: 'coffee',
        sort_order: 1,
      },
    });

    expect(resp.status()).toBe(201);
    const body = await resp.json();
    expect(body.data.name).toBe(categoryName);
  });
});
