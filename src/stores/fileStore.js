import path from 'node:path';
import { config } from '../config.js';
import { ensureDir, readJson, writeJsonAtomic } from '../utils/fs.js';

export class FileStore {
  constructor() {
    this.sessionsFile = path.join(config.dataDir, 'sessions.json');
    this.queueFile = path.join(config.dataDir, 'queue.json');
    this.messagesFile = path.join(config.dataDir, 'messages.json');
  }

  async init() {
    await ensureDir(config.dataDir);
    await ensureDir(path.join(config.dataDir, 'sessions'));
    await this.getSessions();
    await this.getQueue();
    await this.getMessages();
  }

  async getSessions() {
    return readJson(this.sessionsFile, {});
  }

  async saveSessions(sessions) {
    await writeJsonAtomic(this.sessionsFile, sessions);
  }

  async upsertSession(clientId, patch) {
    const sessions = await this.getSessions();
    sessions[clientId] = {
      ...(sessions[clientId] || {}),
      ...patch,
      clientId,
      updatedAt: new Date().toISOString()
    };
    await this.saveSessions(sessions);
    return sessions[clientId];
  }

  async deleteSession(clientId) {
    const sessions = await this.getSessions();
    delete sessions[clientId];
    await this.saveSessions(sessions);
  }

  async getQueue() {
    return readJson(this.queueFile, []);
  }

  async saveQueue(queue) {
    await writeJsonAtomic(this.queueFile, queue);
  }

  async getMessages() {
    return readJson(this.messagesFile, {});
  }

  async saveMessages(messages) {
    await writeJsonAtomic(this.messagesFile, messages);
  }

  async upsertMessage(messageId, patch) {
    const messages = await this.getMessages();
    messages[messageId] = {
      ...(messages[messageId] || {}),
      ...patch,
      id: messageId,
      updatedAt: new Date().toISOString()
    };
    await this.saveMessages(messages);
    return messages[messageId];
  }
}

export const store = new FileStore();
