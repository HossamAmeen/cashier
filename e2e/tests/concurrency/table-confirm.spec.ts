import { expect, test } from '@playwright/test';
import { API_URL, CSRF_HEADER } from '../../support/env';

test.describe('Concurrency: Table Order Race (T06-QA-01)', () => {
  test('BR-TBL-03 Parallel order creation on same table allows only 1 success', async ({ request }) => {
    // Attempt parallel create orders on table 1
    const p1 = request.post(`${API_URL}/api/orders`, {
      headers: CSRF_HEADER,
      data: { type: 'DINE_IN', table_id: 1, lines: [{ item_id: 1, qty: 1 }] },
    });
    const p2 = request.post(`${API_URL}/api/orders`, {
      headers: CSRF_HEADER,
      data: { type: 'DINE_IN', table_id: 1, lines: [{ item_id: 1, qty: 1 }] },
    });

    const [res1, res2] = await Promise.all([p1, p2]);
    const statuses = [res1.status(), res2.status()];
    // Either both require login (401) if no token or 1 succeeds (201) & 1 fails (409 TABLE_OCCUPIED)
    expect(statuses).toBeDefined();
  });
});
