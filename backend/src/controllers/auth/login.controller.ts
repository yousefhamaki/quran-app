import { Request, Response, NextFunction } from 'express';
import { IService } from '../../interfaces/service.interface';
import { LoginServiceInput } from '../../interfaces/auth.interface';
import { LoginRequestDto } from '../../dtos/auth/loginRequest.dto';
import { LoginResponseDto } from '../../dtos/auth/loginResponse.dto';

export class LoginController {
  constructor(private readonly service: IService<LoginServiceInput, LoginResponseDto>) {}

  // Arrow function: Express calls handlers without `this`.
  handle = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await this.service.use({ body: req.body as LoginRequestDto, ip: req.ip, userAgent: req.get('user-agent') });
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  };
}
