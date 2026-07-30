import axios from 'axios';
import { config } from '../config.js';
import { logger } from '../logger.js';

export async function sendCallback(job) {
  if (!job.callbackUrl) {
    return;
  }

  const payload = {
    messageId: job.id,
    clientId: job.clientId,
    to: job.to,
    type: job.type,
    status: job.status,
    attempts: job.attempts,
    error: job.error || null,
    sentAt: job.sentAt || null,
    failedAt: job.failedAt || null
  };

  try {
    await axios.post(job.callbackUrl, payload, {
      timeout: config.callbackTimeoutMs,
      validateStatus: status => status >= 200 && status < 300
    });
    logger.info({ messageId: job.id, callbackUrl: job.callbackUrl }, 'Callback sent');
  } catch (error) {
    logger.error({ messageId: job.id, callbackUrl: job.callbackUrl, error: error.message }, 'Callback failed');
  }
}
