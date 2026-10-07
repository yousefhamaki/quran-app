import { Request, Response, NextFunction } from 'express';
import { IService } from '../../interfaces/service.interface';
import { GetPreferencesServiceInput } from '../../interfaces/preferences.interface';
import { PreferencesDto } from '../../dtos/preferences/preferences.dto';

export class GetPreferencesController {
  constructor(private readonly service: IService<GetPreferencesServiceInput, PreferencesDto>) {}

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
