import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  NgZone,
  OnDestroy,
  OnInit,
  Output,
  PLATFORM_ID,
  QueryList,
  Renderer2,
  ViewChild,
  ViewChildren,
  computed,
  input,
  linkedSignal,
  signal,
  inject,
} from '@angular/core';

import {
  categories,
  Emoji,
  EmojiCategory,
  EmojiData,
  EmojiEvent,
} from 'ngx-emoji-mart-next/ngx-emoji';
import { CategoryComponent } from './category.component';
import { EmojiFrequentlyService } from './emoji-frequently.service';
import { PreviewComponent } from './preview.component';
import { SearchComponent } from './search.component';
import * as icons from './svgs';
import { measureScrollbar } from './utils';

import { AnchorsComponent } from './anchors.component';

const I18N: any = {
  search: 'Search',
  emojilist: 'List of emoji',
  notfound: 'No Emoji Found',
  clear: 'Clear',
  categories: {
    search: 'Search Results',
    recent: 'Frequently Used',
    people: 'Smileys & People',
    nature: 'Animals & Nature',
    foods: 'Food & Drink',
    activity: 'Activity',
    places: 'Travel & Places',
    objects: 'Objects',
    symbols: 'Symbols',
    flags: 'Flags',
    custom: 'Custom',
  },
  skintones: {
    1: 'Default Skin Tone',
    2: 'Light Skin Tone',
    3: 'Medium-Light Skin Tone',
    4: 'Medium Skin Tone',
    5: 'Medium-Dark Skin Tone',
    6: 'Dark Skin Tone',
  },
};

@Component({
  selector: 'emoji-mart',
  templateUrl: './picker.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  preserveWhitespaces: false,
  imports: [CommonModule, AnchorsComponent, SearchComponent, PreviewComponent, CategoryComponent],
})
export class PickerComponent implements OnInit, OnDestroy {
  private ngZone = inject(NgZone);
  private renderer = inject(Renderer2);
  private ref = inject(ChangeDetectorRef);
  private frequently = inject(EmojiFrequentlyService);
  private platformId = inject(PLATFORM_ID);

  readonly perLine = input(9);
  readonly totalFrequentLines = input(4);
  readonly i18n = input<any>({});
  readonly style = input<any>({});
  readonly title = input('Emoji Mart™');
  readonly emoji = input('department_store');
  readonly darkMode = input(
    !!(typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches),
  );
  readonly color = input('#ae65c5');
  readonly hideObsolete = input(true);
  /** Categories that are shown before the built-in ones. The picker does not change the list. */
  readonly categories = input<EmojiCategory[]>([]);
  /** used to temporarily draw categories */
  readonly activeCategories = input<EmojiCategory[]>([]);
  /** All categories that are shown. They are private copies, so no other picker is affected. */
  protected readonly allCategories = signal<EmojiCategory[]>([]);
  readonly set = input<Emoji['set']>('apple');
  readonly skin = input<Emoji['skin']>(1);
  /** Renders the native unicode emoji */
  readonly isNative = input<Emoji['isNative']>(false);
  readonly emojiSize = input<Emoji['size']>(24);
  readonly sheetSize = input<Emoji['sheetSize']>(64);
  readonly emojisToShowFilter = input<(x: string) => boolean>();
  readonly showPreview = input(true);
  readonly emojiTooltip = input(false);
  readonly autoFocus = input(false);
  readonly custom = input<any[]>([]);
  readonly hideRecent = input(true);
  readonly imageUrlFn = input<Emoji['imageUrlFn']>();
  readonly include = input<string[]>();
  readonly exclude = input<string[]>();
  readonly notFoundEmoji = input('sleuth_or_spy');
  readonly categoriesIcons = input<{ [key: string]: string }>(icons.categories);
  readonly searchIcons = input<{ [key: string]: string }>(icons.search);
  readonly useButton = input(false);
  readonly enableFrequentEmojiSort = input(false);
  readonly enableSearch = input(true);
  readonly showSingleCategory = input(false);
  readonly virtualize = input(false);
  readonly virtualizeOffset = input(0);
  readonly recent = input<string[]>();
  @Output() emojiClick = new EventEmitter<any>();
  @Output() emojiSelect = new EventEmitter<any>();
  @Output() skinChange = new EventEmitter<Emoji['skin']>();
  @ViewChild('scrollRef', { static: true }) private scrollRef!: ElementRef;
  @ViewChild(PreviewComponent, { static: false }) previewRef?: PreviewComponent;
  @ViewChild(SearchComponent, { static: false }) searchRef?: SearchComponent;
  @ViewChildren(CategoryComponent) categoryRefs!: QueryList<CategoryComponent>;
  protected readonly width = computed(() => {
    const style = this.style();
    if (style && style.width) {
      return style.width;
    }
    return this.perLine() * (this.emojiSize() + 12) + 12 + 2 + this.measureScrollbar() + 'px';
  });
  protected readonly mergedI18n = computed(() => {
    const i18n = { ...I18N, ...this.i18n() };
    return { ...i18n, categories: { ...I18N.categories, ...i18n.categories } };
  });
  protected readonly mergedCategoriesIcons = computed(() => ({
    ...icons.categories,
    ...this.categoriesIcons(),
  }));
  protected readonly mergedSearchIcons = computed(() => ({
    ...icons.search,
    ...this.searchIcons(),
  }));
  protected readonly currentSkin = linkedSignal(() => this.skin());
  protected readonly isRecentHidden = linkedSignal(() => this.hideRecent());
  /** used to temporarily draw categories */
  protected readonly displayedCategories = linkedSignal(() => this.activeCategories());
  scrollHeight = 0;
  clientHeight = 0;
  clientWidth = 0;
  selected?: string;
  nextScroll?: string;
  scrollTop?: number;
  firstRender = true;
  previewEmoji: EmojiData | null = null;
  animationFrameRequestId: number | null = null;
  NAMESPACE = 'emoji-mart';
  readonly measureScrollbar = signal(0);
  RECENT_CATEGORY: EmojiCategory = {
    id: 'recent',
    name: 'Recent',
    emojis: null,
  };
  SEARCH_CATEGORY: EmojiCategory = {
    id: 'search',
    name: 'Search',
    emojis: null,
    anchor: false,
  };
  CUSTOM_CATEGORY: EmojiCategory = {
    id: 'custom',
    name: 'Custom',
    emojis: [],
  };
  private scrollListener!: () => void;

