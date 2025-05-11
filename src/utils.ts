import { createHash } from 'node:crypto';
import { dirname, resolve } from 'node:path';

export async function lookupPath<R>(
  dir: string,
  candidates: string | string[],
  check: (path: string) => Promise<R> | R,
): Promise<R | undefined> {
  if (!Array.isArray(candidates)) {
    candidates = [candidates];
  }

  do {
    for (const candidate of candidates) {
      const path = resolve(dir, candidate);

      try {
        return await check(path);
      } catch {
        // noop
      }
    }
  } while (cdup());

  return undefined;

  function cdup(): boolean {
    const orig = dir;
    dir = dirname(dir);
    return dir !== orig;
  }
}

export function hash(data: Buffer | string): string {
  const hash = createHash('sha256');
  hash.update(data);
  return hash.digest('hex');
}
