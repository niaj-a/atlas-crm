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
    });
  });

  it('times out slow upstream requests', async () => {
    config.upstreamTimeoutMs = 5;
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_url, { signal }) =>
          new Promise((_resolve, reject) => {
            signal.addEventListener('abort', () => {
              const error = new Error('aborted');
              error.name = 'AbortError';
              reject(error);
            });
          }),
      ),
    );

    await expect(serviceRequest('http://service', '/resource')).rejects.toMatchObject({
      message: 'Upstream service timed out',
      extensions: expect.objectContaining({ code: 'GATEWAY_TIMEOUT' }),
    });
  });
});
