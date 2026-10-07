import { randomUUID } from 'crypto';
import { Model } from 'mongoose';
import { ISession } from '../interfaces/session.interface';
import { ISessionIssuer, ITokenService, IssuedSession, SessionIssueInput } from '../interfaces/auth.interface';

/** Shared by login and register: stores the session (jti) and signs the matching token. */
export class SessionIssuer implements ISessionIssuer {
  constructor(
    private readonly sessionModel: Model<ISession>,
    private readonly tokenService: ITokenService,
    private readonly expiresIn: string
  ) {}

  async issue({ user, ip, userAgent }: SessionIssueInput): Promise<IssuedSession> {
    const jti = randomUUID();
    await this.sessionModel.create({ userId: user._id, jti, isActive: true, ip, userAgent });
    const token = this.tokenService.sign({ sub: String(user._id), role: user.role, jti });
    return { token, expiresIn: this.expiresIn };
  }
}
