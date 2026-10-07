import { BcryptPasswordHasher } from '../../src/traits/passwordHasher.trait';

describe('BcryptPasswordHasher', () => {
  const hasher = new BcryptPasswordHasher(4);

  it('hashes to something other than the plain text', async () => {
    const hash = await hasher.hash('secret123');
    expect(hash).not.toBe('secret123');
    expect(hash.length).toBeGreaterThan(20);
  });

  it('compare returns true for the right password', async () => {
    const hash = await hasher.hash('secret123');
    await expect(hasher.compare('secret123', hash)).resolves.toBe(true);
  });

  it('compare returns false for a wrong password', async () => {
    const hash = await hasher.hash('secret123');
    await expect(hasher.compare('other', hash)).resolves.toBe(false);
  });

  it('works with the default salt rounds', async () => {
    const hash = await new BcryptPasswordHasher().hash('x');
    expect(hash).toMatch(/^\$2[aby]\$10\$/);
  });
});
