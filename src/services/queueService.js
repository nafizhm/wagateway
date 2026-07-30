import { v4 as uuidv4 } from 'uuid';
import { config } from '../config.js';
import { logger } from '../logger.js';
import { store } from '../stores/fileStore.js';
import { buildWhatsAppMessage } from './messageBuilder.js';
import { sendCallback } from './callbackService.js';
import { sessionManager } from './sessionManager.js';
import { normalizePhone } from '../utils/phone.js';

export class QueueService {
  constructor() {
    this.running = false;
    this.timer = null;
  }

  start() {
    if (this.timer) {
      return;
    }

    this.timer = setInterval(() => {
      this.processNext().catch(error => {
        logger.error({ error: error.message }, 'Queue processing crashed');
      });
    }, config.queuePollIntervalMs);

    void this.processNext();
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  async enqueue(input) {
    const job = this.createJob(input);
    const queue = await store.getQueue();
    queue.push(job);
    await store.saveQueue(queue);
    await store.upsertMessage(job.id, job);
    logger.info({ messageId: job.id, clientId: job.clientId, type: job.type }, 'Message queued');
    return job;
  }

  createJob(input) {
    if (!input.clientId) {
      throw new Error('clientId wajib diisi');
    }
    if (!input.to) {
      throw new Error('Nomor tujuan wajib diisi');
    }

    return {
      id: uuidv4(),
      clientId: input.clientId,
      to: normalizePhone(input.to),
      type: input.type,
      payload: input.payload,
      callbackUrl: input.callbackUrl || null,
      status: 'queued',
      attempts: 0,
      maxRetry: config.maxRetry,
      error: null,
      queuedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  async processNext() {
    if (this.running) {
      return;
    }

    this.running = true;
    try {
      const queue = await store.getQueue();
      const index = queue.findIndex(job => job.status === 'queued' || job.status === 'retrying');
      if (index === -1) {
        return;
      }

      const [job] = queue.splice(index, 1);
      job.status = 'processing';
      job.attempts += 1;
      job.updatedAt = new Date().toISOString();
      await store.saveQueue(queue);
      await store.upsertMessage(job.id, job);

      await this.send(job);
    } finally {
      this.running = false;
    }
  }

  async send(job) {
    try {
      const session = sessionManager.get(job.clientId);
      if (!session?.sock || session.status !== 'open') {
        throw new Error('Session belum terhubung');
      }

      const message = buildWhatsAppMessage(job);
      const result = await session.sock.sendMessage(message.jid, message.content);
      job.status = 'sent';
      job.error = null;
      job.providerMessageId = result?.key?.id || null;
      job.sentAt = new Date().toISOString();
      job.updatedAt = new Date().toISOString();

      await store.upsertMessage(job.id, job);
      logger.info({ messageId: job.id, clientId: job.clientId, attempts: job.attempts }, 'Message sent');
      await sendCallback(job);
    } catch (error) {
      await this.handleFailure(job, error);
    }
  }

  async handleFailure(job, error) {
    job.error = error.message;
    job.updatedAt = new Date().toISOString();

    if (job.attempts < job.maxRetry) {
      job.status = 'retrying';
      const queue = await store.getQueue();
      queue.push(job);
      await store.saveQueue(queue);
      await store.upsertMessage(job.id, job);
      logger.warn({ messageId: job.id, attempts: job.attempts, error: job.error }, 'Message scheduled for retry');
      return;
    }

    job.status = 'failed';
    job.failedAt = new Date().toISOString();
    await store.upsertMessage(job.id, job);
    logger.error({ messageId: job.id, attempts: job.attempts, error: job.error }, 'Message permanently failed');
    await sendCallback(job);
  }

  async listQueue() {
    return store.getQueue();
  }

  async findMessage(messageId) {
    const messages = await store.getMessages();
    return messages[messageId] || null;
  }
}

export const queueService = new QueueService();
