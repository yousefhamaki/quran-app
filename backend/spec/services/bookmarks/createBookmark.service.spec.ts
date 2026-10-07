import { Model } from 'mongoose';
import { CreateBookmarkService } from '../../../src/services/bookmarks/createBookmark.service';
import { IBookmark } from '../../../src/interfaces/bookmark.interface';
import { ConflictError } from '../../../src/errors/ConflictError';
import { BookmarkDto } from '../../../src/dtos/bookmarks/bookmark.dto';
import { UserRole } from '../../../src/enums/userRole.enum';

describe('CreateBookmarkService', () => {
  const actor = { id: 'u1', role: UserRole.USER, jti: 'j1' };
  const input = { actor, body: { surah: 2, ayah: 255, note: 'Ayat al-Kursi' } };
  const stored = { _id: 'b1', userId: 'u1', surah: 2, ayah: 255, note: 'Ayat al-Kursi' };

  let bookmarkModel: { exists: jest.Mock; create: jest.Mock };
  let service: CreateBookmarkService;

  beforeEach(() => {
    bookmarkModel = {
      exists: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ toObject: () => stored })
    };
    service = new CreateBookmarkService(bookmarkModel as unknown as Model<IBookmark>);
  });

  it('creates the bookmark for the actor and returns a BookmarkDto', async () => {
    const result = await service.use(input);

    expect(bookmarkModel.exists).toHaveBeenCalledWith({ userId: 'u1', surah: 2, ayah: 255 });
    expect(bookmarkModel.create).toHaveBeenCalledWith({ userId: 'u1', surah: 2, ayah: 255, note: 'Ayat al-Kursi' });
    expect(result).toBeInstanceOf(BookmarkDto);
    expect(result.id).toBe('b1');
  });

  it('throws ConflictError when the user already bookmarked that ayah', async () => {
    bookmarkModel.exists.mockResolvedValue({ _id: 'b1' });
    await expect(service.use(input)).rejects.toBeInstanceOf(ConflictError);
    expect(bookmarkModel.create).not.toHaveBeenCalled();
  });

  it('maps a duplicate-key race from the unique index to ConflictError', async () => {
    bookmarkModel.create.mockRejectedValue({ code: 11000 });
    await expect(service.use(input)).rejects.toBeInstanceOf(ConflictError);
  });

  it('rethrows unexpected database errors', async () => {
    bookmarkModel.create.mockRejectedValue(new Error('db down'));
    await expect(service.use(input)).rejects.toThrow('db down');
  });
});
