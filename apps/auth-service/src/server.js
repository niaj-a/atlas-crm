import mongoose from 'mongoose';
import { createApp } from './app.js';
import { config } from './config.js';

await mongoose.connect(config.mongoUri);
console.log('auth-service connected to MongoDB');

const httpServer = createApp().listen(config.port, () => {
  console.log(`auth-service listening on :${config.port}`);
});

let shuttingDown = false;
async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`auth-service received ${signal}; shutting down`);
  httpServer.close(async () => {
    await mongoose.disconnect();
    console.log('auth-service shutdown complete');
    process.exit(0);
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
