import { Injectable, PendingTasks, inject, signal } from '@angular/core';

import { categories, EmojiData, EmojiService } from 'ngx-emoji-mart-next/ngx-emoji';
import { CUSTOM_EMOJI_KEY_PREFIX } from './emoji-frequently.service';
import { intersect } from './utils';

type SearchIndex = {
  results?: EmojiData[];
  pool?: { [key: string]: EmojiData };
  [key: string]: any;
};

/** The emojis of one combination of `include`, `exclude` and custom emojis. */
interface SearchEntry {
  /** The emojis that are searched. The key of a custom emoji starts with the custom prefix. */
  pool: { [key: string]: EmojiData };
  /** The emojis that are returned. It has the same keys as the pool. */
  list: { [key: string]: EmojiData };
  /** The results for the characters that were typed. */
  index: SearchIndex;
}

@Injectable({ providedIn: 'root' })
export class EmojiSearch {
  private emojiService = inject(EmojiService);
  private pendingTasks = inject(PendingTasks);

  originalPool: { [key: string]: EmojiData } = {};
  index: SearchIndex = {};
  emojisList: { [key: string]: EmojiData | null } = {};
  emoticonsList: { [key: string]: string } = {};

  private readonly entries = new Map<string, Promise<SearchEntry>>();
  private readonly searchTexts = new WeakMap<EmojiData, string>();
  /**
   * Everything the service needs is loaded lazily, on first `search()` call, not eagerly here in
   * the constructor: this service is injected (and so constructed) as soon as `<emoji-search>`
   * mounts, which is the moment the picker mounts with the default `enableSearch=true` —
   * regardless of whether anyone actually searches.
   */
  private ready?: Promise<void>;

  /** True while the first `search()` call's full-dataset load is in flight. */
  readonly isLoading = signal(false);

  private ensureReady(): Promise<void> {
    if (!this.ready) {
      this.isLoading.set(true);
      // Marks the app itself as not-yet-stable for the duration of this load, the same way a
      // `resource()`'s loader does — without this, SSR could serialize before this resolves, and
      // `ApplicationRef.whenStable()`/`ComponentFixture.whenStable()` wouldn't wait for it either.
      const removePendingTask = this.pendingTasks.add();
      this.ready = this.load().finally(() => {
        this.isLoading.set(false);
        removePendingTask();
      });
    }
    return this.ready;
  }

  private async load(): Promise<void> {
    const allEmojis = await this.emojiService.loadAllCategories();

    for (const emojiData of allEmojis) {
      const { shortNames, emoticons } = emojiData;
      const id = shortNames[0];

      for (const emoticon of emoticons) {
        if (this.emoticonsList[emoticon]) {
          continue;
        }

        this.emoticonsList[emoticon] = id;
      }

      this.emojisList[id] = await this.emojiService.getSanitizedData(id);
      this.originalPool[id] = emojiData;
    }
  }

  async search(
    value: string,
    emojisToShowFilter?: (x: any) => boolean,
    maxResults = 75,
    include: any[] = [],
    exclude: any[] = [],
    custom: any[] = [],
  ): Promise<EmojiData[] | null> {
    await this.ensureReady();

    let results: EmojiData[] | undefined;

    if (value.length) {
      if (value === '-' || value === '-1') {
        return [this.emojisList['-1']!];
      }
      if (value === '+' || value === '+1') {
        return [this.emojisList['+1']!];
      }

      let values = value.toLowerCase().split(/[\s|,|\-|_]+/);

      if (values.length > 2) {
        values = [values[0], values[1]];
      }

      const entry = await this.getEntry(include, exclude, custom);
      const allResults = values.map(v => this.searchEntry(entry, v)).filter(a => a);

      if (allResults.length > 1) {
        results = intersect.apply(null, allResults as any);
      } else if (allResults.length) {
        results = allResults[0];
      } else {
        results = [];
      }
    }

    if (results) {
      if (emojisToShowFilter) {
        results = results.filter((result: EmojiData) => {
          if (result && result.id) {
            return emojisToShowFilter(
              result.custom ? undefined : this.emojiService.getCachedBaseData(result.id),
            );
          }
          return false;
        });
      }

      if (results && results.length > maxResults) {
        results = results.slice(0, maxResults);
      }
    }
    return results || null;
  }

