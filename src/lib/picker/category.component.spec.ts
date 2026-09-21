import { Component, signal, viewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CategoryComponent } from './category.component';

describe('CategoryComponent', () => {
  @Component({
    template: `
      <emoji-category
        id="people"
        name="People"
        [i18n]="i18n"
        [emojis]="emojis()"
        [hasStickyPosition]="sticky()"
        [notFoundEmoji]="'sleuth_or_spy'"
        [emojiIsNative]="true"
        [emojiSkin]="1"
        [emojiSize]="24"
        [emojiSet]="'apple'"
        [emojiSheetSize]="64"
        [emojiForceSize]="false"
        [emojiTooltip]="false"
        [emojiBackgroundImageFn]="backgroundImageFn"
      />
    `,
    imports: [CategoryComponent],
  })
  class HostComponent {
    i18n = { categories: { people: 'People' }, notfound: 'Nothing here' };
    emojis = signal<any[] | null>(null);
    sticky = signal(true);
    backgroundImageFn = () => '';
    category = viewChild.required(CategoryComponent);
  }

  function createCategory(emojis: any[] | null = null) {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.emojis.set(emojis);
    fixture.detectChanges();
    return fixture;
  }

  const section = (fixture: ComponentFixture<HostComponent>) =>
    fixture.nativeElement.querySelector('section.emoji-mart-category') as HTMLElement;
  const labels = (fixture: ComponentFixture<HostComponent>) =>
    Array.from(section(fixture).querySelectorAll('.emoji-mart-emoji')).map(
      element => element.getAttribute('aria-label') ?? '',
    );

  it('should render the emojis', () => {
    const fixture = createCategory(['+1', 'grinning']);

    expect(labels(fixture).length).toBe(2);
    expect(labels(fixture)[0]).toContain('thumbsup');
    expect(labels(fixture)[1]).toContain('grinning');
    expect(section(fixture).classList.contains('emoji-mart-no-results')).toBe(false);
    expect(section(fixture).style.display).toBe('');
  });

  it('should skip emojis that do not exist', () => {
    const fixture = createCategory(['+1', 'not-an-emoji', null]);

    expect(labels(fixture).length).toBe(1);
  });

  it('should hide the category and show the message when there are no emojis', () => {
    const fixture = createCategory([]);

    expect(section(fixture).classList.contains('emoji-mart-no-results')).toBe(true);
    expect(section(fixture).style.display).toBe('none');
    expect(section(fixture).querySelector('.emoji-mart-no-results-label')!.textContent).toContain(
      'Nothing here',
    );
  });

  it('should show and hide the category with `updateDisplay`', () => {
    const fixture = createCategory([]);
    const category = fixture.componentInstance.category();

    // A search without results shows the category with the message.
    category.updateDisplay('block');
    expect(section(fixture).style.display).toBe('block');
    expect(section(fixture).classList.contains('emoji-mart-no-results')).toBe(true);

    category.updateDisplay('none');
    expect(section(fixture).style.display).toBe('none');
  });

  it('should show the emojis that `displayedEmojis` is set to', () => {
    const fixture = createCategory([]);
    const category = fixture.componentInstance.category();

    category.displayedEmojis.set(['+1']);
    category.updateDisplay('block');

    expect(labels(fixture).length).toBe(1);
    expect(section(fixture).classList.contains('emoji-mart-no-results')).toBe(false);
  });

  it('should update when the `emojis` input changes', () => {
    const fixture = createCategory(['+1']);

    fixture.componentInstance.emojis.set(['grinning', 'joy']);
    fixture.detectChanges();

    expect(labels(fixture).length).toBe(2);
    expect(labels(fixture)[0]).toContain('grinning');
  });

  it('should set the label height without sticky position', () => {
    const fixture = createCategory(['+1']);
    const category = fixture.componentInstance.category();

    expect(category.labelStyles()).toEqual({});

    fixture.componentInstance.sticky.set(false);
    fixture.detectChanges();

    expect(category.labelStyles()).toEqual({ height: 28 });
  });
});
