import { expect, test } from '@playwright/test';

// These check the raw HTML the Node SSR server sends, not what a browser renders afterward, so
// they fetch the page instead of using Playwright's browser automation.
test.describe('SSR', () => {
  test('should render the picker with its emojis in the initial HTML', async ({ request }) => {
    const response = await request.get('/');

    expect(response.status()).toBe(200);

    const html = await response.text();

    expect(html).toContain('<title>Angular Emoji Mart ✨</title>');
    expect(html).toContain('ng-server-context="ssr"');
    // The anchors and the first three categories render with real emoji labels.
    expect(html).toContain('aria-label="👍, +1, thumbsup"');
    expect((html.match(/class="emoji-mart-emoji /g) ?? []).length).toBeGreaterThan(50);
  });

  test('should send hydration annotations so the client does not re-render from scratch', async ({
    request,
  }) => {
    const response = await request.get('/');
    const html = await response.text();

    expect((html.match(/ ngh="/g) ?? []).length).toBeGreaterThan(0);
    expect(html).toContain('id="ng-state"');
  });
});
