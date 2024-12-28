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
    const create = vi.spyOn(Customer, 'create').mockImplementationOnce(async (values) => ({
      toObject: () => ({ _id: 'customer-1', activities: [], ...values }),
    }));

    const response = await request(createApp())
      .post('/customers')
      .set('authorization', authorization)
      .send({
        name: 'Ada',
        company: 'Analytical Engines',
        ownerId: 'attacker',
        activities: [{ text: 'injected' }],
      });

    expect(response.status).toBe(201);
    expect(create).toHaveBeenCalledWith({
      name: 'Ada',
      company: 'Analytical Engines',
      ownerId: 'owner-1',
    });
  });

  it('prevents ownerId and activities injection during updates', async () => {
    const lean = vi.fn().mockResolvedValue({
      _id: 'customer-1',
      name: 'Updated',
      ownerId: 'owner-1',
      activities: [],
    });
