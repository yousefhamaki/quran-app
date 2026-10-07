import { RequestHandler } from 'express';
import { ProgressRoute } from '../../src/routes/progress.route';
import { AuthMiddleware } from '../../src/middleware/auth.middleware';
import { RouterInspector } from '../helpers/routerInspector';

describe('ProgressRoute', () => {
  const auth = { authenticate: ((_req, _res, next) => next()) as RequestHandler } as unknown as AuthMiddleware;

  it('registers authenticated GET and validated PUT', () => {
    expect(RouterInspector.list(new ProgressRoute(auth).router)).toEqual(['GET / (2)', 'PUT / (3)']);
  });
});
