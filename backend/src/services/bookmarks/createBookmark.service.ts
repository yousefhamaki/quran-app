import { Model } from 'mongoose';
import { IService } from '../../interfaces/service.interface';
import { BookmarkEntity, CreateBookmarkServiceInput, IBookmark } from '../../interfaces/bookmark.interface';
import { BookmarkDto } from '../../dtos/bookmarks/bookmark.dto';
import { ConflictError } from '../../errors/ConflictError';

const DUPLICATE_KEY_CODE = 11000;

export class CreateBookmarkService implements IService<CreateBookmarkServiceInput, BookmarkDto> {
  constructor(private readonly bookmarkModel: Model<IBookmark>) {}

  async use({ actor, body }: CreateBookmarkServiceInput): Promise<BookmarkDto> {
    const filter = { userId: actor.id, surah: body.surah, ayah: body.ayah };

    const existing = await this.bookmarkModel.exists(filter);
    if (existing) throw this.duplicate(body.surah, body.ayah);

    try {
      const created = await this.bookmarkModel.create({ ...filter, note: body.note });
      return new BookmarkDto(created.toObject() as BookmarkEntity);
    } catch (error) {
      // Two simultaneous requests can both pass the exists() check; the unique index catches the loser.
      if ((error as { code?: number }).code === DUPLICATE_KEY_CODE) throw this.duplicate(body.surah, body.ayah);
      throw error;
    }
  }

  private duplicate(surah: number, ayah: number): ConflictError {
    return new ConflictError(`Bookmark for ${surah}:${ayah} already exists`);
  }
}
