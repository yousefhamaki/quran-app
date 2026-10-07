import { Request, Response, NextFunction } from 'express';
import { IService } from '../../interfaces/service.interface';
import { UpdatePreferencesServiceInput } from '../../interfaces/preferences.interface';
import { UpdatePreferencesRequestDto } from '../../dtos/preferences/updatePreferencesRequest.dto';
import { PreferencesDto } from '../../dtos/preferences/preferences.dto';

export class UpdatePreferencesController {
  constructor(private readonly service: IService<UpdatePreferencesServiceInput, PreferencesDto>) {}

  // Arrow function: Express calls handlers without `this`.
  handle = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await this.service.use({ actor: req.user!, body: req.body as UpdatePreferencesRequestDto });
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  };
}