  readonly backgroundImageFn = input<Emoji['backgroundImageFn']>(
    (set: string, sheetSize: number) =>
      `https://cdn.jsdelivr.net/npm/emoji-datasource-${set}@14.0.0/img/${set}/sheets-256/${sheetSize}.png`,
  );

  ngOnInit() {
    // measure scroll
    this.measureScrollbar.set(measureScrollbar());

    this.currentSkin.set(
      JSON.parse(
        (isPlatformBrowser(this.platformId) && localStorage.getItem(`${this.NAMESPACE}.skin`)) ||
          'null',
      ) || this.currentSkin(),
    );

    // The category data is shared by all pickers. Work with copies, because the picker changes
    // the categories that it shows.
    const allCategories = categories.map(category => ({ ...category }));
    const shownCategories: EmojiCategory[] = this.categories().map(category => ({ ...category }));

    if (this.custom().length > 0) {
      this.CUSTOM_CATEGORY.emojis = this.custom().map(emoji => {
        return {
          ...emoji,
          // `<Category />` expects emoji to have an `id`.
          id: emoji.shortNames[0],
          custom: true,
        };
      });

      allCategories.push(this.CUSTOM_CATEGORY);
    }

    const include = this.include();
    if (include !== undefined) {
      allCategories.sort((a, b) => {
        if (this.include()!.indexOf(a.id) > this.include()!.indexOf(b.id)) {
          return 1;
        }
        return -1;
      });
    }

    for (const category of allCategories) {
      const isIncluded = include && include.length ? include.indexOf(category.id) > -1 : true;
      const exclude = this.exclude();
      const isExcluded = exclude && exclude.length ? exclude.indexOf(category.id) > -1 : false;
      if (!isIncluded || isExcluded) {
        continue;
      }

      const emojisToShowFilter = this.emojisToShowFilter();
      if (emojisToShowFilter) {
        const newEmojis = [];

        const { emojis } = category;
        for (let emojiIndex = 0; emojiIndex < emojis!.length; emojiIndex++) {
          const emoji = emojis![emojiIndex];
          if (emojisToShowFilter(emoji)) {
            newEmojis.push(emoji);
          }
        }

        if (newEmojis.length) {
          const newCategory = {
            emojis: newEmojis,
            name: category.name,
            id: category.id,
          };

          shownCategories.push(newCategory);
        }
      } else {
        shownCategories.push(category);
      }
    }

    const includeRecent =
      include && include.length ? include.indexOf(this.RECENT_CATEGORY.id) > -1 : true;
    const excludeValue = this.exclude();
    const excludeRecent =
      excludeValue && excludeValue.length
        ? excludeValue.indexOf(this.RECENT_CATEGORY.id) > -1
        : false;
    if (includeRecent && !excludeRecent) {
      this.isRecentHidden.set(false);
      shownCategories.unshift(this.RECENT_CATEGORY);
    }

    const categoriesValue = shownCategories;
    if (categoriesValue[0]) {
      categoriesValue[0].first = true;
    }

    categoriesValue.unshift(this.SEARCH_CATEGORY);
    this.allCategories.set(categoriesValue);
    this.selected = categoriesValue.filter(category => category.first)[0].name;

    // Need to be careful if small number of categories
    const categoriesToLoadFirst = Math.min(categoriesValue.length, 3);
    this.setActiveCategories(categoriesValue.slice(0, categoriesToLoadFirst));

    // Trim last active category
    const lastActiveCategoryEmojis = categoriesValue[categoriesToLoadFirst - 1].emojis!.slice();
    categoriesValue[categoriesToLoadFirst - 1].emojis = lastActiveCategoryEmojis.slice(0, 60);

    setTimeout(() => {
      // Restore last category
      this.allCategories()[categoriesToLoadFirst - 1].emojis = lastActiveCategoryEmojis;
      this.setActiveCategories(this.allCategories());
      // The `setTimeout` will trigger the change detection, but since we're inside
      // the OnPush component we can run change detection locally starting from this
      // component and going down to the children.
      this.ref.detectChanges();

      isPlatformBrowser(this.platformId) &&
        this.ngZone.runOutsideAngular(() => {
          // The `updateCategoriesSize` doesn't change properties that are used
          // in templates, thus this is run in the context of the root zone to avoid
          // running change detection.
          requestAnimationFrame(() => {
            this.updateCategoriesSize();
          });
        });
    });

    this.ngZone.runOutsideAngular(() => {
      // DOM events that are listened by Angular inside the template trigger change detection
      // and also wrapped into additional functions that call `markForCheck()`. We listen `scroll`
      // in the context of the root zone since it will not trigger change detection each time
      // the `scroll` event is dispatched.
      this.scrollListener = this.renderer.listen(this.scrollRef.nativeElement, 'scroll', () => {
        this.handleScroll();
      });
    });
  }

