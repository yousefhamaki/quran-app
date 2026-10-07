import { Model } from 'mongoose';
import { IService } from '../../interfaces/service.interface';
import { GetPreferencesServiceInput, IPreferences, PreferencesEntity } from '../../interfaces/preferences.interface';
import { PreferencesDto } from '../../dtos/preferences/preferences.dto';

export class GetPreferencesService implements IService<GetPreferencesServiceInput, PreferencesDto> {
  constructor(private readonly preferencesModel: Model<IPreferences>) {}

  async use({ actor }: GetPreferencesServiceInput): Promise<PreferencesDto> {
    const doc = await this.preferencesModel.findOne({ userId: actor.id }).lean<PreferencesEntity>();
    return new PreferencesDto(doc);
  }
}
