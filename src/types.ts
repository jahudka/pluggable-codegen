import type { File } from './file';

type MaybePromise<T> = Promise<T> | T;

export type CodegenOptions = {
  rootDir?: string;
  cacheFile?: string | false;
  prettier?: boolean;
  eslint?: boolean;
};

export type NormalizedCodegenOptions = {
  rootDir: string;
  cacheFile?: string;
  prettier: boolean;
  eslint: boolean;
};

export type CodegenJob = {
  input: string | string[];
  output: string;
  generate: (files: File[], signal: AbortSignal) => MaybePromise<Buffer | string | null>;
  cacheBy?: 'files' | 'contents';
  prettier?: boolean;
  eslint?: boolean;
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
