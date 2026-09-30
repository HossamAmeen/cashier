import { expect, test } from '@playwright/test';
import { API_URL, CSRF_HEADER } from '../../support/env';

test.describe('API: Auth (T01-QA-01)', () => {
  test('BR-AUTH-01 login with valid credentials succeeds and sets refresh cookie', async ({ request }) => {
    const resp = await request.post(`${API_URL}/api/auth/login`, {
      headers: CSRF_HEADER,
      data: {
        username: 'admin',
        password: 'Password123!',
      },
    });

    expect(resp.status()).toBe(200);
    const body = await resp.json();
    expect(body.success).toBe(true);
    expect(body.data.user.role).toBe('ADMIN');
    expect(body.data.access_token).toBeDefined();

    // Verify cookie set
    const setCookie = resp.headers()['set-cookie'];
    expect(setCookie).toBeDefined();
  });

  test('BR-AUTH-01 login with invalid credentials returns INVALID_CREDENTIALS', async ({ request }) => {
    const resp = await request.post(`${API_URL}/api/auth/login`, {
      headers: CSRF_HEADER,
      data: {
        username: 'admin',
        password: 'WrongPassword!',
      },
    });

    expect(resp.status()).toBe(401);
    const body = await resp.json();
    expect(body.success).toBe(false);
    expect(body.code).toBe('INVALID_CREDENTIALS');
  });

  test('BR-AUTH-04 get me endpoint returns current user', async ({ request }) => {
    // Login first
    const loginResp = await request.post(`${API_URL}/api/auth/login`, {
      headers: CSRF_HEADER,
      data: { username: 'admin', password: 'Password123!' },
    });
    const { access_token } = (await loginResp.json()).data;

    const meResp = await request.get(`${API_URL}/api/auth/me`, {
      headers: {
        ...CSRF_HEADER,
        Authorization: `Bearer ${access_token}`,
      },
    });

    expect(meResp.status()).toBe(200);
    const meBody = await meResp.json();
    expect(meBody.data.user.username).toBe('admin');
  });
});
