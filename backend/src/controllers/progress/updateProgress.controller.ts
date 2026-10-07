import { Request, Response, NextFunction } from 'express';
import { IService } from '../../interfaces/service.interface';
import { UpdateProgressServiceInput } from '../../interfaces/progress.interface';
import { UpdateProgressRequestDto } from '../../dtos/progress/updateProgressRequest.dto';
import { ProgressDto } from '../../dtos/progress/progress.dto';

export class UpdateProgressController {
  constructor(private readonly service: IService<UpdateProgressServiceInput, ProgressDto>) {}

  // Arrow function: Express calls handlers without `this`.
  handle = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await this.service.use({ actor: req.user!, body: req.body as UpdateProgressRequestDto });
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  };
}
