import { EnvLoader } from '../../src/config/envLoader';

describe('EnvLoader', () => {
  const base = { MONGO_URI: 'mongodb://x/db', JWT_SECRET: 's3cret' };

  describe('load', () => {
    it('reads the values and applies defaults', () => {
      const env = EnvLoader.load(base);
      expect(env).toEqual({
        nodeEnv: 'development',
        port: 4000,
        mongoUri: 'mongodb://x/db',
        jwtSecret: 's3cret',
        jwtExpiresIn: '24h',
        corsOrigins: []
      });
    });

    it('honours explicit PORT, JWT_EXPIRES_IN, NODE_ENV and CORS_ORIGINS', () => {
      const env = EnvLoader.load({
        ...base,
        PORT: '5000',
        JWT_EXPIRES_IN: '1h',
        NODE_ENV: 'production',
        CORS_ORIGINS: 'http://a.com, http://b.com'
      });
      expect(env.port).toBe(5000);
      expect(env.jwtExpiresIn).toBe('1h');
      expect(env.nodeEnv).toBe('production');
      expect(env.corsOrigins).toEqual(['http://a.com', 'http://b.com']);
    });

    it('fails fast when JWT_SECRET is missing', () => {
      expect(() => EnvLoader.load({ MONGO_URI: 'mongodb://x/db' })).toThrow('Missing required env var JWT_SECRET');
    });

    it('fails fast when MONGO_URI is missing', () => {
      expect(() => EnvLoader.load({ JWT_SECRET: 's' })).toThrow('Missing required env var MONGO_URI');
    });
  });

  describe('parseList', () => {
    it('splits, trims and drops empty entries', () => {
      expect(EnvLoader.parseList(' a , ,b,')).toEqual(['a', 'b']);
    });

    it('returns an empty list for undefined', () => {
      expect(EnvLoader.parseList(undefined)).toEqual([]);
    });
  });
});
