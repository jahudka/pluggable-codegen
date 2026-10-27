import type { File } from './file';
import type { PostprocessorOptions } from './postprocessors';

export type MaybePromise<T> = Promise<T> | T;

export type CodegenOptions = Partial<PostprocessorOptions> & {
  rootDir?: string;
  cacheFile?: string | false;
};

export type NormalizedCodegenOptions = PostprocessorOptions & {
  rootDir: string;
  cacheFile?: string;
};

export type CodegenJob = Partial<PostprocessorOptions> & {
  input: string | string[];
  output: string;
  generate: (files: File[], signal: AbortSignal) => MaybePromise<Buffer | string | null>;
  cacheBy?: 'files' | 'contents';
  extraDeps?: string[];
};

export type CodegenJobGenerator = (rootDir: string) => MaybePromise<CodegenJob[] | CodegenJob>;

export type CodegenInput = CodegenJobGenerator | CodegenJob;

export type CodegenPresetOptions = Omit<CodegenJob, 'input' | 'output' | 'generate'>;

export function defineCodegen(
  job: CodegenInput,
  ...jobs: CodegenInput[]
): [CodegenInput, ...CodegenInput[]];
export function defineCodegen(
  options: CodegenOptions,
  ...jobs: CodegenInput[]
): [CodegenOptions, ...CodegenInput[]];
export function defineCodegen(
  optionsOrJob: CodegenOptions | CodegenInput,
  ...jobs: CodegenInput[]
): [CodegenOptions | CodegenInput, ...CodegenInput[]];
export function defineCodegen(
  optionsOrJob: CodegenOptions | CodegenInput,
  ...jobs: CodegenInput[]
): [CodegenOptions | CodegenInput, ...CodegenInput[]] {
  return [optionsOrJob, ...jobs];
}
