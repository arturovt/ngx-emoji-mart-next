import {
  afterNextRender,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  Input,
  NgZone,
  output,
  signal,
  viewChild,
} from '@angular/core';

import { EmojiSearch } from './emoji-search.service';

let id = 0;

@Component({
  selector: 'emoji-search',
  template: `
    <div class="emoji-mart-search">
      <input
        [id]="inputId"
        #inputRef
        type="search"
        [placeholder]="i18n.search"
        [autofocus]="autoFocus"
        [value]="query"
        (input)="handleChange($event)"
      />
      <!--
      Use a <label> in addition to the placeholder for accessibility, but place it off-screen
      http://www.maxability.co.in/2016/01/placeholder-attribute-and-why-it-is-not-accessible/
      -->
      <label class="emoji-mart-sr-only" [htmlFor]="inputId">
        {{ i18n.search }}
      </label>
      <button
        type="button"
        class="emoji-mart-search-icon"
        (click)="clear()"
        (keyup.enter)="clear()"
        [disabled]="!isSearching()"
        [attr.aria-label]="i18n.clear"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          width="13"
          height="13"
          opacity="0.5"
        >
          <path [attr.d]="icon()" />
        </svg>
      </button>
    </div>
  `,
})
export class SearchComponent {
  @Input() maxResults = 75;
  @Input() autoFocus = false;
  @Input() i18n: any;
  @Input() include: string[] = [];
  @Input() exclude: string[] = [];
  @Input() custom: any[] = [];
  @Input() icons!: { [key: string]: string };
  @Input() emojisToShowFilter?: (x: any) => boolean;

  readonly searchResults = output<any[]>();
  readonly enterKey = output<KeyboardEvent>();

  readonly inputRef = viewChild.required<ElementRef<HTMLInputElement>>('inputRef');

  readonly isSearching = signal(false);

  readonly icon = signal<string>('');

  query = '';

  readonly inputId = `emoji-mart-search-${++id}`;

  private ngZone = inject(NgZone);
  private emojiSearch = inject(EmojiSearch);

  constructor() {
    const destroyRef = inject(DestroyRef);

    afterNextRender(() => {
      this.icon.set(this.icons.search);

      const inputRef = this.inputRef().nativeElement;

      if (this.autoFocus) {
        inputRef.focus();
      }

      this.ngZone.runOutsideAngular(() => {
        const onKeyup = (event: KeyboardEvent) => {
          if (!this.query || event.key !== 'Enter') {
            return;
          }
          this.ngZone.run(() => this.enterKey.emit(event));
          event.preventDefault();
        };

        inputRef.addEventListener('keyup', onKeyup);
        destroyRef.onDestroy(() => inputRef.removeEventListener('keyup', onKeyup));
      });
    });
  }

  clear() {
    this.query = '';
    this.handleSearch('');
    this.inputRef().nativeElement.focus();
  }

  handleSearch(value: string) {
    if (value === '') {
      this.icon.set(this.icons.search);
      this.isSearching.set(false);
    } else {
      this.icon.set(this.icons.delete);
      this.isSearching.set(true);
    }
    const emojis = this.emojiSearch.search(
      this.query,
      this.emojisToShowFilter,
      this.maxResults,
      this.include,
      this.exclude,
      this.custom,
    ) as any[];
    this.searchResults.emit(emojis);
  }

  handleChange(event: Event) {
    const target = <HTMLInputElement>event.target;
    this.query = target.value;
    this.handleSearch(this.query);
  }
}
