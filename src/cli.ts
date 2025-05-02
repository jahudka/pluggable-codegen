#!/usr/bin/env node

import { resolve } from 'node:path';
import { Codegen } from './codegen';
import type { CodegenJob, CodegenOptions } from './types';
import { lookupPath } from './utils';

const configFiles = ['codegen.config.mjs', 'codegen.config.cjs', 'codegen.config.js'];

(async () => {
  const config =
    process.argv.length > 2
      ? await importConfig(resolve(process.argv[2]))
      : await lookupPath(process.cwd(), configFiles, importConfig);

  if (!config) {
    console.log(`Usage: pluggable-codegen [config]`);
    process.exit(1);
  }

  if (!validateConfig(config)) {
    console.log(`Invalid config`);
    process.exit(1);
  }

  const codegen = await Codegen.init(...config);
  await codegen.generateAll();
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
