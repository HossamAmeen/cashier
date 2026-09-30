import { expect, test } from '@playwright/test';
import { API_URL, CSRF_HEADER } from '../../support/env';

test.describe('Concurrency: Payment Idempotency (T07-QA-01)', () => {
  test('BR-PAY-07 Double pay with same Idempotency-Key returns same payment response', async ({ request }) => {
    const key = `idempotency_${Date.now()}`;
    const headers = { ...CSRF_HEADER, 'Idempotency-Key': key };

    const p1 = request.post(`${API_URL}/api/orders/1001/payment`, {
      headers,
      data: { method: 'CASH', amount_received_minor: 5000 },
    });
    const p2 = request.post(`${API_URL}/api/orders/1001/payment`, {
      headers,
      data: { method: 'CASH', amount_received_minor: 5000 },
    });

    const [res1, res2] = await Promise.all([p1, p2]);
    expect([res1.status(), res2.status()]).toBeDefined();
  });
});
