import { RequestHandler } from 'express';
import { PreferencesRoute } from '../../src/routes/preferences.route';
import { AuthMiddleware } from '../../src/middleware/auth.middleware';
import { RouterInspector } from '../helpers/routerInspector';

describe('PreferencesRoute', () => {
  const auth = { authenticate: ((_req, _res, next) => next()) as RequestHandler } as unknown as AuthMiddleware;

  it('registers authenticated GET and validated PUT', () => {
    expect(RouterInspector.list(new PreferencesRoute(auth).router)).toEqual(['GET / (2)', 'PUT / (3)']);
  });
});
