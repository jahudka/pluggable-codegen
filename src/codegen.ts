import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import picomatch from 'picomatch';
import { escapePath, glob } from 'tinyglobby';
import { Cache } from './cache';
import { File } from './file';
import { normalizeJobs, normalizeOptions } from './options';
import type { CodegenInput, CodegenJob, CodegenOptions, NormalizedCodegenOptions } from './types';

export class Codegen {
  readonly #options: NormalizedCodegenOptions;
  readonly #cache: Cache;
  readonly #jobs: Map<Matcher, CodegenJob>;
  readonly #running: Map<CodegenJob, AbortController> = new Map();
  #eslint?: Promise<import('eslint').ESLint>;
  #prettier?: Promise<typeof import('prettier')>;

  static async init(...jobs: CodegenInput[]): Promise<Codegen>;
  static async init(options: CodegenOptions, ...jobs: CodegenInput[]): Promise<Codegen>;
  static async init(
    jobOrOptions: CodegenInput | CodegenOptions,
    ...moreJobs: CodegenInput[]
  ): Promise<Codegen>;
  static async init(
    jobOrOptions: CodegenInput | CodegenOptions,
    ...moreJobs: CodegenInput[]
  ): Promise<Codegen> {
    const [options, jobs] =
      typeof jobOrOptions === 'function' || 'input' in jobOrOptions
        ? [undefined, [jobOrOptions, ...moreJobs]]
        : [jobOrOptions, moreJobs];

    const normalizedOptions = await normalizeOptions(options);
    const normalizedJobs = await normalizeJobs(normalizedOptions.rootDir, jobs);
    return new Codegen(normalizedOptions, normalizedJobs);
  }

  private constructor(options: NormalizedCodegenOptions, jobs: CodegenJob[]) {
    this.#options = options;
    this.#cache = new Cache(options.cacheFile);
    this.#jobs = this.#createJobMap(jobs);
  }

  async generateAll(): Promise<void> {
    await Promise.allSettled([...this.#jobs.values()].map(async (job) => this.#generate(job)));
  }

  async generateMatching(path: string): Promise<void> {
    await Promise.allSettled(
      [...this.#jobs].map(async ([match, job]) => {
        if (match(path)) {
          await this.#generate(job);
        }
      }),
    );
  }

  async #generate(job: CodegenJob): Promise<void> {
    this.#running.get(job)?.abort();

    const controller = new AbortController();
    this.#running.set(job, controller);

    const files = await this.#scanFiles(job);

    await this.#cache.check(files, job.output, job.cacheBy, async () => {
      const file = resolve(this.#options.rootDir, job.output);
      let output = await job.generate(files, controller.signal);

      if (output === null) {
        return false;
      }

      if (controller.signal.aborted) {
        return false;
      }

      if (typeof output === 'string' && (job.eslint ?? this.#options.eslint)) {
        output = await this.#applyESLint(output, file);
      }

      if (controller.signal.aborted) {
        return false;
      }

      if (typeof output === 'string' && (job.prettier ?? this.#options.prettier)) {
        output = await this.#applyPrettier(output, file);
      }

      if (controller.signal.aborted) {
        return false;
      }

      try {
        await mkdir(dirname(file), { mode: 0o750, recursive: true });
      } catch {
        // noop
      }

      await writeFile(file, output);
      return true;
    });
  }

  async #scanFiles(job: CodegenJob): Promise<File[]> {
    const files = await glob(job.input, {
      cwd: this.#options.rootDir,
      absolute: true,
    });

    return files.sort().map((path) => new File(path, this.#options.rootDir));
  }

  async #applyESLint(source: string, path: string): Promise<string> {
    const eslint = await this.#loadESLint();
    const [result] = await eslint.lintText(source, {
      filePath: path,
    });

    // if the file is ignored, there will not be a result
    return result?.output ?? source;
  }

  async #applyPrettier(source: string, path: string): Promise<string> {
    const prettier = await this.#loadPrettier();
    const options = await prettier.resolveConfig(path);

    return prettier.format(source, {
      ...(options ?? {}),
      filepath: path,
    });
  }

  async #loadESLint(): Promise<import('eslint').ESLint> {
    return (this.#eslint ??= import('eslint').then(
      ({ ESLint }) =>
        new ESLint({
          fix: true,
        }),
    ));
  }

  async #loadPrettier(): Promise<typeof import('prettier')> {
    return (this.#prettier ??= import('prettier'));
  }

  #createJobMap(jobs: CodegenJob[]): Map<Matcher, CodegenJob> {
    return new Map(jobs.map((job) => [this.#createMatcher(job), job]));
  }

  #createMatcher(job: CodegenJob): Matcher {
    const root = escapePath(this.#options.rootDir);

    return picomatch(
      Array.isArray(job.input)
        ? job.input.map((pattern) => `${root}/${pattern.replace(/^\//, '')}`)
        : `${root}/${job.input.replace(/^\//, '')}`,
    );
  }
}

type Matcher = (path: string) => boolean;
