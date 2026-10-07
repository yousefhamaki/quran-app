import { Router } from 'express';
import { UserModel } from '../models/user.model';
import { SessionModel } from '../models/session.model';
import { ApiRouterDeps } from '../interfaces/auth.interface';
import { BcryptPasswordHasher } from '../traits/passwordHasher.trait';
import { SessionIssuer } from '../traits/sessionIssuer.trait';
import { RegisterService } from '../services/auth/register.service';
import { LoginService } from '../services/auth/login.service';
import { LogoutService } from '../services/auth/logout.service';
import { GetMeService } from '../services/auth/getMe.service';
import { RegisterController } from '../controllers/auth/register.controller';
import { LoginController } from '../controllers/auth/login.controller';
import { LogoutController } from '../controllers/auth/logout.controller';
import { GetMeController } from '../controllers/auth/getMe.controller';
import { ValidationMiddleware } from '../middleware/validation.middleware';
import { registerSchema } from '../validation/auth/register.validation';
import { loginSchema } from '../validation/auth/login.validation';

export class AuthRoute {
  readonly router = Router();

  constructor(private readonly deps: ApiRouterDeps) {
    this.register();
  }

  private register(): void {
    const { auth, tokenService, jwtExpiresIn, authLimiter } = this.deps;
    const hasher = new BcryptPasswordHasher();
    const sessionIssuer = new SessionIssuer(SessionModel, tokenService, jwtExpiresIn);

    /**
     * @openapi
     * /api/auth/register:
     *   post:
     *     tags: [Auth]
     *     summary: Create an account and sign in (public)
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required: [name, email, password]
     *             properties:
     *               name: { type: string, minLength: 2 }
     *               email: { type: string, format: email }
     *               password: { type: string, minLength: 8 }
     *     responses:
     *       201: { description: Account created; returns the user and a JWT }
     *       400: { description: Validation failed }
     *       409: { description: Email already registered }
     *       429: { description: Too many requests }
     */
    this.router.post(
      '/register',
      authLimiter,
      ValidationMiddleware.validate(registerSchema, 'body'),
      new RegisterController(new RegisterService(UserModel, hasher, sessionIssuer)).handle
    );

    /**
     * @openapi
     * /api/auth/login:
     *   post:
     *     tags: [Auth]
     *     summary: Sign in with email and password (public)
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required: [email, password]
     *             properties:
     *               email: { type: string, format: email }
     *               password: { type: string }
     *     responses:
     *       200: { description: Signed in; returns the user and a JWT }
     *       400: { description: Validation failed }
     *       401: { description: Invalid email or password }
     *       429: { description: Too many requests }
     */
    this.router.post(
      '/login',
      authLimiter,
      ValidationMiddleware.validate(loginSchema, 'body'),
      new LoginController(new LoginService(UserModel, hasher, sessionIssuer)).handle
    );

    /**
     * @openapi
     * /api/auth/logout:
     *   post:
     *     tags: [Auth]
     *     summary: Sign out and revoke the current session
     *     security:
     *       - bearerAuth: []
     *     responses:
     *       200: { description: Session revoked }
     *       401: { description: Not authenticated }
     */
    this.router.post('/logout', auth.authenticate, new LogoutController(new LogoutService(SessionModel)).handle);

    /**
     * @openapi
     * /api/auth/me:
     *   get:
     *     tags: [Auth]
     *     summary: Get the signed-in user
     *     security:
     *       - bearerAuth: []
     *     responses:
     *       200: { description: The current user }
     *       401: { description: Not authenticated }
     *       404: { description: User no longer exists }
     */
    this.router.get('/me', auth.authenticate, new GetMeController(new GetMeService(UserModel)).handle);
  }
}
