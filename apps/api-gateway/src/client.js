import { GraphQLError } from 'graphql';
import { config } from './config.js';

export async function serviceRequest(baseUrl, path, { method = 'GET', token, body } = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.upstreamTimeoutMs);
  let response;

  try {
    response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        'content-type': 'application/json',
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: controller.signal,
    });
  } catch (error) {
    if (error.name === 'AbortError') {
      throw upstreamError('Upstream service timed out', 'GATEWAY_TIMEOUT', 504);
    }
    throw upstreamError('Upstream service is unavailable', 'UPSTREAM_SERVICE_ERROR', 502);
  } finally {
    clearTimeout(timeout);
  }
