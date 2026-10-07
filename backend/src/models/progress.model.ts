import { Schema, model } from 'mongoose';
import { IProgress } from '../interfaces/progress.interface';
import { QURAN } from '../constants/quran.constants';

const progressSchema = new Schema<IProgress>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    surah: { type: Number, required: true, min: QURAN.MIN_SURAH, max: QURAN.MAX_SURAH },
    ayah: { type: Number, required: true, min: QURAN.MIN_AYAH }
  },
  { timestamps: true }
);

export const ProgressModel = model<IProgress>('Progress', progressSchema);
