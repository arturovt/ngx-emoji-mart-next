import { defineConfig, devices } from '@playwright/test';

import type { E2EOptions } from './e2e/fixtures';

export default defineConfig<E2EOptions>({
  testDir: './e2e',
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:4200',
  },
  projects: [
    { name: 'zone', use: { ...devices['Desktop Chrome'], zoneless: false } },
    { name: 'zoneless', use: { ...devices['Desktop Chrome'], zoneless: true } },
  ],
  webServer: {
    command: 'pnpm run serve:integration:static',
    url: 'http://localhost:4200',
    reuseExistingServer: !process.env.CI,
  },
});
