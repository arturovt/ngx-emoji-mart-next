import { Emoji } from '../emoji.component';

export interface EmojiCategory {
  id: string;
  name: string;
  emojis: any[] | null;
  anchor?: boolean;
  first?: boolean;
}

/**
 * The always-loaded lookup entry for one emoji, keyed by its unified code (see
 * `emojiIndex` in `emoji-index.ts`). Carries only what's needed to resolve an id and make
 * synchronous existence/filtering decisions, or render a native emoji at the default skin
 * tone, without loading that emoji's category chunk. Every short name also resolves to the
 * same unified code via `emojiNameToUnified`, so this doesn't need to be duplicated per name.
 */
export interface EmojiIndexEntry {
  category: string;
  shortNames: string[];
  obsoletedBy?: string;
  obsoletes?: string;
}

export interface CompressedEmojiData {
  name: string;
  unified: string;
  shortName: string;
  shortNames?: string[];
  sheet: [number, number];
  keywords?: string[];
  hidden?: string[];
  emoticons?: string[];
  text?: string;
  skinVariations?: EmojiVariation[];
  obsoletedBy?: string;
  obsoletes?: string;
}

export interface EmojiData {
  id: string;
  name: string;
  unified?: string;
  shortName: string;
  shortNames: string[];
  sheet: [number, number];
  keywords: string[];
  hidden: string[];
  emoticons: string[];
  text: string;
  set?: Emoji['set'];
  skinVariations: EmojiVariation[];
  obsoletedBy?: string;
  obsoletes?: string;
  skinTone?: Emoji['skin'];
  custom?: boolean;
  native?: string;
  imageUrl?: string;
  colons?: string;
  skin?: Emoji['skin'];
  spriteUrl?: string;
  sheetRows?: string;
}

export interface EmojiVariation {
  unified: string;
  sheet: [number, number];
  hidden?: string[];
}

export interface SkinData {
  name: string;
  unified: string;
  shortName: string;
  sheet: [number, number];
}
