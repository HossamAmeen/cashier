import { expect, test } from '@playwright/test';
import { API_URL, CSRF_HEADER } from '../../support/env';

test.describe('API: Payments (T07-QA-01)', () => {
  test('BR-PAY-01 Pay order requires authentication', async ({ request }) => {
    const resp = await request.post(`${API_URL}/api/orders/1/payment`, {
      headers: CSRF_HEADER,
      data: { method: 'CASH', amount_received_minor: 5000 },
    });
    expect(resp.status()).toBe(401);
  });
});
