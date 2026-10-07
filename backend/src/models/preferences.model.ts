import { Schema, model } from 'mongoose';
import { IPreferences } from '../interfaces/preferences.interface';
import { Language } from '../enums/language.enum';
import { DEFAULT_PREFERENCES, PREFERENCE_LIMITS } from '../constants/preferences.constants';

const preferencesSchema = new Schema<IPreferences>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    lang: { type: String, enum: Object.values(Language), default: DEFAULT_PREFERENCES.lang },
    reciter: { type: String, default: DEFAULT_PREFERENCES.reciter },
    tafsirId: { type: Number, default: DEFAULT_PREFERENCES.tafsirId },
    speed: {
      type: Number,
      min: PREFERENCE_LIMITS.MIN_SPEED,
      max: PREFERENCE_LIMITS.MAX_SPEED,
      default: DEFAULT_PREFERENCES.speed
    },
    fontSize: {
      type: Number,
      min: PREFERENCE_LIMITS.MIN_FONT_SIZE,
      max: PREFERENCE_LIMITS.MAX_FONT_SIZE,
      default: DEFAULT_PREFERENCES.fontSize
    },
    showTranslation: { type: Boolean, default: DEFAULT_PREFERENCES.showTranslation },
    continuous: { type: Boolean, default: DEFAULT_PREFERENCES.continuous }
  },
  { timestamps: true }
);

export const PreferencesModel = model<IPreferences>('Preferences', preferencesSchema);
