import { Model } from 'mongoose';
import { IService } from '../../interfaces/service.interface';
import { GetProgressServiceInput, IProgress, ProgressEntity } from '../../interfaces/progress.interface';
import { ProgressDto } from '../../dtos/progress/progress.dto';

export class GetProgressService implements IService<GetProgressServiceInput, ProgressDto> {
  constructor(private readonly progressModel: Model<IProgress>) {}

  async use({ actor }: GetProgressServiceInput): Promise<ProgressDto> {
    const doc = await this.progressModel.findOne({ userId: actor.id }).lean<ProgressEntity>();
    return new ProgressDto(doc);
  }
}
