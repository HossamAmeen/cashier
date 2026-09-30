import { expect, test } from '@playwright/test';
import { API_URL, CSRF_HEADER } from '../../support/env';

test.describe('API: Shifts Close (T08-QA-01)', () => {
  test('BR-SHIFT-04 close shift requires authentication', async ({ request }) => {
    const resp = await request.post(`${API_URL}/api/shifts/1/close`, {
      headers: CSRF_HEADER,
      data: { counted_cash_minor: 10000 },
    });
    expect(resp.status()).toBe(401);
  });
});
