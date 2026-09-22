import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  NgZone,
  OnDestroy,
  Output,
  ViewChild,
  computed,
  inject,
  input,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { EMPTY, Subject, fromEvent, switchMap, takeUntil } from 'rxjs';

import { EmojiData } from './data/data.interfaces';
import { DEFAULT_BACKGROUNDFN, EmojiService } from './emoji.service';

export interface Emoji {
  /** Renders the native unicode emoji */
  isNative: boolean;
  forceSize: boolean;
  tooltip: boolean;
  skin: 1 | 2 | 3 | 4 | 5 | 6;
  sheetSize: 16 | 20 | 32 | 64 | 72;
  sheetRows?: number;
  set: 'apple' | 'google' | 'twitter' | 'facebook' | '';
  size: number;
  emoji: string | EmojiData;
  backgroundImageFn: (set: string, sheetSize: number) => string;
  fallback?: (data: any, props: any) => string;
  emojiOver: EventEmitter<EmojiEvent>;
  emojiLeave: EventEmitter<EmojiEvent>;
  emojiClick: EventEmitter<EmojiEvent>;
  imageUrlFn?: (emoji: EmojiData | null) => string;
}

export interface EmojiEvent {
  emoji: EmojiData;
  $event: Event;
}

interface EmojiView {
  isVisible: boolean;
  unified?: string | null;
  custom: boolean;
  title?: string;
  label: string;
  style?: any;
}

