import express from 'express';
import helmet from 'helmet';
import { body, validationResult } from 'express-validator';
import { loginUser, registerUser } from './auth.js';
import { config } from './config.js';

export function createApp() {
  const app = express();
  app.use(helmet());
  app.use(express.json({ limit: '100kb' }));

  app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'auth' }));

  app.use(
    ['/register', '/login'],
    createRateLimiter({
      max: config.authRateLimitMax,
      windowMs: config.authRateLimitWindowMs,
    }),
  );

  app.post(
    '/register',
    body('name').isString().trim().isLength({ min: 2, max: 80 }),
    body('email').isString().isEmail().normalizeEmail(),
    body('password').isString().isLength({ min: 8, max: 128 }),
    async (req, res, next) => {
      try {
        assertValid(req);
        res.status(201).json(await registerUser(req.body));
      } catch (error) {
        next(error);
      }
    },
  );

  app.post(
    '/login',
    body('email').isString().isEmail().normalizeEmail(),
    body('password').isString().notEmpty(),
    async (req, res, next) => {
      try {
        assertValid(req);
        res.json(await loginUser(req.body));
      } catch (error) {
        next(error);
      }
    },
  );

  app.use((error, _req, res, _next) => {
    const status = error.status ?? 500;
    res.status(status).json({ message: status >= 500 ? 'Internal server error' : error.message });
  });

  return app;
}

function assertValid(req) {
  const result = validationResult(req);
  if (!result.isEmpty()) {
    const error = new Error('Invalid request');
    error.status = 400;
    error.details = result.array();
    throw error;
  }
}

function createRateLimiter({ max, windowMs }) {
  const clients = new Map();

  return (req, res, next) => {
    const now = Date.now();
    const key = `${req.ip}:${req.path}`;
    let entry = clients.get(key);

    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowMs };
      clients.set(key, entry);
    }

    entry.count += 1;
    if (entry.count > max) {
      res.set('Retry-After', String(Math.ceil((entry.resetAt - now) / 1000)));
      return res.status(429).json({ message: 'Too many authentication attempts' });
    }

    if (clients.size > 1000) {
      for (const [clientKey, value] of clients) {
        if (value.resetAt <= now) clients.delete(clientKey);
      }
    }
    next();
  };
}
