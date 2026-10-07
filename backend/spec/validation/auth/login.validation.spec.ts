import { loginSchema } from '../../../src/validation/auth/login.validation';

describe('loginSchema', () => {
  const valid = { email: 'ali@test.com', password: 'secret123' };

  it('accepts a valid payload and lowercases the email', () => {
    const { error, value } = loginSchema.validate({ ...valid, email: 'ALI@Test.com' });
    expect(error).toBeUndefined();
    expect(value.email).toBe('ali@test.com');
  });

  it.each([
    ['missing email', { ...valid, email: undefined }],
    ['bad email', { ...valid, email: 'nope' }],
    ['missing password', { ...valid, password: undefined }],
    ['empty password', { ...valid, password: '' }]
  ])('rejects %s', (_label, payload) => {
    expect(loginSchema.validate(payload).error).toBeDefined();
  });
});
