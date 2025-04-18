import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnChanges,
  OutputEmitterRef,
  inject,
  output,
  signal,
} from '@angular/core';

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
  emojiOver: OutputEmitterRef<EmojiEvent>;
  emojiLeave: OutputEmitterRef<EmojiEvent>;
  emojiClick: OutputEmitterRef<EmojiEvent>;
  imageUrlFn?: (emoji: EmojiData | null) => string;
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
  @Input() skin: Emoji['skin'] = 1;
  @Input() set: Emoji['set'] = 'apple';
  @Input() sheetSize: Emoji['sheetSize'] = 64;
  /** Renders the native unicode emoji */
  @Input() isNative: Emoji['isNative'] = false;
  @Input() forceSize: Emoji['forceSize'] = false;
  @Input() tooltip: Emoji['tooltip'] = false;
  @Input() size: Emoji['size'] = 24;
  @Input() emoji: Emoji['emoji'] = '';
  @Input() fallback?: Emoji['fallback'];
  @Input() hideObsolete = false;
  @Input() sheetRows?: number;
  @Input() sheetColumns?: number;
  @Input() useButton?: boolean;

  readonly emojiOver: Emoji['emojiOver'] = output();
  readonly emojiLeave: Emoji['emojiLeave'] = output();
  readonly emojiClick: Emoji['emojiClick'] = output();

  protected readonly styles = signal<Record<string, string | undefined>>({});

  title?: string = undefined;
  label = '';
  unified?: string | null;
  custom = false;
  isVisible = true;
  // TODO: replace 4.0.3 w/ dynamic get verison from emoji-datasource in package.json
  @Input() backgroundImageFn: Emoji['backgroundImageFn'] = DEFAULT_BACKGROUNDFN;
  @Input() imageUrlFn?: Emoji['imageUrlFn'];

  private readonly emojiService = inject(EmojiService);

  ngOnChanges() {
    if (!this.emoji) {
      return (this.isVisible = false);
    }
    const data = this.getData();
    if (!data) {
      return (this.isVisible = false);
    }
    // const children = this.children;
    this.unified = data.native || null;
    if (data.custom) {
      this.custom = data.custom;
    }
    if (!data.unified && !data.custom) {
      return (this.isVisible = false);
    }
    if (this.tooltip) {
      this.title = data.shortNames[0];
    }
    if (data.obsoletedBy && this.hideObsolete) {
      return (this.isVisible = false);
    }

    this.label = [data.native].concat(data.shortNames).filter(Boolean).join(', ');

    if (this.isNative && data.unified && data.native) {
      // hide older emoji before the split into gendered emoji
      this.styles.set({ fontSize: `${this.size}px` });

      if (this.forceSize) {
        this.styles.update(styles => ({
          ...styles,
          display: 'inline-block',
          width: `${this.size}px`,
          height: `${this.size}px`,
          'word-break': 'keep-all',
        }));
      }
    } else if (data.custom) {
      this.styles.set({
        width: `${this.size}px`,
        height: `${this.size}px`,
        display: 'inline-block',
      });
      if (data.spriteUrl && this.sheetRows && this.sheetColumns) {
        this.styles.update(styles => ({
          ...styles,
          backgroundImage: `url(${data.spriteUrl})`,
          backgroundSize: `${100 * this.sheetColumns!}% ${100 * this.sheetRows!}%`,
          backgroundPosition: this.emojiService.getSpritePosition(data.sheet, this.sheetColumns!),
        }));
      } else {
        this.styles.update(styles => ({
          ...styles,
          backgroundImage: `url(${data.imageUrl})`,
          backgroundSize: 'contain',
        }));
      }
    } else {
      if (data.hidden.length && data.hidden.includes(this.set)) {
        if (this.fallback) {
          this.styles.set({ fontSize: `${this.size}px` });
          this.unified = this.fallback(data, this);
        } else {
          return (this.isVisible = false);
        }
      } else {
        const styles = this.emojiService.emojiSpriteStyles(
          data.sheet,
          this.set,
          this.size,
          this.sheetSize,
          this.sheetRows,
          this.backgroundImageFn,
          this.sheetColumns,
          this.imageUrlFn?.(this.getData()),
        );
        this.styles.set(styles);
      }
    }
    return (this.isVisible = true);
  }

  getData() {
    return this.emojiService.getData(this.emoji, this.skin, this.set);
  }

  getSanitizedData(): EmojiData {
    return this.emojiService.getSanitizedData(this.emoji, this.skin, this.set) as EmojiData;
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
