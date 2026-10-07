import { Request, Response, NextFunction } from 'express';
import { IService } from '../../interfaces/service.interface';
import { RegisterServiceInput } from '../../interfaces/auth.interface';
import { RegisterRequestDto } from '../../dtos/auth/registerRequest.dto';
import { LoginResponseDto } from '../../dtos/auth/loginResponse.dto';

export class RegisterController {
  constructor(private readonly service: IService<RegisterServiceInput, LoginResponseDto>) {}

  // Arrow function: Express calls handlers without `this`.
  handle = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await this.service.use({ body: req.body as RegisterRequestDto, ip: req.ip, userAgent: req.get('user-agent') });
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  };
}
