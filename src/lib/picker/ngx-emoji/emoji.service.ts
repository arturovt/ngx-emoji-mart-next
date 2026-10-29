import { Injectable } from '@angular/core';

import { CompressedEmojiData, EmojiData, EmojiIndexEntry, EmojiVariation } from './data/data.interfaces';
import { emojiIndex, emojiNameToUnified } from './data/emoji-index';
import { Emoji } from './emoji.component';

const COLONS_REGEX = /^(?:\:([^\:]+)\:)(?:\:skin-tone-(\d)\:)?$/;
const SKINS = ['1F3FA', '1F3FB', '1F3FC', '1F3FD', '1F3FE', '1F3FF'];
export const DEFAULT_BACKGROUNDFN = (set: string, sheetSize: number) =>
  `https://cdn.jsdelivr.net/npm/emoji-datasource-${set}@14.0.0/img/${set}/sheets-256/${sheetSize}.png`;

type CategoryModule = { emojis: { [unified: string]: CompressedEmojiData } };

// Explicit, literal `import()` calls, one per category: a dynamic import whose specifier is
// computed (e.g. a template string) is not statically analyzable, so bundlers (verified against
// this repo's own ng-packagr build) silently drop the target file from the package instead of
// splitting it into its own chunk. Each of these must stay a literal string.
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
  /** One load per category, shared by every emoji in it. */
  private readonly categoryCache = new Map<string, Promise<{ [unified: string]: CompressedEmojiData }>>();
  /** The enriched (but not skin-adjusted) data for a resolved emoji, cached by unified code. */
  private readonly enrichedCache = new Map<string, EmojiData>();
  private keywordsPromise?: Promise<{ [unified: string]: string[] }>;

  /**
   * Resolves a string or object emoji id to its index entry, without loading its category
   * chunk. Returns `undefined` for anything that isn't a known standard emoji (a custom emoji,
   * or an id that doesn't exist) — the caller should treat that as the "custom" fallback.
   *
   * A string in `:name:` or `:name::skin-tone-N:` form is parsed the same way `getData` always
   * has: the skin tone, if present, is returned so the caller can use it even though it isn't
   * part of this emoji's identity.
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

  /** Loads (and caches) the category chunk that a resolved emoji's data lives in. */
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
   * Resolves and enriches a single emoji's base data (no skin-tone variation applied — see
   * `applySkinVariation`). This is the one genuinely async step: it loads (or reuses) the
   * category chunk this emoji belongs to.
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
   * A previously loaded emoji's base data, if any — synchronous, reads only what's already
   * cached. Used by `EmojiSearch` after `loadAllCategories()`, where every emoji is guaranteed
   * to already be cached.
   */
  getCachedBaseData(emoji: EmojiData | string): EmojiData | undefined {
    const resolved = this.resolveIndexEntry(emoji);
    return resolved ? this.enrichedCache.get(resolved.unified) : undefined;
  }

  /**
   * Loads every category chunk once, for the search feature, with real search keywords merged
   * in (plain rendering, via `loadBaseData`, never needs them — they default to `[]`).
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

  /** Loaded only here, not at module scope: plain rendering never needs search keywords. */
  private loadKeywords(): Promise<{ [unified: string]: string[] }> {
    if (!this.keywordsPromise) {
      this.keywordsPromise = import('./data/emoji-keywords').then(module => module.emojiKeywords);
    }
    return this.keywordsPromise;
  }

  /**
   * An emoji's own keywords, plus — matching the pre-split behavior — the keywords and primary
   * short name of the older emoji it obsoletes, if any, so searching for the old emoji's terms
   * still finds its replacement.
   */
  private buildSearchKeywords(unified: string, emojiKeywords: { [unified: string]: string[] }): string[] {
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

  /** Applies a skin-tone variation on top of an emoji's base data. Pure and synchronous. */
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

  async getData(emoji: EmojiData | string, skin?: Emoji['skin'], set?: Emoji['set']): Promise<EmojiData | null> {
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
      // A custom emoji, or an id/unified that doesn't match a standard one. Matches the
      // pre-async behavior: the given object itself becomes the result.
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
