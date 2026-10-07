import { Request, Response, NextFunction } from 'express';
import { IService } from '../../interfaces/service.interface';
import { GetMeServiceInput } from '../../interfaces/auth.interface';
import { UserDto } from '../../dtos/users/user.dto';

export class GetMeController {
  constructor(private readonly service: IService<GetMeServiceInput, UserDto>) {}

  // Arrow function: Express calls handlers without `this`.
  handle = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await this.service.use({ userId: req.user!.id });
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  };
}
