import { RequestHandler } from 'express';
import { BookmarksRoute } from '../../src/routes/bookmarks.route';
import { AuthMiddleware } from '../../src/middleware/auth.middleware';
import { RouterInspector } from '../helpers/routerInspector';

describe('BookmarksRoute', () => {
  const auth = { authenticate: ((_req, _res, next) => next()) as RequestHandler } as unknown as AuthMiddleware;

  it('registers authenticated list, create (validated) and delete (validated)', () => {
    expect(RouterInspector.list(new BookmarksRoute(auth).router)).toEqual([
      'GET / (2)',
      'POST / (3)',
      'DELETE /:id (3)'
    ]);
  });
});
