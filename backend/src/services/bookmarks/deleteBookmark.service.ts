import { Model } from 'mongoose';
import { IService } from '../../interfaces/service.interface';
import { DeleteBookmarkServiceInput, IBookmark } from '../../interfaces/bookmark.interface';
import { MessageDto } from '../../dtos/common/message.dto';
import { NotFoundError } from '../../errors/NotFoundError';

export class DeleteBookmarkService implements IService<DeleteBookmarkServiceInput, MessageDto> {
  constructor(private readonly bookmarkModel: Model<IBookmark>) {}

  async use({ actor, id }: DeleteBookmarkServiceInput): Promise<MessageDto> {
    // Scoped by userId: someone else's bookmark looks exactly like a missing one.
    const deleted = await this.bookmarkModel.findOneAndDelete({ _id: id, userId: actor.id });
    if (!deleted) throw new NotFoundError('Bookmark not found');
    return new MessageDto('Bookmark deleted');
  }
}