  ngOnDestroy(): void {
    this.scrollListener?.();
    // This is called here because the component might be destroyed
    // but there will still be a `requestAnimationFrame` callback in the queue
    // that calls `detectChanges()` on the `ViewRef`. This will lead to a runtime
    // exception if the `detectChanges()` is called after the `ViewRef` is destroyed.
    this.cancelAnimationFrame();
  }

  setActiveCategories(categoriesToMakeActive: Array<EmojiCategory>) {
    if (this.showSingleCategory()) {
      this.displayedCategories.set(
        categoriesToMakeActive.filter(x => x.name === this.selected || x === this.SEARCH_CATEGORY),
      );
    } else {
      this.displayedCategories.set(categoriesToMakeActive);
    }
  }
  updateCategoriesSize() {
    this.categoryRefs.forEach(component => component.memoizeSize());

    if (this.scrollRef) {
      const target = this.scrollRef.nativeElement;
      this.scrollHeight = target.scrollHeight;
      this.clientHeight = target.clientHeight;
      this.clientWidth = target.clientWidth;
    }
  }
  handleAnchorClick($event: { category: EmojiCategory; index: number }) {
    this.updateCategoriesSize();
    this.selected = $event.category.name;
    const categoriesValue = this.allCategories();
    this.setActiveCategories(categoriesValue);

    if (this.SEARCH_CATEGORY.emojis) {
      this.handleSearch(null);
      this.searchRef?.clear();
      this.handleAnchorClick($event);
      return;
    }

    const component = this.categoryRefs.find(n => n.id() === $event.category.id);
    if (component) {
      let { top } = component;

      if ($event.category.first) {
        top = 0;
      } else {
        top += 1;
      }
      this.scrollRef.nativeElement.scrollTop = top;
    }
    this.nextScroll = $event.category.name;

    // handle component scrolling to load emojis
    for (const category of categoriesValue) {
      const componentToScroll = this.categoryRefs.find(({ id: idInput }) => {
        const id = idInput();
        return id === category.id;
      });
      componentToScroll?.handleScroll(this.scrollRef.nativeElement.scrollTop);
    }
  }
  handleScroll(noSelectionChange = false) {
    if (this.nextScroll) {
      this.selected = this.nextScroll;
      this.nextScroll = undefined;
      this.ref.detectChanges();
      return;
    }
    if (!this.scrollRef) {
      return;
    }
    if (this.showSingleCategory()) {
      return;
    }

    let activeCategory: EmojiCategory | undefined;
    if (this.SEARCH_CATEGORY.emojis) {
      activeCategory = this.SEARCH_CATEGORY;
    } else {
      const target = this.scrollRef.nativeElement;
      // check scroll is not at bottom
      if (target.scrollTop === 0) {
        // hit the TOP
        activeCategory = this.allCategories().find(n => n.first === true);
      } else if (target.scrollHeight - target.scrollTop === this.clientHeight) {
        // scrolled to bottom activate last category
        activeCategory = this.allCategories()[this.allCategories().length - 1];
      } else {
        // scrolling
        for (const category of this.allCategories()) {
          const component = this.categoryRefs.find(({ id: idInput }) => {
            const id = idInput();
            return id === category.id;
          });
          const active: boolean | undefined = component?.handleScroll(target.scrollTop);
          if (active) {
            activeCategory = category;
          }
        }
      }

      this.scrollTop = target.scrollTop;
    }
    // This will allow us to run the change detection only when the category changes.
    if (!noSelectionChange && activeCategory && activeCategory.name !== this.selected) {
      this.selected = activeCategory.name;
      this.ref.detectChanges();
    } else if (noSelectionChange) {
      this.ref.detectChanges();
    }
  }

