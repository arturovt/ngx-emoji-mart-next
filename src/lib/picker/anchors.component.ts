import { ChangeDetectionStrategy, Component, input, Input, output } from '@angular/core';

import { EmojiCategory } from '@ctrl/ngx-emoji-mart/ngx-emoji';

@Component({
  selector: 'emoji-mart-anchors',
  templateUrl: './anchors.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnchorsComponent {
  protected readonly categories = input<EmojiCategory[]>([]);
  @Input() color?: string;
  @Input() selected?: string;
  @Input() i18n: any;
  @Input() icons: { [key: string]: string } = {};

  readonly anchorClick = output<{ category: EmojiCategory; index: number }>();

  handleClick($event: Event, index: number) {
    this.anchorClick.emit({
      category: this.categories()[index],
      index,
    });
  }
}
