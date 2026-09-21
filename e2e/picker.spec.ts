import type { Page } from '@playwright/test';

import { expect, test } from './fixtures';

const search = (page: Page) => page.locator('.emoji-mart-search input');
const emojis = (page: Page) => page.locator('.emoji-mart-scroll .emoji-mart-emoji');
const category = (page: Page, name: string) =>
  page
    .locator('section.emoji-mart-category')
    .filter({ has: page.locator(`[data-name="${name}"]`) });

test.describe('Emoji picker', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should run with zone.js only when it is not zoneless', async ({ page, zoneless }) => {
    // The app starts after `zone.js` is loaded, so wait until it renders.
    await expect(page.locator('.emoji-mart-scroll')).toBeVisible();

    const hasZone = await page.evaluate(() => 'Zone' in window);

    expect(hasZone).toBe(!zoneless);
  });

  test('should render list of emojis', async ({ page }) => {
    await expect(page.locator('.emoji-mart-scroll')).toBeVisible();
  });

  test('should show the idle emoji in the preview', async ({ page }) => {
    await expect(page.locator('.emoji-mart-preview:visible .emoji-mart-emoji')).toBeVisible();
  });

  test('should show the title in the preview', async ({ page }) => {
    await expect(page.locator('.emoji-mart-preview:visible .emoji-mart-title-label')).toHaveText(
      'Pick your emoji…',
    );
  });

  test('should update preview emoji when emoji is hovered', async ({ page }) => {
    await search(page).fill('thumbs up');

    const emoji = page.locator('.emoji-mart-scroll ngx-emoji:visible span').first();
    const preview = page.locator('.emoji-mart-preview:visible');

    await emoji.dispatchEvent('mouseenter');

    await expect(preview).toContainText(':thumbsup:');

    await emoji.dispatchEvent('mouseleave');

    await expect(preview).not.toContainText(':thumbsup:');
  });

  test('should emit the emoji that is clicked', async ({ page }) => {
    await search(page).fill('thumbs up');

    // The demo logs the selected emoji.
    const message = page.waitForEvent('console', { predicate: m => m.type() === 'log' });
    await emojis(page).first().click();

    const emoji = await (await message).args()[0].jsonValue();
    expect(emoji).toEqual(expect.objectContaining({ id: '+1' }));
  });

  test('should show a clicked emoji in the recent category after a reload', async ({ page }) => {
    await search(page).fill('octopus');
    await emojis(page).first().click();

    await page.reload();

    await expect(
      category(page, 'Recent').locator('.emoji-mart-emoji[aria-label*="octopus"]'),
    ).toBeVisible();
  });

  test('should clear the search with the clear button', async ({ page }) => {
    const button = page.locator('.emoji-mart-search-icon');

    await expect(button).toBeDisabled();

    await search(page).fill('thumbs up');

    await expect(button).toBeEnabled();

    await button.click();

    await expect(search(page)).toHaveValue('');
    await expect(button).toBeDisabled();
  });

  test('should show a message when nothing is found', async ({ page }) => {
    await search(page).fill('zzzzqqqq');

    await expect(page.locator('.emoji-mart-no-results-label')).toHaveText('No Emoji Found');

    await search(page).fill('');

    await expect(page.locator('.emoji-mart-no-results-label')).toBeHidden();
  });

  test('should scroll to a category and select its anchor', async ({ page }) => {
    const anchor = page.locator('.emoji-mart-anchor[title="Objects"]');
    const scroll = page.locator('.emoji-mart-scroll');

    await expect(anchor).not.toHaveClass(/emoji-mart-anchor-selected/);

    await anchor.click();

    await expect(anchor).toHaveClass(/emoji-mart-anchor-selected/);
    await expect
      .poll(() => scroll.evaluate(element => element.scrollTop))
      .toBeGreaterThan(0);
  });

  test('should change the skin tone and remember it', async ({ page }) => {
    const swatch = (tone: number) =>
      page.locator(`.emoji-mart-skin-swatch.selected .emoji-mart-skin-tone-${tone}`);

    await search(page).fill('thumbs up');
    await expect(emojis(page).first()).not.toContainText('\u{1F3FD}');

    // The first click opens the list of skin tones and the second one picks a tone.
    await page.locator('.emoji-mart-skin-tone-1').click();
    await page.locator('.emoji-mart-skin-tone-4').click();

    await expect(swatch(4)).toBeVisible();
    await expect(emojis(page).first()).toContainText('\u{1F3FD}');

    await page.reload();

    await expect(swatch(4)).toBeVisible();
  });
});
