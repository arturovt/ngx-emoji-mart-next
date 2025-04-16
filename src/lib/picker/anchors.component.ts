import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { EmojiCategory } from '@ctrl/ngx-emoji-mart/ngx-emoji';

@Component({
  selector: 'emoji-mart-anchors',
  templateUrl: './anchors.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnchorsComponent {
  readonly categories = input<EmojiCategory[]>([]);
  readonly color = input<string>();
  readonly selected = input<string>();
  readonly i18n = input<any>();
  readonly icons = input<Record<string, string>>({});

  readonly anchorClick = output<{ category: EmojiCategory; index: number }>();

  handleClick($event: Event, index: number) {
    this.anchorClick.emit({
      category: this.categories()[index],
      index,
    });
  }
}
