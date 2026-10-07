import { EnvConfig } from '../interfaces/env.interface';
import { AUTH } from '../constants/auth.constants';

export class EnvLoader {
  /** Reads and validates the environment. Fails fast: no fallback secrets. */
  static load(source: NodeJS.ProcessEnv): EnvConfig {
    return {
      nodeEnv: source.NODE_ENV ?? 'development',
      port: Number(source.PORT ?? 4000),
      mongoUri: EnvLoader.required(source, 'MONGO_URI'),
      jwtSecret: EnvLoader.required(source, 'JWT_SECRET'),
      jwtExpiresIn: source.JWT_EXPIRES_IN ?? AUTH.DEFAULT_JWT_EXPIRES_IN,
      corsOrigins: EnvLoader.parseList(source.CORS_ORIGINS)
    };
  }

  static parseList(value: string | undefined): string[] {
    return (value ?? '')
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }

  private static required(source: NodeJS.ProcessEnv, key: string): string {
    const value = source[key];
    if (!value) throw new Error(`Missing required env var ${key}`);
    return value;
  }
}
