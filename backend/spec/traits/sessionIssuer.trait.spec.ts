import { Model } from 'mongoose';
import { SessionIssuer } from '../../src/traits/sessionIssuer.trait';
import { ISession } from '../../src/interfaces/session.interface';
import { ITokenService } from '../../src/interfaces/auth.interface';
import { UserRole } from '../../src/enums/userRole.enum';

describe('SessionIssuer', () => {
  const user = {
    _id: 'u1',
    name: 'Ali',
    email: 'ali@test.com',
    passwordHash: 'h',
    role: UserRole.USER,
    isActive: true
  };

  let sessionModel: { create: jest.Mock };
  let tokenService: jest.Mocked<ITokenService>;
  let issuer: SessionIssuer;

  beforeEach(() => {
    sessionModel = { create: jest.fn().mockResolvedValue({}) };
    tokenService = { sign: jest.fn().mockReturnValue('jwt'), verify: jest.fn() };
    issuer = new SessionIssuer(sessionModel as unknown as Model<ISession>, tokenService, '24h');
  });

  it('stores an active session and signs a token carrying the same jti', async () => {
    const result = await issuer.issue({ user, ip: '1.1.1.1', userAgent: 'jest' });

    const stored = sessionModel.create.mock.calls[0][0];
    expect(stored).toMatchObject({ userId: 'u1', isActive: true, ip: '1.1.1.1', userAgent: 'jest' });
    expect(typeof stored.jti).toBe('string');
    expect(tokenService.sign).toHaveBeenCalledWith({ sub: 'u1', role: UserRole.USER, jti: stored.jti });
    expect(result).toEqual({ token: 'jwt', expiresIn: '24h' });
  });

  it('uses a fresh jti for every session', async () => {
    await issuer.issue({ user });
    await issuer.issue({ user });
    const [first, second] = sessionModel.create.mock.calls.map((call) => call[0].jti);
    expect(first).not.toBe(second);
  });

  it('does not sign a token when the session could not be stored', async () => {
    sessionModel.create.mockRejectedValue(new Error('db down'));
    await expect(issuer.issue({ user })).rejects.toThrow('db down');
    expect(tokenService.sign).not.toHaveBeenCalled();
  });
});
