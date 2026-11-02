import { Injectable } from '@angular/core';

import {
  CompressedEmojiData,
  EmojiData,
  EmojiIndexEntry,
  EmojiVariation,
} from './data/data.interfaces';
import { emojiIndex, emojiNameToUnified } from './data/emoji-index';
import { Emoji } from './emoji.component';

const COLONS_REGEX = /^(?:\:([^\:]+)\:)(?:\:skin-tone-(\d)\:)?$/;
const SKINS = ['1F3FA', '1F3FB', '1F3FC', '1F3FD', '1F3FE', '1F3FF'];
export const DEFAULT_BACKGROUNDFN = (set: string, sheetSize: number) =>
  `https://cdn.jsdelivr.net/npm/emoji-datasource-${set}@14.0.0/img/${set}/sheets-256/${sheetSize}.png`;

type CategoryModule = { emojis: { [unified: string]: CompressedEmojiData } };

// Each line below uses a plain, fixed text inside `import()`. We tested this with this repo's
// own build: if the text comes from a variable instead, the bundler cannot split that file into
// its own chunk. It just drops the file. So every path here must be written out in full.
const CATEGORY_LOADERS: { [id: string]: () => Promise<CategoryModule> } = {
  activity: () => import('./data/categories/activity'),
  flags: () => import('./data/categories/flags'),
  foods: () => import('./data/categories/foods'),
  nature: () => import('./data/categories/nature'),
  objects: () => import('./data/categories/objects'),
  people: () => import('./data/categories/people'),
  places: () => import('./data/categories/places'),
  symbols: () => import('./data/categories/symbols'),
};

@Injectable({ providedIn: 'root' })
export class EmojiService {
  /** We load each category only once. Every emoji in that category shares this one load. */
  private readonly categoryCache = new Map<
    string,
    Promise<{ [unified: string]: CompressedEmojiData }>
  >();
  /** The full data for one emoji, before we add the skin tone. Saved by its unified code. */
  private readonly enrichedCache = new Map<string, EmojiData>();
  private keywordsPromise?: Promise<{ [unified: string]: string[] }>;

  /**
   * Finds the index entry for an emoji id or object. This does not load the category file.
   * It returns `undefined` when the emoji is not a known standard emoji. This can mean it is
   * a custom emoji, or the id does not exist. In that case, the caller should treat it as
   * "custom".
   *
   * A string like `:name:` or `:name::skin-tone-N:` is read the same way `getData` always
   * did. If a skin tone is inside the string, we return it too. The caller can use it, even
   * though it is not really part of the emoji's own id.
   */
  resolveIndexEntry(
    emoji: EmojiData | string,
  ): { unified: string; entry: EmojiIndexEntry; skinOverride?: Emoji['skin'] } | undefined {
    let key: string;
    let skinOverride: Emoji['skin'] | undefined;

    if (typeof emoji === 'string') {
      const matches = emoji.match(COLONS_REGEX);
      if (matches) {
        key = matches[1];
        if (matches[2]) {
          skinOverride = parseInt(matches[2], 10) as Emoji['skin'];
        }
      } else {
        key = emoji;
      }
    } else if (emoji.id && !emoji.custom) {
      key = emoji.id;
    } else if (emoji.unified) {
      key = emoji.unified.toUpperCase();
    } else {
      return undefined;
    }

    const unified = emojiIndex[key] ? key : emojiNameToUnified[key];
    if (!unified || !emojiIndex[unified]) {
      return undefined;
    }
    return { unified, entry: emojiIndex[unified], skinOverride };
  }

  /**
   * Builds a native emoji's data using only the index entry, with no category file needed.
   * This only works for the default skin tone. Other skin tones need the `skinVariations`
   * data, and that data only lives in the category file.
   */
  buildNativeIndexData(unified: string, entry: EmojiIndexEntry): EmojiData {
    return {
      id: entry.shortNames[0],
      name: '',
      shortName: entry.shortNames[0],
      shortNames: entry.shortNames,
      sheet: [0, 0],
      keywords: [],
      hidden: [],
      emoticons: [],
      text: '',
      skinVariations: [],
      unified,
      native: this.unifiedToNative(unified),
      obsoletedBy: entry.obsoletedBy,
      obsoletes: entry.obsoletes,
      custom: false,
    };
  }

