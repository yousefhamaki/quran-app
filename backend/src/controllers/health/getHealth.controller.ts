import { Request, Response, NextFunction } from 'express';
import { IService } from '../../interfaces/service.interface';
import { HealthDto } from '../../dtos/health/health.dto';

export class GetHealthController {
  constructor(private readonly service: IService<void, HealthDto>) {}

  // Arrow function: Express calls handlers without `this`.
  handle = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await this.service.use();
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  };
}
