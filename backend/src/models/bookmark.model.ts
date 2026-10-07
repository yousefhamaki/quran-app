import { Schema, model } from 'mongoose';
import { IBookmark } from '../interfaces/bookmark.interface';
import { QURAN } from '../constants/quran.constants';

const bookmarkSchema = new Schema<IBookmark>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    surah: { type: Number, required: true, min: QURAN.MIN_SURAH, max: QURAN.MAX_SURAH },
    ayah: { type: Number, required: true, min: QURAN.MIN_AYAH },
    note: { type: String, trim: true }
  },
  { timestamps: true }
);

bookmarkSchema.index({ userId: 1, surah: 1, ayah: 1 }, { unique: true });

export const BookmarkModel = model<IBookmark>('Bookmark', bookmarkSchema);
