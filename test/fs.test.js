import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { writeJsonAtomic } from '../src/utils/fs.js';

test('writes JSON atomically during concurrent writes', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'wa-gateway-fs-'));
  const file = path.join(dir, 'data.json');

  await Promise.all(Array.from({ length: 20 }, (_, index) => {
    return writeJsonAtomic(file, { index });
  }));

  const raw = await fs.readFile(file, 'utf8');
  const parsed = JSON.parse(raw);

  assert.equal(typeof parsed.index, 'number');

  const entries = await fs.readdir(dir);
  assert.deepEqual(entries, ['data.json']);
});
