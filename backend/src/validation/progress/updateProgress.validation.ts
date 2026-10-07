import Joi from 'joi';
import { UpdateProgressRequestDto } from '../../dtos/progress/updateProgressRequest.dto';
import { QURAN } from '../../constants/quran.constants';

export const updateProgressSchema = Joi.object<UpdateProgressRequestDto>({
  surah: Joi.number().integer().min(QURAN.MIN_SURAH).max(QURAN.MAX_SURAH).required(),
  ayah: Joi.number().integer().min(QURAN.MIN_AYAH).required()
});
