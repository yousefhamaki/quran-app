import { Request, Response, NextFunction } from 'express';
import { IService } from '../../interfaces/service.interface';
import { LogoutServiceInput } from '../../interfaces/auth.interface';
import { MessageDto } from '../../dtos/common/message.dto';

export class LogoutController {
  constructor(private readonly service: IService<LogoutServiceInput, MessageDto>) {}

  // Arrow function: Express calls handlers without `this`.
  handle = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await this.service.use({ userId: req.user!.id, jti: req.user!.jti });
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  };
}
