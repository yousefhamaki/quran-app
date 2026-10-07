import { Model } from 'mongoose';
import { IService } from '../../interfaces/service.interface';
import { IUser, UserEntity } from '../../interfaces/user.interface';
import { IPasswordHasher, ISessionIssuer, RegisterServiceInput } from '../../interfaces/auth.interface';
import { LoginResponseDto } from '../../dtos/auth/loginResponse.dto';
import { UserDto } from '../../dtos/users/user.dto';
import { ConflictError } from '../../errors/ConflictError';

export class RegisterService implements IService<RegisterServiceInput, LoginResponseDto> {
  constructor(
    private readonly userModel: Model<IUser>,
    private readonly hasher: IPasswordHasher,
    private readonly sessionIssuer: ISessionIssuer
  ) {}

  async use({ body, ip, userAgent }: RegisterServiceInput): Promise<LoginResponseDto> {
    await this.ensureEmailIsFree(body.email);

    const passwordHash = await this.hasher.hash(body.password);
    const created = await this.userModel.create({ name: body.name, email: body.email, passwordHash });

    const entity = created.toObject() as UserEntity;
    const { token, expiresIn } = await this.sessionIssuer.issue({ user: entity, ip, userAgent });
    return new LoginResponseDto(token, expiresIn, new UserDto(entity));
  }

  private async ensureEmailIsFree(email: string): Promise<void> {
    const existing = await this.userModel.exists({ email });
    if (existing) throw new ConflictError(`Email '${email}' is already registered`);
  }
}
