import { EmojiService } from './emoji.service';

describe('EmojiService', () => {
  it('should not change the shared emoji data when it is created again', async () => {
    // Every application, and every server request, creates a new service.
    new EmojiService();
    new EmojiService();
    const service = new EmojiService();

    const data = await service.getData('+1');
    expect(data!.shortNames).toEqual(['+1', 'thumbsup']);
  });

  it('should return a custom emoji even when its id is a standard short name', async () => {
    const service = new EmojiService();
    const custom = {
      id: 'parrot',
      name: 'Party Parrot',
      shortNames: ['parrot'],
      keywords: ['party'],
      imageUrl: './parrot.gif',
      custom: true,
    };

    const data = (await service.getData(custom as any))!;

    expect(data.custom).toBe(true);
    expect(data.imageUrl).toBe('./parrot.gif');
    expect(data.unified).toBeUndefined();
  });

  it('should still find a standard emoji by its id', async () => {
    const service = new EmojiService();

    expect((await service.getData({ id: 'parrot' } as any))!.unified).toBeDefined();
    expect((await service.getData('parrot'))!.custom).toBeUndefined();
  });

  it('should resolve an id synchronously via the always-loaded index, without loading any category', () => {
    const service = new EmojiService();
    const resolved = service.resolveIndexEntry('+1');

    expect(resolved?.unified).toBe('1F44D');
    expect(resolved?.entry.category).toBeTruthy();
  });

  it('should return null, not a custom fallback, for a string id that is not a standard emoji', async () => {
    const service = new EmojiService();

    expect(await service.getData('not-an-emoji')).toBeNull();
  });

  it('should load a category only once, shared by every emoji in it', () => {
    const service = new EmojiService();

    // `+1` (also called `thumbsup`) and `grinning` are both in the "Smileys & People"
    // category. If we get back the same promise both times, that means the second call
    // reused the first load. It did not start a second dynamic import.
    const first = service.loadCategory(service.resolveIndexEntry('+1')!.entry.category);
    const second = service.loadCategory(service.resolveIndexEntry('grinning')!.entry.category);

    expect(first).toBe(second);
  });

  it('should build a native emoji straight from the index, with the right character and short names', () => {
    const service = new EmojiService();
    const resolved = service.resolveIndexEntry('+1')!;

    const data = service.buildNativeIndexData(resolved.unified, resolved.entry);

    expect(data.native).toBe('👍');
    expect(data.unified).toBe('1F44D');
    expect(data.shortNames).toEqual(['+1', 'thumbsup']);
    expect(data.custom).toBe(false);
  });
});
