import { Model } from 'mongoose';
import { UpdatePreferencesService } from '../../../src/services/preferences/updatePreferences.service';
import { IPreferences } from '../../../src/interfaces/preferences.interface';
import { PreferencesDto } from '../../../src/dtos/preferences/preferences.dto';
import { DEFAULT_PREFERENCES } from '../../../src/constants/preferences.constants';
import { UserRole } from '../../../src/enums/userRole.enum';

describe('UpdatePreferencesService', () => {
  const actor = { id: 'u1', role: UserRole.USER, jti: 'j1' };

  it('upserts only the fields that were sent and returns merged preferences', async () => {
    const lean = jest.fn().mockResolvedValue({ ...DEFAULT_PREFERENCES, _id: 'x', userId: 'u1', speed: 1.5 });
    const preferencesModel = { findOneAndUpdate: jest.fn().mockReturnValue({ lean }) };
    const service = new UpdatePreferencesService(preferencesModel as unknown as Model<IPreferences>);

    const result = await service.use({ actor, body: { speed: 1.5 } });

    expect(preferencesModel.findOneAndUpdate).toHaveBeenCalledWith(
      { userId: 'u1' },
      { $set: { speed: 1.5 } },
      expect.objectContaining({ upsert: true, returnDocument: 'after' })
    );
    expect(result).toBeInstanceOf(PreferencesDto);
    expect(result.speed).toBe(1.5);
    expect(result.reciter).toBe(DEFAULT_PREFERENCES.reciter);
  });
});
