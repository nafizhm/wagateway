import 'dotenv/config';
import path from 'node:path';

const rootDir = process.cwd();

export const config = {
  host: process.env.HOST || '0.0.0.0',
  port: Number(process.env.PORT || 3000),
  dataDir: path.resolve(rootDir, process.env.DATA_DIR || './data'),
  logLevel: process.env.LOG_LEVEL || 'info',
  queuePollIntervalMs: Number(process.env.QUEUE_POLL_INTERVAL_MS || 1000),
  callbackTimeoutMs: Number(process.env.CALLBACK_TIMEOUT_MS || 10000),
  maxRetry: Number(process.env.MAX_RETRY || 3),
  reconnectDelayMs: Number(process.env.SESSION_RECONNECT_DELAY_MS || 5000)
};
