import { AppError } from './AppError';
import { ERROR_CODES } from '../constants/error.constants';

export class AuthenticationError extends AppError {
  constructor(message = 'Authentication required', details?: unknown) {
    super(ERROR_CODES.AUTHENTICATION_ERROR, message, 401, details);
  }
}
