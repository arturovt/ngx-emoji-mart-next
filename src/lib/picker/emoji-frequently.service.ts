import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject } from '@angular/core';

import { EmojiData } from 'ngx-emoji-mart-next/ngx-emoji';

/**
 * The key of a custom emoji starts with this text. This keeps a custom emoji apart from a
 * standard emoji that has the same id.
 */
export const CUSTOM_EMOJI_KEY_PREFIX = 'custom:';

@Injectable({ providedIn: 'root' })
export class EmojiFrequentlyService {
  private platformId = inject(PLATFORM_ID);

  NAMESPACE = 'emoji-mart';
  frequently: { [key: string]: number } | null = null;
  defaults: { [key: string]: number } = {};
  initialized = false;
  DEFAULTS = [
    '+1',
    'grinning',
    'kissing_heart',
    'heart_eyes',
    'laughing',
    'stuck_out_tongue_winking_eye',
    'sweat_smile',
    'joy',
    'scream',
    'disappointed',
    'unamused',
    'weary',
    'sob',
    'sunglasses',
    'heart',
    'poop',
  ];
  init() {
    this.frequently = JSON.parse(
      (isPlatformBrowser(this.platformId) &&
        localStorage.getItem(`${this.NAMESPACE}.frequently`)) ||
        'null',
    );
    this.initialized = true;
  }
  add(emoji: EmojiData) {
    if (!this.initialized) {
      this.init();
    }
    if (!this.frequently) {
      this.frequently = this.defaults;
    }
    const key = emoji.custom ? `${CUSTOM_EMOJI_KEY_PREFIX}${emoji.id}` : emoji.id;
    if (!this.frequently[key]) {
      this.frequently[key] = 0;
    }
    this.frequently[key] += 1;

    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem(`${this.NAMESPACE}.last`, key);
      localStorage.setItem(`${this.NAMESPACE}.frequently`, JSON.stringify(this.frequently));
    }
  }
  get(perLine: number, totalLines: number) {
    if (!this.initialized) {
      this.init();
    }
    if (this.frequently === null) {
      this.defaults = {};
      const result = [];

      for (let i = 0; i < perLine; i++) {
        this.defaults[this.DEFAULTS[i]] = perLine - i;
        result.push(this.DEFAULTS[i]);
      }
      return result;
    }

    const quantity = perLine * totalLines;
    const frequentlyKeys = Object.keys(this.frequently);

    const sorted = frequentlyKeys
      .sort((a, b) => this.frequently![a] - this.frequently![b])
      .reverse();
    const sliced = sorted.slice(0, quantity);

    const last =
      isPlatformBrowser(this.platformId) && localStorage.getItem(`${this.NAMESPACE}.last`);

    if (last && !sliced.includes(last)) {
      sliced.pop();
      sliced.push(last);
    }
    return sliced;
  }
}
