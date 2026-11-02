import { Emoji, EmojiComponent, EmojiService } from 'ngx-emoji-mart-next/ngx-emoji';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
  Injector,
  ViewChild,
  afterNextRender,
  computed,
  input,
  linkedSignal,
  signal,
  inject,
} from '@angular/core';
import { CUSTOM_EMOJI_KEY_PREFIX, EmojiFrequentlyService } from './emoji-frequently.service';

@Component({
  selector: 'emoji-category',
  template: `
    @let _i18n = i18n();
    @let _id = id();
    @let _noEmojiToDisplay = noEmojiToDisplay();
    @let _emojiSize = emojiSize();
    @let _emojiSkin = emojiSkin();
    @let _emojiIsNative = emojiIsNative();
    @let _emojiSet = emojiSet();
    @let _emojiSheetSize = emojiSheetSize();
    @let _emojiForceSize = emojiForceSize();
    @let _emojiTooltip = emojiTooltip();
    @let _emojiBackgroundImageFn = emojiBackgroundImageFn();
    @let _emojiImageUrlFn = emojiImageUrlFn();
    @let _hideObsolete = hideObsolete();
    @let _emojiUseButton = emojiUseButton();
    @let _name = name();
    @let _recentReady = recentReady();

    <section
      #container
      class="emoji-mart-category"
      [attr.aria-label]="_i18n.categories[_id]"
      [class.emoji-mart-no-results]="_noEmojiToDisplay"
      [style]="containerStyles()"
    >
      <div class="emoji-mart-category-label" [style]="labelStyles()" [attr.data-name]="name()">
        <!-- already labeled by the section aria-label -->
        <span #label [style]="labelSpanStyles" aria-hidden="true">
          {{ _i18n.categories[_id] }}
        </span>
      </div>

      @if (_name === 'Recent' && !_recentReady) {
        <!--
          We read "Recent" from local storage, which only exists in the browser. The server
          cannot read it. So we wait here, until the browser has painted once, before we show
          anything. This way the server and the browser always start with the same picture. We
          never have to swap one list of emoji for another right in front of the user.
        -->
        <div class="emoji-mart-category-loading" [style.min-height]="recentLoadingHeight()">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            width="16"
            height="16"
            opacity="0.5"
          >
            <circle
              cx="10"
              cy="10"
              r="8"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-dasharray="32"
              stroke-dashoffset="12"
            >
              <animateTransform
                attributeName="transform"
                type="rotate"
                from="0 10 10"
                to="360 10 10"
                dur="0.8s"
                repeatCount="indefinite"
              />
            </circle>
          </svg>
        </div>
      } @else {
      <div class="emoji-mart-results" [class.emoji-mart-results-reveal]="_name === 'Recent'">
        @if (virtualize()) {
          <div>
            @if (filteredEmojis(); as filteredEmojis) {
              <div>
                @for (emoji of filteredEmojis; track emoji) {
                  <ngx-emoji
                    [emoji]="emoji"
                    [size]="_emojiSize"
                    [skin]="_emojiSkin"
                    [isNative]="_emojiIsNative"
                    [set]="_emojiSet"
                    [sheetSize]="_emojiSheetSize"
                    [forceSize]="_emojiForceSize"
                    [tooltip]="_emojiTooltip"
                    [backgroundImageFn]="_emojiBackgroundImageFn"
                    [imageUrlFn]="_emojiImageUrlFn"
                    [hideObsolete]="_hideObsolete"
                    [useButton]="_emojiUseButton"
                    (emojiOver)="emojiOver.emit($event)"
                    (emojiLeave)="emojiLeave.emit($event)"
                    (emojiClick)="emojiClick.emit($event)"
                  ></ngx-emoji>
                }
              </div>
            }
          </div>
        } @else {
          @for (emoji of emojisToDisplay(); track emoji) {
            <ngx-emoji
              [emoji]="emoji"
              [size]="_emojiSize"
              [skin]="_emojiSkin"
              [isNative]="_emojiIsNative"
              [set]="_emojiSet"
              [sheetSize]="_emojiSheetSize"
              [forceSize]="_emojiForceSize"
              [tooltip]="_emojiTooltip"
              [backgroundImageFn]="_emojiBackgroundImageFn"
              [imageUrlFn]="_emojiImageUrlFn"
              [hideObsolete]="_hideObsolete"
              [useButton]="_emojiUseButton"
              (emojiOver)="emojiOver.emit($event)"
              (emojiLeave)="emojiLeave.emit($event)"
              (emojiClick)="emojiClick.emit($event)"
            ></ngx-emoji>
          }
        }
      </div>
      }

      @if (_noEmojiToDisplay) {
        <div>
          <div>
            <ngx-emoji
              [emoji]="notFoundEmoji()"
              [size]="38"
              [skin]="_emojiSkin"
              [isNative]="_emojiIsNative"
              [set]="_emojiSet"
              [sheetSize]="_emojiSheetSize"
              [forceSize]="_emojiForceSize"
              [tooltip]="_emojiTooltip"
              [backgroundImageFn]="_emojiBackgroundImageFn"
              [useButton]="_emojiUseButton"
            ></ngx-emoji>
          </div>

          <div class="emoji-mart-no-results-label">
            {{ _i18n.notfound }}
          </div>
        </div>
      }
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  preserveWhitespaces: false,
  imports: [EmojiComponent],
})
export class CategoryComponent implements OnChanges, OnInit, AfterViewInit {
  ref = inject(ChangeDetectorRef);
  private emojiService = inject(EmojiService);
  private frequently = inject(EmojiFrequentlyService);

  /**
   * We compute the "Recent" list the same way on the server and in the browser (see
   * `updateRecentEmojis`). But the server never has `localStorage`, so its list is only ever
   * the built-in defaults. If the browser's `localStorage` holds something different, showing
   * that real list right away would mean swapping it in right after the defaults, which looks
   * like a flicker. So we keep the "Recent" row hidden, behind a spinner, until right after the
   * first paint. By then we are always in the browser, so there is nothing left to swap.
   */
  readonly recentReady = signal(false);
  private readonly injector = inject(Injector);

  readonly emojis = input<any[] | null>(null);
  /** The emojis that are shown. The picker and the recent category can change them. */
  readonly displayedEmojis = linkedSignal(() => this.emojis());
  readonly hasStickyPosition = input(true);
  readonly name = input('');
  readonly perLine = input(9);
  readonly totalFrequentLines = input(4);
  readonly recent = input<string[] | undefined>([]);
  readonly custom = input<any[]>([]);
  readonly i18n = input<any>();
  readonly id = input<any>();
  readonly hideObsolete = input(true);
  readonly notFoundEmoji = input.required<string>();
  readonly virtualize = input(false);
  readonly virtualizeOffset = input(0);
  readonly emojiIsNative = input.required<Emoji['isNative']>();
  readonly emojiSkin = input.required<Emoji['skin']>();
  readonly emojiSize = input.required<Emoji['size']>();
  readonly emojiSet = input.required<Emoji['set']>();
  readonly emojiSheetSize = input.required<Emoji['sheetSize']>();
  readonly emojiForceSize = input.required<Emoji['forceSize']>();
  readonly emojiTooltip = input.required<Emoji['tooltip']>();
  readonly emojiBackgroundImageFn = input.required<Emoji['backgroundImageFn']>();
  readonly emojiImageUrlFn = input<Emoji['imageUrlFn']>();
  readonly emojiUseButton = input<boolean>();

  // These are always dispatched outside of the Angular zone, so the picker does not run change
  // detection for an emoji that nobody hovers or clicks over.
  @Output() emojiOver: Emoji['emojiOver'] = new EventEmitter();
  @Output() emojiLeave: Emoji['emojiLeave'] = new EventEmitter();
  @Output() emojiClick: Emoji['emojiClick'] = new EventEmitter();

  @ViewChild('container', { static: true }) container!: ElementRef;
  @ViewChild('label', { static: true }) label!: ElementRef;
  /** The emojis that are drawn. It skips emojis that do not exist and obsolete ones. */
  readonly emojisToDisplay = computed(() => this.filterEmojis());
  readonly noEmojiToDisplay = computed(() => this.emojisToDisplay().length === 0);
  /** Set by `updateDisplay`. It is stronger than hiding a category that has no emojis. */
  private readonly display = signal<'none' | 'block' | undefined>(undefined);
  private readonly minHeight = signal<string | undefined>(undefined);
  readonly containerStyles = computed(() => {
    const display = this.display() ?? (this.noEmojiToDisplay() ? 'none' : undefined);
    const minHeight = this.minHeight();
    return { ...(display && { display }), ...(minHeight && { minHeight }) };
  });
  readonly labelStyles = computed(() => (this.hasStickyPosition() ? {} : { height: 28 }));
  /**
   * How tall the spinner should be, while we wait to show "Recent" (see `recentReady`). We
   * already know how many emoji we will show (`emojisToDisplay` does not wait for
   * `recentReady`). So we can save the right amount of space for them right away. This way nothing
   * moves on screen once we swap the spinner for the real emoji.
   */
  readonly recentLoadingHeight = computed(() => {
    const rows = Math.ceil((this.emojisToDisplay().length || this.perLine()) / this.perLine());
    return `${rows * (this.emojiSize() + 12)}px`;
  });
  /** The emojis that virtualized mode shows. Only set while the category is near the viewport. */
  readonly filteredEmojis = signal<any[] | null | undefined>(undefined);
  labelSpanStyles: any = {};
  margin = 0;
  minMargin = 0;
  maxMargin = 0;
  top = 0;
  rows = 0;

  ngOnInit() {
    this.updateRecentEmojis();

    // Only "Recent" needs this (see `recentReady`). We register it here, not in the
    // constructor, so every other category skips it. A picker has many categories, each with
    // its own `emoji-category`, and each registered hook adds one more thing Angular must
    // settle after the first render.
    if (this.name() === 'Recent') {
      afterNextRender(() => this.recentReady.set(true), { injector: this.injector });
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes.emojis?.currentValue?.length !== changes.emojis?.previousValue?.length) {
      this.ngAfterViewInit();
    }
  }

  ngAfterViewInit() {
    if (!this.virtualize()) {
      return;
    }

    const { width } = this.container.nativeElement.getBoundingClientRect();

    const perRow = Math.floor(width / (this.emojiSize() + 12));
    this.rows = Math.ceil(this.emojisToDisplay().length / perRow);
    this.minHeight.set(`${this.rows * (this.emojiSize() + 12) + 28}px`);

    this.handleScroll(this.container.nativeElement.parentNode.parentNode.scrollTop);
  }

  memoizeSize() {
    const parent = this.container.nativeElement.parentNode.parentNode;
    const { top, height } = this.container.nativeElement.getBoundingClientRect();
    const parentTop = parent.getBoundingClientRect().top;
    const labelHeight = this.label.nativeElement.getBoundingClientRect().height;

    this.top = top - parentTop + parent.scrollTop;

    if (height === 0) {
      this.maxMargin = 0;
    } else {
      this.maxMargin = height - labelHeight;
    }
  }

  handleScroll(scrollTop: number): boolean {
    let margin = scrollTop - this.top;
    margin = margin < this.minMargin ? this.minMargin : margin;
    margin = margin > this.maxMargin ? this.maxMargin : margin;

    if (this.virtualize()) {
      const { top, height } = this.container.nativeElement.getBoundingClientRect();
      const parentHeight = this.container.nativeElement.parentNode.parentNode.clientHeight;

      if (
        parentHeight + (parentHeight + this.virtualizeOffset()) >= top &&
        -height - (parentHeight + this.virtualizeOffset()) <= top
      ) {
        this.filteredEmojis.set(this.emojisToDisplay());
      } else {
        this.filteredEmojis.set([]);
      }
    }

    if (margin === this.margin) {
      return false;
    }

    if (!this.hasStickyPosition()) {
      this.label.nativeElement.style.top = `${margin}px`;
    }

    this.margin = margin;
    return true;
  }

  updateRecentEmojis() {
    if (this.name() !== 'Recent') {
      return;
    }

    let frequentlyUsed =
      this.recent() || this.frequently.get(this.perLine(), this.totalFrequentLines());
    if (!frequentlyUsed || !frequentlyUsed.length) {
      frequentlyUsed = this.frequently.get(this.perLine(), this.totalFrequentLines());
    }
    if (!frequentlyUsed.length) {
      return;
    }
    this.displayedEmojis.set(
      frequentlyUsed.map(key => this.getRecentEmoji(key)).filter(emoji => !!emoji),
    );
  }

  /**
   * A key is the id of a standard emoji, or `custom:` and the id of a custom emoji. The plain id of
   * a custom emoji also works when no standard emoji has this id.
   *
   * We check if a standard emoji exists using the index that is always loaded. We do not use
   * `EmojiService.getData()` for this. This keeps the check synchronous. `getRecentEmoji` runs
   * in `ngOnInit`, before any category file has had a chance to load.
   */
  private getRecentEmoji(key: string) {
    const findCustom = (id: string) => this.custom().find((emoji: any) => emoji.id === id);

    if (key.startsWith(CUSTOM_EMOJI_KEY_PREFIX)) {
      return findCustom(key.slice(CUSTOM_EMOJI_KEY_PREFIX.length));
    }
    return this.emojiService.resolveIndexEntry(key) ? key : findCustom(key);
  }

  updateDisplay(display: 'none' | 'block') {
    this.display.set(display);
    this.updateRecentEmojis();
  }

  /**
   * Decides which emojis to show. This also sets the category's size, before anything has
   * rendered (see `ngAfterViewInit` and `memoizeSize`). We check if an emoji exists, and check
   * `obsoletedBy`, using the index that is always loaded. We do not use
   * `EmojiService.getData()`. This keeps the check synchronous. The category file for these
   * emojis may not have loaded yet.
   */
  private filterEmojis(): any[] {
    const newEmojis = [];
    for (const emoji of this.displayedEmojis() || []) {
      if (!emoji) {
        continue;
      }

      if (typeof emoji === 'string') {
        const resolved = this.emojiService.resolveIndexEntry(emoji);
        if (!resolved) {
          continue;
        }
        if (resolved.entry.obsoletedBy && this.hideObsolete()) {
          continue;
        }
      } else if (!emoji.custom) {
        // This is not already marked as custom. It might share an id with a standard emoji.
        // If so, it should behave like that standard emoji, the same way
        // `EmojiService.resolveIndexEntry` itself would treat it.
        const resolved = this.emojiService.resolveIndexEntry(emoji);
        if (resolved?.entry.obsoletedBy && this.hideObsolete()) {
          continue;
        }
      }

      newEmojis.push(emoji);
    }
    return newEmojis;
  }
}
