import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@as-integrations/express4';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { config } from './config.js';
import { createAuthContext } from './auth-context.js';
import { resolvers, typeDefs } from './schema.js';

const app = express();
app.use(helmet({ contentSecurityPolicy: false }));
app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'api-gateway' }));

const server = new ApolloServer({ schema: makeExecutableSchema({ typeDefs, resolvers }) });
await server.start();

app.use(
  '/graphql',
  cors({
    credentials: false,
    origin(origin, callback) {
      if (!origin || config.allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error('Origin not allowed by CORS'));
    },
