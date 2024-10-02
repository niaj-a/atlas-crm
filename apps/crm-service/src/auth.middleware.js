import jwt from 'jsonwebtoken';
import { config } from './config.js';

export function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ message: 'Missing bearer token' });

  try {
    req.user = jwt.verify(token, config.jwtSecret, { algorithms: ['HS256'] });
    next();
  } catch {
    res.status(401).json({ message: 'Invalid or expired token' });
  }
}
