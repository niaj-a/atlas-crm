import { afterEach, describe, expect, it, vi } from 'vitest';
import { serviceRequest } from '../src/client.js';
import { config } from '../src/config.js';

const originalTimeout = config.upstreamTimeoutMs;

afterEach(() => {
  config.upstreamTimeoutMs = originalTimeout;
  vi.unstubAllGlobals();
});

describe('serviceRequest', () => {
  it('maps upstream authentication failures', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        status: 401,
        ok: false,
        json: vi.fn().mockResolvedValue({ message: 'Invalid token' }),
      }),
    );

    await expect(serviceRequest('http://service', '/resource')).rejects.toMatchObject({
      message: 'Invalid token',
      extensions: expect.objectContaining({ code: 'UNAUTHENTICATED' }),
