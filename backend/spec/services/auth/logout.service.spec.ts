import { Model } from 'mongoose';
import { LogoutService } from '../../../src/services/auth/logout.service';
import { ISession } from '../../../src/interfaces/session.interface';
import { MessageDto } from '../../../src/dtos/common/message.dto';

describe('LogoutService', () => {
  it('deactivates the active session identified by jti and user', async () => {
    const sessionModel = { updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 }) };
    const service = new LogoutService(sessionModel as unknown as Model<ISession>);

    const result = await service.use({ userId: 'u1', jti: 'j1' });

    expect(sessionModel.updateOne).toHaveBeenCalledWith(
      { jti: 'j1', userId: 'u1', isActive: true },
      { $set: { isActive: false, loggedOutAt: expect.any(Date) } }
    );
    expect(result).toBeInstanceOf(MessageDto);
    expect(result.message).toBe('Logged out');
  });

  it('propagates database errors', async () => {
    const sessionModel = { updateOne: jest.fn().mockRejectedValue(new Error('db down')) };
    const service = new LogoutService(sessionModel as unknown as Model<ISession>);
    await expect(service.use({ userId: 'u1', jti: 'j1' })).rejects.toThrow('db down');
  });
});
