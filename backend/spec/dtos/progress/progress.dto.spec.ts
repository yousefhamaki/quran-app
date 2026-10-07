import { ProgressDto } from '../../../src/dtos/progress/progress.dto';

describe('ProgressDto', () => {
  it('copies surah, ayah and updatedAt from a stored entity', () => {
    const updatedAt = new Date('2026-01-01');
    const dto = new ProgressDto({ _id: 'p1', userId: 'u1', surah: 5, ayah: 6, updatedAt });
    expect(dto).toEqual({ surah: 5, ayah: 6, updatedAt });
    expect(dto).not.toHaveProperty('userId');
  });

  it('is a null-ish default without an entity', () => {
    expect(new ProgressDto()).toEqual({ surah: null, ayah: null, updatedAt: null });
    expect(new ProgressDto(null)).toEqual({ surah: null, ayah: null, updatedAt: null });
  });
});
