import { Model } from 'mongoose';
import { IService } from '../../interfaces/service.interface';
import { BookmarkEntity, IBookmark, ListBookmarksServiceInput } from '../../interfaces/bookmark.interface';
import { BookmarkDto } from '../../dtos/bookmarks/bookmark.dto';

export class ListBookmarksService implements IService<ListBookmarksServiceInput, BookmarkDto[]> {
  constructor(private readonly bookmarkModel: Model<IBookmark>) {}

  async use({ actor }: ListBookmarksServiceInput): Promise<BookmarkDto[]> {
    // Data scoping: a user only ever sees their own bookmarks.
    const docs = await this.bookmarkModel.find({ userId: actor.id }).sort({ createdAt: -1 }).lean<BookmarkEntity[]>();
    return docs.map((doc) => new BookmarkDto(doc));
  }
}
