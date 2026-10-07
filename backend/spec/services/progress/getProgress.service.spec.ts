import { Model } from 'mongoose';
import { GetProgressService } from '../../../src/services/progress/getProgress.service';
import { IProgress } from '../../../src/interfaces/progress.interface';
import { ProgressDto } from '../../../src/dtos/progress/progress.dto';
import { UserRole } from '../../../src/enums/userRole.enum';

describe('GetProgressService', () => {
  const actor = { id: 'u1', role: UserRole.USER, jti: 'j1' };

  const build = (found: unknown) => {
    const lean = jest.fn().mockResolvedValue(found);
    const progressModel = { findOne: jest.fn().mockReturnValue({ lean }) };
    return { progressModel, service: new GetProgressService(progressModel as unknown as Model<IProgress>) };
  };

  it('returns the stored progress of the actor', async () => {
    const { progressModel, service } = build({ _id: 'p1', userId: 'u1', surah: 18, ayah: 10 });

    const result = await service.use({ actor });

    expect(progressModel.findOne).toHaveBeenCalledWith({ userId: 'u1' });
    expect(result).toBeInstanceOf(ProgressDto);
    expect(result.surah).toBe(18);
    expect(result.ayah).toBe(10);
  });

  it('returns a null default when nothing is saved yet', async () => {
    const { service } = build(null);
    const result = await service.use({ actor });
    expect(result).toEqual({ surah: null, ayah: null, updatedAt: null });
  });
});
