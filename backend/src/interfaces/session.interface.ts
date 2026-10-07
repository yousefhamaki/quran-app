import { Types } from 'mongoose';

export interface ISession {
  userId: Types.ObjectId | string;
  jti: string;
  isActive: boolean;
  ip?: string;
  userAgent?: string;
  loggedOutAt?: Date;
}
