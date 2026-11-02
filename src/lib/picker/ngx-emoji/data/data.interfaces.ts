import { Emoji } from '../emoji.component';

export interface EmojiCategory {
  id: string;
  name: string;
  emojis: any[] | null;
  anchor?: boolean;
  first?: boolean;
}

/**
 * One lookup entry for one emoji. We load this file right away, for every emoji. It is
 * stored in `emojiIndex` (in `emoji-index.ts`), keyed by the emoji's unified code.
 *
 * This entry only has what we need to find an emoji by id, and to make quick decisions about
 * it (like checking if it still exists, or if it should be filtered out). We do not need to
 * load that emoji's category file just for this.
 *
 * A short name maps to the same unified code through `emojiNameToUnified`. So we do not need
 * to repeat this entry once for every short name.
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
