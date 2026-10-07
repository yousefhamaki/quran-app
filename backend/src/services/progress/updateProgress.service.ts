import { Model } from 'mongoose';
import { IService } from '../../interfaces/service.interface';
import { IProgress, ProgressEntity, UpdateProgressServiceInput } from '../../interfaces/progress.interface';
import { ProgressDto } from '../../dtos/progress/progress.dto';

export class UpdateProgressService implements IService<UpdateProgressServiceInput, ProgressDto> {
  constructor(private readonly progressModel: Model<IProgress>) {}

  async use({ actor, body }: UpdateProgressServiceInput): Promise<ProgressDto> {
    const doc = await this.progressModel
      .findOneAndUpdate(
        { userId: actor.id },
        { $set: { surah: body.surah, ayah: body.ayah } },
        { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
      )
      .lean<ProgressEntity>();
    return new ProgressDto(doc);
  }
}
