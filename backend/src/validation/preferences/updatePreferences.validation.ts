import Joi from 'joi';
import { UpdatePreferencesRequestDto } from '../../dtos/preferences/updatePreferencesRequest.dto';
import { Language } from '../../enums/language.enum';
import { PREFERENCE_LIMITS } from '../../constants/preferences.constants';

export const updatePreferencesSchema = Joi.object<UpdatePreferencesRequestDto>({
  lang: Joi.string().valid(...Object.values(Language)),
  reciter: Joi.string().trim().min(1).max(100),
  tafsirId: Joi.number().integer().min(1),
  speed: Joi.number().min(PREFERENCE_LIMITS.MIN_SPEED).max(PREFERENCE_LIMITS.MAX_SPEED),
  fontSize: Joi.number().min(PREFERENCE_LIMITS.MIN_FONT_SIZE).max(PREFERENCE_LIMITS.MAX_FONT_SIZE),
  showTranslation: Joi.boolean(),
  continuous: Joi.boolean()
}).min(1);
