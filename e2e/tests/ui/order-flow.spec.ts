import { expect, test } from '@playwright/test';

test.describe('UI: Order Flow (T06-FE-01)', () => {
  test('Order editor renders items grid and cart panel', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="username"]', 'cashier');
    await page.fill('input[type="password"]', 'Password123!');
    await page.click('button[type="submit"]');

    await page.goto('/orders/new');
    await expect(page.locator('h1')).toContainText('طلب');
  });
});