  /**
   * The emojis and the cached results are kept for each combination of `include`, `exclude` and
   * custom emojis. This way a call never gets the results of another combination.
   */
  private getEntry(include: any[], exclude: any[], custom: any[]): Promise<SearchEntry> {
    if (!include.length && !exclude.length && !custom.length) {
      return Promise.resolve({ pool: this.originalPool, list: this.emojisList as any, index: this.index });
    }

    const signature = JSON.stringify([include, exclude, custom]);
    let entry = this.entries.get(signature);
    if (!entry) {
      entry = this.createEntry(include, exclude, custom);
      this.entries.set(signature, entry);
    }
    return entry;
  }

  private async createEntry(include: any[], exclude: any[], custom: any[]): Promise<SearchEntry> {
    let pool: { [key: string]: EmojiData };

    if (include.length || exclude.length) {
      pool = {};

      for (const category of categories || []) {
        const isIncluded = include.length ? include.indexOf(category.id) > -1 : true;
        const isExcluded = exclude.length ? exclude.indexOf(category.id) > -1 : false;

        if (!isIncluded || isExcluded) {
          continue;
        }

        for (const emojiId of category.emojis || []) {
          // Need to make sure that pool gets keyed
          // with the correct id, which is why we call emojiService.getData below
          const emoji = await this.emojiService.getData(emojiId);
          if (emoji) {
            pool[emoji.id] = emoji;
          }
        }
      }
    } else {
      pool = { ...this.originalPool };
    }

    const list: { [key: string]: EmojiData } = { ...this.emojisList } as any;
    const customIsIncluded = include.length ? include.indexOf('custom') > -1 : true;
    const customIsExcluded = exclude.length ? exclude.indexOf('custom') > -1 : false;

    if (customIsIncluded && !customIsExcluded) {
      for (const emoji of custom) {
        const id = emoji.id || emoji.shortNames?.[0];
        // A custom emoji can have the same id as a standard emoji, so it has its own key.
        const key = `${CUSTOM_EMOJI_KEY_PREFIX}${id}`;

        if (id && !pool[key]) {
          const data = { ...emoji, id, custom: true };
          pool[key] = (await this.emojiService.getData(data))!;
          list[key] = (await this.emojiService.getSanitizedData(data))!;
        }
      }
    }

    return { pool, list, index: {} };
  }

  private searchEntry(entry: SearchEntry, value: string): EmojiData[] {
    let pool = entry.pool;
    let index = entry.index;
    let length = 0;

    for (let charIndex = 0; charIndex < value.length; charIndex++) {
      const char = value[charIndex];
      length++;
      if (!index[char]) {
        index[char] = {};
      }
      index = index[char];

      if (!index.results) {
        const sub = value.substr(0, length);
        const found: { emoji: EmojiData; score: number }[] = [];

        index.pool = {};

        for (const key of Object.keys(pool)) {
          const emoji = pool[key];
          const subIndex = this.getSearchText(emoji).indexOf(sub);

          if (subIndex !== -1) {
            found.push({ emoji: entry.list[key], score: sub === emoji.id ? 0 : subIndex + 1 });
            index.pool[key] = emoji;
          }
        }

        index.results = found.sort((a, b) => a.score - b.score).map(({ emoji }) => emoji);
      }

      pool = index.pool!;
    }

    return index.results!;
  }

  private getSearchText(emoji: EmojiData): string {
    let text = this.searchTexts.get(emoji);
    if (text === undefined) {
      text = this.buildSearch(
        emoji.shortNames,
        emoji.name,
        emoji.id,
        emoji.keywords,
        emoji.emoticons,
      );
      this.searchTexts.set(emoji, text);
    }
    return text;
  }

  buildSearch(
    shortNames: string[],
    name: string,
    id: string,
    keywords: string[],
    emoticons: string[],
  ) {
    const search: string[] = [];

    const addToSearch = (strings: string | string[], split: boolean) => {
      if (!strings) {
        return;
      }

      const arr = Array.isArray(strings) ? strings : [strings];

      for (const str of arr) {
        const substrings = split ? str.split(/[-|_|\s]+/) : [str];

        for (let s of substrings) {
          s = s.toLowerCase();

          if (!search.includes(s)) {
            search.push(s);
          }
        }
      }
    };

    addToSearch(shortNames, true);
    addToSearch(name, true);
    addToSearch(id, true);
    addToSearch(keywords, true);
    addToSearch(emoticons, false);

    return search.join(',');
  }
}
