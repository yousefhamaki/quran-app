import Joi from 'joi';
import { RegisterRequestDto } from '../../dtos/auth/registerRequest.dto';

export const registerSchema = Joi.object<RegisterRequestDto>({
  name: Joi.string().trim().min(2).max(100).required(),
  email: Joi.string().trim().lowercase().email().required(),
  password: Joi.string().min(8).max(128).required()
});
