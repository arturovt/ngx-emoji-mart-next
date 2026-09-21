import { expect, test } from './fixtures';

test.describe('Demo app', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should render native emojis by default and sheet emojis for a theme', async ({ page }) => {
    const emoji = page.locator('.emoji-mart-scroll .emoji-mart-emoji').first();

    await expect(emoji).toHaveClass(/emoji-mart-emoji-native/);

    await page.getByRole('button', { name: 'apple', exact: true }).click();

    await expect(page.getByRole('button', { name: 'apple', exact: true })).toHaveClass(
      /bg-indigo-600/,
    );
    await expect(emoji).not.toHaveClass(/emoji-mart-emoji-native/);
    await expect(emoji.locator('span').first()).toHaveCSS(
      'background-image',
      /emoji-datasource-apple/,
    );

    await page.getByRole('button', { name: 'native', exact: true }).click();

    await expect(emoji).toHaveClass(/emoji-mart-emoji-native/);
  });

  test('should switch dark mode', async ({ page }) => {
    const picker = page.locator('emoji-mart .emoji-mart');

    await page.getByRole('button', { name: 'dark', exact: true }).click();
    await expect(picker).toHaveClass(/emoji-mart-dark/);

    await page.getByRole('button', { name: 'light', exact: true }).click();
    await expect(picker).not.toHaveClass(/emoji-mart-dark/);

    await page.emulateMedia({ colorScheme: 'dark' });
    await page.getByRole('button', { name: 'auto', exact: true }).click();
    await expect(picker).toHaveClass(/emoji-mart-dark/);
  });

  test('should remember a clicked custom emoji in the recent category', async ({ page }) => {
    const category = (name: string) =>
      page
        .locator('section.emoji-mart-category')
        .filter({ has: page.locator(`[data-name="${name}"]`) });

    // "Party Parrot" has the short name of a standard emoji. The recent category must show the
    // custom emoji and not the standard one.
    await category('Custom').locator('.emoji-mart-emoji').first().click();

    await page.reload();

    const recent = category('Recent').locator('.emoji-mart-emoji.emoji-mart-emoji-custom');
    await expect(recent).toHaveCount(1);
    await expect(recent.locator('span').first()).toHaveCSS('background-image', /parrot\.gif/);
  });

  test('should find a custom emoji with the search', async ({ page }) => {
    // "Party Parrot" has the short name of a standard emoji, so the search finds both.
    await page.locator('.emoji-mart-search input').fill('parrot');

    const results = page
      .locator('section.emoji-mart-category')
      .filter({ has: page.locator('[data-name="Search"]') });

    await expect(results.locator('.emoji-mart-emoji')).toHaveCount(2);
    const custom = results.locator('.emoji-mart-emoji.emoji-mart-emoji-custom');
    await expect(custom).toHaveCount(1);
    await expect(custom.locator('span').first()).toHaveCSS('background-image', /parrot\.gif/);
  });

  test('should render the custom emojis', async ({ page }) => {
    const custom = page
      .locator('section.emoji-mart-category')
      .filter({ has: page.locator('[data-name="Custom"]') });

    await expect(page.locator('.emoji-mart-anchor[title="Custom"]')).toBeVisible();
    await expect(custom.locator('.emoji-mart-emoji')).toHaveCount(3);

    // "Party Parrot" has the short name of a standard emoji, but it must show the custom image.
    const parrot = custom.locator('.emoji-mart-emoji').first();
    await expect(parrot).toHaveClass(/emoji-mart-emoji-custom/);
    await expect(parrot.locator('span').first()).toHaveCSS('background-image', /parrot\.gif/);
  });
});
