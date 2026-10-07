import { UserDto } from '../users/user.dto';

export class LoginResponseDto {
  constructor(
    readonly token: string,
    readonly expiresIn: string,
    readonly user: UserDto
  ) {}
}
