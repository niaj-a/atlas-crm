import jwt from 'jsonwebtoken';
import { afterEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { config } from '../src/config.js';
import { Customer } from '../src/customer.model.js';

const authorization = `Bearer ${jwt.sign(
  { sub: 'owner-1', email: 'owner@example.com' },
  config.jwtSecret,
  { algorithm: 'HS256' },
)}`;

afterEach(() => vi.restoreAllMocks());

describe('crm-service', () => {
  it('reports health', async () => {
    const response = await request(createApp()).get('/health');
    expect(response.status).toBe(200);
    expect(response.body.service).toBe('crm');
  });

  it('protects customer routes', async () => {
    const response = await request(createApp()).get('/customers');
    expect(response.status).toBe(401);
  });

  it('allows only writable fields when creating a customer', async () => {
