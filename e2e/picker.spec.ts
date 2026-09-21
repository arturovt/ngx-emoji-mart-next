import { expect, test } from '@playwright/test';

test.describe('Emoji picker', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should render list of emojis', async ({ page }) => {
    await expect(page.locator('.emoji-mart-scroll')).toBeVisible();
  });

  test('should update preview emoji when emoji is hovered', async ({ page }) => {
    await page.locator('.emoji-mart-search input').fill('thumbs up');

    const emoji = page.locator('.emoji-mart-scroll ngx-emoji:visible span').first();
    const preview = page.locator('.emoji-mart-preview:visible');

    await emoji.dispatchEvent('mouseenter');

    await expect(preview).toContainText(':thumbsup:');

    await emoji.dispatchEvent('mouseleave');

    await expect(preview).not.toContainText(':thumbsup:');
  });
});