  /** Loads the category file for one emoji. We save the result, so we load it only once. */
  loadCategory(categoryId: string): Promise<{ [unified: string]: CompressedEmojiData }> {
    let promise = this.categoryCache.get(categoryId);
    if (!promise) {
      const loader = CATEGORY_LOADERS[categoryId];
      promise = loader ? loader().then(module => module.emojis) : Promise.resolve({});
      this.categoryCache.set(categoryId, promise);
    }
    return promise;
  }

  /**
   * Finds and builds the base data for one emoji. This does not add the skin tone yet. See
   * `applySkinVariation` for that part. This is the one real async step. It loads the
   * category file for this emoji, or reuses it if we already loaded it.
   */
  async loadBaseData(unified: string): Promise<EmojiData> {
    const cached = this.enrichedCache.get(unified);
    if (cached) {
      return cached;
    }

    const entry = emojiIndex[unified];
    const categoryData = await this.loadCategory(entry.category);
    const data = this.enrich(categoryData[unified]);
    this.enrichedCache.set(unified, data);
    return data;
  }

  /**
   * Gets an emoji's base data, but only if we already loaded it. This is synchronous. It only
   * reads what we already saved. `EmojiSearch` uses this after calling `loadAllCategories()`.
   * At that point, every emoji is already saved.
   */
  getCachedBaseData(emoji: EmojiData | string): EmojiData | undefined {
    const resolved = this.resolveIndexEntry(emoji);
    return resolved ? this.enrichedCache.get(resolved.unified) : undefined;
  }

  /**
   * Loads every category file, one time each, for the search feature. It also adds the real
   * search keywords. Normal rendering, through `loadBaseData`, never needs the keywords. There
   * they just stay an empty list, `[]`.
   */
  async loadAllCategories(): Promise<EmojiData[]> {
    const categoryIds = [...new Set(Object.values(emojiIndex).map(entry => entry.category))];
    const [categoryDatas, emojiKeywords] = await Promise.all([
      Promise.all(categoryIds.map(id => this.loadCategory(id))),
      this.loadKeywords(),
    ]);

    const all: EmojiData[] = [];
    for (const categoryData of categoryDatas) {
      for (const unified of Object.keys(categoryData)) {
        let data = this.enrichedCache.get(unified);
        if (!data) {
          data = this.enrich(categoryData[unified]);
          this.enrichedCache.set(unified, data);
        }
        if (!data.keywords.length) {
          data.keywords = this.buildSearchKeywords(unified, emojiKeywords);
        }
        all.push(data);
      }
    }
    return all;
  }

  /** We load this only here, not when the file first runs. Plain rendering never needs it. */
  private loadKeywords(): Promise<{ [unified: string]: string[] }> {
    if (this.keywordsPromise === undefined) {
      this.keywordsPromise = import('./data/emoji-keywords').then(module => module.emojiKeywords);
    }
    return this.keywordsPromise;
  }

  /**
   * Builds the search keywords for one emoji. If this emoji replaces an older one, we also add
   * that older emoji's keywords and main short name. This matches how the code worked before we
   * split the data. This way, a search for the old emoji's words still finds the new emoji.
   */
  private buildSearchKeywords(
    unified: string,
    emojiKeywords: { [unified: string]: string[] },
  ): string[] {
    const keywords = emojiKeywords[unified] ? [...emojiKeywords[unified]] : [];
    const entry = emojiIndex[unified];
    const obsoletedEntry = entry.obsoletes ? emojiIndex[entry.obsoletes] : undefined;
    if (obsoletedEntry) {
      const obsoletedKeywords = emojiKeywords[entry.obsoletes!];
      if (obsoletedKeywords) {
        keywords.push(...obsoletedKeywords);
      }
      keywords.push(obsoletedEntry.shortNames[0]);
    }
    return keywords;
  }

