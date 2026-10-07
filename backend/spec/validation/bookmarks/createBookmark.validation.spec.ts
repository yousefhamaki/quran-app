import { createBookmarkSchema } from '../../../src/validation/bookmarks/createBookmark.validation';

describe('createBookmarkSchema', () => {
  it('accepts surah and ayah, with or without a note', () => {
    expect(createBookmarkSchema.validate({ surah: 2, ayah: 255 }).error).toBeUndefined();
    expect(createBookmarkSchema.validate({ surah: 114, ayah: 1, note: 'x' }).error).toBeUndefined();
    expect(createBookmarkSchema.validate({ surah: 1, ayah: 1, note: '' }).error).toBeUndefined();
  });

  it.each([
    ['surah 0', { surah: 0, ayah: 1 }],
    ['surah 115', { surah: 115, ayah: 1 }],
    ['ayah 0', { surah: 1, ayah: 0 }],
    ['fractional ayah', { surah: 1, ayah: 1.5 }],
    ['missing ayah', { surah: 1 }],
    ['missing surah', { ayah: 1 }],
    ['note too long', { surah: 1, ayah: 1, note: 'x'.repeat(501) }]
  ])('rejects %s', (_label, payload) => {
    expect(createBookmarkSchema.validate(payload).error).toBeDefined();
  });
});
