import { Request, Response, NextFunction, RequestHandler } from 'express';
import { rateLimit } from 'express-rate-limit';
import { RateLimitError } from '../errors/RateLimitError';

export interface RateLimitOptions {
  windowMs: number;
  max: number;
}

export class RateLimitMiddleware {
  static create({ windowMs, max }: RateLimitOptions): RequestHandler {
    return rateLimit({
      windowMs,
      limit: max,
      standardHeaders: true,
      legacyHeaders: false,
      handler: RateLimitMiddleware.onLimitReached
    });
  }

  static onLimitReached(_req: Request, _res: Response, next: NextFunction): void {
    next(new RateLimitError());
  }
}
