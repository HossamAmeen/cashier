import { expect, test } from '@playwright/test';
import { API_URL, CSRF_HEADER } from '../../support/env';

test.describe('API: Store Settings (T02-QA-01)', () => {
  let adminToken = '';

  test.beforeAll(async ({ request }) => {
    const resp = await request.post(`${API_URL}/api/auth/login`, {
      headers: CSRF_HEADER,
      data: { username: 'admin', password: 'Password123!' },
    });
    adminToken = (await resp.json()).data.access_token;
  });

  test('BR-SET-01 get settings endpoint returns business configuration', async ({ request }) => {
    const resp = await request.get(`${API_URL}/api/settings`, {
      headers: { ...CSRF_HEADER, Authorization: `Bearer ${adminToken}` },
    });
    expect(resp.status()).toBe(200);
    const body = await resp.json();
    expect(body.data.business_name).toBeDefined();
  });

  test('BR-SET-02 Admin can update store settings', async ({ request }) => {
    const resp = await request.patch(`${API_URL}/api/settings`, {
      headers: { ...CSRF_HEADER, Authorization: `Bearer ${adminToken}` },
      data: {
        business_name: 'كاشيري - الفرع الرئيسي',
        receipt_header: 'أهلاً بكم في مطعمنا',
        receipt_footer: 'شكراً لزيارتكم',
      },
    });

    expect(resp.status()).toBe(200);
    const body = await resp.json();
    expect(body.data.business_name).toBe('كاشيري - الفرع الرئيسي');
  });
});
