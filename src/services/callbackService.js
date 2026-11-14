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
export async function sendIncomingCallback(session, message) {
  if (!session.incomingCallbackUrl) {
    return;
  }

  const payload = {
    clientId: session.clientId,
    key: message.key || null,
    message: message.message || null,
    pushName: message.pushName || null,
    messageTimestamp: message.messageTimestamp || null,
    from: message.key?.remoteJid || null,
    sender: message.key?.participant || message.participant || message.key?.remoteJid || null,
    senderName: message.pushName || null
  };

  try {
    await axios.post(session.incomingCallbackUrl, payload, {
      headers: session.incomingCallbackHeaders || {},
      timeout: config.callbackTimeoutMs,
      validateStatus: status => status >= 200 && status < 300
    });
    logger.info({ clientId: session.clientId, incomingCallbackUrl: session.incomingCallbackUrl, messageId: message.key?.id }, 'Incoming callback sent');
  } catch (error) {
    logger.error({ clientId: session.clientId, incomingCallbackUrl: session.incomingCallbackUrl, messageId: message.key?.id, error: error.message }, 'Incoming callback failed');
  }
}