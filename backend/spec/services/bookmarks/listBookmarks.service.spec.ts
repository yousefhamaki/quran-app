import { Model } from 'mongoose';
import { ListBookmarksService } from '../../../src/services/bookmarks/listBookmarks.service';
import { IBookmark } from '../../../src/interfaces/bookmark.interface';
import { BookmarkDto } from '../../../src/dtos/bookmarks/bookmark.dto';
import { UserRole } from '../../../src/enums/userRole.enum';

describe('ListBookmarksService', () => {
  const actor = { id: 'u1', role: UserRole.USER, jti: 'j1' };
  const docs = [
    { _id: 'b1', userId: 'u1', surah: 1, ayah: 1, note: 'first' },
    { _id: 'b2', userId: 'u1', surah: 2, ayah: 255 }
  ];

  const build = (found: unknown[]) => {
    const lean = jest.fn().mockResolvedValue(found);
    const sort = jest.fn().mockReturnValue({ lean });
    const bookmarkModel = { find: jest.fn().mockReturnValue({ sort }) };
    return { bookmarkModel, sort, service: new ListBookmarksService(bookmarkModel as unknown as Model<IBookmark>) };
  };

  it('returns only the actor bookmarks, newest first, as DTOs', async () => {
    const { bookmarkModel, sort, service } = build(docs);

    const result = await service.use({ actor });

    expect(bookmarkModel.find).toHaveBeenCalledWith({ userId: 'u1' });
    expect(sort).toHaveBeenCalledWith({ createdAt: -1 });
    expect(result).toHaveLength(2);
    expect(result[0]).toBeInstanceOf(BookmarkDto);
    expect(result[0]).not.toHaveProperty('userId');
    expect(result.map((b) => b.id)).toEqual(['b1', 'b2']);
  });

  it('returns an empty list when the user has none', async () => {
    const { service } = build([]);
    await expect(service.use({ actor })).resolves.toEqual([]);
  });
});
