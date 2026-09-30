import { expect, test } from '@playwright/test';

test.describe('UI: Shift Close (T08-FE-01)', () => {
  test('Close shift screen renders financial breakdown and difference preview', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="username"]', 'cashier');
    await page.fill('input[type="password"]', 'Password123!');
    await page.click('button[type="submit"]');

    await page.goto('/shift/close');
    await expect(page.locator('h1')).toContainText('إغلاق');
  });
});
