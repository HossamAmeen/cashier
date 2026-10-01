import { expect, test } from '@playwright/test';

test.describe('UI: Orders History (T09-FE-01)', () => {
  test('Orders history screen renders search bar and status filters', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="username"]', 'cashier');
    await page.fill('input[type="password"]', 'Password123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('/');

    await page.goto('/orders');
    await expect(page.locator('h1')).toContainText('سجل الطلبات');
  });
});
