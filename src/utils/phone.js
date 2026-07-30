export function toWhatsAppJid(to) {
  if (!to || typeof to !== 'string') {
    throw new Error('Nomor tujuan wajib diisi');
  }

  const trimmed = to.trim();
  if (trimmed.endsWith('@s.whatsapp.net') || trimmed.endsWith('@g.us')) {
    return trimmed;
  }

  const digits = trimmed.replace(/\D/g, '');
  if (digits.length < 8) {
    throw new Error('Nomor tujuan tidak valid');
  }

  return `${digits}@s.whatsapp.net`;
}

export function normalizePhone(to) {
  return toWhatsAppJid(to).replace('@s.whatsapp.net', '');
}
