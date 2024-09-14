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
  port: Number(process.env.PORT ?? 4000),
  jwtSecret,
  authServiceUrl: process.env.AUTH_SERVICE_URL ?? 'http://localhost:4001',
  crmServiceUrl: process.env.CRM_SERVICE_URL ?? 'http://localhost:4002',
  allowedOrigins: (
    process.env.CORS_ORIGINS ??
    process.env.ALLOWED_ORIGINS ??
    'http://localhost:5173,http://localhost:8080'
  )
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  upstreamTimeoutMs: Number(process.env.UPSTREAM_TIMEOUT_MS ?? 5000),
};
