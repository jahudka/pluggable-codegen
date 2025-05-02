import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import type { File } from './file';

export class Cache {
  readonly #cacheFile?: string;
  #cacheData?: Promise<Map<string, string>>;
  #writeTmr?: ReturnType<typeof setTimeout>;

  constructor(cacheFile?: string) {
    this.#cacheFile = cacheFile;
  }

  async check(
    files: File[],
    output: string,
    mode: 'files' | 'contents' | undefined,
    generate: () => Promise<boolean>,
  ): Promise<void> {
    if (!mode) {
      await generate();
      return;
    }

    const [cacheData, hash] = await Promise.all([
      (this.#cacheData ??= this.#readCacheData()),
      this.#getHash(files, mode),
    ]);

    if (cacheData.get(output) === hash || !(await generate())) {
      return;
    }

    cacheData.set(output, hash);
    clearTimeout(this.#writeTmr);
    this.#writeTmr = setTimeout(() => this.#writeCacheData(cacheData), 250);
  }

  async #getHash(files: File[], mode: 'files' | 'contents'): Promise<string> {
    const hash = createHash('sha256');

    for (const file of files) {
      hash.update(mode === 'files' ? file.localPath : await file.buffer());
    }

    return hash.digest('hex');
  }

  async #readCacheData(): Promise<Map<string, string>> {
    if (!this.#cacheFile) {
      return new Map();
    }

    try {
      const cacheData = await readFile(this.#cacheFile, 'utf-8');
      return new Map(Object.entries(JSON.parse(cacheData)));
    } catch {
      return new Map();
    }
  }

  async #writeCacheData(data: Map<string, string>): Promise<void> {
    if (this.#cacheFile) {
      await writeFile(this.#cacheFile, JSON.stringify(Object.fromEntries(data)));
    }
  }
}
