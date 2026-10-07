import { Model } from 'mongoose';
import { IService } from '../../interfaces/service.interface';
import { ISession } from '../../interfaces/session.interface';
import { LogoutServiceInput } from '../../interfaces/auth.interface';
import { MessageDto } from '../../dtos/common/message.dto';

export class LogoutService implements IService<LogoutServiceInput, MessageDto> {
  constructor(private readonly sessionModel: Model<ISession>) {}

  async use({ userId, jti }: LogoutServiceInput): Promise<MessageDto> {
    await this.sessionModel.updateOne(
      { jti, userId, isActive: true },
      { $set: { isActive: false, loggedOutAt: new Date() } }
    );
    return new MessageDto('Logged out');
  }
}
