import { readFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { lookupPath } from '../utils';
import type { Postprocessor } from './types';

const candidates = ['.oxfmtrc.json'];

export class Oxfmt implements Postprocessor {
  readonly id = 'oxfmt';
  readonly packageName = 'oxfmt';
  readonly conflicts = ['eslint', 'prettier'];

  private cache: Map<string, Promise<any>> = new Map();

  async apply(source: string, path: string): Promise<string> {
    const { format } = await import('oxfmt');
    const config = await this.#resolveConfig(path);
    const { code, errors } = await format(path, source, config);
    const firstError = errors.filter((e) => e.severity === 'Error').pop();

    if (firstError) {
      throw new Error(firstError.message);
    }

    return code;
  }

  async #resolveConfig(from: string): Promise<any> {
    const dir = dirname(from);
    const cached = this.cache.get(dir);

    if (cached) {
      return cached;
    }

    const { promise, resolve } = Promise.withResolvers<any>();
    this.cache.set(dir, promise);

    const config = await lookupPath(dir, candidates, this.#loadConfig);
    resolve(config);
    return promise;
  }

  #loadConfig = async (file: string): Promise<any> => {
    const contents = await readFile(file, 'utf-8');
    return JSON.parse(contents);
  };
}
