import { ApplicationRef, Component, NgZone, createComponent, provideZoneChangeDetection } from '@angular/core';
import { createApplication } from '@angular/platform-browser';

import { PickerModule } from './picker.module';
import { frame, timeout } from './testing-utils';

/**
 * The other tests run without zone.js. This file loads it and starts an application with zone.js.
 * Change detection of the whole application runs when the Angular zone becomes stable, so counting
 * `onMicrotaskEmpty` shows if an event made the application run change detection.
 */
describe('PickerComponent in an application with zone.js', () => {
  let app: ApplicationRef;
  let host: HTMLElement;
  let ticks: number;

  async function start(template: string) {
    @Component({ template, imports: [PickerModule] })
    class HostComponent {
      clicks = 0;
    }

    await import('zone.js');
    app = await createApplication({ providers: [provideZoneChangeDetection()] });
    host = document.createElement('div');
    document.body.appendChild(host);
    const component = createComponent(HostComponent, {
      environmentInjector: app.injector,
      hostElement: host,
    });
    app.attachView(component.hostView);
    app.tick();

    // Let the picker finish the timers that it starts when it is created, and let every
    // initially-rendered emoji's `resource()`-backed data load finish too.
    await timeout();
    await frame();
    await timeout();
    await app.whenStable();

    ticks = 0;
    app.injector.get(NgZone).onMicrotaskEmpty.subscribe(() => ticks++);
  }

  afterEach(() => {
    app?.destroy();
    host?.remove();
  });

  const firstEmoji = () =>
    host.querySelector(
      'section.emoji-mart-category:not(.emoji-mart-no-results) .emoji-mart-emoji',
    ) as HTMLElement;
  const settleTicks = async () => {
    await frame();
    await timeout();
    await frame();
  };

  it('should not run change detection when an emoji is clicked and nobody listens', async () => {
    await start('<emoji-mart></emoji-mart>');

    firstEmoji().click();
    await settleTicks();

    expect(ticks).toBe(0);
  });

  it('should not run change detection when an emoji is hovered and the preview is off', async () => {
    await start('<emoji-mart [showPreview]="false"></emoji-mart>');

    firstEmoji().dispatchEvent(new MouseEvent('mouseenter'));
    firstEmoji().dispatchEvent(new MouseEvent('mouseleave'));
    await settleTicks();

    expect(ticks).toBe(0);
  });

  // Known problem. `PickerComponent.handleEmojiOver` writes the `previewEmoji` signal outside
  // the Angular zone (by design, for performance — see the "should not enter the zone for the
  // preview" test in picker-state.spec.ts), but Angular's scheduler still runs change detection
  // for a signal write outside the zone. The same gap also makes `PreviewComponent`'s now
  // `resource()`-backed data occasionally (rarely, only with real zone.js — not seen in zoneless
  // or SSR e2e runs) miss a render after hovering, since the resource's own zone re-entry on
  // resolution can race with this. Wrapping the write in `ngZone.run()` would fix both, but was
  // rejected: it directly contradicts the "should not enter the zone for the preview" test's
  // invariant, trading a confirmed, tested design decision for a rare e2e flake.
  // Remove `.fails` when this is fixed.
  it.fails('should not run change detection when an emoji is hovered', async () => {
    await start('<emoji-mart></emoji-mart>');

    firstEmoji().dispatchEvent(new MouseEvent('mouseenter'));
    firstEmoji().dispatchEvent(new MouseEvent('mouseleave'));
    await settleTicks();

    expect(ticks).toBe(0);
  });

  it('should still not run change detection when an output is observed', async () => {
    await start('<emoji-mart (emojiClick)="clicks = clicks + 1"></emoji-mart>');

    firstEmoji().click();
    await settleTicks();

    expect(ticks).toBe(0);
  });

  it('should not report its first stable state until every rendered emoji has actually loaded, even with zone.js loaded', async () => {
    @Component({ template: '<emoji-mart></emoji-mart>', imports: [PickerModule] })
    class HostComponent {}

    await import('zone.js');
    app = await createApplication({ providers: [provideZoneChangeDetection()] });
    host = document.createElement('div');
    document.body.appendChild(host);
    const component = createComponent(HostComponent, {
      environmentInjector: app.injector,
      hostElement: host,
    });
    app.attachView(component.hostView);
    app.tick();

    // Each rendered <ngx-emoji> loads its data through a `resource()`, which — unlike the bare
    // `setTimeout` the picker separately uses to backfill a trimmed category for a fast first
    // paint — is tracked by Angular's pending-task system. So `whenStable()` genuinely waits for
    // every initially-rendered emoji's data, not just for the view's own synchronous structure.
    await app.whenStable();

    const placeholders = host.querySelectorAll('.emoji-mart-emoji-loading');
    expect(placeholders.length).toBe(0);
    expect(host.querySelectorAll('.emoji-mart-emoji').length).toBeGreaterThan(0);
  });
});
