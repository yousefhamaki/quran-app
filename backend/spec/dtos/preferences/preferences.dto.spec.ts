import { PreferencesDto } from '../../../src/dtos/preferences/preferences.dto';
import { DEFAULT_PREFERENCES } from '../../../src/constants/preferences.constants';
import { Language } from '../../../src/enums/language.enum';

describe('PreferencesDto', () => {
  it('copies the stored values and hides internals', () => {
    const dto = new PreferencesDto({
      _id: 'x',
      userId: 'u1',
      lang: Language.EN,
      reciter: 'ar.husary',
      tafsirId: 4,
      speed: 0.75,
      fontSize: 50,
      showTranslation: false,
      continuous: true
    });
    expect(dto).toEqual({
      lang: 'en',
      reciter: 'ar.husary',
      tafsirId: 4,
      speed: 0.75,
      fontSize: 50,
      showTranslation: false,
      continuous: true
    });
    expect(dto).not.toHaveProperty('userId');
  });

  it('falls back to the defaults without an entity', () => {
    expect(new PreferencesDto()).toEqual(DEFAULT_PREFERENCES);
  });
});
