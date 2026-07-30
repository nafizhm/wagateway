import fs from 'node:fs/promises';
import path from 'node:path';
import makeWASocket, {
  DisconnectReason,
  fetchLatestBaileysVersion,
  useMultiFileAuthState
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import QRCode from 'qrcode';
import { config } from '../config.js';
import { logger } from '../logger.js';
import { store } from '../stores/fileStore.js';

export class SessionManager {
  constructor() {
    this.sessions = new Map();
  }

  sessionPath(clientId) {
    return path.join(config.dataDir, 'sessions', clientId);
  }

  async restoreAll() {
    const sessions = await store.getSessions();
    const restorableClientIds = Object.values(sessions)
      .filter(session => session.status !== 'logged_out')
      .map(session => session.clientId);

    await Promise.all(restorableClientIds.map(clientId => this.create(clientId)));
  }

  async create(clientId) {
    this.assertClientId(clientId);

    const existing = this.sessions.get(clientId);
    if (existing?.sock) {
      return this.publicSession(clientId, existing);
    }

    const authDir = this.sessionPath(clientId);
    const { state, saveCreds } = await useMultiFileAuthState(authDir);
    const socketOptions = {
      auth: state,
      printQRInTerminal: false,
      markOnlineOnConnect: false,
      syncFullHistory: false
    };

    try {
      const { version } = await fetchLatestBaileysVersion();
      socketOptions.version = version;
    } catch (error) {
      logger.warn({ clientId, error: error.message }, 'Using Baileys bundled WhatsApp version fallback');
    }

    const runtime = {
      clientId,
      status: 'connecting',
      qr: null,
      qrImage: null,
      sock: null,
      createdAt: new Date().toISOString()
    };
    this.sessions.set(clientId, runtime);

    const sock = makeWASocket(socketOptions);
    runtime.sock = sock;

    sock.ev.on('creds.update', saveCreds);
    sock.ev.on('connection.update', update => {
      void this.handleConnectionUpdate(clientId, update);
    });

    await store.upsertSession(clientId, {
      status: 'connecting',
      createdAt: runtime.createdAt,
      authDir
    });

    logger.info({ clientId }, 'Session starting');
    return this.publicSession(clientId, runtime);
  }

  async handleConnectionUpdate(clientId, update) {
    const runtime = this.sessions.get(clientId);
    if (!runtime) {
      return;
    }

    if (update.qr) {
      runtime.qr = update.qr;
      runtime.qrImage = await QRCode.toDataURL(update.qr);
      runtime.status = 'qr';
      await store.upsertSession(clientId, { status: 'qr', lastQrAt: new Date().toISOString() });
    }

    if (update.connection === 'open') {
      runtime.status = 'open';
      runtime.qr = null;
      runtime.qrImage = null;
      const phone = runtime.sock?.user?.id?.split(':')[0]?.replace(/\D/g, '') || null;
      await this.enforceUniquePhone(clientId, phone);
      await store.upsertSession(clientId, {
        status: 'open',
        phone,
        openedAt: new Date().toISOString()
      });
      logger.info({ clientId, phone }, 'Session opened');
    }

    if (update.connection === 'close') {
      const disconnectError = update.lastDisconnect?.error;
      const statusCode = disconnectError instanceof Boom
        ? disconnectError.output?.statusCode
        : new Boom(disconnectError || 'connection closed').output?.statusCode;
      const loggedOut = statusCode === DisconnectReason.loggedOut;
      runtime.status = loggedOut ? 'logged_out' : 'closed';
      await store.upsertSession(clientId, {
        status: runtime.status,
        lastDisconnectReason: statusCode || null,
        closedAt: new Date().toISOString()
      });

      logger.warn({ clientId, statusCode, loggedOut }, 'Session closed');
      this.sessions.delete(clientId);

      if (!loggedOut) {
        setTimeout(() => {
          this.create(clientId).catch(error => {
            logger.error({ clientId, error: error.message }, 'Reconnect failed');
          });
        }, config.reconnectDelayMs);
      }
    }
  }

  async enforceUniquePhone(clientId, phone) {
    if (!phone) {
      return;
    }

    const sessions = await store.getSessions();
    const duplicate = Object.values(sessions).find(session => {
      return session.clientId !== clientId && session.phone === phone && session.status === 'open';
    });

    if (duplicate) {
      logger.error({ clientId, phone, duplicateClientId: duplicate.clientId }, 'Phone number already used by another client');
      await this.logout(clientId);
      throw new Error('Nomor WhatsApp sudah digunakan oleh client lain');
    }
  }

  get(clientId) {
    return this.sessions.get(clientId);
  }

  list() {
    return Array.from(this.sessions.entries()).map(([clientId, session]) => this.publicSession(clientId, session));
  }

  async getQr(clientId) {
    const runtime = this.sessions.get(clientId) || await this.create(clientId);
    return {
      clientId,
      status: runtime.status,
      qr: runtime.qr,
      qrImage: runtime.qrImage
    };
  }

  async logout(clientId) {
    const runtime = this.sessions.get(clientId);
    if (runtime?.sock) {
      await runtime.sock.logout();
      runtime.sock.end?.();
    }
    this.sessions.delete(clientId);
    await store.upsertSession(clientId, { status: 'logged_out', loggedOutAt: new Date().toISOString() });
  }

  async delete(clientId) {
    const runtime = this.sessions.get(clientId);
    if (runtime?.sock) {
      runtime.sock.end?.();
    }
    this.sessions.delete(clientId);
    await fs.rm(this.sessionPath(clientId), { recursive: true, force: true });
    await store.deleteSession(clientId);
  }

  publicSession(clientId, session) {
    return {
      clientId,
      status: session.status,
      hasQr: Boolean(session.qr),
      createdAt: session.createdAt
    };
  }

  assertClientId(clientId) {
    if (!clientId || typeof clientId !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(clientId)) {
      throw new Error('clientId wajib diisi dan hanya boleh berisi huruf, angka, underscore, atau dash');
    }
  }
}

export const sessionManager = new SessionManager();
