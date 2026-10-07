import { Language } from '../../enums/language.enum';
import { PreferencesEntity } from '../../interfaces/preferences.interface';
import { DEFAULT_PREFERENCES } from '../../constants/preferences.constants';

/** Falls back to the defaults when nothing is stored (or a field is missing). */
export class PreferencesDto {
  readonly lang: Language;
  readonly reciter: string;
  readonly tafsirId: number;
  readonly speed: number;
  readonly fontSize: number;
  readonly showTranslation: boolean;
  readonly continuous: boolean;

  constructor(preferences?: PreferencesEntity | null) {
    this.lang = preferences?.lang ?? DEFAULT_PREFERENCES.lang;
    this.reciter = preferences?.reciter ?? DEFAULT_PREFERENCES.reciter;
    this.tafsirId = preferences?.tafsirId ?? DEFAULT_PREFERENCES.tafsirId;
    this.speed = preferences?.speed ?? DEFAULT_PREFERENCES.speed;
    this.fontSize = preferences?.fontSize ?? DEFAULT_PREFERENCES.fontSize;
    this.showTranslation = preferences?.showTranslation ?? DEFAULT_PREFERENCES.showTranslation;
    this.continuous = preferences?.continuous ?? DEFAULT_PREFERENCES.continuous;
  }
}
