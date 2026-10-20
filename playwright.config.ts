import { defineConfig, devices } from '@playwright/test';

import type { E2EOptions } from './e2e/fixtures';

const SSR_PORT = 4322;

export default defineConfig<E2EOptions>({
  testDir: './e2e',
  forbidOnly: !!process.env.CI,
  // One run of all tests takes less than a minute. A hang must not block for a long time.
  globalTimeout: 5 * 60 * 1000,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:4200',
  },
  projects: [
    { name: 'zone', use: { ...devices['Desktop Chrome'], zoneless: false }, testIgnore: 'ssr.spec.ts' },
    { name: 'zoneless', use: { ...devices['Desktop Chrome'], zoneless: true }, testIgnore: 'ssr.spec.ts' },
    { name: 'ssr', use: { baseURL: `http://localhost:${SSR_PORT}` }, testMatch: 'ssr.spec.ts' },
    {
      // Run the same browser tests, but against the server-rendered, hydrated page instead of a
      // fresh client-side render, to catch anything that only breaks after hydration.
      name: 'ssr-hydrated-zone',
      use: { ...devices['Desktop Chrome'], baseURL: `http://localhost:${SSR_PORT}`, zoneless: false },
      testIgnore: 'ssr.spec.ts',
    },
    {
      name: 'ssr-hydrated-zoneless',
      use: { ...devices['Desktop Chrome'], baseURL: `http://localhost:${SSR_PORT}`, zoneless: true },
      testIgnore: 'ssr.spec.ts',
    },
  ],
  webServer: [
    {
      command: 'pnpm run serve:integration:static',
      url: 'http://localhost:4200',
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'node dist/server/server.mjs',
      url: `http://localhost:${SSR_PORT}`,
      env: { PORT: String(SSR_PORT) },
      reuseExistingServer: !process.env.CI,
    },
  ],
});
