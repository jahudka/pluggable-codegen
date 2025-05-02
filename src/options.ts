import { mkdir, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import type { CodegenInput, CodegenJob, CodegenOptions, NormalizedCodegenOptions } from './types';
import { lookupPath } from './utils';

export async function normalizeOptions(
  options: CodegenOptions = {},
): Promise<NormalizedCodegenOptions> {
  let packageJson: Promise<any> | undefined;

  const rootDir = resolve(options.rootDir ?? process.cwd());
  const cacheFile = await resolveCacheFile(rootDir, options.cacheFile);
  const prettier = options.prettier ?? hasDevDep(await getPackageJson(), 'prettier');
  const eslint = options.eslint ?? hasDevDep(await getPackageJson(), 'eslint');

  return { rootDir, cacheFile, prettier, eslint };

  async function getPackageJson(): Promise<any> {
    return (packageJson ??= readPackageJson(rootDir));
  }
}

export async function normalizeJobs(
  rootDir: string,
  inputs: CodegenInput[],
): Promise<CodegenJob[]> {
  const jobs = await Promise.all(
    inputs.map(async (input) => {
      return typeof input === 'function' ? input(rootDir) : input;
    }),
  );

  return jobs.flat();
}

async function resolveCacheFile(
  rootDir: string,
  cacheFile?: string | false,
): Promise<string | undefined> {
  if (cacheFile === false) {
    return undefined;
  } else if (cacheFile !== undefined) {
    return resolve(rootDir, cacheFile);
  }

  const codegenPath = typeof __dirname !== 'undefined' ? __dirname : import.meta.dirname;

  if (!codegenPath.includes('/node_modules/')) {
    return undefined;
  }

  cacheFile = codegenPath.replace(/^(.+\/node_modules)\/.*$/, '$1/.cache/pluggable-codegen.json');

  try {
    await mkdir(dirname(cacheFile), { recursive: true, mode: 0o750 });
  } catch {
    // noop
  }

  return cacheFile;
}

function hasDevDep(packageJson: any, dep: string): boolean {
  return (
    typeof packageJson === 'object' &&
    packageJson !== null &&
    'devDependencies' in packageJson &&
    typeof packageJson.devDependencies === 'object' &&
    packageJson.devDependencies !== null &&
    dep in packageJson.devDependencies
  );
}

async function readPackageJson(dir: string): Promise<any | undefined> {
  return lookupPath(dir, 'package.json', async (path) => {
    const content = await readFile(path, 'utf-8');
    return JSON.parse(content);
  });
}
