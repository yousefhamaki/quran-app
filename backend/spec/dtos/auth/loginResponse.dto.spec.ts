import { LoginResponseDto } from '../../../src/dtos/auth/loginResponse.dto';
import { UserDto } from '../../../src/dtos/users/user.dto';
import { UserRole } from '../../../src/enums/userRole.enum';

describe('LoginResponseDto', () => {
  it('exposes token, expiresIn and the user', () => {
    const user = new UserDto({
      _id: 'u1',
      name: 'Ali',
      email: 'ali@test.com',
      passwordHash: 'h',
      role: UserRole.USER,
      isActive: true
    });
    const dto = new LoginResponseDto('jwt', '24h', user);
    expect(dto.token).toBe('jwt');
    expect(dto.expiresIn).toBe('24h');
    expect(dto.user).toBe(user);
  });
});
