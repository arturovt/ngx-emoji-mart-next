import { EmojiService } from './emoji.service';

describe('EmojiService', () => {
  it('should not change the shared emoji data when it is created again', () => {
    // Every application, and every server request, creates a new service.
    new EmojiService();
    new EmojiService();
    const service = new EmojiService();

    expect(service.getData('+1')!.shortNames).toEqual(['+1', 'thumbsup']);
  });
});
