import { Emoji, EmojiComponent, EmojiData, EmojiService } from 'ngx-emoji-mart-next/ngx-emoji';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  OnChanges,
  output,
  signal,
} from '@angular/core';

import { SkinComponent } from './skins.component';

@Component({
  selector: 'emoji-preview',
  templateUrl: './preview.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [EmojiComponent, SkinComponent],
})
export class PreviewComponent implements OnChanges {
  readonly title = input<string>();
  readonly emoji = input<any>();
  readonly idleEmoji = input<any>();
  readonly i18n = input<any>();
  readonly emojiIsNative = input<boolean>();
  readonly emojiSkin = input<Emoji['skin']>();
  readonly emojiSize = input<Emoji['size']>();
  readonly emojiSet = input<Emoji['set']>();
  readonly emojiSheetSize = input<Emoji['sheetSize']>();
  readonly emojiBackgroundImageFn = input<Emoji['backgroundImageFn']>();
  readonly emojiImageUrlFn = input<Emoji['imageUrlFn']>();

  readonly skinChange = output<Emoji['skin']>();

  readonly emojiData = signal<Partial<EmojiData>>({});

  readonly listedEmoticons = signal<string[] | null>(null);

  private emojiService = inject(EmojiService);

  ngOnChanges() {
    const emoji = this.emoji();

    if (!emoji) {
      return;
    }

    const emojiData = this.emojiService.getData(emoji, this.emojiSkin(), this.emojiSet())!;
    this.emojiData.set(emojiData);

    const knownEmoticons: string[] = [];
    const listedEmoticons: string[] = [];
    const emoitcons = emojiData.emoticons || [];
    emoitcons.forEach((emoticon: string) => {
      if (knownEmoticons.indexOf(emoticon.toLowerCase()) >= 0) {
        return;
      }
      knownEmoticons.push(emoticon.toLowerCase());
      listedEmoticons.push(emoticon);
    });
    this.listedEmoticons.set(listedEmoticons);
  }
}
