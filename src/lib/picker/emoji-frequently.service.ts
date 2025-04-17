import { Injectable } from '@angular/core';

import { EmojiData } from 'ngx-emoji-mart-next/ngx-emoji';

@Injectable({ providedIn: 'root' })
export class EmojiFrequentlyService {
  NAMESPACE = 'emoji-mart';
  frequently: Record<string, number> | null = null;
  defaults: Record<string, number> = {};
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
    const frequently =
      typeof ngServerMode !== 'undefined' &&
      !ngServerMode &&
      localStorage.getItem(`${this.NAMESPACE}.frequently`);

    this.frequently = JSON.parse(frequently || 'null');

    this.initialized = true;
  }

  add(emoji: EmojiData) {
    if (!this.initialized) {
      this.init();
    }
    if (!this.frequently) {
      this.frequently = this.defaults;
    }
    if (!this.frequently[emoji.id]) {
      this.frequently[emoji.id] = 0;
    }
    this.frequently[emoji.id] += 1;

    if (typeof ngServerMode !== 'undefined' && !ngServerMode) {
      localStorage.setItem(`${this.NAMESPACE}.last`, emoji.id);
      localStorage.setItem(`${this.NAMESPACE}.frequently`, JSON.stringify(this.frequently));
    }
  }

  get(perLine: number, totalLines: number) {
    if (!this.initialized) {
      this.init();
    }

    // If no frequently used data is available, fall back to defaults.
    if (this.frequently === null) {
      this.defaults = {};
      const result = [];

      // Use the top N default emojis (N = perLine).
      for (let i = 0; i < perLine; i++) {
        this.defaults[this.DEFAULTS[i]] = perLine - i; // Assign descending weight.
        result.push(this.DEFAULTS[i]);
      }
      return result;
    }

    // Calculate total number of emojis to display.
    const quantity = perLine * totalLines;
    // Get all emoji IDs that have usage data.
    const frequentlyKeys = Object.keys(this.frequently);

    // Sort emoji IDs by usage count (highest first).
    const sorted = frequentlyKeys
      .sort((a, b) => this.frequently![a] - this.frequently![b])
      .reverse();

    // Slice the top emojis based on the required quantity.
    const sliced = sorted.slice(0, quantity);

    // Get the most recently used emoji (in browser only).
    const last =
      typeof ngServerMode !== 'undefined' &&
      !ngServerMode &&
      localStorage.getItem(`${this.NAMESPACE}.last`);

    // If the last used emoji isn’t already in the list, append it.
    if (last && !sliced.includes(last)) {
      sliced.pop(); // Remove the least recent one to make space.
      sliced.push(last); // Add the most recently used emoji.
    }

    return sliced;
  }
}
