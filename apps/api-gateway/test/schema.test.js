import jwt from 'jsonwebtoken';
import { describe, expect, it } from 'vitest';
import { createAuthContext } from '../src/auth-context.js';
import { config } from '../src/config.js';
import { requireUser, typeDefs } from '../src/schema.js';

describe('GraphQL schema', () => {
  it('exposes the CRM customer query', () => {
    expect(typeDefs).toContain('customers(limit: Int, offset: Int): [Customer!]!');
  });

  it('returns a structured unauthenticated error when credentials are missing', () => {
    let error;
    try {
      requireUser({ user: null, authError: null });
    } catch (caught) {
      error = caught;
    }
    expect(error).toMatchObject({
      message: 'Authentication required',
      extensions: expect.objectContaining({ code: 'UNAUTHENTICATED' }),
    });
  });

  it('distinguishes an invalid token and rejects non-HS256 JWTs', () => {
    const token = jwt.sign({ sub: 'user-1' }, config.jwtSecret, { algorithm: 'HS384' });
    const context = createAuthContext(`Bearer ${token}`);

    expect(context.user).toBeNull();
    expect(context.authError).toBe('Invalid or expired token');
    let error;
    try {
      requireUser(context);
    } catch (caught) {
      error = caught;
    }
    expect(error).toMatchObject({
      message: 'Invalid or expired token',
      extensions: expect.objectContaining({ code: 'UNAUTHENTICATED' }),
    });
  });
});
