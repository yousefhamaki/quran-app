import { BookmarkEntity } from '../../interfaces/bookmark.interface';

export class BookmarkDto {
  readonly id: string;
  readonly surah: number;
  readonly ayah: number;
  readonly note?: string;
  readonly createdAt?: Date;

  constructor(bookmark: BookmarkEntity) {
    this.id = String(bookmark._id);
    this.surah = bookmark.surah;
    this.ayah = bookmark.ayah;
    this.note = bookmark.note;
    this.createdAt = bookmark.createdAt;
  }
}
