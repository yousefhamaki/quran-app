import { Schema, model } from 'mongoose';
import { IUser } from '../interfaces/user.interface';
import { UserRole } from '../enums/userRole.enum';

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: Object.values(UserRole), default: UserRole.USER },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

export const UserModel = model<IUser>('User', userSchema);
