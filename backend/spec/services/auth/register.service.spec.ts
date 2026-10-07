import { Model } from 'mongoose';
import { RegisterService } from '../../../src/services/auth/register.service';
import { IUser } from '../../../src/interfaces/user.interface';
import { IPasswordHasher, ISessionIssuer } from '../../../src/interfaces/auth.interface';
import { ConflictError } from '../../../src/errors/ConflictError';
import { LoginResponseDto } from '../../../src/dtos/auth/loginResponse.dto';
import { UserRole } from '../../../src/enums/userRole.enum';

describe('RegisterService', () => {
  const input = {
    body: { name: 'Ali', email: 'ali@test.com', password: 'secret123' },
    ip: '1.1.1.1',
    userAgent: 'jest'
  };
  const stored = {
    _id: '65f000000000000000000001',
    name: 'Ali',
    email: 'ali@test.com',
    passwordHash: 'hashed',
    role: UserRole.USER,
    isActive: true
  };

  let userModel: { exists: jest.Mock; create: jest.Mock };
  let hasher: jest.Mocked<IPasswordHasher>;
  let issuer: jest.Mocked<ISessionIssuer>;
  let service: RegisterService;

  beforeEach(() => {
    userModel = {
      exists: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ toObject: () => stored })
    };
    hasher = { hash: jest.fn().mockResolvedValue('hashed'), compare: jest.fn() };
    issuer = { issue: jest.fn().mockResolvedValue({ token: 'jwt', expiresIn: '24h' }) };
    service = new RegisterService(userModel as unknown as Model<IUser>, hasher, issuer);
  });

  it('hashes the password, creates the user and returns the user DTO with a token', async () => {
    const result = await service.use(input);

    expect(hasher.hash).toHaveBeenCalledWith('secret123');
    expect(userModel.create).toHaveBeenCalledWith({ name: 'Ali', email: 'ali@test.com', passwordHash: 'hashed' });
    expect(issuer.issue).toHaveBeenCalledWith({ user: stored, ip: '1.1.1.1', userAgent: 'jest' });
    expect(result).toBeInstanceOf(LoginResponseDto);
    expect(result.token).toBe('jwt');
    expect(result.user.email).toBe('ali@test.com');
  });

  it('never exposes the password hash', async () => {
    const result = await service.use(input);
    expect(result.user).not.toHaveProperty('passwordHash');
  });

  it('throws ConflictError when the email is already registered', async () => {
    userModel.exists.mockResolvedValue({ _id: 'x' });
    await expect(service.use(input)).rejects.toBeInstanceOf(ConflictError);
    expect(userModel.create).not.toHaveBeenCalled();
    expect(issuer.issue).not.toHaveBeenCalled();
  });
});
