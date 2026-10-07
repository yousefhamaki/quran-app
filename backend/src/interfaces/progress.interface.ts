import { Types } from 'mongoose';
import { AuthenticatedUser } from './auth.interface';
import { UpdateProgressRequestDto } from '../dtos/progress/updateProgressRequest.dto';

export interface IProgress {
  userId: Types.ObjectId | string;
  surah: number;
  ayah: number;
}

export interface ProgressEntity extends IProgress {
  _id: Types.ObjectId | string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface GetProgressServiceInput {
  actor: AuthenticatedUser;
}

export interface UpdateProgressServiceInput {
  actor: AuthenticatedUser;
  body: UpdateProgressRequestDto;
}
