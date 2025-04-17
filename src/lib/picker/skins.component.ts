import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
  signal,
} from '@angular/core';

import { EmojiSkin } from 'ngx-emoji-mart-next/ngx-emoji';

@Component({
  selector: 'emoji-skins',
  template: `
    <section class="emoji-mart-skin-swatches" [class.opened]="opened()">
      @for (skinTone of skinTones; track skinTone) {
        <span class="emoji-mart-skin-swatch" [class.selected]="skinTone === skin">
          <span
            (click)="handleClick(skinTone)"
            (keyup.enter)="handleClick(skinTone)"
            (keyup.space)="handleClick(skinTone)"
            class="emoji-mart-skin emoji-mart-skin-tone-{{ skinTone }}"
            role="button"
            [tabIndex]="tabIndex(skinTone)"
            [attr.aria-hidden]="!isVisible(skinTone)"
            [attr.aria-pressed]="pressed(skinTone)"
            [attr.aria-haspopup]="!!isSelected(skinTone)"
            [attr.aria-expanded]="expanded(skinTone)"
            [attr.aria-label]="i18n.skintones[skinTone]"
            [attr.title]="i18n.skintones[skinTone]"
          ></span>
        </span>
      }
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SkinComponent {
  /** currently selected skin */
  @Input() skin?: EmojiSkin;
  @Input() i18n: any;

  @Output() changeSkin = new EventEmitter<EmojiSkin>();

  readonly opened = signal(false);

  readonly skinTones: EmojiSkin[] = [1, 2, 3, 4, 5, 6];

  toggleOpen() {
    this.opened.update(opened => !opened);
  }

  isSelected(skinTone: EmojiSkin): boolean {
    return skinTone === this.skin;
  }

  isVisible(skinTone: EmojiSkin): boolean {
    return this.opened() || this.isSelected(skinTone);
  }

  pressed(skinTone: EmojiSkin) {
    return this.opened() ? !!this.isSelected(skinTone) : '';
  }

  tabIndex(skinTone: EmojiSkin) {
    return this.isVisible(skinTone) ? '0' : '';
  }

  expanded(skinTone: EmojiSkin) {
    return this.isSelected(skinTone) ? this.opened : '';
  }

  handleClick(skin: EmojiSkin) {
    if (!this.opened()) {
      this.opened.set(true);
      return;
    }
    this.opened.set(false);
    if (skin !== this.skin) {
      this.changeSkin.emit(skin);
    }
  }
}
