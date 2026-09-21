import { EmojiService } from './emoji.service';

describe('EmojiService', () => {
  it('should not change the shared emoji data when it is created again', () => {
    // Every application, and every server request, creates a new service.
    new EmojiService();
    new EmojiService();
    const service = new EmojiService();

    expect(service.getData('+1')!.shortNames).toEqual(['+1', 'thumbsup']);
  });

  it('should return a custom emoji even when its id is a standard short name', () => {
    const service = new EmojiService();
    const custom = {
      id: 'parrot',
      name: 'Party Parrot',
      shortNames: ['parrot'],
      keywords: ['party'],
      imageUrl: './parrot.gif',
      custom: true,
    };

    const data = service.getData(custom as any)!;

    expect(data.custom).toBe(true);
    expect(data.imageUrl).toBe('./parrot.gif');
    expect(data.unified).toBeUndefined();
  });

  it('should still find a standard emoji by its id', () => {
    const service = new EmojiService();

    expect(service.getData({ id: 'parrot' } as any)!.unified).toBeDefined();
    expect(service.getData('parrot')!.custom).toBeUndefined();
  });
});
