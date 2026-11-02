import { TestBed } from '@angular/core/testing';

import { EmojiData } from 'ngx-emoji-mart-next/ngx-emoji';
import { EmojiSearch } from './emoji-search.service';

describe('EmojiSearch', () => {
  let es: EmojiSearch;

  beforeEach(async () => {
    await TestBed.configureTestingModule({}).compileComponents();
    es = TestBed.inject(EmojiSearch);
  });

  it('should return nothing', async () => {
    expect(await es.search('')).toEqual(null);
  });

  it('should search', async () => {
    const res = await es.search('pineapple');
    expect(res).toBeDefined();
    expect(res!.length).toBe(1);
    expect(res![0].name).toBe('Pineapple');
  });

  it('should filter only emojis we care about, exclude pineapple', async () => {
    const emojisToShowFilter = (data: EmojiData) => {
      return data.unified !== '1F34D';
    };
    const apples = (await es.search('apple', emojisToShowFilter))!.map(obj => obj.id);
    expect(apples.length).toBe(3);
    expect(apples).not.toContain('pineapple');
  });

  it('can include/exclude categories', async () => {
    expect(await es.search('flag', undefined, undefined, ['people'])).toEqual([]);
  });

  it('can search for thinking_face', async () => {
    expect((await es.search('thinking_fac'))!.map((x: any) => x.id)).toEqual(['thinking_face']);
  });

  it('can search for woman-facepalming', async () => {
    expect((await es.search('woman-facep'))!.map(x => x.id)).toEqual(['woman-facepalming']);
  });

  it('should use the include and exclude of every call', async () => {
    const isFlag = (emoji: EmojiData) => emoji.id.startsWith('flag-');
    const all = (await es.search('flag'))!;
    const withoutFlags = (await es.search('flag', undefined, undefined, [], ['flags']))!;

    expect(all.some(isFlag)).toBe(true);
    expect(withoutFlags.some(isFlag)).toBe(false);
  });

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

    it('should find a custom emoji that has the id of a standard emoji', async () => {
      const results = await es.search('parrot', undefined, undefined, [], [], [custom('parrot')]);

      expect(describeResults(results)).toEqual(['parrot:false', 'parrot:true']);
    });

    it('should give a custom emoji an id and mark it as custom', async () => {
      const results = await es.search('octocat', undefined, undefined, [], [], [custom('octocat')]);

      expect(describeResults(results)).toEqual(['octocat:true']);
    });

    it('should not keep the custom emojis for the next search', async () => {
      expect(
        (await es.search('zebracorn', undefined, undefined, [], [], [custom('zebracorn')]))!.length,
      ).toBe(1);
      expect(await es.search('zebracorn')).toEqual([]);
    });

    it('should search the custom emojis of every call', async () => {
      expect(await es.search('qux')).toEqual([]);
      expect(
        describeResults(await es.search('qux', undefined, undefined, [], [], [custom('quxblob')])),
      ).toEqual(['quxblob:true']);
      expect(
        describeResults(await es.search('qux', undefined, undefined, [], [], [custom('quxcat')])),
      ).toEqual(['quxcat:true']);
    });

    it('should not search the custom emojis when the custom category is excluded', async () => {
      const results = await es.search(
        'parrot',
        undefined,
        undefined,
        [],
        ['custom'],
        [custom('parrot')],
      );

      expect(describeResults(results)).toEqual(['parrot:false']);
    });

    it('should search only the custom emojis when only the custom category is included', async () => {
      const results = await es.search(
        'parrot',
        undefined,
        undefined,
        ['custom'],
        [],
        [custom('parrot')],
      );

      expect(describeResults(results)).toEqual(['parrot:true']);
    });

    it('should not change the custom emojis that it gets', async () => {
      const emoji = custom('octocat');

      await es.search('octocat', undefined, undefined, [], [], [emoji]);

      expect(emoji).toEqual(custom('octocat'));
    });
  });

  it('can search for a short name that is not the first one', async () => {
    // `medical_symbol` also has the short name `staff_of_aesculapius`.
    const ids = (await es.search('aesculapius'))!.map(emoji => emoji.id);

    expect(ids).toEqual(['medical_symbol']);
  });
});
