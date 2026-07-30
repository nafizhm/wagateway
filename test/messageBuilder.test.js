import test from 'node:test';
import assert from 'node:assert/strict';
import { buildWhatsAppMessage } from '../src/services/messageBuilder.js';

test('builds text message payload', () => {
  const message = buildWhatsAppMessage({
    type: 'text',
    to: '6281234567890',
    payload: { text: 'Halo' }
  });

  assert.equal(message.jid, '6281234567890@s.whatsapp.net');
  assert.deepEqual(message.content, { text: 'Halo' });
});

test('builds image message payload from URL', () => {
  const message = buildWhatsAppMessage({
    type: 'image',
    to: '6281234567890',
    payload: {
      imageUrl: 'https://example.com/image.jpg',
      caption: 'Foto'
    }
  });

  assert.deepEqual(message.content, {
    image: { url: 'https://example.com/image.jpg' },
    caption: 'Foto'
  });
});

test('builds pdf message payload from URL', () => {
  const message = buildWhatsAppMessage({
    type: 'pdf',
    to: '6281234567890',
    payload: {
      documentUrl: 'https://example.com/file.pdf',
      fileName: 'kwitansi.pdf'
    }
  });

  assert.equal(message.content.fileName, 'kwitansi.pdf');
  assert.equal(message.content.mimetype, 'application/pdf');
  assert.deepEqual(message.content.document, { url: 'https://example.com/file.pdf' });
});
