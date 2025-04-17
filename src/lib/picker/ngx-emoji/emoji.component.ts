import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  Signal,
  inject,
  input,
  signal,
} from '@angular/core';

import { EmojiData } from './data/data.interfaces';
import { DEFAULT_BACKGROUNDFN, EmojiService } from './emoji.service';

export type EmojiSkin = 1 | 2 | 3 | 4 | 5 | 6;

export type EmojiSheetSize = 16 | 20 | 32 | 64 | 72;

export type EmojiSet = 'apple' | 'google' | 'twitter' | 'facebook' | '';

export type EmojiImageUrlFn = (emoji: EmojiData | null) => string;

export type EmojiBackgroundImageFn = (set: string, sheetSize: number) => string;

export interface Emoji {
  /** Renders the native unicode emoji */
  isNative: Signal<boolean>;
  forceSize: Signal<boolean>;
  tooltip: Signal<boolean>;
  skin: Signal<EmojiSkin>;
  sheetSize: Signal<EmojiSheetSize>;
  sheetRows: Signal<number | undefined>;
  set: Signal<EmojiSet>;
  size: Signal<number>;
  emoji: Signal<string | EmojiData>;
  backgroundImageFn: Signal<EmojiBackgroundImageFn>;
  fallback: Signal<((data: any, props: any) => string) | undefined>;
  imageUrlFn: Signal<EmojiImageUrlFn | undefined>;

  emojiOver: EventEmitter<EmojiEvent>;
  emojiLeave: EventEmitter<EmojiEvent>;
  emojiClick: EventEmitter<EmojiEvent>;
}

export interface EmojiEvent {
  emoji: EmojiData;
  $event: Event;
}

