import jwt, { SignOptions } from 'jsonwebtoken';
import { ITokenService, TokenPayload } from '../interfaces/auth.interface';

export class JwtTokenService implements ITokenService {
  constructor(
    private readonly secret: string,
    private readonly expiresIn: string
  ) {
    if (!secret) throw new Error('JWT secret is required');
  }

  sign(payload: TokenPayload): string {
    return jwt.sign(payload, this.secret, { expiresIn: this.expiresIn } as SignOptions);
  }

  verify(token: string): TokenPayload {
    return jwt.verify(token, this.secret) as TokenPayload;
  }
}
