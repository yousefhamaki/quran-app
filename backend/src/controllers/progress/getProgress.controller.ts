import { Request, Response, NextFunction } from 'express';
import { IService } from '../../interfaces/service.interface';
import { GetProgressServiceInput } from '../../interfaces/progress.interface';
import { ProgressDto } from '../../dtos/progress/progress.dto';

export class GetProgressController {
  constructor(private readonly service: IService<GetProgressServiceInput, ProgressDto>) {}

  // Arrow function: Express calls handlers without `this`.
  handle = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await this.service.use({ actor: req.user! });
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  };
}
