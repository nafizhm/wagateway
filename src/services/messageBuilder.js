import fs from 'node:fs';
import mime from 'mime-types';
import { toWhatsAppJid } from '../utils/phone.js';

function mediaSource(url, filePath) {
  if (url) {
    return { url };
  }

  if (filePath) {
    if (!fs.existsSync(filePath)) {
      throw new Error('File media tidak ditemukan');
    }
    return { url: filePath };
  }

  throw new Error('URL atau path media wajib diisi');
}

export function buildWhatsAppMessage(job) {
  const jid = toWhatsAppJid(job.to);

  if (job.type === 'text') {
    return {
      jid,
      content: { text: job.payload.text }
    };
  }

  if (job.type === 'image') {
    return {
      jid,
      content: {
        image: mediaSource(job.payload.imageUrl, job.payload.imagePath),
        caption: job.payload.caption || undefined
      }
    };
  }

  if (job.type === 'pdf') {
    const fileName = job.payload.fileName || 'document.pdf';
    const mimetype = job.payload.mimetype || mime.lookup(fileName) || 'application/pdf';
    return {
      jid,
      content: {
        document: mediaSource(job.payload.documentUrl, job.payload.documentPath),
        fileName,
        mimetype,
        caption: job.payload.caption || undefined
      }
    };
  }

  throw new Error(`Tipe pesan tidak didukung: ${job.type}`);
}
