import Joi from 'joi';
import { LoginRequestDto } from '../../dtos/auth/loginRequest.dto';

export const loginSchema = Joi.object<LoginRequestDto>({
  email: Joi.string().trim().lowercase().email().required(),
  password: Joi.string().min(1).max(128).required()
});
