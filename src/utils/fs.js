import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

const writeLocks = new Map();

export async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

export async function readJson(file, fallback) {
  try {
    const raw = await fs.readFile(file, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return fallback;
    }
    if (error instanceof SyntaxError) {
      const backupFile = `${file}.corrupt-${Date.now()}`;
      await fs.rename(file, backupFile);
      return fallback;
    }
    throw error;
  }
}

export async function writeJsonAtomic(file, data) {
  const previous = writeLocks.get(file) || Promise.resolve();
  const current = previous.catch(() => {}).then(() => writeJsonAtomicNow(file, data));

  writeLocks.set(file, current);

  try {
    await current;
  } finally {
    if (writeLocks.get(file) === current) {
      writeLocks.delete(file);
    }
  }
}

async function writeJsonAtomicNow(file, data) {
  await ensureDir(path.dirname(file));
  const tmpFile = `${file}.${process.pid}.${randomUUID()}.tmp`;
  await fs.writeFile(tmpFile, JSON.stringify(data, null, 2));
  await fs.rename(tmpFile, file);
}
