import { expect, test } from '@playwright/test';

test('AC-15 BR-GEN-05 the PWA shell is Arabic RTL', async ({ page }) => {
  await page.goto('/login');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
});