  private enrich(compressed: CompressedEmojiData): EmojiData {
    const data: any = { ...compressed };
    data.shortNames = [data.shortName, ...(compressed.shortNames ?? [])];
    data.id = data.shortName;
    data.native = this.unifiedToNative(data.unified);
    if (!data.skinVariations) {
      data.skinVariations = [];
    }
    if (!data.keywords) {
      data.keywords = [];
    }
    if (!data.emoticons) {
      data.emoticons = [];
    }
    if (!data.hidden) {
      data.hidden = [];
    }
    if (!data.text) {
      data.text = '';
    }
    return data;
  }

  /** Adds a skin tone to an emoji's base data. This is a pure, synchronous function. */
  applySkinVariation(emojiData: EmojiData, skin?: Emoji['skin'], set?: Emoji['set']): EmojiData {
    const hasSkinVariations = emojiData.skinVariations && emojiData.skinVariations.length;
    if (hasSkinVariations && skin && skin > 1 && set) {
      emojiData = { ...emojiData };

      const skinKey = SKINS[skin - 1];
      const variationData = emojiData.skinVariations.find((n: EmojiVariation) =>
        n.unified.includes(skinKey),
      );

      if (variationData && (!variationData.hidden || !variationData.hidden.includes(set))) {
        emojiData.skinTone = skin;
        emojiData = { ...emojiData, ...variationData };
      }
      emojiData.native = this.unifiedToNative(emojiData.unified!);
    }

    emojiData.set = set || '';
    return emojiData;
  }

  async getData(
    emoji: EmojiData | string,
    skin?: Emoji['skin'],
    set?: Emoji['set'],
  ): Promise<EmojiData | null> {
    if (typeof emoji === 'string') {
      const resolved = this.resolveIndexEntry(emoji);
      if (!resolved) {
        return null;
      }
      const base = await this.loadBaseData(resolved.unified);
      return this.applySkinVariation(base, resolved.skinOverride ?? skin, set);
    }

    const resolved = this.resolveIndexEntry(emoji);
    if (!resolved) {
      // This is a custom emoji, or an id that does not match any standard emoji. The old,
      // synchronous code worked the same way: we just return the given object as the result.
      const emojiData = emoji as EmojiData;
      emojiData.custom = true;
      emojiData.set = set || '';
      return emojiData;
    }

    const base = await this.loadBaseData(resolved.unified);
    return this.applySkinVariation(base, resolved.skinOverride ?? skin, set);
  }

  unifiedToNative(unified: string) {
    const codePoints = unified.split('-').map(u => parseInt(`0x${u}`, 16));
    return String.fromCodePoint(...codePoints);
  }

  emojiSpriteStyles(
    sheet: EmojiData['sheet'],
    set: Emoji['set'] = 'apple',
    size: Emoji['size'] = 24,
    sheetSize: Emoji['sheetSize'] = 64,
    sheetRows: Emoji['sheetRows'] = 60,
    backgroundImageFn: Emoji['backgroundImageFn'] = DEFAULT_BACKGROUNDFN,
    sheetColumns = 61,
    url?: string,
  ) {
    const hasImageUrl = !!url;
    url = url || backgroundImageFn(set, sheetSize);
    return {
      width: `${size}px`,
      height: `${size}px`,
      display: 'inline-block',
      'background-image': `url(${url})`,
      'background-size': hasImageUrl ? '100% 100%' : `${100 * sheetColumns}% ${100 * sheetRows}%`,
      'background-position': hasImageUrl ? undefined : this.getSpritePosition(sheet, sheetColumns),
    };
  }

  getSpritePosition(sheet: EmojiData['sheet'], sheetColumns: number) {
    const [sheetX, sheetY] = sheet;
    const multiply = 100 / (sheetColumns - 1);
    return `${multiply * sheetX}% ${multiply * sheetY}%`;
  }

  sanitize(emoji: EmojiData | null): EmojiData | null {
    if (emoji === null) {
      return null;
    }
    const id = emoji.id || emoji.shortNames[0];
    let colons = `:${id}:`;
    if (emoji.skinTone) {
      colons += `:skin-tone-${emoji.skinTone}:`;
    }
    emoji.colons = colons;
    return { ...emoji };
  }

  async getSanitizedData(
    emoji: string | EmojiData,
    skin?: Emoji['skin'],
    set?: Emoji['set'],
  ): Promise<EmojiData | null> {
    return this.sanitize(await this.getData(emoji, skin, set));
  }
}
