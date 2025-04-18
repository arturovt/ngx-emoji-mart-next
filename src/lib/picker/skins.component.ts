import { ChangeDetectionStrategy, Component, Input, output, signal } from '@angular/core';

import { Emoji } from 'ngx-emoji-mart-next/ngx-emoji';

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
  @Input() skin?: Emoji['skin'];
  @Input() i18n: any;

  readonly changeSkin = output<Emoji['skin']>();

  readonly opened = signal(false);

  readonly skinTones: Emoji['skin'][] = [1, 2, 3, 4, 5, 6];

  toggleOpen() {
    this.opened.update(opened => !opened);
  }

  isSelected(skinTone: Emoji['skin']): boolean {
    return skinTone === this.skin;
  }

  isVisible(skinTone: Emoji['skin']): boolean {
    return this.opened() || this.isSelected(skinTone);
  }

  pressed(skinTone: Emoji['skin']) {
    return this.opened() ? !!this.isSelected(skinTone) : '';
  }

  tabIndex(skinTone: Emoji['skin']) {
    return this.isVisible(skinTone) ? '0' : '';
  }

  expanded(skinTone: Emoji['skin']) {
    return this.isSelected(skinTone) ? this.opened : '';
  }

  handleClick(skin: Emoji['skin']) {
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
