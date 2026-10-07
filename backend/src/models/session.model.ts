import { Schema, model } from 'mongoose';
import { ISession } from '../interfaces/session.interface';

const sessionSchema = new Schema<ISession>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    jti: { type: String, required: true, unique: true },
    isActive: { type: Boolean, default: true },
    ip: { type: String },
    userAgent: { type: String },
    loggedOutAt: { type: Date }
  },
  { timestamps: true }
);

export const SessionModel = model<ISession>('Session', sessionSchema);
