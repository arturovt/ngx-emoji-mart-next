import { test as base } from '@playwright/test';

export { expect } from '@playwright/test';

export interface E2EOptions {
  /** Runs the demo app without `zone.js` and with zoneless change detection. */
  zoneless: boolean;
}

export const test = base.extend<E2EOptions>({
  zoneless: [false, { option: true }],

  // The app reads this flag in `src/main.ts` before it starts.
  page: async ({ page, zoneless }, use) => {
    await page.addInitScript(value => {
      (window as { __zoneless?: boolean }).__zoneless = value;
    }, zoneless);
    await use(page);
  },
});
