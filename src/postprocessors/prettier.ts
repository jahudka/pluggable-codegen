import type { Postprocessor } from './types';

export class Prettier implements Postprocessor {
  readonly id = 'prettier';
  readonly packageName = 'prettier';
  readonly conflicts = [];

  async apply(source: string, path: string): Promise<string> {
    const { resolveConfig, format } = await import('prettier');
    const options = await resolveConfig(path);

    return format(source, {
      ...(options ?? {}),
      filepath: path,
    });
  }
}
