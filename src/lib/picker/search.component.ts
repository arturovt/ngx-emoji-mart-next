import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  NgZone,
  OnDestroy,
  OnInit,
  Output,
  ViewChild,
  computed,
  input,
  signal,
  inject,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import { EmojiSearch } from './emoji-search.service';
import { Subject, fromEvent, takeUntil } from 'rxjs';

let id = 0;

@Component({
  selector: 'emoji-search',
  template: `
    <div class="emoji-mart-search">
      <input
        [id]="inputId"
        #inputRef
        type="search"
        [placeholder]="i18n().search"
        [autofocus]="autoFocus()"
        [(ngModel)]="query"
        (ngModelChange)="handleChange()"
      />
      <!--
      Use a <label> in addition to the placeholder for accessibility, but place it off-screen
      http://www.maxability.co.in/2016/01/placeholder-attribute-and-why-it-is-not-accessible/
      -->
      <label class="emoji-mart-sr-only" [htmlFor]="inputId">
        {{ i18n().search }}
      </label>
      <button
        type="button"
        class="emoji-mart-search-icon"
        (click)="clear()"
        (keyup.enter)="clear()"
        [disabled]="!isSearching()"
        [attr.aria-label]="i18n().clear"
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
  preserveWhitespaces: false,
  imports: [FormsModule],
})
export class SearchComponent implements AfterViewInit, OnInit, OnDestroy {
  private ngZone = inject(NgZone);
  private emojiSearch = inject(EmojiSearch);

  readonly maxResults = input(75);
  readonly autoFocus = input(false);
  readonly i18n = input<any>();
  readonly include = input<string[]>([]);
  readonly exclude = input<string[]>([]);
  readonly custom = input<any[]>([]);
  readonly icons = input.required<{ [key: string]: string }>();
  readonly emojisToShowFilter = input<(x: any) => boolean>();
  @Output() searchResults = new EventEmitter<any[]>();
  @Output() enterKey = new EventEmitter<KeyboardEvent>();
  @ViewChild('inputRef', { static: true }) private inputRef!: ElementRef<HTMLInputElement>;
  readonly isSearching = signal(false);
  readonly icon = computed(() => (this.isSearching() ? this.icons().delete : this.icons().search));
  query = '';
  inputId = `emoji-mart-search-${++id}`;

  private destroy$ = new Subject<void>();

  ngOnInit() {
    this.setupKeyupListener();
  }

  ngAfterViewInit() {
    if (this.autoFocus()) {
      this.inputRef.nativeElement.focus();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
  }

  clear() {
    this.query = '';
    this.handleSearch('');
    this.inputRef.nativeElement.focus();
  }

  handleSearch(value: string) {
    this.isSearching.set(value !== '');
    const emojis = this.emojiSearch.search(
      this.query,
      this.emojisToShowFilter(),
      this.maxResults(),
      this.include(),
      this.exclude(),
      this.custom(),
    ) as any[];
    this.searchResults.emit(emojis);
  }

  handleChange() {
    this.handleSearch(this.query);
  }

  private setupKeyupListener(): void {
    this.ngZone.runOutsideAngular(() =>
      fromEvent<KeyboardEvent>(this.inputRef.nativeElement, 'keyup')
        .pipe(takeUntil(this.destroy$))
        .subscribe($event => {
          if (!this.query || $event.key !== 'Enter') {
            return;
          }
          this.enterKey.emit($event);
          $event.preventDefault();
        }),
    );
  }
}
