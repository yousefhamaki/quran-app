import { RequestHandler } from 'express';
import { UserRole } from '../enums/userRole.enum';
import { UserEntity } from './user.interface';
import { LoginRequestDto } from '../dtos/auth/loginRequest.dto';
import { RegisterRequestDto } from '../dtos/auth/registerRequest.dto';
import { AuthMiddleware } from '../middleware/auth.middleware';

export interface AuthenticatedUser {
  id: string;
  role: UserRole;
  jti: string;
}

export interface TokenPayload {
  sub: string;
  role: UserRole;
  jti: string;
}

export interface ITokenService {
  sign(payload: TokenPayload): string;
  verify(token: string): TokenPayload;
}

export interface IPasswordHasher {
  hash(plain: string): Promise<string>;
  compare(plain: string, hash: string): Promise<boolean>;
}

export interface IssuedSession {
  token: string;
  expiresIn: string;
}

export interface SessionIssueInput {
  user: UserEntity;
  ip?: string;
  userAgent?: string;
}

/** Creates a session row (jti) and signs the token that references it. */
export interface ISessionIssuer {
  issue(input: SessionIssueInput): Promise<IssuedSession>;
}

export interface LoginServiceInput {
  body: LoginRequestDto;
  ip?: string;
  userAgent?: string;
}

export interface RegisterServiceInput {
  body: RegisterRequestDto;
  ip?: string;
  userAgent?: string;
}

export interface LogoutServiceInput {
  userId: string;
  jti: string;
}

export interface GetMeServiceInput {
  userId: string;
}

export interface ApiRouterDeps {
  auth: AuthMiddleware;
  tokenService: ITokenService;
  jwtExpiresIn: string;
  authLimiter: RequestHandler;
}
