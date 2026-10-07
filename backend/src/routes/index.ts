import { Router } from 'express';
import { ApiRouterDeps } from '../interfaces/auth.interface';
import { HealthRoute } from './health.route';
import { AuthRoute } from './auth.route';
import { BookmarksRoute } from './bookmarks.route';
import { ProgressRoute } from './progress.route';
import { PreferencesRoute } from './preferences.route';

export class ApiRouter {
  readonly router = Router();

  constructor(deps: ApiRouterDeps) {
    this.router.use('/health', new HealthRoute().router);
    this.router.use('/auth', new AuthRoute(deps).router);
    this.router.use('/bookmarks', new BookmarksRoute(deps.auth).router);
    this.router.use('/progress', new ProgressRoute(deps.auth).router);
    this.router.use('/preferences', new PreferencesRoute(deps.auth).router);
  }
}
