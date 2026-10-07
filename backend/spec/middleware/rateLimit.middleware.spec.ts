import { Request, Response } from 'express';
import { RateLimitMiddleware } from '../../src/middleware/rateLimit.middleware';
import { RateLimitError } from '../../src/errors/RateLimitError';

describe('RateLimitMiddleware', () => {
  it('create returns an Express request handler', () => {
    const handler = RateLimitMiddleware.create({ windowMs: 1000, max: 5 });
    expect(typeof handler).toBe('function');
  });

  it('onLimitReached forwards a 429 RateLimitError', () => {
    const next = jest.fn();
    RateLimitMiddleware.onLimitReached({} as Request, {} as Response, next);

    const error = next.mock.calls[0][0] as RateLimitError;
    expect(error).toBeInstanceOf(RateLimitError);
    expect(error.statusCode).toBe(429);
  });
});
