import { BookmarkDto } from '../../../src/dtos/bookmarks/bookmark.dto';

describe('BookmarkDto', () => {
  it('copies only the whitelisted fields and hides userId', () => {
    const createdAt = new Date('2026-01-01');
    const dto = new BookmarkDto({
      _id: 'b1',
      userId: 'u1',
      surah: 2,
      ayah: 255,
      note: 'n',
      createdAt,
      updatedAt: createdAt
    });
    expect(dto).toEqual({ id: 'b1', surah: 2, ayah: 255, note: 'n', createdAt });
    expect(dto).not.toHaveProperty('userId');
  });
});
