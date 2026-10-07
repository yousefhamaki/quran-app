import { Model } from 'mongoose';
import { GetPreferencesService } from '../../../src/services/preferences/getPreferences.service';
import { IPreferences } from '../../../src/interfaces/preferences.interface';
import { PreferencesDto } from '../../../src/dtos/preferences/preferences.dto';
import { DEFAULT_PREFERENCES } from '../../../src/constants/preferences.constants';
import { Language } from '../../../src/enums/language.enum';
import { UserRole } from '../../../src/enums/userRole.enum';

describe('GetPreferencesService', () => {
  const actor = { id: 'u1', role: UserRole.USER, jti: 'j1' };

  const build = (found: unknown) => {
    const lean = jest.fn().mockResolvedValue(found);
    const preferencesModel = { findOne: jest.fn().mockReturnValue({ lean }) };
    return {
      preferencesModel,
      service: new GetPreferencesService(preferencesModel as unknown as Model<IPreferences>)
    };
  };

  it('returns the stored preferences of the actor', async () => {
    const { preferencesModel, service } = build({
      ...DEFAULT_PREFERENCES,
      _id: 'x',
      userId: 'u1',
      lang: Language.EN,
      fontSize: 40
    });

    const result = await service.use({ actor });

    expect(preferencesModel.findOne).toHaveBeenCalledWith({ userId: 'u1' });
    expect(result).toBeInstanceOf(PreferencesDto);
    expect(result.lang).toBe(Language.EN);
    expect(result.fontSize).toBe(40);
    expect(result).not.toHaveProperty('userId');
  });

  it('returns the defaults when nothing is saved yet', async () => {
    const { service } = build(null);
    const result = await service.use({ actor });
    expect(result).toEqual(DEFAULT_PREFERENCES);
  });
});
