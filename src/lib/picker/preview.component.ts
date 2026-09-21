import { Emoji, EmojiComponent, EmojiData, EmojiService } from 'ngx-emoji-mart-next/ngx-emoji';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Output,
  computed,
  input,
  inject,
} from '@angular/core';

import { SkinComponent } from './skins.component';

@Component({
  selector: 'emoji-preview',
  template: `
    @if (emoji() && emojiData()) {
      <div class="emoji-mart-preview">
        <div class="emoji-mart-preview-emoji">
          <ngx-emoji
            [emoji]="emoji()"
            [size]="38"
            [isNative]="emojiIsNative()"
            [skin]="emojiSkin()"
            [size]="emojiSize()"
            [set]="emojiSet()"
            [sheetSize]="emojiSheetSize()"
            [backgroundImageFn]="emojiBackgroundImageFn()"
            [imageUrlFn]="emojiImageUrlFn()"
          ></ngx-emoji>
        </div>

        <div class="emoji-mart-preview-data">
          <div class="emoji-mart-preview-name">{{ emojiData().name }}</div>
          <div class="emoji-mart-preview-shortname">
            @for (short_name of emojiData().shortNames; track $index) {
              <span class="emoji-mart-preview-shortname"> :{{ short_name }}: </span>
            }
          </div>
          <div class="emoji-mart-preview-emoticons">
            @for (emoticon of listedEmoticons(); track emoticon) {
              <span class="emoji-mart-preview-emoticon">
                {{ emoticon }}
              </span>
            }
          </div>
        </div>
      </div>
    }

    <div class="emoji-mart-preview" [hidden]="emoji()">
      <div class="emoji-mart-preview-emoji">
        @if (idleEmoji() && idleEmoji().length) {
          <ngx-emoji
            [isNative]="emojiIsNative()"
            [skin]="emojiSkin()"
            [set]="emojiSet()"
            [emoji]="idleEmoji()"
            [backgroundImageFn]="emojiBackgroundImageFn()"
            [size]="38"
            [imageUrlFn]="emojiImageUrlFn()"
          ></ngx-emoji>
        }
      </div>

      <div class="emoji-mart-preview-data">
        <span class="emoji-mart-title-label">{{ title() }}</span>
      </div>

      <div class="emoji-mart-preview-skins">
        <emoji-skins
          [skin]="emojiSkin()"
          (changeSkin)="skinChange.emit($event)"
          [i18n]="i18n()"
        ></emoji-skins>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  preserveWhitespaces: false,
  imports: [EmojiComponent, SkinComponent],
})
export class PreviewComponent {
  private emojiService = inject(EmojiService);

  readonly title = input<string>();
  readonly emoji = input<any>();
  readonly idleEmoji = input<any>();
  readonly i18n = input<any>();
  readonly emojiIsNative = input.required<Emoji['isNative']>();
  readonly emojiSkin = input.required<Emoji['skin']>();
  readonly emojiSize = input.required<Emoji['size']>();
  readonly emojiSet = input.required<Emoji['set']>();
  readonly emojiSheetSize = input.required<Emoji['sheetSize']>();
  readonly emojiBackgroundImageFn = input.required<Emoji['backgroundImageFn']>();
  readonly emojiImageUrlFn = input<Emoji['imageUrlFn']>();
  @Output() skinChange = new EventEmitter<Emoji['skin']>();
  readonly emojiData = computed<Partial<EmojiData>>(() => {
    const emoji = this.emoji();
    if (!emoji) {
      return {};
    }
    return this.emojiService.getData(emoji, this.emojiSkin(), this.emojiSet()) as EmojiData;
  });
  readonly listedEmoticons = computed(() => {
    const knownEmoticons: string[] = [];
    const listedEmoticons: string[] = [];
    const emoitcons = this.emojiData().emoticons || [];
    emoitcons.forEach((emoticon: string) => {
      if (knownEmoticons.indexOf(emoticon.toLowerCase()) >= 0) {
        return;
      }
      knownEmoticons.push(emoticon.toLowerCase());
      listedEmoticons.push(emoticon);
    });
    return listedEmoticons;
  });
}
