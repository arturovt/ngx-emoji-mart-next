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
  ViewChild,
  computed,
  input,
  linkedSignal,
  signal,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable, Subject } from 'rxjs';

import { CUSTOM_EMOJI_KEY_PREFIX, EmojiFrequentlyService } from './emoji-frequently.service';

@Component({
  selector: 'emoji-category',
  template: `
    <section
      #container
      class="emoji-mart-category"
      [attr.aria-label]="i18n().categories[id()]"
      [class.emoji-mart-no-results]="noEmojiToDisplay()"
      [ngStyle]="containerStyles()"
    >
      <div class="emoji-mart-category-label" [ngStyle]="labelStyles()" [attr.data-name]="name()">
        <!-- already labeled by the section aria-label -->
        <span #label [ngStyle]="labelSpanStyles" aria-hidden="true">
          {{ i18n().categories[id()] }}
        </span>
      </div>

      @if (virtualize()) {
        <div>
          @if (filteredEmojis$ | async; as filteredEmojis) {
            <div>
              @for (emoji of filteredEmojis; track emoji) {
                <ngx-emoji
                  [emoji]="emoji"
                  [size]="emojiSize()"
                  [skin]="emojiSkin()"
                  [isNative]="emojiIsNative()"
                  [set]="emojiSet()"
                  [sheetSize]="emojiSheetSize()"
                  [forceSize]="emojiForceSize()"
                  [tooltip]="emojiTooltip()"
                  [backgroundImageFn]="emojiBackgroundImageFn()"
                  [imageUrlFn]="emojiImageUrlFn()"
                  [hideObsolete]="hideObsolete()"
                  [useButton]="emojiUseButton()"
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
            [size]="emojiSize()"
            [skin]="emojiSkin()"
            [isNative]="emojiIsNative()"
            [set]="emojiSet()"
            [sheetSize]="emojiSheetSize()"
            [forceSize]="emojiForceSize()"
            [tooltip]="emojiTooltip()"
            [backgroundImageFn]="emojiBackgroundImageFn()"
            [imageUrlFn]="emojiImageUrlFn()"
            [hideObsolete]="hideObsolete()"
            [useButton]="emojiUseButton()"
            (emojiOver)="emojiOver.emit($event)"
            (emojiLeave)="emojiLeave.emit($event)"
            (emojiClick)="emojiClick.emit($event)"
          ></ngx-emoji>
        }
      }

      @if (noEmojiToDisplay()) {
        <div>
          <div>
            <ngx-emoji
              [emoji]="notFoundEmoji()"
              [size]="38"
              [skin]="emojiSkin()"
              [isNative]="emojiIsNative()"
              [set]="emojiSet()"
              [sheetSize]="emojiSheetSize()"
              [forceSize]="emojiForceSize()"
              [tooltip]="emojiTooltip()"
              [backgroundImageFn]="emojiBackgroundImageFn()"
              [useButton]="emojiUseButton()"
            ></ngx-emoji>
          </div>

          <div class="emoji-mart-no-results-label">
            {{ i18n().notfound }}
          </div>
        </div>
      }
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  preserveWhitespaces: false,
  imports: [CommonModule, EmojiComponent],
})
export class CategoryComponent implements OnChanges, OnInit, AfterViewInit {
  ref = inject(ChangeDetectorRef);
  private emojiService = inject(EmojiService);
  private frequently = inject(EmojiFrequentlyService);

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
  private filteredEmojisSubject = new Subject<any[] | null | undefined>();
  filteredEmojis$: Observable<any[] | null | undefined> = this.filteredEmojisSubject.asObservable();
  labelSpanStyles: any = {};
  margin = 0;
  minMargin = 0;
  maxMargin = 0;
  top = 0;
  rows = 0;

  ngOnInit() {
    this.updateRecentEmojis();
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

    this.ref.detectChanges();

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
        this.filteredEmojisSubject.next(this.emojisToDisplay());
      } else {
        this.filteredEmojisSubject.next([]);
      }
    }

    if (margin === this.margin) {
      this.ref.detectChanges();
      return false;
    }

    if (!this.hasStickyPosition()) {
      this.label.nativeElement.style.top = `${margin}px`;
    }

    this.margin = margin;
    this.ref.detectChanges();
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
      frequentlyUsed
        .map(key => this.getRecentEmoji(key))
        .filter(emoji => !!emoji && !!this.emojiService.getData(emoji)),
    );
  }

  /**
   * A key is the id of a standard emoji, or `custom:` and the id of a custom emoji. The plain id of
   * a custom emoji also works when no standard emoji has this id.
   */
  private getRecentEmoji(key: string) {
    const findCustom = (id: string) => this.custom().find((emoji: any) => emoji.id === id);

    if (key.startsWith(CUSTOM_EMOJI_KEY_PREFIX)) {
      return findCustom(key.slice(CUSTOM_EMOJI_KEY_PREFIX.length));
    }
    return this.emojiService.getData(key) ? key : findCustom(key);
  }

  updateDisplay(display: 'none' | 'block') {
    this.display.set(display);
    this.updateRecentEmojis();
    this.ref.detectChanges();
  }

  private filterEmojis(): any[] {
    const newEmojis = [];
    for (const emoji of this.displayedEmojis() || []) {
      if (!emoji) {
        continue;
      }
      const data = this.emojiService.getData(emoji);
      if (!data || (data.obsoletedBy && this.hideObsolete()) || (!data.unified && !data.custom)) {
        continue;
      }
      newEmojis.push(emoji);
    }
    return newEmojis;
  }
}
