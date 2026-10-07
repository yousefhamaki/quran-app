import request from 'supertest';
import { Model } from 'mongoose';
import { App } from '../src/app';
import { AuthMiddleware } from '../src/middleware/auth.middleware';
import { ISession } from '../src/interfaces/session.interface';
import { ITokenService } from '../src/interfaces/auth.interface';
import { UserRole } from '../src/enums/userRole.enum';

describe('App (HTTP wiring, no database)', () => {
  const tokenService: jest.Mocked<ITokenService> = {
    sign: jest.fn(),
    verify: jest.fn().mockReturnValue({ sub: 'u1', role: UserRole.USER, jti: 'j1' })
  };
  const sessionModel = { findOne: jest.fn().mockResolvedValue({ _id: 's1' }) };

  const build = () =>
    new App(
      {
        auth: new AuthMiddleware(tokenService, sessionModel as unknown as Model<ISession>),
        tokenService,
        jwtExpiresIn: '24h',
        authLimiter: (_req, _res, next) => next()
      },
      ['http://localhost:5173']
    ).app;

  it('GET /api/health is public and uses the success envelope', async () => {
    const res = await request(build()).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('ok');
  });

  it('sets security headers (helmet)', async () => {
    const res = await request(build()).get('/api/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });

  it('allows a configured CORS origin and not others', async () => {
    const allowed = await request(build()).get('/api/health').set('Origin', 'http://localhost:5173');
    const denied = await request(build()).get('/api/health').set('Origin', 'http://evil.example');
    expect(allowed.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    expect(denied.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('returns a JSON 404 for unknown routes', async () => {
    const res = await request(build()).get('/api/nope');
    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ success: false, error: { code: 'NOT_FOUND' } });
  });

  it('protects bookmarks, progress and preferences behind authentication', async () => {
    const app = build();
    for (const path of ['/api/bookmarks', '/api/progress', '/api/preferences', '/api/auth/me']) {
      const res = await request(app).get(path);
      expect(res.status).toBe(401);
      expect(res.body).toMatchObject({ success: false, error: { code: 'AUTHENTICATION_ERROR' } });
    }
  });

  it('rejects an invalid login body with 400 before touching the database', async () => {
    const res = await request(build()).post('/api/auth/login').send({ email: 'nope' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('validates the bookmark id param for an authenticated user', async () => {
    const res = await request(build()).delete('/api/bookmarks/not-an-id').set('Authorization', 'Bearer abc');
    expect(res.status).toBe(400);
  });

  it('validates the progress and preferences bodies for an authenticated user', async () => {
    const app = build();
    const progress = await request(app).put('/api/progress').set('Authorization', 'Bearer abc').send({ surah: 999, ayah: 1 });
    const prefs = await request(app).put('/api/preferences').set('Authorization', 'Bearer abc').send({ speed: 9 });
    expect(progress.status).toBe(400);
    expect(prefs.status).toBe(400);
  });

  it('serves Swagger UI at /api/docs', async () => {
    const res = await request(build()).get('/api/docs/');
    expect(res.status).toBe(200);
    expect(res.text).toContain('swagger');
  });
});
