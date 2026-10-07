import { RequestHandler } from 'express';
import Joi from 'joi';
import { ValidationError } from '../errors/ValidationError';

type Source = 'body' | 'query' | 'params';

export class ValidationMiddleware {
  static validate(schema: Joi.ObjectSchema, source: Source = 'body'): RequestHandler {
    return (req, _res, next) => {
      const { value, error } = schema.validate(req[source], { abortEarly: false, stripUnknown: true });
      if (error) {
        return next(
          new ValidationError(
            'Validation failed',
            error.details.map((d) => ({ field: d.path.join('.'), message: d.message }))
          )
        );
      }
      // Express 5 makes req.query a getter that re-parses the URL on every access,
      // so mutating it is silently lost. Shadow it with an own property instead.
      if (source === 'query') {
        Object.defineProperty(req, 'query', { value, writable: true, configurable: true, enumerable: true });
      } else {
        req[source] = value;
      }
      next();
    };
  }
}
