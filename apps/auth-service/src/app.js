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
