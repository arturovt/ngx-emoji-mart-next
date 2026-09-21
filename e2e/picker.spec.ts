import { expect, test } from './fixtures';

test.describe('Emoji picker', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should run with zone.js only when it is not zoneless', async ({ page, zoneless }) => {
    const hasZone = await page.evaluate(() => 'Zone' in window);

    expect(hasZone).toBe(!zoneless);
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
