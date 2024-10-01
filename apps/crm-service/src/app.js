import express from 'express';
import helmet from 'helmet';
import { body, query, validationResult } from 'express-validator';
import { ACTIVITY_TYPES, CUSTOMER_STATUSES, MAX_CUSTOMER_ACTIVITIES } from '@crm/shared';
import { requireAuth } from './auth.middleware.js';
import { Customer } from './customer.model.js';

const CUSTOMER_FIELDS = ['name', 'email', 'company', 'phone', 'status'];
const ACTIVITY_FIELDS = ['type', 'text'];

export function createApp() {
  const app = express();
  app.use(helmet());
  app.use(express.json({ limit: '200kb' }));
  app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'crm' }));
  app.use('/customers', requireAuth);

  app.get(
    '/customers',
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('offset').optional().isInt({ min: 0, max: 10000 }).toInt(),
    async (req, res, next) => {
      try {
        assertValid(req);
        let customerQuery = Customer.find({ ownerId: req.user.sub }).sort({ createdAt: -1 });
        if (req.query.offset !== undefined) customerQuery = customerQuery.skip(req.query.offset);
        if (req.query.limit !== undefined) customerQuery = customerQuery.limit(req.query.limit);
        const customers = await customerQuery.lean();
        res.json(customers.map(normalizeCustomer));
      } catch (error) {
        next(error);
      }
    },
  );

  app.post(
    '/customers',
    body('name').isString().trim().isLength({ min: 1, max: 120 }),
    body('email')
      .optional({ nullable: true })
      .isString()
      .if((value) => value !== '')
      .isEmail()
      .normalizeEmail(),
    body('company').optional({ nullable: true }).isString().trim().isLength({ max: 120 }),
    body('phone').optional({ nullable: true }).isString().trim().isLength({ max: 40 }),
    body('status').optional().isString().isIn(CUSTOMER_STATUSES),
    async (req, res, next) => {
      try {
        assertValid(req);
        const customer = await Customer.create({
          ...pick(req.body, CUSTOMER_FIELDS),
          ownerId: req.user.sub,
        });
        res.status(201).json(normalizeCustomer(customer.toObject()));
      } catch (error) {
        next(error);
      }
    },
  );

  app.put(
    '/customers/:id',
    body('name').optional().isString().trim().isLength({ min: 1, max: 120 }),
    body('email')
      .optional({ nullable: true })
      .isString()
      .if((value) => value !== '')
      .isEmail()
      .normalizeEmail(),
    body('company').optional({ nullable: true }).isString().trim().isLength({ max: 120 }),
    body('phone').optional({ nullable: true }).isString().trim().isLength({ max: 40 }),
    body('status').optional().isString().isIn(CUSTOMER_STATUSES),
    async (req, res, next) => {
      try {
        assertValid(req);
        const customer = await Customer.findOneAndUpdate(
          { _id: req.params.id, ownerId: req.user.sub },
          { $set: pick(req.body, CUSTOMER_FIELDS) },
          { new: true, runValidators: true },
        ).lean();
