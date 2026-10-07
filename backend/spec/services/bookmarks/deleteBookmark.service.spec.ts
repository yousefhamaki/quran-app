import { Model } from 'mongoose';
import { DeleteBookmarkService } from '../../../src/services/bookmarks/deleteBookmark.service';
import { IBookmark } from '../../../src/interfaces/bookmark.interface';
import { NotFoundError } from '../../../src/errors/NotFoundError';
import { MessageDto } from '../../../src/dtos/common/message.dto';
import { UserRole } from '../../../src/enums/userRole.enum';

describe('DeleteBookmarkService', () => {
  const actor = { id: 'u1', role: UserRole.USER, jti: 'j1' };

  const build = (deleted: unknown) => {
    const bookmarkModel = { findOneAndDelete: jest.fn().mockResolvedValue(deleted) };
    return { bookmarkModel, service: new DeleteBookmarkService(bookmarkModel as unknown as Model<IBookmark>) };
  };

  it('deletes the bookmark scoped to the actor', async () => {
    const { bookmarkModel, service } = build({ _id: 'b1' });

    const result = await service.use({ actor, id: 'b1' });

    expect(bookmarkModel.findOneAndDelete).toHaveBeenCalledWith({ _id: 'b1', userId: 'u1' });
    expect(result).toBeInstanceOf(MessageDto);
    expect(result.message).toBe('Bookmark deleted');
  });

  it('throws NotFoundError when the bookmark is missing or belongs to someone else', async () => {
    const { service } = build(null);
    await expect(service.use({ actor, id: 'b1' })).rejects.toBeInstanceOf(NotFoundError);
  });
});
