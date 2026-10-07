import { Model } from 'mongoose';
import { UpdateProgressService } from '../../../src/services/progress/updateProgress.service';
import { IProgress } from '../../../src/interfaces/progress.interface';
import { ProgressDto } from '../../../src/dtos/progress/progress.dto';
import { UserRole } from '../../../src/enums/userRole.enum';

describe('UpdateProgressService', () => {
  const actor = { id: 'u1', role: UserRole.USER, jti: 'j1' };

  it('upserts the progress for the actor and returns it as a DTO', async () => {
    const lean = jest.fn().mockResolvedValue({ _id: 'p1', userId: 'u1', surah: 3, ayah: 7 });
    const progressModel = { findOneAndUpdate: jest.fn().mockReturnValue({ lean }) };
    const service = new UpdateProgressService(progressModel as unknown as Model<IProgress>);

    const result = await service.use({ actor, body: { surah: 3, ayah: 7 } });

    expect(progressModel.findOneAndUpdate).toHaveBeenCalledWith(
      { userId: 'u1' },
      { $set: { surah: 3, ayah: 7 } },
      expect.objectContaining({ upsert: true, returnDocument: 'after' })
    );
    expect(result).toBeInstanceOf(ProgressDto);
    expect(result.surah).toBe(3);
    expect(result.ayah).toBe(7);
  });
});
