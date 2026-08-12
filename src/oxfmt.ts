import { readFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { lookupPath } from './utils';

const candidates = ['.oxfmtrc.json'];
const cache: Map<string, Promise<any>> = new Map();

export async function resolveOxfmtConfig(from: string): Promise<any> {
  const dir = dirname(from);
  const cached = cache.get(dir);

  if (cached) {
    return cached;
  }

  const { promise, resolve } = Promise.withResolvers<any>();
  cache.set(dir, promise);

  const config = await lookupPath(dir, candidates, loadConfig);
  resolve(config);
  return promise;
}

async function loadConfig(file: string): Promise<any> {
  const contents = await readFile(file, 'utf-8');
  return JSON.parse(contents);
}
