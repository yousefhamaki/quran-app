import { Request, Response } from 'express';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import { Model } from 'mongoose';
import { AuthMiddleware } from '../../src/middleware/auth.middleware';
import { ITokenService } from '../../src/interfaces/auth.interface';
import { ISession } from '../../src/interfaces/session.interface';
import { AuthenticationError } from '../../src/errors/AuthenticationError';
import { ForbiddenError } from '../../src/errors/ForbiddenError';
import { UserRole } from '../../src/enums/userRole.enum';

describe('AuthMiddleware', () => {
  const res = {} as Response;
  let tokenService: jest.Mocked<ITokenService>;
  let sessionModel: { findOne: jest.Mock };
  let middleware: AuthMiddleware;
  let next: jest.Mock;

  const requestWith = (authorization?: string) => ({ headers: { authorization } }) as unknown as Request;

  beforeEach(() => {
    tokenService = { sign: jest.fn(), verify: jest.fn().mockReturnValue({ sub: 'u1', role: UserRole.USER, jti: 'j1' }) };
    sessionModel = { findOne: jest.fn().mockResolvedValue({ _id: 's1' }) };
    middleware = new AuthMiddleware(tokenService, sessionModel as unknown as Model<ISession>);
    next = jest.fn();
  });

  describe('authenticate', () => {
    it('rejects a request without an Authorization header', async () => {
      await middleware.authenticate(requestWith(), res, next);
      expect(next).toHaveBeenCalledWith(expect.any(AuthenticationError));
    });

    it('rejects a header without the Bearer prefix', async () => {
      await middleware.authenticate(requestWith('Token abc'), res, next);
      expect(next).toHaveBeenCalledWith(expect.any(AuthenticationError));
      expect(tokenService.verify).not.toHaveBeenCalled();
    });

    it('rejects an invalid token', async () => {
      tokenService.verify.mockImplementation(() => {
        throw new JsonWebTokenError('bad');
      });
      await middleware.authenticate(requestWith('Bearer abc'), res, next);
      expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: 'Invalid token' }));
    });

    it('rejects an expired token', async () => {
      tokenService.verify.mockImplementation(() => {
        throw new TokenExpiredError('expired', new Date());
      });
      await middleware.authenticate(requestWith('Bearer abc'), res, next);
      expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: 'Token has expired' }));
    });

    it('rejects a token without sub or jti', async () => {
      tokenService.verify.mockReturnValue({ sub: 'u1', role: UserRole.USER, jti: '' });
      await middleware.authenticate(requestWith('Bearer abc'), res, next);
      expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: 'Malformed token payload' }));
    });

    it('rejects when the session was logged out or is missing', async () => {
      sessionModel.findOne.mockResolvedValue(null);
      await middleware.authenticate(requestWith('Bearer abc'), res, next);
      expect(sessionModel.findOne).toHaveBeenCalledWith({ jti: 'j1', userId: 'u1', isActive: true });
      expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: 'Session is invalid or has been logged out' }));
    });

    it('forwards unexpected errors untouched', async () => {
      const boom = new Error('db down');
      sessionModel.findOne.mockRejectedValue(boom);
      await middleware.authenticate(requestWith('Bearer abc'), res, next);
      expect(next).toHaveBeenCalledWith(boom);
    });

    it('sets req.user and calls next() with no arguments on success', async () => {
      const req = requestWith('Bearer abc');
      await middleware.authenticate(req, res, next);
      expect(req.user).toEqual({ id: 'u1', role: UserRole.USER, jti: 'j1' });
      expect(next).toHaveBeenCalledWith();
    });
  });

  describe('authorize', () => {
    it('rejects when there is no authenticated user', () => {
      AuthMiddleware.authorize(UserRole.ADMIN)({} as Request, res, next);
      expect(next).toHaveBeenCalledWith(expect.any(AuthenticationError));
    });

    it('rejects a user whose role is not allowed', () => {
      const req = { user: { id: 'u1', role: UserRole.USER, jti: 'j1' } } as Request;
      AuthMiddleware.authorize(UserRole.ADMIN)(req, res, next);
      expect(next).toHaveBeenCalledWith(expect.any(ForbiddenError));
    });

    it('lets an allowed role through', () => {
      const req = { user: { id: 'u1', role: UserRole.ADMIN, jti: 'j1' } } as Request;
      AuthMiddleware.authorize(UserRole.ADMIN)(req, res, next);
      expect(next).toHaveBeenCalledWith();
    });
  });
});
