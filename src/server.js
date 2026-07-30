import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { logger } from './logger.js';
import { store } from './stores/fileStore.js';
import { router } from './http/routes.js';
import { errorHandler } from './http/errors.js';
import { sessionManager } from './services/sessionManager.js';
import { queueService } from './services/queueService.js';

const app = express();

app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(router);
app.use(errorHandler);

await store.init();
await sessionManager.restoreAll();
queueService.start();

const server = app.listen(config.port, config.host, () => {
  logger.info({ host: config.host, port: config.port }, 'WA Gateway Service started');
});

async function shutdown(signal) {
  logger.info({ signal }, 'Shutting down');
  queueService.stop();
  server.close(() => process.exit(0));
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
