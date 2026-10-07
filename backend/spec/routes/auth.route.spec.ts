import { RequestHandler } from 'express';
import { AuthRoute } from '../../src/routes/auth.route';
import { AuthMiddleware } from '../../src/middleware/auth.middleware';
import { RouterInspector } from '../helpers/routerInspector';

describe('AuthRoute', () => {
  const authenticate: RequestHandler = (_req, _res, next) => next();
  const deps = {
    auth: { authenticate } as unknown as AuthMiddleware,
    tokenService: { sign: jest.fn(), verify: jest.fn() },
    jwtExpiresIn: '24h',
    authLimiter: ((_req, _res, next) => next()) as RequestHandler
  };

  it('registers register/login (limiter + validation + controller) and logout/me (auth + controller)', () => {
    expect(RouterInspector.list(new AuthRoute(deps).router)).toEqual([
      'POST /register (3)',
      'POST /login (3)',
      'POST /logout (2)',
      'GET /me (2)'
    ]);
  });
});
