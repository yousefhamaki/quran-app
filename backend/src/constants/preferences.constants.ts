import { Language } from '../enums/language.enum';

export const PREFERENCE_LIMITS = {
  MIN_SPEED: 0.5,
  MAX_SPEED: 2,
  MIN_FONT_SIZE: 16,
  MAX_FONT_SIZE: 72
} as const;

export const DEFAULT_PREFERENCES = {
  lang: Language.AR,
  reciter: 'ar.alafasy',
  tafsirId: 1,
  speed: 1,
  fontSize: 32,
  showTranslation: true,
  continuous: false
};
