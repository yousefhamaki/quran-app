import { Request, Response } from 'express';
import Joi from 'joi';
import { ValidationMiddleware } from '../../src/middleware/validation.middleware';
import { ValidationError } from '../../src/errors/ValidationError';

describe('ValidationMiddleware', () => {
  const schema = Joi.object({ name: Joi.string().required(), age: Joi.number().optional() });
  const res = {} as Response;

  it('passes a valid body, replaces it with the sanitised value and strips unknown keys', () => {
    const req = { body: { name: 'Ali', extra: 'x' } } as Request;
    const next = jest.fn();

    ValidationMiddleware.validate(schema, 'body')(req, res, next);

    expect(req.body).toEqual({ name: 'Ali' });
    expect(next).toHaveBeenCalledWith();
  });

  it('forwards a ValidationError listing every failing field', () => {
    const req = { body: { age: 'abc' } } as Request;
    const next = jest.fn();

    ValidationMiddleware.validate(schema)(req, res, next);

    const error = next.mock.calls[0][0] as ValidationError;
    expect(error).toBeInstanceOf(ValidationError);
    expect(error.details).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: 'name' }), expect.objectContaining({ field: 'age' })])
    );
  });

  it('validates params', () => {
    const req = { params: { name: 'ok' } } as unknown as Request;
    const next = jest.fn();
    ValidationMiddleware.validate(schema, 'params')(req, res, next);
    expect(next).toHaveBeenCalledWith();
  });

  it('writes the sanitised query as an own property', () => {
    const req = { query: { name: 'Ali', extra: '1' } } as unknown as Request;
    const next = jest.fn();

    ValidationMiddleware.validate(schema, 'query')(req, res, next);

    expect(req.query).toEqual({ name: 'Ali' });
    expect(next).toHaveBeenCalledWith();
  });
});
