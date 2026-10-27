import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import picomatch from 'picomatch';
import { escapePath, glob } from 'tinyglobby';
import { Cache } from './cache';
import { File } from './file';
import { normalizeJobs, normalizeOptions } from './options';
import { postprocessors } from './postprocessors';
import type { CodegenInput, CodegenJob, CodegenOptions, NormalizedCodegenOptions } from './types';
import { hash } from './utils';

export class Codegen {
  readonly #options: NormalizedCodegenOptions;
  readonly #cache: Cache;
  readonly #jobs: Map<Matcher, CodegenJob>;
  readonly #running: Map<CodegenJob, AbortController> = new Map();

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
    this.#cache = new Cache(options.rootDir, options.cacheFile);
    this.#jobs = this.#createJobMap(jobs);
  }

  async generateAll(): Promise<boolean> {
    const results = await Promise.all([...this.#jobs.values()].map(this.#generate));
    await this.#cache.flush();
    return results.every((v) => v);
  }

  async generateMatching(path: string): Promise<boolean> {
    const results = await Promise.all(
      [...this.#jobs].map(async ([match, job]) => {
        if (match(path)) {
          await this.#generate(job);
        }
      }),
    );

    await this.#cache.flush();
    return results.every((v) => v);
  }

  readonly #generate = async (job: CodegenJob): Promise<boolean> => {
    this.#running.get(job)?.abort();

    const controller = new AbortController();
    this.#running.set(job, controller);

    const files = await this.#scanFiles(job.input);
    const extraDeps = job.extraDeps?.length ? await this.#scanFiles(job.extraDeps) : [];
    let success = true;

    await this.#cache.check([...files, ...extraDeps], job.output, job.cacheBy, async () => {
      try {
        const file = resolve(this.#options.rootDir, job.output);
        let output = await job.generate(files, controller.signal);

        if (output === null) {
          return undefined;
        }

        if (controller.signal.aborted) {
          return undefined;
        }

        const disabled: Set<string> = new Set();

        for (const postprocessor of postprocessors) {
          if (typeof output !== 'string') {
            break;
          }

          const enabled = job[postprocessor.id] ?? this.#options[postprocessor.id];

          if (!enabled || disabled.has(postprocessor.id)) {
            continue;
          }

          for (const id of postprocessor.conflicts) {
            disabled.add(id);
          }

          output = await postprocessor.apply(output, file);

          if (controller.signal.aborted) {
            return undefined;
          }
        }

        if (controller.signal.aborted) {
          return undefined;
        }

        try {
          await mkdir(dirname(file), { mode: 0o750, recursive: true });
        } catch {
          // noop
        }

        await writeFile(file, output);
        return hash(output);
      } catch (e: any) {
        console.log(`\nError while generating '${job.output}':`);
        console.log(e);
        console.log('');
        success = false;
        return undefined;
      }
    });

    return success;
  };

  async #scanFiles(patterns: string[] | string): Promise<File[]> {
    const files = await glob(patterns, {
      cwd: this.#options.rootDir,
      absolute: true,
    });

    return files.sort().map((path) => new File(path, this.#options.rootDir));
  }

  #createJobMap(jobs: CodegenJob[]): Map<Matcher, CodegenJob> {
    return new Map(jobs.map((job) => [this.#createMatcher(job), job]));
  }

  #createMatcher(job: CodegenJob): Matcher {
    const root = escapePath(this.#options.rootDir);
    const patterns = [job.input, job.extraDeps ?? []];
    return picomatch(patterns.flat().map((pattern) => resolve(root, pattern)));
  }
}

type Matcher = (path: string) => boolean;
