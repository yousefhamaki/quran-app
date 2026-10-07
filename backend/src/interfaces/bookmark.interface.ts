import { Types } from 'mongoose';
import { AuthenticatedUser } from './auth.interface';
import { CreateBookmarkRequestDto } from '../dtos/bookmarks/createBookmarkRequest.dto';

export interface IBookmark {
  userId: Types.ObjectId | string;
  surah: number;
  ayah: number;
  note?: string;
}

export interface BookmarkEntity extends IBookmark {
  _id: Types.ObjectId | string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ListBookmarksServiceInput {
  actor: AuthenticatedUser;
}

export interface CreateBookmarkServiceInput {
  actor: AuthenticatedUser;
  body: CreateBookmarkRequestDto;
}

export interface DeleteBookmarkServiceInput {
  actor: AuthenticatedUser;
  id: string;
}
