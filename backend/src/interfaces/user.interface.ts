import { Types } from 'mongoose';
import { UserRole } from '../enums/userRole.enum';

export interface IUser {
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  isActive: boolean;
}

/** What a stored user looks like when read back (what DTOs receive). */
export interface UserEntity extends IUser {
  _id: Types.ObjectId | string;
  createdAt?: Date;
  updatedAt?: Date;
}
