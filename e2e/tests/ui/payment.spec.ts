import { expect, test } from '@playwright/test';

test.describe('UI: Payment Screen (T07-FE-01)', () => {
  test('Payment screen allows selecting CASH or CARD', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="username"]', 'cashier');
    await page.fill('input[type="password"]', 'Password123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('/');

    await page.goto('/orders/1001/pay');
    await expect(page.locator('h1')).toContainText('دفع');
  });
});
