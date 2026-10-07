import { updatePreferencesSchema } from '../../../src/validation/preferences/updatePreferences.validation';

describe('updatePreferencesSchema', () => {
  const full = {
    lang: 'en',
    reciter: 'ar.alafasy',
    tafsirId: 3,
    speed: 1.25,
    fontSize: 40,
    showTranslation: false,
    continuous: true
  };

  it('accepts a full payload', () => {
    expect(updatePreferencesSchema.validate(full).error).toBeUndefined();
  });

  it('accepts a partial payload', () => {
    expect(updatePreferencesSchema.validate({ speed: 2 }).error).toBeUndefined();
    expect(updatePreferencesSchema.validate({ fontSize: 16 }).error).toBeUndefined();
  });

  it.each([
    ['empty body', {}],
    ['unknown language', { lang: 'fr' }],
    ['speed too slow', { speed: 0.4 }],
    ['speed too fast', { speed: 2.1 }],
    ['font too small', { fontSize: 15 }],
    ['font too large', { fontSize: 73 }],
    ['fractional tafsirId', { tafsirId: 1.5 }],
    ['zero tafsirId', { tafsirId: 0 }],
    ['non-boolean showTranslation', { showTranslation: 'maybe' }],
    ['empty reciter', { reciter: '' }]
  ])('rejects %s', (_label, payload) => {
    expect(updatePreferencesSchema.validate(payload).error).toBeDefined();
  });
});
