import { expect, test } from '@playwright/test';
import { API_URL, CSRF_HEADER } from '../../support/env';

test.describe('API: History Filters (T09-QA-01)', () => {
  test('BR-ROLE-04 Orders history requires authentication', async ({ request }) => {
    const resp = await request.get(`${API_URL}/api/orders`, {
      headers: CSRF_HEADER,
    });
    expect(resp.status()).toBe(401);
  });
});
