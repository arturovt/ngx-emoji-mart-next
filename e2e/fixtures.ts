import { test as base } from '@playwright/test';

export { expect } from '@playwright/test';

export interface E2EOptions {
  /** Runs the demo app without `zone.js` and with zoneless change detection. */
  zoneless: boolean;
}

// A 1x1 transparent PNG.
const IMAGE = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
);

export const test = base.extend<E2EOptions>({
  zoneless: [false, { option: true }],

  page: async ({ page, zoneless }, use) => {
    // The tests must not depend on the network. The app loads emoji sheets and custom emoji
    // images from these hosts.
    await page.route(/^https:\/\/(cdn\.jsdelivr\.net|github\.githubassets\.com)\//, route =>
      route.fulfill({ contentType: 'image/png', body: IMAGE }),
    );

    // The app reads this flag in `src/main.ts` before it starts.
    await page.addInitScript(value => {
      (window as { __zoneless?: boolean }).__zoneless = value;
    }, zoneless);
    await use(page);
  },
});
