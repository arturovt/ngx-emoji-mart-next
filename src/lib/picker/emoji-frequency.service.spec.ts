import { inject, TestBed } from '@angular/core/testing';

import { EmojiData, EmojiService } from 'ngx-emoji-mart-next/ngx-emoji';
import { EmojiFrequentlyService } from './emoji-frequently.service';

describe('EmojiFrequently', () => {
  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({}).compileComponents();
  });

  it(
    'should get default',
    inject([EmojiFrequentlyService], (ef: EmojiFrequentlyService) => {
      const defaults = ef.get(ef.DEFAULTS.length, 4);
      expect(defaults.length).toEqual(ef.DEFAULTS.length);
    }),
  );

  it(
    'should get shorter default',
    inject([EmojiFrequentlyService], (ef: EmojiFrequentlyService) => {
      const defaults = ef.get(8, 4);
      expect(defaults.length).toEqual(8);
    }),
  );

  it(
    'should add emoji',
    inject(
      [EmojiFrequentlyService, EmojiService],
      (ef: EmojiFrequentlyService, es: EmojiService) => {
        const pineapple = es.getData('pineapple');
        ef.get(8, 4);
        ef.add(pineapple!);
        const result = ef.get(8, 4);
        expect(result.length).toEqual(9);
      },
    ),
  );

  it(
    'should count a custom emoji and a standard emoji with the same id separately',
    inject([EmojiFrequentlyService], (ef: EmojiFrequentlyService) => {
      ef.add({ id: 'parrot' } as EmojiData);
      ef.add({ id: 'parrot', custom: true } as EmojiData);
      ef.add({ id: 'parrot', custom: true } as EmojiData);

      const stored = JSON.parse(localStorage.getItem('emoji-mart.frequently')!);
      expect(stored['parrot']).toBe(1);
      expect(stored['custom:parrot']).toBe(2);
      expect(localStorage.getItem('emoji-mart.last')).toBe('custom:parrot');
    }),
  );
});
