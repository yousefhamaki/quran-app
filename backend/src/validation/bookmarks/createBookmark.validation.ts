import Joi from 'joi';
import { CreateBookmarkRequestDto } from '../../dtos/bookmarks/createBookmarkRequest.dto';
import { QURAN } from '../../constants/quran.constants';

export const createBookmarkSchema = Joi.object<CreateBookmarkRequestDto>({
  surah: Joi.number().integer().min(QURAN.MIN_SURAH).max(QURAN.MAX_SURAH).required(),
  ayah: Joi.number().integer().min(QURAN.MIN_AYAH).required(),
  note: Joi.string().trim().max(500).allow('').optional()
});
