import { Server as HttpServer } from 'http';
import { env } from './config/env';
import { Database } from './config/database';
import { App } from './app';
import { SessionModel } from './models/session.model';
import { JwtTokenService } from './traits/jwtToken.trait';
import { AuthMiddleware } from './middleware/auth.middleware';
import { RateLimitMiddleware } from './middleware/rateLimit.middleware';
import { AUTH } from './constants/auth.constants';

class Server {
  private readonly database = new Database();
  private httpServer?: HttpServer;

  async start(): Promise<void> {
    await this.database.connect(env.mongoUri);

    const tokenService = new JwtTokenService(env.jwtSecret, env.jwtExpiresIn);
    const application = new App(
      {
        auth: new AuthMiddleware(tokenService, SessionModel),
        tokenService,
        jwtExpiresIn: env.jwtExpiresIn,
        authLimiter: RateLimitMiddleware.create({
          windowMs: AUTH.RATE_LIMIT_WINDOW_MS,
          max: AUTH.RATE_LIMIT_MAX_REQUESTS
        })
      },
      env.corsOrigins
    );

    this.httpServer = application.app.listen(env.port, () => {
      console.log(`API listening on http://localhost:${env.port} (docs at /api/docs)`);
    });
  }

  async stop(): Promise<void> {
    await new Promise<void>((resolve) => (this.httpServer ? this.httpServer.close(() => resolve()) : resolve()));
    await this.database.disconnect();
  }
}

const server = new Server();

server.start().catch((error) => {
  console.error('Failed to start server', error);
  process.exit(1);
});

process.on('SIGTERM', () => {
  server.stop().then(() => process.exit(0));
});
