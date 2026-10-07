import { Model } from 'mongoose';
import { IService } from '../../interfaces/service.interface';
import { IUser, UserEntity } from '../../interfaces/user.interface';
import { GetMeServiceInput } from '../../interfaces/auth.interface';
import { UserDto } from '../../dtos/users/user.dto';
import { NotFoundError } from '../../errors/NotFoundError';

export class GetMeService implements IService<GetMeServiceInput, UserDto> {
  constructor(private readonly userModel: Model<IUser>) {}

  async use({ userId }: GetMeServiceInput): Promise<UserDto> {
    const user = await this.userModel.findById(userId).lean<UserEntity>();
    if (!user) throw new NotFoundError('User not found');
    return new UserDto(user);
  }
}
