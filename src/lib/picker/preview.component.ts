import { Emoji, EmojiComponent, EmojiData, EmojiService } from '@ctrl/ngx-emoji-mart/ngx-emoji';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
} from '@angular/core';

import { SkinComponent } from './skins.component';

@Component({
  selector: 'emoji-preview',
  templateUrl: './preview.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [EmojiComponent, SkinComponent],
})
export class PreviewComponent implements OnChanges {
  @Input() title?: string;
  @Input() emoji: any;
  @Input() idleEmoji: any;
  @Input() i18n: any;
  @Input() emojiIsNative?: Emoji['isNative'];
  @Input() emojiSkin?: Emoji['skin'];
  @Input() emojiSize?: Emoji['size'];
  @Input() emojiSet?: Emoji['set'];
  @Input() emojiSheetSize?: Emoji['sheetSize'];
  @Input() emojiBackgroundImageFn?: Emoji['backgroundImageFn'];
  @Input() emojiImageUrlFn?: Emoji['imageUrlFn'];
  @Output() skinChange = new EventEmitter<Emoji['skin']>();
  emojiData: Partial<EmojiData> = {};
  listedEmoticons?: string[];

  constructor(
    public ref: ChangeDetectorRef,
    private emojiService: EmojiService,
  ) {}

  ngOnChanges() {
    if (!this.emoji) {
      return;
    }
    this.emojiData = this.emojiService.getData(
      this.emoji,
      this.emojiSkin,
      this.emojiSet,
    ) as EmojiData;
    const knownEmoticons: string[] = [];
    const listedEmoticons: string[] = [];
    const emoitcons = this.emojiData.emoticons || [];
    emoitcons.forEach((emoticon: string) => {
      if (knownEmoticons.indexOf(emoticon.toLowerCase()) >= 0) {
        return;
      }
      knownEmoticons.push(emoticon.toLowerCase());
      listedEmoticons.push(emoticon);
    });
    this.listedEmoticons = listedEmoticons;
    this.ref.detectChanges();
  }
}
