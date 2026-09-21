import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EmojiComponent } from './emoji.component';

describe('EmojiComponent', () => {
  function createEmoji(template: string, props: Record<string, unknown> = {}) {
    @Component({ template, imports: [EmojiComponent] })
    class HostComponent {
      name = signal<unknown>('');
      tooltip = signal(false);
      events: string[] = [];
      fallbackCalls: { size: unknown; emoji: unknown }[] = [];
      fallback = (_data: unknown, props: { size: unknown; emoji: unknown }) => {
        this.fallbackCalls.push({ size: props.size, emoji: props.emoji });
        return ':fallback:';
      };
    }

    const fixture = TestBed.createComponent(HostComponent);
    Object.assign(fixture.componentInstance, props);
    fixture.detectChanges();
    return fixture;
  }

  const emoji = (fixture: ComponentFixture<unknown>) =>
    fixture.nativeElement.querySelector('.emoji-mart-emoji') as HTMLElement | null;
  const inner = (fixture: ComponentFixture<unknown>) =>
    emoji(fixture)!.firstElementChild as HTMLElement;

  it('should render a native emoji', () => {
    const fixture = createEmoji('<ngx-emoji emoji="+1" [isNative]="true" [size]="30"/>');

    expect(emoji(fixture)!.classList.contains('emoji-mart-emoji-native')).toBe(true);
    expect(emoji(fixture)!.textContent!.trim()).toBe('👍');
    expect(emoji(fixture)!.getAttribute('aria-label')).toMatch(/^👍, \+1, .*thumbsup$/);
    expect(inner(fixture).style.fontSize).toBe('30px');
  });

  it('should force the size of a native emoji', () => {
    const fixture = createEmoji(
      '<ngx-emoji emoji="+1" [isNative]="true" [forceSize]="true" [size]="30"/>',
    );

    expect(inner(fixture).style.display).toBe('inline-block');
    expect(inner(fixture).style.width).toBe('30px');
    expect(inner(fixture).style.height).toBe('30px');
  });

  it('should render an emoji from a sheet', () => {
    const fixture = createEmoji('<ngx-emoji emoji="+1" set="apple" [size]="30"/>');

    expect(emoji(fixture)!.classList.contains('emoji-mart-emoji-native')).toBe(false);
    expect(inner(fixture).style.backgroundImage).toContain('emoji-datasource-apple');
    expect(inner(fixture).style.width).toBe('30px');
    expect(inner(fixture).style.height).toBe('30px');
  });

  it('should render a custom emoji', () => {
    const fixture = createEmoji('<ngx-emoji [emoji]="custom" [size]="30"/>', {
      custom: {
        id: 'my-emoji',
        name: 'My emoji',
        shortNames: ['my-emoji'],
        keywords: ['mine'],
        imageUrl: './my-emoji.png',
      },
    });

    expect(emoji(fixture)!.classList.contains('emoji-mart-emoji-custom')).toBe(true);
    expect(emoji(fixture)!.getAttribute('aria-label')).toBe('my-emoji');
    expect(inner(fixture).style.backgroundImage).toContain('my-emoji.png');
    expect(inner(fixture).style.width).toBe('30px');
  });

  it('should show the short name as the title only with `tooltip`', () => {
    const withTooltip = createEmoji('<ngx-emoji emoji="+1" [tooltip]="true"/>');
    const withoutTooltip = createEmoji('<ngx-emoji emoji="+1"/>');

    expect(emoji(withTooltip)!.getAttribute('title')).toBe('+1');
    expect(emoji(withoutTooltip)!.hasAttribute('title')).toBe(false);
  });

  it('should render nothing for an unknown emoji', () => {
    const fixture = createEmoji('<ngx-emoji emoji="not-an-emoji"/>');

    expect(emoji(fixture)).toBeNull();
  });

  it('should render a button with `useButton`', () => {
    const fixture = createEmoji('<ngx-emoji emoji="+1" [useButton]="true"/>');

    expect(emoji(fixture)!.tagName).toBe('BUTTON');
  });

  it('should update when the inputs change', () => {
    const fixture = createEmoji('<ngx-emoji [emoji]="name()" [isNative]="true"/>');
    fixture.componentInstance.name.set('+1');
    fixture.detectChanges();

    expect(emoji(fixture)!.getAttribute('aria-label')).toMatch(/^👍, \+1/);

    fixture.componentInstance.name.set('grinning');
    fixture.detectChanges();

    expect(emoji(fixture)!.getAttribute('aria-label')).toMatch(/^😀, grinning/);
  });

  it('should not keep the title or the custom class when the inputs change back', () => {
    const fixture = createEmoji(
      '<ngx-emoji [emoji]="name()" [tooltip]="tooltip()" [isNative]="true"/>',
    );
    fixture.componentInstance.name.set({
      id: 'my-emoji',
      name: 'My emoji',
      shortNames: ['my-emoji'],
      keywords: [],
      imageUrl: './my-emoji.png',
    });
    fixture.componentInstance.tooltip.set(true);
    fixture.detectChanges();

    expect(emoji(fixture)!.classList.contains('emoji-mart-emoji-custom')).toBe(true);
    expect(emoji(fixture)!.getAttribute('title')).toBe('my-emoji');

    fixture.componentInstance.name.set('+1');
    fixture.componentInstance.tooltip.set(false);
    fixture.detectChanges();

    expect(emoji(fixture)!.classList.contains('emoji-mart-emoji-custom')).toBe(false);
    expect(emoji(fixture)!.hasAttribute('title')).toBe(false);
  });

  it('should emit the emoji on click, mouseenter and mouseleave', () => {
    const fixture = createEmoji(`<ngx-emoji
      emoji="+1"
      (emojiClick)="events.push('click ' + $event.emoji.id)"
      (emojiOver)="events.push('over ' + $event.emoji.id)"
      (emojiLeave)="events.push('leave ' + $event.emoji.id)"
    />`);

    emoji(fixture)!.dispatchEvent(new MouseEvent('mouseenter'));
    emoji(fixture)!.dispatchEvent(new MouseEvent('mouseleave'));
    emoji(fixture)!.click();

    expect(fixture.componentInstance).toEqual(
      expect.objectContaining({ events: ['over +1', 'leave +1', 'click +1'] }),
    );
  });

  describe('fallback', () => {
    // `melting_face` is not available in the `facebook` set.
    const template = '<ngx-emoji emoji="melting_face" set="facebook" [size]="26"';

    it('should render nothing without a fallback', () => {
      const fixture = createEmoji(`${template}/>`);

      expect(emoji(fixture)).toBeNull();
    });

    it('should render the emoji and call the fallback with the plain props', () => {
      const fixture = createEmoji(`${template} [fallback]="fallback"/>`);

      expect(emoji(fixture)).not.toBeNull();
      expect(fixture.componentInstance).toEqual(
        expect.objectContaining({ fallbackCalls: [{ size: 26, emoji: 'melting_face' }] }),
      );
    });
  });
});
