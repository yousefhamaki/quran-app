import { Model } from 'mongoose';
import { GetMeService } from '../../../src/services/auth/getMe.service';
import { IUser } from '../../../src/interfaces/user.interface';
import { NotFoundError } from '../../../src/errors/NotFoundError';
import { UserDto } from '../../../src/dtos/users/user.dto';
import { UserRole } from '../../../src/enums/userRole.enum';

describe('GetMeService', () => {
  const stored = {
    _id: '65f000000000000000000001',
    name: 'Ali',
    email: 'ali@test.com',
    passwordHash: 'hashed',
    role: UserRole.USER,
    isActive: true
  };

  const build = (found: unknown) => {
    const lean = jest.fn().mockResolvedValue(found);
    const userModel = { findById: jest.fn().mockReturnValue({ lean }) };
    return { userModel, service: new GetMeService(userModel as unknown as Model<IUser>) };
  };

  it('returns the current user as a UserDto without the hash', async () => {
    const { userModel, service } = build(stored);

    const result = await service.use({ userId: 'u1' });

    expect(userModel.findById).toHaveBeenCalledWith('u1');
    expect(result).toBeInstanceOf(UserDto);
    expect(result.email).toBe('ali@test.com');
    expect(result).not.toHaveProperty('passwordHash');
  });

  it('throws NotFoundError when the user no longer exists', async () => {
    const { service } = build(null);
    await expect(service.use({ userId: 'u1' })).rejects.toBeInstanceOf(NotFoundError);
  });
});
