import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizePhone, toWhatsAppJid } from '../src/utils/phone.js';

test('normalizes Indonesian phone number to WhatsApp JID', () => {
  assert.equal(toWhatsAppJid('+62 812-3456-7890'), '6281234567890@s.whatsapp.net');
  assert.equal(normalizePhone('+62 812-3456-7890'), '6281234567890');
});

test('keeps existing WhatsApp JID', () => {
  assert.equal(toWhatsAppJid('6281234567890@s.whatsapp.net'), '6281234567890@s.whatsapp.net');
});

test('rejects short phone number', () => {
  assert.throws(() => toWhatsAppJid('123'), /tidak valid/);
});
