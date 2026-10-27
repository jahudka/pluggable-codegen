#!/usr/bin/env node

import { resolve } from 'node:path';
import { Codegen } from './codegen';
import type { CodegenJob, CodegenOptions } from './types';
import { lookupPath } from './utils';

const configFiles = ['codegen.config.mjs', 'codegen.config.cjs', 'codegen.config.js'];

void (async () => {
  const config =
    process.argv.length > 2
      ? await importConfig(resolve(process.argv[2]))
      : await lookupPath(process.cwd(), configFiles, importConfig);

  if (!config) {
    console.log(`Usage: pluggable-codegen [config]`);
    process.exitCode = 1;
    return;
  }

  if (!validateConfig(config)) {
    console.log(`Invalid config`);
    process.exitCode = 1;
    return;
  }

  const codegen = await Codegen.init(...config);

  if (!(await codegen.generateAll())) {
    process.exitCode = 1;
  }
})();

async function importConfig(path: string): Promise<any> {
  try {
    const config = await import(path);
    return config.default;
  } catch (e: unknown) {
    if (!path.endsWith('.mjs')) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const config = require(path);
      return config.default ?? config;
    }

    throw e;
  }
}

type Config = [CodegenJob | CodegenOptions, ...CodegenJob[]];

function validateConfig(config: unknown): config is Config {
  if (!Array.isArray(config) || !config.length) {
    return false;
  }

  // we'll be more thorough in the future, promise
  return true;
}
