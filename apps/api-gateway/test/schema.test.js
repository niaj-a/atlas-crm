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
