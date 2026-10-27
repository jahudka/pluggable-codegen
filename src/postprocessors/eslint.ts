import type { ESLint as Linter } from 'eslint';
import type { Postprocessor } from './types';

export class ESLint implements Postprocessor {
  readonly id = 'eslint';
  readonly packageName = 'eslint';
  readonly conflicts = [];

  #linter?: Promise<Linter>;

  async apply(source: string, path: string): Promise<string> {
    const linter = await this.#getLinter();
    const [result] = await linter.lintText(source, {
      filePath: path,
    });

    // if the file is ignored, there will not be a result
    return result?.output ?? source;
  }

  #getLinter(): Promise<Linter> {
    return (this.#linter ??= this.#loadLinter());
  }

  async #loadLinter(): Promise<Linter> {
    const { ESLint: Linter } = await import('eslint');
    return new Linter({ fix: true });
  }
}
