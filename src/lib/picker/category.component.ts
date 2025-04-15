import { Emoji, EmojiComponent, EmojiService } from '@ctrl/ngx-emoji-mart/ngx-emoji';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  signal,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Subject } from 'rxjs';

import { EmojiFrequentlyService } from './emoji-frequently.service';

@Component({
  selector: 'emoji-category',
  templateUrl: './category.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [EmojiComponent],
})
export class CategoryComponent implements OnChanges, OnInit, AfterViewInit {
  @Input() emojis: any[] | null = null;
  @Input() hasStickyPosition = true;
  @Input() name = '';
  @Input() perLine = 9;
  @Input() totalFrequentLines = 4;
  @Input() recent: string[] = [];
  @Input() custom: any[] = [];
  @Input() i18n: any;
  @Input() id: any;
  @Input() hideObsolete = true;
  @Input() notFoundEmoji?: string;
  @Input() virtualize = false;
  @Input() virtualizeOffset = 0;
  @Input() emojiIsNative?: Emoji['isNative'];
  @Input() emojiSkin!: Emoji['skin'];
  @Input() emojiSize!: Emoji['size'];
  @Input() emojiSet!: Emoji['set'];
  @Input() emojiSheetSize!: Emoji['sheetSize'];
  @Input() emojiForceSize!: Emoji['forceSize'];
  @Input() emojiTooltip!: Emoji['tooltip'];
  @Input() emojiBackgroundImageFn?: Emoji['backgroundImageFn'];
  @Input() emojiImageUrlFn?: Emoji['imageUrlFn'];
  @Input() emojiUseButton?: boolean;

  /**
   * Note: the suffix is added explicitly so we know the event is dispatched outside of the Angular zone.
   */
  @Output() emojiOver: Emoji['emojiOver'] = new EventEmitter();
  @Output() emojiLeave: Emoji['emojiLeave'] = new EventEmitter();
  @Output() emojiClick: Emoji['emojiClick'] = new EventEmitter();

  @ViewChild('container', { static: true }) container!: ElementRef;
  @ViewChild('label', { static: true }) label!: ElementRef;

  readonly containerStyles = signal<Record<string, string>>({});
  emojisToDisplay: any[] = [];
  private filteredEmojisSubject = new Subject<any[] | null | undefined>();
  protected readonly _filteredEmojis = toSignal(this.filteredEmojisSubject);
  readonly labelStyles = signal<Record<string, string>>({});
  margin = 0;
  minMargin = 0;
  maxMargin = 0;
  top = 0;
  rows = 0;

  constructor(
    public ref: ChangeDetectorRef,
    private emojiService: EmojiService,
    private frequently: EmojiFrequentlyService,
  ) {}

  ngOnInit() {
    this.updateRecentEmojis();
    this.emojisToDisplay = this.filterEmojis();

    if (this.noEmojiToDisplay) {
      this.containerStyles.set({ display: 'none' });
    }

    if (!this.hasStickyPosition) {
      this.labelStyles.set({ height: '28px' });
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes.emojis?.currentValue?.length !== changes.emojis?.previousValue?.length) {
      this.emojisToDisplay = this.filterEmojis();
      this.ngAfterViewInit();
    }
  }

  ngAfterViewInit() {
    if (!this.virtualize) {
      return;
    }

    const { width } = this.container.nativeElement.getBoundingClientRect();

    const perRow = Math.floor(width / (this.emojiSize + 12));
    this.rows = Math.ceil(this.emojisToDisplay.length / perRow);

    this.containerStyles.update(containerStyles => ({
      ...containerStyles,
      minHeight: `${this.rows * (this.emojiSize + 12) + 28}px`,
    }));

    this.ref.detectChanges();

    this.handleScroll(this.container.nativeElement.parentNode.parentNode.scrollTop);
  }

  get noEmojiToDisplay(): boolean {
    return this.emojisToDisplay.length === 0;
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

    if (this.virtualize) {
      const { top, height } = this.container.nativeElement.getBoundingClientRect();
      const parentHeight = this.container.nativeElement.parentNode.parentNode.clientHeight;

      if (
        parentHeight + (parentHeight + this.virtualizeOffset) >= top &&
        -height - (parentHeight + this.virtualizeOffset) <= top
      ) {
        this.filteredEmojisSubject.next(this.emojisToDisplay);
      } else {
        this.filteredEmojisSubject.next([]);
      }
    }

    if (margin === this.margin) {
      this.ref.detectChanges();
      return false;
    }

    if (!this.hasStickyPosition) {
      this.label.nativeElement.style.top = `${margin}px`;
    }

    this.margin = margin;
    this.ref.detectChanges();
    return true;
  }

  updateRecentEmojis() {
    if (this.name !== 'Recent') {
      return;
    }

    let frequentlyUsed = this.recent || this.frequently.get(this.perLine, this.totalFrequentLines);
    if (!frequentlyUsed || !frequentlyUsed.length) {
      frequentlyUsed = this.frequently.get(this.perLine, this.totalFrequentLines);
    }
    if (!frequentlyUsed.length) {
      return;
    }
    this.emojis = frequentlyUsed
      .map(id => {
        const emoji = this.custom.filter((e: any) => e.id === id)[0];
        if (emoji) {
          return emoji;
        }

        return id;
      })
      .filter(id => !!this.emojiService.getData(id));
  }

  updateDisplay(display: 'none' | 'block') {
    this.containerStyles.update(containerStyles => ({
      ...containerStyles,
      display,
    }));

    this.updateRecentEmojis();
    this.ref.detectChanges();
  }

  private filterEmojis(): any[] {
    const newEmojis = [];
    for (const emoji of this.emojis || []) {
      if (!emoji) {
        continue;
      }
      const data = this.emojiService.getData(emoji);
      if (!data || (data.obsoletedBy && this.hideObsolete) || (!data.unified && !data.custom)) {
        continue;
      }
      newEmojis.push(emoji);
    }
    return newEmojis;
  }
}