@Component({
  selector: 'ngx-emoji',
  templateUrl: './emoji.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmojiComponent implements OnChanges, Emoji {
  readonly skin: Emoji['skin'] = input(1);
  readonly set: Emoji['set'] = input('apple');
  readonly sheetSize: Emoji['sheetSize'] = input(64);
  /** Renders the native unicode emoji */
  readonly isNative: Emoji['isNative'] = input(false);
  readonly forceSize: Emoji['forceSize'] = input(false);
  readonly tooltip: Emoji['tooltip'] = input(false);
  readonly size: Emoji['size'] = input(24);
  readonly emoji: Emoji['emoji'] = input('');
  readonly fallback: Emoji['fallback'] = input();
  readonly hideObsolete = input(false);
  readonly sheetRows = input<number>();
  readonly sheetColumns = input<number>();
  readonly useButton = input(false);

  @Output() emojiOver: Emoji['emojiOver'] = new EventEmitter();
  @Output() emojiLeave: Emoji['emojiLeave'] = new EventEmitter();
  @Output() emojiClick: Emoji['emojiClick'] = new EventEmitter();

  protected readonly styles = signal<Record<string, string | undefined>>({});

  readonly title = signal<string | undefined>(undefined);
  readonly label = signal('');

  readonly unified = signal<string | null>(null);

  readonly custom = signal(false);

  readonly isVisible = signal(true);

  // TODO: replace 4.0.3 w/ dynamic get verison from emoji-datasource in package.json
  readonly backgroundImageFn: Emoji['backgroundImageFn'] = input(DEFAULT_BACKGROUNDFN);
  readonly imageUrlFn: Emoji['imageUrlFn'] = input();

  private readonly emojiService = inject(EmojiService);

  ngOnChanges() {
    // If there's no emoji, hide the component.
    if (!this.emoji()) {
      return this.isVisible.set(false);
    }

    // Get the associated emoji data.
    const data = this.getData();

    // If no data found, hide the component
    if (!data) {
      return this.isVisible.set(false);
    }

    // Set the unified value (native emoji), or null if not available.
    this.unified.set(data.native || null);

    // If it's a custom emoji, store custom data.
    if (data.custom) {
      this.custom.set(data.custom);
    }

    // If neither a unified value nor a custom emoji is present, hide the component.
    if (!data.unified && !data.custom) {
      return this.isVisible.set(false);
    }

    // If tooltip is enabled, set the title to the first short name.
    if (this.tooltip()) {
      this.title.set(data.shortNames[0]);
    }

    // If the emoji has been obsoleted and the setting to hide obsolete
    // emojis is on, hide the component.
    if (data.obsoletedBy && this.hideObsolete()) {
      return this.isVisible.set(false);
    }

    // Set the label using native emoji and short names, filtered and joined by commas.
    this.label.set([data.native].concat(data.shortNames).filter(Boolean).join(', '));

    if (this.isNative() && data.unified && data.native) {
      // If emoji is native, has a unified code, and a native representation:
      // Apply font size style (used to hide older gender-neutral emoji).
      this.styles.set({ fontSize: `${this.size}px` });

      // If forceSize is enabled, enforce fixed width/height styles.
      if (this.forceSize()) {
        this.styles.update(styles => ({
          ...styles,
          display: 'inline-block',
          width: `${this.size}px`,
          height: `${this.size}px`,
          'word-break': 'keep-all',
        }));
      }
    } else if (data.custom) {
      // If it's a custom emoji:
      // Set base styles for size and display.
      this.styles.set({
        width: `${this.size}px`,
        height: `${this.size}px`,
        display: 'inline-block',
      });

      const sheetRows = this.sheetRows();
      const sheetColumns = this.sheetColumns();

      if (data.spriteUrl && sheetRows && sheetColumns) {
        // If using sprite sheet for custom emoji:
        // Set background image and position from sprite.
        this.styles.update(styles => ({
          ...styles,
          backgroundImage: `url(${data.spriteUrl})`,
          backgroundSize: `${100 * sheetColumns}% ${100 * sheetRows}%`,
          backgroundPosition: this.emojiService.getSpritePosition(data.sheet, sheetColumns),
        }));
      } else {
        // Fallback to individual image if sprite is not available.
        this.styles.update(styles => ({
          ...styles,
          backgroundImage: `url(${data.imageUrl})`,
          backgroundSize: 'contain',
        }));
      }
    } else {
      // Handle standard non-custom emoji (likely from sprite sheet).
      if (data.hidden.length && data.hidden.includes(this.set())) {
        // If emoji is hidden in the current set.
        const fallback = this.fallback();
        if (fallback) {
          // Use fallback emoji rendering.
          this.styles.set({ fontSize: `${this.size}px` });
          this.unified.set(fallback(data, this));
        } else {
          // If no fallback available, hide the emoji.
          return this.isVisible.set(false);
        }
      } else {
        // Generate styles for sprite-based emoji rendering.
        const styles = this.emojiService.emojiSpriteStyles(
          data.sheet,
          this.set(),
          this.size(),
          this.sheetSize(),
          this.sheetRows(),
          this.backgroundImageFn(),
          this.sheetColumns(),
          this.imageUrlFn()?.(this.getData()),
        );
        this.styles.set(styles);
      }
    }

    // Emoji is valid and visible.
    return this.isVisible.set(true);
  }

  getData() {
    return this.emojiService.getData(this.emoji(), this.skin(), this.set());
  }

  getSanitizedData(): EmojiData {
    return this.emojiService.getSanitizedData(this.emoji(), this.skin(), this.set()) as EmojiData;
  }

  protected handleClick($event: MouseEvent): void {
    const emoji = this.getSanitizedData();
    this.emojiClick.emit({ emoji, $event });
  }

  protected handleMouseenter($event: MouseEvent): void {
    const emoji = this.getSanitizedData();
    this.emojiOver.emit({ emoji, $event });
  }

  protected handleMouseleave($event: MouseEvent): void {
    const emoji = this.getSanitizedData();
    this.emojiLeave.emit({ emoji, $event });
  }
}
