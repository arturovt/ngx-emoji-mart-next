import { Component, NgZone } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EmojiData, EmojiService, categories } from 'ngx-emoji-mart-next/ngx-emoji';

import { PickerModule } from './picker.module';
import * as icons from './svgs';
import { frame, timeout } from './testing-utils';

/**
 * These tests describe the state that the picker derives from its inputs and then changes by
 * itself (merged `i18n` and icons, current skin, recent category, displayed categories and search
 * results). They only look at the DOM, `localStorage` and events.
 */
describe('PickerComponent state', () => {
  const STORAGE_KEYS = ['emoji-mart.skin', 'emoji-mart.frequently', 'emoji-mart.last'];

  function createPicker(template: string, props: Record<string, unknown> = {}) {
    @Component({ template, imports: [PickerModule] })
    class HostComponent {
      skinChanges: number[] = [];
    }

    const fixture = TestBed.createComponent(HostComponent);
    Object.assign(fixture.componentInstance, props);
    fixture.detectChanges();
    return fixture;
  }

  async function settle(fixture: ComponentFixture<unknown>) {
    // The picker draws the remaining categories in a `setTimeout` and measures them in an
    // animation frame.
    await timeout();
    await frame();
    fixture.detectChanges();
  }

  const one = (fixture: ComponentFixture<unknown>, selector: string) =>
    fixture.nativeElement.querySelector(selector) as HTMLElement;
  const all = (fixture: ComponentFixture<unknown>, selector: string) =>
    Array.from(fixture.nativeElement.querySelectorAll(selector)) as HTMLElement[];
  const categoryNames = (fixture: ComponentFixture<unknown>) =>
    all(fixture, '.emoji-mart-category-label').map(label => label.dataset['name']);
  const emojiLabels = (container: HTMLElement) =>
    Array.from(container.querySelectorAll('ngx-emoji .emoji-mart-emoji')).map(
      element => element.getAttribute('aria-label') ?? '',
    );
  const selectedSkin = (fixture: ComponentFixture<unknown>) =>
    one(fixture, '.emoji-mart-skin-swatch.selected .emoji-mart-skin')!.className;

  beforeEach(() => STORAGE_KEYS.forEach(key => localStorage.removeItem(key)));
  afterEach(() => STORAGE_KEYS.forEach(key => localStorage.removeItem(key)));

  describe('i18n', () => {
    it('should use the default strings', async () => {
      const fixture = createPicker('<emoji-mart></emoji-mart>');
      await settle(fixture);

      expect((one(fixture, '.emoji-mart-search input') as HTMLInputElement).placeholder).toBe(
        'Search',
      );
      expect(one(fixture, '.emoji-mart-scroll').getAttribute('aria-label')).toBe('List of emoji');
      expect(one(fixture, '.emoji-mart-anchor[title="Smileys & People"]')).not.toBeNull();
    });

    it('should merge a partial `i18n` with the defaults', async () => {
      const fixture = createPicker('<emoji-mart [i18n]="i18n"></emoji-mart>', {
        i18n: { search: 'Buscar', categories: { people: 'Gente' } },
      });
      await settle(fixture);

      expect((one(fixture, '.emoji-mart-search input') as HTMLInputElement).placeholder).toBe(
        'Buscar',
      );
      // Not overridden, so it keeps the default.
      expect(one(fixture, '.emoji-mart-scroll').getAttribute('aria-label')).toBe('List of emoji');
      expect(one(fixture, '.emoji-mart-anchor[title="Gente"]')).not.toBeNull();
      expect(one(fixture, '.emoji-mart-anchor[title="Animals & Nature"]')).not.toBeNull();
    });
  });

  describe('skin', () => {
    it('should use the first skin by default', async () => {
      const fixture = createPicker('<emoji-mart></emoji-mart>');
      await settle(fixture);

      expect(selectedSkin(fixture)).toContain('emoji-mart-skin-tone-1');
    });

    it('should use the `skin` input', async () => {
      const fixture = createPicker('<emoji-mart [skin]="4"></emoji-mart>');
      await settle(fixture);

      expect(selectedSkin(fixture)).toContain('emoji-mart-skin-tone-4');
    });

    it('should prefer the skin saved in `localStorage` and not emit `skinChange` for it', async () => {
      localStorage.setItem('emoji-mart.skin', '3');
      const fixture = createPicker(
        '<emoji-mart [skin]="4" (skinChange)="skinChanges.push($event)"></emoji-mart>',
      );
      await settle(fixture);

      expect(selectedSkin(fixture)).toContain('emoji-mart-skin-tone-3');
      expect(fixture.componentInstance).toEqual(expect.objectContaining({ skinChanges: [] }));
    });

    it('should update the skin, save it and emit `skinChange` when a skin is picked', async () => {
      const fixture = createPicker(
        '<emoji-mart (skinChange)="skinChanges.push($event)"></emoji-mart>',
      );
      await settle(fixture);

      // The first click opens the list of skins and the second one picks a skin.
      one(fixture, '.emoji-mart-skin-tone-1').click();
      fixture.detectChanges();
      one(fixture, '.emoji-mart-skin-tone-5').click();
      fixture.detectChanges();

      expect(selectedSkin(fixture)).toContain('emoji-mart-skin-tone-5');
      expect(localStorage.getItem('emoji-mart.skin')).toBe('5');
      expect(fixture.componentInstance).toEqual(expect.objectContaining({ skinChanges: [5] }));
    });
  });

  describe('recent emojis', () => {
    // Emojis in the first category that has emojis (the `recent` category is not empty by default).
    const clickFirstEmoji = (fixture: ComponentFixture<unknown>) =>
      one(
        fixture,
        'section.emoji-mart-category:not(.emoji-mart-no-results) ngx-emoji span',
      ).click();

    it('should remember a clicked emoji by default', async () => {
      const fixture = createPicker('<emoji-mart></emoji-mart>');
      await settle(fixture);

      clickFirstEmoji(fixture);

      expect(localStorage.getItem('emoji-mart.frequently')).not.toBeNull();
      expect(localStorage.getItem('emoji-mart.last')).not.toBeNull();
    });

    it('should not remember a clicked emoji when the `recent` category is excluded', async () => {
      const fixture = createPicker('<emoji-mart [exclude]="[\'recent\']"></emoji-mart>');
      await settle(fixture);

      clickFirstEmoji(fixture);

      expect(localStorage.getItem('emoji-mart.frequently')).toBeNull();
    });

    it('should not remember a clicked emoji when the `recent` category is not included', async () => {
      const fixture = createPicker('<emoji-mart [include]="[\'people\']"></emoji-mart>');
      await settle(fixture);

      clickFirstEmoji(fixture);

      expect(localStorage.getItem('emoji-mart.frequently')).toBeNull();
    });

    it('should not remember a clicked emoji when `recent` is provided', async () => {
      const fixture = createPicker('<emoji-mart [recent]="recent"></emoji-mart>', {
        recent: ['sunglasses', 'heart'],
      });
      await settle(fixture);

      clickFirstEmoji(fixture);

      expect(localStorage.getItem('emoji-mart.frequently')).toBeNull();
    });

    it('should show the provided `recent` emojis in the recent category', async () => {
      const fixture = createPicker('<emoji-mart [recent]="recent"></emoji-mart>', {
        recent: ['sunglasses', 'heart'],
      });
      await settle(fixture);

      const recent = one(fixture, '.emoji-mart-category-label[data-name="Recent"]')
        .parentElement as HTMLElement;
      const labels = emojiLabels(recent);

      expect(labels.length).toBe(2);
      expect(labels[0]).toContain('sunglasses');
      expect(labels[1]).toContain('heart');
    });
  });

  describe('displayed categories', () => {
    it('should first draw only the first three categories and then draw all of them', async () => {
      const fixture = createPicker('<emoji-mart></emoji-mart>');

      expect(categoryNames(fixture)).toEqual(['Search', 'Recent', 'Smileys & People']);

      await settle(fixture);

      // Search, Recent and all categories with emojis.
      expect(categoryNames(fixture).length).toBe(categories.length + 2);
    });

    it('should draw only the selected category (and search) with `showSingleCategory`', async () => {
      const fixture = createPicker('<emoji-mart [showSingleCategory]="true"></emoji-mart>');
      await settle(fixture);

      expect(categoryNames(fixture)).toEqual(['Search', 'Recent']);

      // The anchors are: Recent, People, Nature, ...
      all(fixture, '.emoji-mart-anchor')[2].click();
      fixture.detectChanges();

      expect(categoryNames(fixture)).toEqual(['Search', 'Animals & Nature']);
    });
  });

  describe('icons', () => {
    const anchorPath = (fixture: ComponentFixture<unknown>, title: string) =>
      one(fixture, `.emoji-mart-anchor[title="${title}"] path`).getAttribute('d');
    const searchPath = (fixture: ComponentFixture<unknown>) =>
      one(fixture, '.emoji-mart-search svg path').getAttribute('d');

    it('should merge partial `categoriesIcons` with the default icons', async () => {
      const fixture = createPicker(
        '<emoji-mart [categoriesIcons]="categoriesIcons"></emoji-mart>',
        { categoriesIcons: { people: 'M0 0h1' } },
      );
      await settle(fixture);

      expect(anchorPath(fixture, 'Smileys & People')).toBe('M0 0h1');
      expect(anchorPath(fixture, 'Animals & Nature')).toBe(icons.categories['nature']);
    });

    it('should merge partial `searchIcons` with the default icons', async () => {
      const fixture = createPicker('<emoji-mart [searchIcons]="searchIcons"></emoji-mart>', {
        searchIcons: { search: 'M1 1h1' },
      });
      await settle(fixture);

      expect(searchPath(fixture)).toBe('M1 1h1');

      const input = one(fixture, '.emoji-mart-search input') as HTMLInputElement;
      input.value = 'thumbs';
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      // The `delete` icon was not provided so it comes from the defaults.
      expect(searchPath(fixture)).toBe(icons.search['delete']);
    });
  });

  describe('search button', () => {
    it('should show the search icon, and the clear icon only while searching', async () => {
      const fixture = createPicker('<emoji-mart></emoji-mart>');
      await settle(fixture);

      const button = one(fixture, '.emoji-mart-search-icon') as HTMLButtonElement;
      const iconPath = () => one(fixture, '.emoji-mart-search svg path').getAttribute('d');
      const input = one(fixture, '.emoji-mart-search input') as HTMLInputElement;

      expect(iconPath()).toBe(icons.search['search']);
      expect(button.disabled).toBe(true);

      input.value = 'thumbs';
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      expect(iconPath()).toBe(icons.search['delete']);
      expect(button.disabled).toBe(false);

      button.click();
      fixture.detectChanges();
      await settle(fixture);

      expect(input.value).toBe('');
      expect(iconPath()).toBe(icons.search['search']);
      expect(button.disabled).toBe(true);
    });
  });

  describe('width', () => {
    const width = (fixture: ComponentFixture<unknown>) =>
      one(fixture, 'section.emoji-mart').style.width;

    it('should depend on `perLine` and `emojiSize`', async () => {
      const wide = createPicker('<emoji-mart [perLine]="9" [emojiSize]="24"></emoji-mart>');
      const narrow = createPicker('<emoji-mart [perLine]="5" [emojiSize]="24"></emoji-mart>');
      const small = createPicker('<emoji-mart [perLine]="9" [emojiSize]="20"></emoji-mart>');
      await settle(wide);
      await settle(narrow);
      await settle(small);

      // Each emoji takes `emojiSize + 12` pixels.
      expect(parseFloat(width(wide)) - parseFloat(width(narrow))).toBe(4 * (24 + 12));
      expect(parseFloat(width(wide)) - parseFloat(width(small))).toBe(9 * (24 - 20));
    });

    it('should use the width of the `style` input', async () => {
      const fixture = createPicker('<emoji-mart [style]="{ width: \'300px\' }"></emoji-mart>');
      await settle(fixture);

      expect(width(fixture)).toBe('300px');
    });
  });

  describe('custom emojis', () => {
    it('should render a custom emoji that has the short name of a standard emoji', async () => {
      const fixture = createPicker('<emoji-mart [custom]="custom"></emoji-mart>', {
        custom: [
          {
            name: 'Party Parrot',
            shortNames: ['parrot'],
            keywords: ['party'],
            imageUrl: './parrot.gif',
          },
        ],
      });
      await settle(fixture);

      const category = one(fixture, '.emoji-mart-category-label[data-name="Custom"]')
        .parentElement as HTMLElement;
      const parrot = category.querySelector('.emoji-mart-emoji') as HTMLElement;

      expect(parrot.classList.contains('emoji-mart-emoji-custom')).toBe(true);
      expect((parrot.firstElementChild as HTMLElement).style.backgroundImage).toContain(
        'parrot.gif',
      );
    });
  });

  // In an application with zone.js, entering the Angular zone runs change detection. The picker
  // updates its preview on its own, and it enters the zone only for an output that is observed.
  describe('Angular zone', () => {
    const firstEmoji = (fixture: ComponentFixture<unknown>) =>
      one(fixture, 'section.emoji-mart-category:not(.emoji-mart-no-results) .emoji-mart-emoji');

    it('should not enter the zone for the preview or when nobody listens to the outputs', async () => {
      const fixture = createPicker('<emoji-mart></emoji-mart>');
      await settle(fixture);
      const run = vi.spyOn(TestBed.inject(NgZone), 'run');

      // Angular's own scheduler enters the zone later in a test without zone.js, so nothing is
      // awaited here. `fixture.detectChanges` enters the zone too, so it is not called either.
      firstEmoji(fixture).dispatchEvent(new MouseEvent('mouseenter'));
      expect(one(fixture, '.emoji-mart-preview:not([hidden])')).not.toBeNull();
      firstEmoji(fixture).dispatchEvent(new MouseEvent('mouseleave'));
      firstEmoji(fixture).click();

      expect(run).not.toHaveBeenCalled();
      await frame();
    });

    it.each(['emojiClick', 'emojiSelect'])(
      'should still not enter the zone when %s is observed',
      async output => {
        const fixture = createPicker(`<emoji-mart (${output})="events.push(1)"></emoji-mart>`, {
          events: [],
        });
        await settle(fixture);
        const run = vi.spyOn(TestBed.inject(NgZone), 'run');

        firstEmoji(fixture).click();

        expect(run).not.toHaveBeenCalled();
        expect((fixture.componentInstance as any).events.length).toBe(1);
      },
    );
  });

  describe('custom and standard emojis with the same id', () => {
    const custom = [
      {
        name: 'Party Parrot',
        shortNames: ['parrot'],
        keywords: ['party'],
        imageUrl: './parrot.gif',
      },
    ];
    const template = '<emoji-mart [custom]="custom"></emoji-mart>';
    const parrots = (fixture: ComponentFixture<unknown>) =>
      all(fixture, '.emoji-mart-category .emoji-mart-emoji').filter(element =>
        /(^|, )parrot$/.test(element.getAttribute('aria-label') ?? ''),
      );
    const isCustom = (element: HTMLElement) =>
      element.classList.contains('emoji-mart-emoji-custom');
    const previewName = (fixture: ComponentFixture<unknown>) =>
      one(
        fixture,
        '.emoji-mart-preview:not([hidden]) .emoji-mart-preview-name',
      ).textContent!.trim();

    it('should show the emoji that is hovered in the preview', async () => {
      const fixture = createPicker(template, { custom });
      await settle(fixture);
      const standard = parrots(fixture).find(element => !isCustom(element))!;
      const party = parrots(fixture).find(isCustom)!;

      standard.dispatchEvent(new MouseEvent('mouseenter'));
      fixture.detectChanges();
      expect(previewName(fixture)).toBe('Parrot');

      standard.dispatchEvent(new MouseEvent('mouseleave'));
      party.dispatchEvent(new MouseEvent('mouseenter'));
      fixture.detectChanges();
      expect(previewName(fixture)).toBe('Party Parrot');
    });

    it('should find both of them with the search', async () => {
      const fixture = createPicker(template, { custom });
      await settle(fixture);

      const input = one(fixture, '.emoji-mart-search input') as HTMLInputElement;
      input.value = 'parrot';
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();
      await settle(fixture);

      const results = one(fixture, '.emoji-mart-category-label[data-name="Search"]')
        .parentElement as HTMLElement;
      const found = Array.from(results.querySelectorAll('.emoji-mart-emoji')) as HTMLElement[];

      expect(found.map(isCustom).sort()).toEqual([false, true]);
    });

    it('should remember each of them in the recent category', async () => {
      const first = createPicker(template, { custom });
      await settle(first);
      parrots(first).find(isCustom)!.click();
      parrots(first).find(element => !isCustom(element))!.click();

      const second = createPicker(template, { custom });
      await settle(second);
      const recent = one(second, '.emoji-mart-category-label[data-name="Recent"]')
        .parentElement as HTMLElement;
      const recentParrots = Array.from(recent.querySelectorAll('.emoji-mart-emoji')).filter(
        element => /(^|, )parrot$/.test(element.getAttribute('aria-label') ?? ''),
      ) as HTMLElement[];

      expect(recentParrots.map(isCustom).sort()).toEqual([false, true]);
    });
  });

  describe('preview', () => {
    const idleTitle = (fixture: ComponentFixture<unknown>) =>
      one(fixture, '.emoji-mart-title-label').textContent!.trim();

    it('should show the default title when no emoji is hovered', async () => {
      const fixture = createPicker('<emoji-mart></emoji-mart>');
      await settle(fixture);

      expect(idleTitle(fixture)).toBe('Emoji Mart™');
    });

    it('should show the `title` input when no emoji is hovered', async () => {
      const fixture = createPicker('<emoji-mart title="Pick your emoji…"></emoji-mart>');
      await settle(fixture);

      expect(idleTitle(fixture)).toBe('Pick your emoji…');
    });

    it('should show the name, short names and emoticons of the hovered emoji', async () => {
      const fixture = createPicker('<emoji-mart></emoji-mart>');
      await settle(fixture);

      const input = one(fixture, '.emoji-mart-search input') as HTMLInputElement;
      input.value = 'smile';
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();
      await settle(fixture);

      const emoji = all(fixture, '.emoji-mart-category .emoji-mart-emoji').find(element =>
        /(^|, )smile$/.test(element.getAttribute('aria-label') ?? ''),
      );
      expect(emoji).toBeDefined();
      emoji!.dispatchEvent(new MouseEvent('mouseenter'));
      fixture.detectChanges();

      const data = TestBed.inject(EmojiService).getData('smile', 1, 'apple') as EmojiData;
      const text = (selector: string) =>
        all(fixture, `.emoji-mart-preview:not([hidden]) ${selector}`).map(e =>
          e.textContent!.trim(),
        );
      const emoticons = (data.emoticons ?? []).filter(
        (emoticon, index, list) =>
          list.findIndex(other => other.toLowerCase() === emoticon.toLowerCase()) === index,
      );

      expect(text('.emoji-mart-preview-name')).toEqual([data.name]);
      expect(text('span.emoji-mart-preview-shortname')).toEqual(
        data.shortNames.map(name => `:${name}:`),
      );
      expect(emoticons.length).toBeGreaterThan(0);
      expect(text('.emoji-mart-preview-emoticon')).toEqual(emoticons);
    });
  });

  describe('search results', () => {
    const searchCategory = (fixture: ComponentFixture<unknown>) =>
      one(fixture, '.emoji-mart-category-label[data-name="Search"]').parentElement as HTMLElement;

    it('should show the results in the search category and hide it when the search is cleared', async () => {
      const fixture = createPicker('<emoji-mart></emoji-mart>');
      await settle(fixture);

      const input = one(fixture, '.emoji-mart-search input') as HTMLInputElement;
      input.value = 'thumbs up';
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();
      await settle(fixture);

      const labels = emojiLabels(searchCategory(fixture));
      expect(labels.length).toBeGreaterThan(0);
      expect(labels[0]).toContain('thumbsup');
      expect(searchCategory(fixture).style.display).toBe('block');
      expect(searchCategory(fixture).classList).not.toContain('emoji-mart-no-results');

      input.value = '';
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();
      await settle(fixture);

      expect(searchCategory(fixture).style.display).toBe('none');
      expect(searchCategory(fixture).classList).toContain('emoji-mart-no-results');
    });
  });
});
