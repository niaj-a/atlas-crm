import 'dotenv/config';

const DEFAULT_JWT_SECRET = 'dev-only-change-me';
const jwtSecret = process.env.JWT_SECRET ?? DEFAULT_JWT_SECRET;

if (
  process.env.NODE_ENV === 'production' &&
  (jwtSecret === DEFAULT_JWT_SECRET || jwtSecret.length < 32)
) {
  throw new Error('JWT_SECRET must be a non-default value of at least 32 characters in production');
}

export const config = {
  port: Number(process.env.PORT ?? 4001),
  mongoUri: process.env.MONGO_URI ?? 'mongodb://localhost:27017/crm-auth',
  jwtSecret,
  authRateLimitWindowMs: Number(process.env.AUTH_RATE_LIMIT_WINDOW_MS ?? 60_000),
  authRateLimitMax: Number(process.env.AUTH_RATE_LIMIT_MAX ?? 20),
};
