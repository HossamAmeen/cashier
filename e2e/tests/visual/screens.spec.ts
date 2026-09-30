import { expect, test } from '@playwright/test';

test.describe('Visual Suite: Screen Layouts & RTL Verification (T11-QA-01)', () => {
  test('Login screen visual layout check', async ({ page }) => {
    await page.goto('/login');
    const dir = await page.getAttribute('html', 'dir');
    expect(dir).toBe('rtl');
  });
});
