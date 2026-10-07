export interface EnvConfig {
  nodeEnv: string;
  port: number;
  mongoUri: string;
  jwtSecret: string;
  jwtExpiresIn: string;
  corsOrigins: string[];
}
