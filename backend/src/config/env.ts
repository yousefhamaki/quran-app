import dotenv from 'dotenv';
import { EnvLoader } from './envLoader';

dotenv.config();

export const env = EnvLoader.load(process.env);
