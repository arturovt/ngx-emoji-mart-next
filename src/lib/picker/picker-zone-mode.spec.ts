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

    // Let the picker finish the timers that it starts when it is created.
    await timeout();
    await frame();
    await timeout();

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

  // Known problem. The picker updates the preview outside of the Angular zone with
  // `ChangeDetectorRef.detectChanges()`. The `emoji` input of the preview is a signal now, and the
  // scheduler of Angular runs change detection for a signal that changes outside of the zone.
  // Remove `.fails` when this is fixed.
  it.fails('should not run change detection when an emoji is hovered', async () => {
    await start('<emoji-mart></emoji-mart>');

    firstEmoji().dispatchEvent(new MouseEvent('mouseenter'));
    firstEmoji().dispatchEvent(new MouseEvent('mouseleave'));
    await settleTicks();

    expect(ticks).toBe(0);
  });

  it('should run change detection when an output is observed', async () => {
    await start('<emoji-mart (emojiClick)="clicks = clicks + 1"></emoji-mart>');

    firstEmoji().click();
    await settleTicks();

    expect(ticks).toBeGreaterThan(0);
  });
});
