import { SwaggerConfig } from '../../src/config/swagger';

describe('SwaggerConfig', () => {
  it('builds an OpenAPI document that includes every documented endpoint', () => {
    const spec = SwaggerConfig.build() as { openapi: string; paths: Record<string, Record<string, unknown>> };

    expect(spec.openapi).toBe('3.0.3');
    expect(Object.keys(spec.paths).sort()).toEqual(
      [
        '/api/auth/login',
        '/api/auth/logout',
        '/api/auth/me',
        '/api/auth/register',
        '/api/bookmarks',
        '/api/bookmarks/{id}',
        '/api/health',
        '/api/preferences',
        '/api/progress'
      ].sort()
    );
    expect(Object.keys(spec.paths['/api/bookmarks']).sort()).toEqual(['get', 'post']);
    expect(Object.keys(spec.paths['/api/preferences']).sort()).toEqual(['get', 'put']);
  });
});
