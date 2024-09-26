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

  if (response.status === 204) return true;
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const statusMappings = {
      400: 'BAD_USER_INPUT',
      401: 'UNAUTHENTICATED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      409: 'CONFLICT',
      429: 'TOO_MANY_REQUESTS',
    };
    const code = statusMappings[response.status] ?? 'UPSTREAM_SERVICE_ERROR';
    const message =
      response.status >= 500
        ? 'Upstream service error'
        : (payload.message ?? `Upstream service returned ${response.status}`);
    throw upstreamError(message, code, response.status >= 500 ? 502 : response.status);
  }
  return payload;
}

function upstreamError(message, code, status) {
  return new GraphQLError(message, {
    extensions: { code, http: { status } },
  });
}