  handleSearch($emojis: any[] | null) {
    this.SEARCH_CATEGORY.emojis = $emojis;
    for (const component of this.categoryRefs.toArray()) {
      if (component.name() === 'Search') {
        component.displayedEmojis.set($emojis);
        component.updateDisplay($emojis ? 'block' : 'none');
      } else {
        component.updateDisplay($emojis ? 'none' : 'block');
      }
    }

    this.scrollRef.nativeElement.scrollTop = 0;
    this.handleScroll();
  }

  handleEnterKey($event: Event, emoji?: EmojiData): void {
    // Note: the `handleEnterKey` is invoked when the search component dispatches the
    //       `enterKey` event or when any emoji is clicked thus the `emojiClick` event of
    //       `emoji-category` is dispatched. Both events are dispatched outside of the Angular zone
    //       to prevent no-op ticks, basically when users outside of the picker component are not
    //       listening to any of these events.

    if (!emoji) {
      if (this.SEARCH_CATEGORY.emojis !== null && this.SEARCH_CATEGORY.emojis.length) {
        emoji = this.SEARCH_CATEGORY.emojis[0];
        if (emoji) {
          this.emojiSelect.emit({ $event, emoji });
        } else {
          return;
        }
      }
    }

    if (!this.isRecentHidden() && !this.recent() && emoji) {
      this.frequently.add(emoji);
    }

    const component = this.categoryRefs.toArray()[1];
    if (component && this.enableFrequentEmojiSort()) {
      this.ngZone.run(() => {
        component.updateRecentEmojis();
        component.ref.markForCheck();
      });
    }
  }
  handleEmojiOver($event: EmojiEvent) {
    if (!this.showPreview() || !this.previewRef) {
      return;
    }

    // A standard emoji can have the same id as a custom emoji.
    const emojiData = $event.emoji.custom
      ? this.CUSTOM_CATEGORY.emojis!.find((customEmoji: any) => customEmoji.id === $event.emoji.id)
      : undefined;
    if (emojiData) {
      $event.emoji = { ...emojiData };
    }

    this.previewEmoji = $event.emoji;
    this.cancelAnimationFrame();
    this.ref.detectChanges();
  }

  handleEmojiLeave() {
    if (!this.showPreview() || !this.previewRef) {
      return;
    }
    // Note: `handleEmojiLeave` will be invoked outside of the Angular zone because of the `mouseleave`
    //       event set up outside of the Angular zone in `ngx-emoji`. See `setupMouseLeaveListener`.
    //       This is done explicitly because we don't have to run redundant change detection since we
    //       would still want to leave the Angular zone here when scheduling animation frame.
    this.animationFrameRequestId = requestAnimationFrame(() => {
      this.previewEmoji = null;
      this.ref.detectChanges();
    });
  }

  handleEmojiClick($event: EmojiEvent) {
    this.emojiClick.emit($event);
    this.emojiSelect.emit($event);
    this.handleEnterKey($event.$event, $event.emoji);
  }

  handleSkinChange(skin: Emoji['skin']) {
    this.currentSkin.set(skin);
    localStorage.setItem(`${this.NAMESPACE}.skin`, String(skin));
    this.skinChange.emit(skin);
  }

  private cancelAnimationFrame(): void {
    if (this.animationFrameRequestId !== null) {
      cancelAnimationFrame(this.animationFrameRequestId);
      this.animationFrameRequestId = null;
    }
  }
}

