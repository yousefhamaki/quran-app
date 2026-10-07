import { Model } from 'mongoose';
import { LoginService } from '../../../src/services/auth/login.service';
import { IUser } from '../../../src/interfaces/user.interface';
import { IPasswordHasher, ISessionIssuer } from '../../../src/interfaces/auth.interface';
import { AuthenticationError } from '../../../src/errors/AuthenticationError';
import { LoginResponseDto } from '../../../src/dtos/auth/loginResponse.dto';
import { UserRole } from '../../../src/enums/userRole.enum';

describe('LoginService', () => {
  const input = { body: { email: 'ali@test.com', password: 'secret123' }, ip: '1.1.1.1', userAgent: 'jest' };
  const stored = {
    _id: '65f000000000000000000001',
    name: 'Ali',
    email: 'ali@test.com',
    passwordHash: 'hashed',
    role: UserRole.USER,
    isActive: true
  };

  let select: jest.Mock;
  let userModel: { findOne: jest.Mock };
  let hasher: jest.Mocked<IPasswordHasher>;
  let issuer: jest.Mocked<ISessionIssuer>;
  let service: LoginService;

  beforeEach(() => {
    select = jest.fn().mockResolvedValue({ ...stored, toObject: () => stored });
    userModel = { findOne: jest.fn().mockReturnValue({ select }) };
    hasher = { hash: jest.fn(), compare: jest.fn().mockResolvedValue(true) };
    issuer = { issue: jest.fn().mockResolvedValue({ token: 'jwt', expiresIn: '24h' }) };
    service = new LoginService(userModel as unknown as Model<IUser>, hasher, issuer);
  });

  it('returns a LoginResponseDto with token, expiry and the user', async () => {
    const result = await service.use(input);

    expect(userModel.findOne).toHaveBeenCalledWith({ email: 'ali@test.com' });
    expect(select).toHaveBeenCalledWith('+passwordHash');
    expect(hasher.compare).toHaveBeenCalledWith('secret123', 'hashed');
    expect(issuer.issue).toHaveBeenCalledWith({ user: stored, ip: '1.1.1.1', userAgent: 'jest' });
    expect(result).toBeInstanceOf(LoginResponseDto);
    expect(result.token).toBe('jwt');
    expect(result.expiresIn).toBe('24h');
    expect(result.user.id).toBe(stored._id);
  });

  it('never exposes the password hash', async () => {
    const result = await service.use(input);
    expect(result.user).not.toHaveProperty('passwordHash');
  });

  it('throws AuthenticationError when the user does not exist', async () => {
    select.mockResolvedValue(null);
    await expect(service.use(input)).rejects.toBeInstanceOf(AuthenticationError);
    expect(issuer.issue).not.toHaveBeenCalled();
  });

  it('throws the same AuthenticationError when the password is wrong', async () => {
    hasher.compare.mockResolvedValue(false);
    await expect(service.use(input)).rejects.toThrow('Invalid email or password');
    expect(issuer.issue).not.toHaveBeenCalled();
  });

  it('throws AuthenticationError when the account is inactive', async () => {
    select.mockResolvedValue({ ...stored, isActive: false, toObject: () => stored });
    await expect(service.use(input)).rejects.toThrow('Account is inactive');
    expect(issuer.issue).not.toHaveBeenCalled();
  });
});
