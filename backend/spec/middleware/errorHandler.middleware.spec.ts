import { Request, Response } from 'express';
import { ErrorHandlerMiddleware } from '../../src/middleware/errorHandler.middleware';
import { NotFoundError } from '../../src/errors/NotFoundError';
import { ConflictError } from '../../src/errors/ConflictError';

const mockRes = () => {
  const res = {} as Response;
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('ErrorHandlerMiddleware', () => {
  const handler = new ErrorHandlerMiddleware();
  const req = {} as Request;

  describe('handle', () => {
    it('turns an AppError into { success: false, error } with its status code', () => {
      const res = mockRes();
      handler.handle(new ConflictError('Already there', [{ field: 'x' }]), req, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: { code: 'CONFLICT', message: 'Already there', details: [{ field: 'x' }] }
      });
    });

    it('hides unexpected errors behind a generic 500', () => {
      const spy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
      const res = mockRes();

      handler.handle(new Error('secret internals'), req, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Internal server error' }
      });
      spy.mockRestore();
    });
  });

  describe('notFound', () => {
    it('forwards a NotFoundError naming the route', () => {
      const next = jest.fn();
      handler.notFound({ method: 'GET', originalUrl: '/nope' } as Request, mockRes(), next);

      const error = next.mock.calls[0][0] as NotFoundError;
      expect(error).toBeInstanceOf(NotFoundError);
      expect(error.message).toContain('GET /nope');
    });
  });
});
