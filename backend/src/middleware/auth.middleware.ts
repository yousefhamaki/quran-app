import { Request, Response, NextFunction, RequestHandler } from 'express';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import { Model } from 'mongoose';
import { ITokenService } from '../interfaces/auth.interface';
import { ISession } from '../interfaces/session.interface';
import { AuthenticationError } from '../errors/AuthenticationError';
import { ForbiddenError } from '../errors/ForbiddenError';
import { UserRole } from '../enums/userRole.enum';

export class AuthMiddleware {
  constructor(
    private readonly tokenService: ITokenService,
    private readonly sessionModel: Model<ISession>
  ) {}

  authenticate = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return next(new AuthenticationError('Missing or invalid Authorization header'));
    }

    try {
      const payload = this.tokenService.verify(header.substring(7).trim());
      if (!payload.sub || !payload.jti) {
        return next(new AuthenticationError('Malformed token payload'));
      }

      // The session check is what makes logout / revoke actually work.
      const session = await this.sessionModel.findOne({ jti: payload.jti, userId: payload.sub, isActive: true });
      if (!session) {
        return next(new AuthenticationError('Session is invalid or has been logged out'));
      }

      req.user = { id: payload.sub, role: payload.role, jti: payload.jti };
      next();
    } catch (error) {
      if (error instanceof TokenExpiredError) return next(new AuthenticationError('Token has expired'));
      if (error instanceof JsonWebTokenError) return next(new AuthenticationError('Invalid token'));
      next(error);
    }
  };

  static authorize(...roles: UserRole[]): RequestHandler {
    return (req, _res, next) => {
      if (!req.user) return next(new AuthenticationError());
      if (!roles.includes(req.user.role)) return next(new ForbiddenError('You do not have access to this resource'));
      next();
    };
  }
}
