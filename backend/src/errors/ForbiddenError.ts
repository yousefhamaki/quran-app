import { AppError } from './AppError';
import { ERROR_CODES } from '../constants/error.constants';

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden', details?: unknown) {
    super(ERROR_CODES.FORBIDDEN, message, 403, details);
  }
}
