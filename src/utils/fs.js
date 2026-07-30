import fs from 'node:fs/promises';
import path from 'node:path';

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
  await ensureDir(path.dirname(file));
  const tmpFile = `${file}.${process.pid}.tmp`;
  await fs.writeFile(tmpFile, JSON.stringify(data, null, 2));
  await fs.rename(tmpFile, file);
}
