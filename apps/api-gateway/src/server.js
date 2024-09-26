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
  }),
  express.json({ limit: '200kb' }),
  expressMiddleware(server, {
    context: async ({ req }) => createAuthContext(req.headers.authorization),
  }),
);

const httpServer = app.listen(config.port, () => {
  console.log(`api-gateway listening on :${config.port}/graphql`);
});

let shuttingDown = false;
async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`api-gateway received ${signal}; shutting down`);
  httpServer.close(async () => {
    await server.stop();
    console.log('api-gateway shutdown complete');
    process.exit(0);
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
