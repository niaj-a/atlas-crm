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
