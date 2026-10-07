import { AppError } from '../../src/errors/AppError';
import { NotFoundError } from '../../src/errors/NotFoundError';
import { ValidationError } from '../../src/errors/ValidationError';
import { AuthenticationError } from '../../src/errors/AuthenticationError';
import { ForbiddenError } from '../../src/errors/ForbiddenError';
import { ConflictError } from '../../src/errors/ConflictError';
import { RateLimitError } from '../../src/errors/RateLimitError';

describe('errors', () => {
  it.each([
    [NotFoundError, 404, 'NOT_FOUND'],
    [ValidationError, 400, 'VALIDATION_ERROR'],
    [AuthenticationError, 401, 'AUTHENTICATION_ERROR'],
    [ForbiddenError, 403, 'FORBIDDEN'],
    [ConflictError, 409, 'CONFLICT'],
    [RateLimitError, 429, 'RATE_LIMITED']
  ])('%p carries its status and code', (ErrorClass, status, code) => {
    const error = new ErrorClass();
    expect(error).toBeInstanceOf(AppError);
    expect(error).toBeInstanceOf(ErrorClass);
    expect(error.statusCode).toBe(status);
    expect(error.code).toBe(code);
    expect(error.message.length).toBeGreaterThan(0);
  });

  it('keeps a custom message and details', () => {
    const error = new ConflictError('taken', { field: 'email' });
    expect(error.message).toBe('taken');
    expect(error.details).toEqual({ field: 'email' });
    expect(error.name).toBe('ConflictError');
  });
});
