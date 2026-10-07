import { UserDto } from '../../../src/dtos/users/user.dto';
import { UserRole } from '../../../src/enums/userRole.enum';

describe('UserDto', () => {
  const entity = {
    _id: '65f000000000000000000001',
    name: 'Ali',
    email: 'ali@test.com',
    passwordHash: 'hashed',
    role: UserRole.USER,
    isActive: true,
    createdAt: new Date('2026-01-01'),
    __v: 0
  };

  it('copies only the whitelisted fields', () => {
    const dto = new UserDto(entity);
    expect(dto).toEqual({
      id: entity._id,
      name: 'Ali',
      email: 'ali@test.com',
      role: UserRole.USER,
      isActive: true,
      createdAt: entity.createdAt
    });
    expect(dto).not.toHaveProperty('passwordHash');
    expect(dto).not.toHaveProperty('__v');
  });
});
