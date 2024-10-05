import mongoose from 'mongoose';
import { createApp } from './app.js';
import { config } from './config.js';

await mongoose.connect(config.mongoUri);
console.log('crm-service connected to MongoDB');

const httpServer = createApp().listen(config.port, () => {
  console.log(`crm-service listening on :${config.port}`);
});

let shuttingDown = false;
async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`crm-service received ${signal}; shutting down`);
  httpServer.close(async () => {
    await mongoose.disconnect();
    console.log('crm-service shutdown complete');
    process.exit(0);
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
