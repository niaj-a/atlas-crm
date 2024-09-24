import jwt from 'jsonwebtoken';
import { config } from './config.js';

export function createAuthContext(authorization) {
  const token = authorization?.replace(/^Bearer\s+/i, '');
  if (!token) return { token: null, user: null, authError: null };

  try {
    const payload = jwt.verify(token, config.jwtSecret, { algorithms: ['HS256'] });
    return {
      token,
      user: {
        id: payload.sub,
        email: payload.email,
        role: payload.role,
        name: payload.name ?? payload.email,
      },
      authError: null,
    };
  } catch {
    return {
      token: null,
      user: null,
      authError: 'Invalid or expired token',
    };
  }
}
