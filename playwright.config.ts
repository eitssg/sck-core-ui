import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  retries: 0,
  webServer: {
    command: 'yarn dev',
    url: 'http://localhost:8080',
    reuseExistingServer: true,
    timeout: 120_000,
  },
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:8080',
    headless: true,
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
});
