import { Types } from 'mongoose';
import { Language } from '../enums/language.enum';
import { AuthenticatedUser } from './auth.interface';
import { UpdatePreferencesRequestDto } from '../dtos/preferences/updatePreferencesRequest.dto';

export interface PreferenceValues {
  lang: Language;
  reciter: string;
  tafsirId: number;
  speed: number;
  fontSize: number;
  showTranslation: boolean;
  continuous: boolean;
}

export interface IPreferences extends PreferenceValues {
  userId: Types.ObjectId | string;
}

export interface PreferencesEntity extends IPreferences {
  _id: Types.ObjectId | string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface GetPreferencesServiceInput {
  actor: AuthenticatedUser;
}

export interface UpdatePreferencesServiceInput {
  actor: AuthenticatedUser;
  body: UpdatePreferencesRequestDto;
}
