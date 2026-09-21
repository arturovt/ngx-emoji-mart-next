import { ChangeDetectionStrategy, Component, EventEmitter, Output, input } from '@angular/core';

import { EmojiCategory } from 'ngx-emoji-mart-next/ngx-emoji';

@Component({
  selector: 'emoji-mart-anchors',
  template: `
    <div class="emoji-mart-anchors">
      @for (category of categories(); track category.id; let idx = $index) {
        @if (category.anchor !== false) {
          <span
            [attr.title]="i18n().categories[category.id]"
            (click)="this.handleClick($event, idx)"
            class="emoji-mart-anchor"
            [class.emoji-mart-anchor-selected]="category.name === selected()"
            [style.color]="category.name === selected() ? color() : null"
          >
            <div>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
                <path [attr.d]="icons()[category.id]" />
              </svg>
            </div>
            <span class="emoji-mart-anchor-bar" [style.background-color]="color()"></span>
          </span>
        }
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  preserveWhitespaces: false,
})
export class AnchorsComponent {
  readonly categories = input<EmojiCategory[]>([]);
  readonly color = input<string>();
  readonly selected = input<string>();
  readonly i18n = input<any>();
  readonly icons = input<{ [key: string]: string }>({});
  @Output() anchorClick = new EventEmitter<{ category: EmojiCategory; index: number }>();

  handleClick($event: Event, index: number) {
    this.anchorClick.emit({
      category: this.categories()[index],
      index,
    });
  }
}
