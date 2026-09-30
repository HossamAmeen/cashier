import { defineConfig, devices } from '@playwright/test';

/**
 * QA runs ONLY on the server via infra/scripts/qa-remote.sh (CLAUDE.md §7, ADR-0004), before GATE C.
 * BASE_URL = https://cashier.hossam-ameen.online, API_URL = https://api.cashier.hossam-ameen.online.
 */
const BASE_URL = process.env.BASE_URL ?? '';
const API_URL = process.env.API_URL ?? '';
const LOCAL = /(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])/i;

for (const [name, value] of Object.entries({ BASE_URL, API_URL })) {
  if (!value) throw new Error(`${name} is required (QA runs on the server only).`);
  if (LOCAL.test(value)) throw new Error(`${name}=${value} points to localhost; QA never runs against localhost.`);
  if (!value.startsWith('https://')) throw new Error(`${name} must be https.`);
}

export default defineConfig({
  testDir: './tests',
  fullyParallel: false, // shared single environment; concurrency specs create their own parallelism
  retries: 1,
  workers: 1,
  reporter: [['html', { open: 'never' }], ['junit', { outputFile: 'results/junit.xml' }], ['list']],
  use: {
    baseURL: BASE_URL,
    locale: 'ar-EG',
    timezoneId: 'Africa/Cairo',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'api', testMatch: /(api|concurrency)\/.*\.spec\.ts/ },
    {
      name: 'ui-1280',
      testMatch: /(ui|visual)\/.*\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } },
    },
    {
      name: 'ui-1024',
      testMatch: /visual\/.*\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], viewport: { width: 1024, height: 768 } },
    },
  ],
});
