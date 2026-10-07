import { Model } from 'mongoose';
import { IService } from '../../interfaces/service.interface';
import { IPreferences, PreferencesEntity, UpdatePreferencesServiceInput } from '../../interfaces/preferences.interface';
import { PreferencesDto } from '../../dtos/preferences/preferences.dto';

export class UpdatePreferencesService implements IService<UpdatePreferencesServiceInput, PreferencesDto> {
  constructor(private readonly preferencesModel: Model<IPreferences>) {}

  async use({ actor, body }: UpdatePreferencesServiceInput): Promise<PreferencesDto> {
    // Partial update: only the fields the client sent are written; the rest keep their stored or default value.
    const doc = await this.preferencesModel
      .findOneAndUpdate(
        { userId: actor.id },
        { $set: body },
        { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
      )
      .lean<PreferencesEntity>();
    return new PreferencesDto(doc);
  }
}
