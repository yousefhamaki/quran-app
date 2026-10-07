import { updateProgressSchema } from '../../../src/validation/progress/updateProgress.validation';

describe('updateProgressSchema', () => {
  it('accepts a valid payload', () => {
    expect(updateProgressSchema.validate({ surah: 18, ayah: 10 }).error).toBeUndefined();
  });

  it.each([
    ['surah out of range', { surah: 200, ayah: 1 }],
    ['ayah below 1', { surah: 1, ayah: 0 }],
    ['missing ayah', { surah: 1 }],
    ['missing surah', { ayah: 1 }],
    ['non-numeric', { surah: 'a', ayah: 'b' }]
  ])('rejects %s', (_label, payload) => {
    expect(updateProgressSchema.validate(payload).error).toBeDefined();
  });
});
