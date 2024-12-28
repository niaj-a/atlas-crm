import { afterEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import * as authModule from '../src/auth.js';
import { config } from '../src/config.js';

const originalRateLimitMax = config.authRateLimitMax;
afterEach(() => {
  config.authRateLimitMax = originalRateLimitMax;
  vi.restoreAllMocks();
});

describe('auth-service', () => {
  it('rejects an invalid registration payload', async () => {
    const response = await request(createApp()).post('/register').send({ email: 'bad' });
    expect(response.status).toBe(400);
  });

  it('returns a session for a valid mocked login', async () => {
    vi.spyOn(authModule, 'loginUser').mockResolvedValueOnce({
      token: 'token',
      user: { id: '1', name: 'Ada', email: 'ada@example.com', role: 'sales' },
    });
    const response = await request(createApp())
      .post('/login')
      .send({ email: 'ada@example.com', password: 'password123' });
    expect(response.status).toBe(200);
    expect(response.body.token).toBe('token');
  });

  it('rate limits repeated authentication attempts', async () => {
    config.authRateLimitMax = 2;
    const app = createApp();

    await request(app).post('/login').send({});
    await request(app).post('/login').send({});
    const response = await request(app).post('/login').send({});

    expect(response.status).toBe(429);
    expect(response.headers['retry-after']).toBeDefined();
  });
});
