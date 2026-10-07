import { HealthRoute } from '../../src/routes/health.route';
import { RouterInspector } from '../helpers/routerInspector';

describe('HealthRoute', () => {
  it('registers a public GET / with only the controller', () => {
    expect(RouterInspector.list(new HealthRoute().router)).toEqual(['GET / (1)']);
  });
});
