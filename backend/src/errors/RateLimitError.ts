import { AppError } from './AppError';
import { ERROR_CODES } from '../constants/error.constants';

export class RateLimitError extends AppError {
  constructor(message = 'Too many requests, please try again later', details?: unknown) {
    super(ERROR_CODES.RATE_LIMITED, message, 429, details);
  }
}
