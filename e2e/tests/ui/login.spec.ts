import { expect, test } from '@playwright/test';

test.describe('UI: Login Flow (T01-QA-01)', () => {
  test('Screen 01 renders login form and handles invalid login error', async ({ page }) => {
    await page.goto('/login');

    await expect(page.locator('h1')).toContainText('سيمبل بوينت');
    await page.fill('input[name="username"]', 'admin');
    await page.fill('input[type="password"]', 'WrongPassword!');
    await page.click('button[type="submit"]');

    // Should display error alert
    await expect(page.locator('[role="alert"]')).toBeVisible();
  });

  test('Screen 01 successful login redirects to homepage', async ({ page }) => {
    await page.goto('/login');

    await page.fill('input[name="username"]', 'cashier1');
    await page.fill('input[type="password"]', 'Password123!');
    await page.click('button[type="submit"]');

    await page.waitForURL('/');
    await expect(page).toHaveURL('/');
  });
});
