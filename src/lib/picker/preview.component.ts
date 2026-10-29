import { Emoji, EmojiComponent, EmojiData, EmojiService } from 'ngx-emoji-mart-next/ngx-emoji';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Output,
  computed,
  input,
  inject,
  resource,
} from '@angular/core';

import { SkinComponent } from './skins.component';

@Component({
  selector: 'emoji-preview',
  template: `
    @let _emoji = emoji();
    @let _emojiData = emojiData();
    @let _idleEmoji = idleEmoji();
    @let _emojiIsNative = emojiIsNative();
    @let _emojiSkin = emojiSkin();
    @let _emojiSet = emojiSet();
    @let _emojiBackgroundImageFn = emojiBackgroundImageFn();
    @let _emojiImageUrlFn = emojiImageUrlFn();

    @if (_emoji && hasEmojiData()) {
      <div class="emoji-mart-preview">
        <div class="emoji-mart-preview-emoji">
          <ngx-emoji
            [emoji]="_emoji"
            [size]="38"
            [isNative]="_emojiIsNative"
            [skin]="_emojiSkin"
            [size]="emojiSize()"
            [set]="_emojiSet"
            [sheetSize]="emojiSheetSize()"
            [backgroundImageFn]="_emojiBackgroundImageFn"
            [imageUrlFn]="_emojiImageUrlFn"
          ></ngx-emoji>
        </div>

        <div class="emoji-mart-preview-data">
          <div class="emoji-mart-preview-name">{{ _emojiData.name }}</div>
          <div class="emoji-mart-preview-shortname">
            @for (short_name of _emojiData.shortNames; track $index) {
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

    <div class="emoji-mart-preview" [hidden]="_emoji">
      <div class="emoji-mart-preview-emoji">
        @if (_idleEmoji && _idleEmoji.length) {
          <ngx-emoji
            [isNative]="_emojiIsNative"
            [skin]="_emojiSkin"
            [set]="_emojiSet"
            [emoji]="_idleEmoji"
            [backgroundImageFn]="_emojiBackgroundImageFn"
            [size]="38"
            [imageUrlFn]="_emojiImageUrlFn"
          ></ngx-emoji>
        }
      </div>

      <div class="emoji-mart-preview-data">
        <span class="emoji-mart-title-label">{{ title() }}</span>
      </div>

      <div class="emoji-mart-preview-skins">
        <emoji-skins
          [skin]="_emojiSkin"
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

  /**
   * The hovered/selected emoji's base data (name, short names, emoticons) for the preview
   * panel's text. Doesn't depend on skin/set — those only affect the `<ngx-emoji>` child's own
   * rendering below, not this text — so changing skin tone never reloads this.
   */
  private readonly emojiResource = resource<EmojiData | null, Emoji['emoji'] | undefined>({
    params: () => this.emoji() || undefined,
    loader: async ({ params }) => {
      const resolved = this.emojiService.resolveIndexEntry(params);
      if (resolved) {
        return this.emojiService.loadBaseData(resolved.unified);
      }
      if (typeof params === 'string') {
        return null;
      }
      const custom = params as EmojiData;
      custom.custom = true;
      return custom;
    },
    // No `id` — see the matching comment in `EmojiComponent.baseData`.
  });

  readonly emojiData = computed<Partial<EmojiData>>(() => {
    if (this.emojiResource.status() === 'error') {
      return {};
    }
    return this.emojiResource.value() ?? {};
  });
  /**
   * Whether `emojiData` is genuinely resolved data, not just the `{}` default it falls back to
   * while loading or on error. The template uses this (not a truthiness check on `emojiData`,
   * which is always a truthy object) to keep the idle panel showing until the real data is
   * ready, instead of briefly rendering the hover panel with blank fields.
   */
  readonly hasEmojiData = computed(() => !!this.emoji() && this.emojiResource.hasValue());
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
