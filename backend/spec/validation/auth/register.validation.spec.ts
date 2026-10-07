import { registerSchema } from '../../../src/validation/auth/register.validation';

describe('registerSchema', () => {
  const valid = { name: 'Ali', email: 'ali@test.com', password: 'secret123' };

  it('accepts a valid payload', () => {
    expect(registerSchema.validate(valid).error).toBeUndefined();
  });

  it.each([
    ['missing name', { ...valid, name: undefined }],
    ['short name', { ...valid, name: 'A' }],
    ['bad email', { ...valid, email: 'nope' }],
    ['short password', { ...valid, password: '123' }],
    ['missing password', { ...valid, password: undefined }]
  ])('rejects %s', (_label, payload) => {
    expect(registerSchema.validate(payload).error).toBeDefined();
  });

  it('does not allow a client-chosen role (stripped as unknown)', () => {
    const { value } = registerSchema.validate({ ...valid, role: 'admin' }, { stripUnknown: true });
    expect(value).not.toHaveProperty('role');
  });
});
