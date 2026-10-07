import { Model } from 'mongoose';
import { IService } from '../../interfaces/service.interface';
import { IUser, UserEntity } from '../../interfaces/user.interface';
import { IPasswordHasher, ISessionIssuer, LoginServiceInput } from '../../interfaces/auth.interface';
import { LoginResponseDto } from '../../dtos/auth/loginResponse.dto';
import { UserDto } from '../../dtos/users/user.dto';
import { AuthenticationError } from '../../errors/AuthenticationError';

export class LoginService implements IService<LoginServiceInput, LoginResponseDto> {
  constructor(
    private readonly userModel: Model<IUser>,
    private readonly hasher: IPasswordHasher,
    private readonly sessionIssuer: ISessionIssuer
  ) {}

  async use({ body, ip, userAgent }: LoginServiceInput): Promise<LoginResponseDto> {
    const user = await this.userModel.findOne({ email: body.email }).select('+passwordHash');
    // Same message for "no user" and "wrong password" so emails cannot be enumerated.
    if (!user || !(await this.hasher.compare(body.password, user.passwordHash))) {
      throw new AuthenticationError('Invalid email or password');
    }
    if (!user.isActive) throw new AuthenticationError('Account is inactive');

    const entity = user.toObject() as UserEntity;
    const { token, expiresIn } = await this.sessionIssuer.issue({ user: entity, ip, userAgent });
    return new LoginResponseDto(token, expiresIn, new UserDto(entity));
  }
}
