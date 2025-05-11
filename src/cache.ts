import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { File } from './file';
import { hash } from './utils';

type CacheEntry = {
  output: string;
  source: string;
};

export class Cache {
  readonly #rootDir: string;
  readonly #cacheFile?: string;
  #cacheData?: Promise<Map<string, CacheEntry>>;
  #writeTmr?: ReturnType<typeof setTimeout>;

  constructor(rootDir: string, cacheFile?: string) {
    this.#rootDir = rootDir;
    this.#cacheFile = cacheFile;
  }

  async check(
    files: File[],
    output: string,
    mode: 'files' | 'contents' | undefined,
    generate: () => Promise<string | undefined>,
  ): Promise<void> {
    if (!mode) {
      await generate();
      return;
    }

    const [cacheData, sourceHash, outputHash] = await Promise.all([
      (this.#cacheData ??= this.#readCacheData()),
      this.#getSourceHash(files, mode),
      this.#getOutputHash(resolve(this.#rootDir, output)),
    ]);

    const entry = cacheData.get(output);

    if (!entry || entry.source !== sourceHash || entry.output !== outputHash) {
      return;
    }

    const newHash = await generate();

    if (newHash === undefined) {
      return;
    }

    cacheData.set(output, {
      source: sourceHash,
      output: newHash,
    });

    clearTimeout(this.#writeTmr);
    this.#writeTmr = setTimeout(() => this.#writeCacheData(cacheData), 250);
  }

  async #getSourceHash(files: File[], mode: 'files' | 'contents'): Promise<string> {
    const hash = createHash('sha256');

    for (const file of files) {
      hash.update(mode === 'files' ? file.localPath : await file.buffer());
    }

    return hash.digest('hex');
  }

  async #getOutputHash(file: string): Promise<string | undefined> {
    try {
      return hash(await readFile(file));
    } catch {
      return undefined;
    }
  }

  async #readCacheData(): Promise<Map<string, CacheEntry>> {
    if (!this.#cacheFile) {
      return new Map();
    }

    try {
      const rawData = JSON.parse(await readFile(this.#cacheFile, 'utf-8'));
      const cacheData: Map<string, CacheEntry> = new Map();

      if (!isObject(rawData)) {
        return cacheData;
      }

      for (const [key, value] of Object.entries(rawData)) {
        if (!isObject(value) || !isValidEntry(value)) {
          continue;
        }

        cacheData.set(key, value);
      }

      return cacheData;
    } catch {
      return new Map();
    }
  }

  async #writeCacheData(data: Map<string, CacheEntry>): Promise<void> {
    if (this.#cacheFile) {
      await writeFile(this.#cacheFile, JSON.stringify(Object.fromEntries(data)));
    }
  }
}

function isObject(v: unknown): v is object {
  return !!v && typeof v === 'object' && Object.getPrototypeOf(v) === Object.prototype;
}

function isValidEntry(v: object): v is CacheEntry {
  return (
    Object.keys(v).length === 2 &&
    'source' in v &&
    typeof v.source === 'string' &&
    'output' in v &&
    typeof v.output === 'string'
  );
}
