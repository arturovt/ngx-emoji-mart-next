import { ChangeDetectionStrategy, Component } from '@angular/core';
import { By } from '@angular/platform-browser';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PickerModule } from './picker.module';
import { PickerComponent } from './picker.component';
import { frame, timeout } from './testing-utils';
import { hydrate, ssr } from './testing-ssr-utils';

describe('PickerComponent', () => {
  @Component({
    template: '<emoji-mart title="Pick your emoji…" emoji="point_up"></emoji-mart>',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [PickerModule],
  })
  class TestComponent {}

  let component: TestComponent;
  let fixture: ComponentFixture<TestComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestComponent],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(TestComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should update preview on `mouseenter` and `mouseleave` but should not trigger change detection', async () => {
    const picker = fixture.debugElement.query(By.directive(PickerComponent));
    expect(picker.componentInstance.previewEmoji()).toEqual(null);

    // Query category that has emojis to display (does not have class `emoji-mart-no-results`).
    const emojiMartCategory = document.querySelector(
      'section.emoji-mart-category:not(.emoji-mart-no-results)',
    )!;
    const emoji = emojiMartCategory.querySelector('ngx-emoji span')!;

    emoji.dispatchEvent(new MouseEvent('mouseenter'));

    expect(picker.componentInstance.previewEmoji()).toBeDefined();

    emoji.dispatchEvent(new MouseEvent('mouseleave'));

    // The preview is cleared in an animation frame.
    await frame();

    expect(picker.componentInstance.previewEmoji()).toEqual(null);

    // Let the picker finish the timers that it started when it was created.
    await timeout();
    await frame();
  });
});

describe('PickerComponent with real SSR and hydration', () => {
  // `ssr()` needs its own root component: `bootstrapApplication` requires one, and `<emoji-mart>`
  // on its own is not one.
  @Component({
    selector: 'app-root',
    template: '<emoji-mart title="Pick your emoji…" emoji="point_up"></emoji-mart>',
    imports: [PickerModule],
  })
  class ServerRoot {}

  // A second, distinct class for hydration, with an identical template. See `hydrate()`'s
  // comment for why this can't be `ServerRoot` again.
  @Component({
    selector: 'app-root',
    template: '<emoji-mart title="Pick your emoji…" emoji="point_up"></emoji-mart>',
    imports: [PickerModule],
  })
  class ClientRoot {}

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('should not grow the category it trimmed for a fast first paint', async () => {
    const html = await ssr(ServerRoot);

    // The category is trimmed to a smaller first batch for a fast first paint on the browser.
    // The server has no "later" to grow it back into, so the count below must stay the trimmed
    // one instead of the full ~500+ emojis the default first category actually has.
    const countInSsrOutput = (html.match(/<ngx-emoji\b/g) ?? []).length;
    expect(countInSsrOutput).toBeGreaterThan(0);
    expect(countInSsrOutput).toBeLessThan(100);
  });

  it('should not schedule a timer to grow it either, since there is nothing left to run it on afterward', async () => {
    const uncaughtErrors: unknown[] = [];
    const onError = (event: ErrorEvent) => uncaughtErrors.push(event.error ?? event.message);
    const onRejection = (event: PromiseRejectionEvent) => uncaughtErrors.push(event.reason);
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);

    try {
      await ssr(ServerRoot);

      // If a timer was left running on the server, this is roughly when it would fire. By then
      // `renderApplication` has already torn the app down, so the timer's callback would be
      // reaching into a component whose view no longer backs a real element.
      await timeout();
      await frame();
    } finally {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
    }

    expect(uncaughtErrors).toEqual([]);
  });

  it('should hydrate the server-rendered picker without a mismatch, then still grow the category on the client', async () => {
    const html = await ssr(ServerRoot);
    const countInSsrOutput = (html.match(/<ngx-emoji\b/g) ?? []).length;

    const { appRef, consoleErrors } = await hydrate(ClientRoot, html);

    // A hydration mismatch does not necessarily break the page (Angular can fall back to
    // re-rendering the mismatched part from scratch), but it does log an error. No errors here
    // means the client genuinely reused the server-rendered DOM instead of silently redoing it.
    expect(consoleErrors).toEqual([]);

    // The timer that grows the trimmed category back still runs on the client after hydration.
    await timeout();
    await frame();
    appRef.tick();

    const countAfterHydrationTimers = document.querySelectorAll('ngx-emoji').length;
    expect(countAfterHydrationTimers).toBeGreaterThan(countInSsrOutput);

    appRef.destroy();
  });
});
