import jwt from 'jsonwebtoken';
import { JwtTokenService } from '../../src/traits/jwtToken.trait';
import { UserRole } from '../../src/enums/userRole.enum';

describe('JwtTokenService', () => {
  const payload = { sub: 'u1', role: UserRole.USER, jti: 'j1' };

  it('refuses to be built without a secret', () => {
    expect(() => new JwtTokenService('', '1h')).toThrow('JWT secret is required');
  });

  it('signs a token that verifies back to the same payload', () => {
    const service = new JwtTokenService('test-secret', '1h');
    const decoded = service.verify(service.sign(payload));
    expect(decoded).toMatchObject(payload);
  });

  it('always sets an expiry', () => {
    const service = new JwtTokenService('test-secret', '1h');
    const decoded = jwt.decode(service.sign(payload)) as { exp?: number };
    expect(decoded.exp).toBeDefined();
  });

  it('rejects a token signed with another secret', () => {
    const token = new JwtTokenService('one', '1h').sign(payload);
    expect(() => new JwtTokenService('two', '1h').verify(token)).toThrow();
  });
});