@Component({
  selector: 'ngx-emoji',
  template: `
    @if (view().isVisible) {
      @if (useButton()) {
        <button
          #button
          type="button"
          [attr.title]="view().title"
          [attr.aria-label]="view().label"
          class="emoji-mart-emoji"
          [class.emoji-mart-emoji-native]="isNative()"
          [class.emoji-mart-emoji-custom]="view().custom"
        >
          <span [ngStyle]="view().style">
            @if (isNative()) {
              {{ view().unified }}
            }
            <ng-content></ng-content>
          </span>
        </button>
      } @else {
        <span
          #button
          [attr.title]="view().title"
          [attr.aria-label]="view().label"
          class="emoji-mart-emoji"
          [class.emoji-mart-emoji-native]="isNative()"
          [class.emoji-mart-emoji-custom]="view().custom"
        >
          <span [ngStyle]="view().style">
            @if (isNative()) {
              {{ view().unified }}
            }
            <ng-content></ng-content>
          </span>
        </span>
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  preserveWhitespaces: false,
  imports: [CommonModule],
})
export class EmojiComponent implements OnDestroy {
  readonly skin = input<Emoji['skin']>(1);
  readonly set = input<Emoji['set']>('apple');
  readonly sheetSize = input<Emoji['sheetSize']>(64);
  /** Renders the native unicode emoji */
  readonly isNative = input<Emoji['isNative']>(false);
  readonly forceSize = input<Emoji['forceSize']>(false);
  readonly tooltip = input<Emoji['tooltip']>(false);
  readonly size = input<Emoji['size']>(24);
  readonly emoji = input<Emoji['emoji']>('');
  readonly fallback = input<Emoji['fallback']>();
  readonly hideObsolete = input(false);
  readonly sheetRows = input<number>();
  readonly sheetColumns = input<number>();
  readonly useButton = input<boolean>();
  /**
   * Always dispatched outside of the Angular zone, so hovering or clicking an emoji that nobody
   * listens to does not run change detection. If you change your own state in a handler and need
   * the view to update, call `ChangeDetectorRef.markForCheck()` yourself.
   */
  @Output() emojiOver: Emoji['emojiOver'] = new EventEmitter();
  @Output() emojiLeave: Emoji['emojiLeave'] = new EventEmitter();
  @Output() emojiClick: Emoji['emojiClick'] = new EventEmitter();

  // TODO: replace 4.0.3 w/ dynamic get verison from emoji-datasource in package.json
  readonly backgroundImageFn = input<Emoji['backgroundImageFn']>(DEFAULT_BACKGROUNDFN);
  readonly imageUrlFn = input<Emoji['imageUrlFn']>();

  @ViewChild('button', { static: false })
  set button(button: ElementRef<HTMLElement> | undefined) {
    // Note: `runOutsideAngular` is used to trigger `addEventListener` outside of the Angular zone
    //       too. See `setupMouseEnterListener`. The `switchMap` will subscribe to `fromEvent` considering
    //       the context where the factory is called in.
    this.ngZone.runOutsideAngular(() => this.button$.next(button?.nativeElement));
  }

  /**
   * The subject used to emit whenever view queries are run and `button` or `span` is set/removed.
   * We use subject to keep the reactive behavior so we don't have to add and remove event listeners manually.
   */
  private readonly button$ = new Subject<HTMLElement | undefined>();

  private readonly destroy$ = new Subject<void>();

  private readonly ngZone = inject(NgZone);
  private readonly emojiService = inject(EmojiService);

  protected readonly view = computed<EmojiView>(() => {
    const hidden: EmojiView = { isVisible: false, custom: false, label: '' };
    if (!this.emoji()) {
      return hidden;
    }
    const data = this.getData();
    if (!data) {
      return hidden;
    }
    let unified = data.native || null;
    if (!data.unified && !data.custom) {
      return hidden;
    }
    const title = this.tooltip() ? data.shortNames[0] : undefined;
    if (data.obsoletedBy && this.hideObsolete()) {
      return hidden;
    }

    const label = [data.native].concat(data.shortNames).filter(Boolean).join(', ');
    let style: any;

    if (this.isNative() && data.unified && data.native) {
      // hide older emoji before the split into gendered emoji
      style = { fontSize: `${this.size()}px` };

      if (this.forceSize()) {
        style.display = 'inline-block';
        style.width = `${this.size()}px`;
        style.height = `${this.size()}px`;
        style['word-break'] = 'keep-all';
      }
    } else if (data.custom) {
      style = {
        width: `${this.size()}px`,
        height: `${this.size()}px`,
        display: 'inline-block',
      };
      const sheetColumns = this.sheetColumns();
      const sheetRows = this.sheetRows();
      if (data.spriteUrl && sheetRows && sheetColumns) {
        style = {
          ...style,
          backgroundImage: `url(${data.spriteUrl})`,
          backgroundSize: `${100 * sheetColumns}% ${100 * sheetRows}%`,
          backgroundPosition: this.emojiService.getSpritePosition(data.sheet, sheetColumns),
        };
      } else {
        style = {
          ...style,
          backgroundImage: `url(${data.imageUrl})`,
          backgroundSize: 'contain',
        };
      }
    } else {
      const set = this.set();
      if (data.hidden.length && data.hidden.includes(set)) {
        const fallback = this.fallback();
        if (!fallback) {
          return hidden;
        }
        style = { fontSize: `${this.size()}px` };
        unified = fallback(data, this.getProps());
      } else {
        style = this.emojiService.emojiSpriteStyles(
          data.sheet,
          set,
          this.size(),
          this.sheetSize(),
          this.sheetRows(),
          this.backgroundImageFn(),
          this.sheetColumns(),
          this.imageUrlFn()?.(this.getData()),
        );
      }
    }
    return { isVisible: true, unified, custom: !!data.custom, title, label, style };
  });

  constructor() {
    this.setupMouseListeners();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
  }

  /** The current values of the inputs. They are passed to `fallback`. */
  private getProps() {
    return {
      skin: this.skin(),
      set: this.set(),
      sheetSize: this.sheetSize(),
      isNative: this.isNative(),
      forceSize: this.forceSize(),
      tooltip: this.tooltip(),
      size: this.size(),
      emoji: this.emoji(),
      fallback: this.fallback(),
      hideObsolete: this.hideObsolete(),
      sheetRows: this.sheetRows(),
      sheetColumns: this.sheetColumns(),
      useButton: this.useButton(),
      backgroundImageFn: this.backgroundImageFn(),
      imageUrlFn: this.imageUrlFn(),
    };
  }

  getData() {
    return this.emojiService.getData(this.emoji(), this.skin(), this.set());
  }

  getSanitizedData(): EmojiData {
    return this.emojiService.getSanitizedData(this.emoji(), this.skin(), this.set()) as EmojiData;
  }

  private setupMouseListeners(): void {
    const eventListener$ = (eventName: string) =>
      this.button$.pipe(
        // Note: `EMPTY` is used to remove event listener once the DOM node is removed.
        switchMap(button => (button ? fromEvent(button, eventName) : EMPTY)),
        takeUntil(this.destroy$),
      );

    eventListener$('click').subscribe($event => {
      this.emojiClick.emit({ emoji: this.getSanitizedData(), $event });
    });

    eventListener$('mouseenter').subscribe($event => {
      this.emojiOver.emit({ emoji: this.getSanitizedData(), $event });
    });

    eventListener$('mouseleave').subscribe($event => {
      this.emojiLeave.emit({ emoji: this.getSanitizedData(), $event });
    });
  }
}
