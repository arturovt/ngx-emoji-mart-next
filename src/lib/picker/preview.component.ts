import {
  EmojiBackgroundImageFn,
  EmojiComponent,
  EmojiData,
  EmojiImageUrlFn,
  EmojiService,
  EmojiSet,
  EmojiSheetSize,
  EmojiSkin,
} from 'ngx-emoji-mart-next/ngx-emoji';
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
  @Input() emojiIsNative = false;
  @Input() emojiSkin?: EmojiSkin;
  @Input() emojiSize?: number;
  @Input() emojiSet?: EmojiSet;
  @Input() emojiSheetSize?: EmojiSheetSize;
  @Input() emojiBackgroundImageFn?: EmojiBackgroundImageFn;
  @Input() emojiImageUrlFn?: EmojiImageUrlFn;
  @Output() skinChange = new EventEmitter<EmojiSkin>();
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
