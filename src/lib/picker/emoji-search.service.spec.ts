import { inject, TestBed } from '@angular/core/testing';

import { EmojiData } from 'ngx-emoji-mart-next/ngx-emoji';
import { EmojiSearch } from './emoji-search.service';

describe('EmojiSearch', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({}).compileComponents();
  });

  it('should return nothing', inject([EmojiSearch], (es: EmojiSearch) => {
    expect(es.search('')).toEqual(null);
  }));

  it('should search', inject([EmojiSearch], (es: EmojiSearch) => {
    const res = es.search('pineapple');
    expect(res).toBeDefined();
    expect(res!.length).toBe(1);
    expect(res![0].name).toBe('Pineapple');
  }));

  it('should filter only emojis we care about, exclude pineapple', inject(
    [EmojiSearch],
    (es: EmojiSearch) => {
      const emojisToShowFilter = (data: EmojiData) => {
        return data.unified !== '1F34D';
      };
      const apples = es.search('apple', emojisToShowFilter)!.map(obj => obj.id);
      expect(apples.length).toBe(3);
      expect(apples).not.toContain('pineapple');
    },
  ));

  it('can include/exclude categories', inject(
    [EmojiSearch],
    (es: EmojiSearch) => {
      expect(es.search('flag', undefined, undefined, ['people'])).toEqual([]);
    },
  ));

  it('can search for thinking_face', inject(
    [EmojiSearch],
    (es: EmojiSearch) => {
      expect(es.search('thinking_fac')!.map((x: any) => x.id)).toEqual([
        'thinking_face',
      ]);
    },
  ));

  it('can search for woman-facepalming', inject(
    [EmojiSearch],
    (es: EmojiSearch) => {
      expect(es.search('woman-facep')!.map(x => x.id)).toEqual([
        'woman-facepalming',
      ]);
    },
  ));

  it('should use the include and exclude of every call', inject(
    [EmojiSearch],
    (es: EmojiSearch) => {
      const isFlag = (emoji: EmojiData) => emoji.id.startsWith('flag-');
      const all = es.search('flag')!;
      const withoutFlags = es.search('flag', undefined, undefined, [], ['flags'])!;

      expect(all.some(isFlag)).toBe(true);
      expect(withoutFlags.some(isFlag)).toBe(false);
    },
  ));

  describe('custom emojis', () => {
    const custom = (id: string, extra: object = {}) => ({
      name: 'Party Parrot',
      shortNames: [id],
      keywords: ['party'],
      imageUrl: './parrot.gif',
      ...extra,
    });
    const describeResults = (results: EmojiData[] | null) =>
      results!.map(emoji => `${emoji.id}:${!!emoji.custom}`).sort();

    it('should find a custom emoji that has the id of a standard emoji', inject(
      [EmojiSearch],
      (es: EmojiSearch) => {
        const results = es.search('parrot', undefined, undefined, [], [], [custom('parrot')]);

        expect(describeResults(results)).toEqual(['parrot:false', 'parrot:true']);
      },
    ));

    it('should give a custom emoji an id and mark it as custom', inject(
      [EmojiSearch],
      (es: EmojiSearch) => {
        const results = es.search('octocat', undefined, undefined, [], [], [custom('octocat')]);

        expect(describeResults(results)).toEqual(['octocat:true']);
      },
    ));

    it('should not keep the custom emojis for the next search', inject(
      [EmojiSearch],
      (es: EmojiSearch) => {
        expect(es.search('zebracorn', undefined, undefined, [], [], [custom('zebracorn')])!.length)
          .toBe(1);
        expect(es.search('zebracorn')).toEqual([]);
      },
    ));

    it('should search the custom emojis of every call', inject(
      [EmojiSearch],
      (es: EmojiSearch) => {
        expect(es.search('qux')).toEqual([]);
        expect(describeResults(es.search('qux', undefined, undefined, [], [], [custom('quxblob')])))
          .toEqual(['quxblob:true']);
        expect(describeResults(es.search('qux', undefined, undefined, [], [], [custom('quxcat')])))
          .toEqual(['quxcat:true']);
      },
    ));

    it('should not search the custom emojis when the custom category is excluded', inject(
      [EmojiSearch],
      (es: EmojiSearch) => {
        const results = es.search('parrot', undefined, undefined, [], ['custom'], [custom('parrot')]);

        expect(describeResults(results)).toEqual(['parrot:false']);
      },
    ));

    it('should search only the custom emojis when only the custom category is included', inject(
      [EmojiSearch],
      (es: EmojiSearch) => {
        const results = es.search('parrot', undefined, undefined, ['custom'], [], [custom('parrot')]);

        expect(describeResults(results)).toEqual(['parrot:true']);
      },
    ));

    it('should not change the custom emojis that it gets', inject(
      [EmojiSearch],
      (es: EmojiSearch) => {
        const emoji = custom('octocat');

        es.search('octocat', undefined, undefined, [], [], [emoji]);

        expect(emoji).toEqual(custom('octocat'));
      },
    ));
  });
});
