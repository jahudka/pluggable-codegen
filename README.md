# Pluggable Code Generator

This package provides a simple mechanism to hook simple custom code generation
scripts into Rollup and Vite build pipelines. It doesn't generate any code
by itself - it's just a bridge between Rollup or Vite and another script
which does the actual generation. It's useful in situations where you want
to watch a bunch of globs and generate some output from them whenever they
change. It can also be used standalone, although in that case it doesn't
provide watch functionality.

## Installation

```shell
npm i -D pluggable-codegen
yarn add -D pluggable-codegen
pnpm add -D pluggable-codegen
bun add -D pluggable-codegen
```

## Usage

You can either provide configuration for your code generation inline in your
bundler config (`rollup.config.ts` / `vite.config.ts`), or using a separate
config file (which is useful if you want to run the codegen standalone).

### Standalone

```typescript
// codegen.config.js
import { defineCodegen } from 'pluggable-codegen';

export default defineCodegen(
  // optional global config; default values shown
  {
    rootDir: process.cwd(),
    // set to false to disable caching:
    cacheFile: 'node_modules/.cache/pluggable-codegen.json',
    // auto-detected based on devDependencies:
    eslint: undefined,
    prettier: undefined,
    // global overrides for tinyglobby options:
    glob: undefined,
  },
  // followed by one or more codegen jobs:
  {
    input: 'src/some/interesting/files/*.ts', // also can be an array
    output: 'src/some/generated/file.ts',
    generate: async (files, signal) => {
      // 'files' is an array of instances of the File class
      // exported by the package, see below;
      // 'signal' is an abort signal

      // now do something fun and return a Buffer or a string;
      // you can also return null, in which case nothing will be written
      return `export const fileList = ${JSON.stringify(files)};`;
    },
    // set to 'files' if your generated output is based only on
    // the list of file names, or to 'contents' if the output is
    // based on the files' contents:
    cacheBy: undefined,
    // you can override the global 'eslint', 'prettier',
    // and 'glob' options per-job:
    // prettier: false,
  },
);
```

The config file can also have a `.cjs` or a `.mjs` extension depending on your
need; either will be autodetected.

You can run the codegen using `node_modules/.bin/pluggable-codegen` or
popular wrappers like `npx` or `bun x`. If you're using a non-standard
config file name, you can pass it as the first argument.

### Using bundler plugin

Within a bundler config, such as `vite.config.ts`, you would just use
the `codegen()` plugin instead of the `defineCodegen()` typing helper:

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import { codegen } from 'pluggable-codegen';

export default defineConfig({
  plugins: [
    codegen(), // same arguments as defineCodegen()
  ],
});
```

In fact, you can combine the two if you want to run the codegen as a bundler
plugin _as well as_ standalone - this is useful e.g. after `svelte-kit sync`
and before `svelte-check`:

```typescript
// vite.config.ts

import { defineConfig } from 'vite';
import { codegen } from 'pluggable-codegen';
import codegenConfig from './codegen.config';

export default defineConfig({
  plugins: [codegen(...codegenConfig)],
});
```

When used as a bundler plugin, the codegen will run all jobs once at the
beginning of the build, and each job will be rerun if any of its input files
change.

## The `File` class

The list of files matching the input globs will be passed as an array of
instances of the `File` class. This class has the following methods and
properties:

```typescript
declare class File {
  // full absolute path to the file:
  readonly fullPath: string;
  // relative path from rootDir with leading './' stripped:
  readonly localPath: string;

  // read file contents; all of these methods cache the raw buffer
  // in memory for later reuse:
  buffer(): Promise<Buffer>;
  text(): Promise<string>;
  json(): Promise<any>;
}
```

## Presets

### SvelteKit Routegen

The [`sveltekit-routegen`](https://www.npmjs.com/package/sveltekit-routegen)
package (which you can install separately) exports a codegen preset which
generates type-safe helpers for generating URLs from routes in SvelteKit.

### GraphQL Codegen

This preset wraps the `graphql-code-generator` package so that you don't
have to run `gql-gen --watch` separately. It doesn't accept any options;
simply configure `gql-gen` using a `graphql.config.yml` file as you would if
you used `gql-gen` standalone and add the `gqlgen()` job exported from
`pluggable-codegen/presets/graphql-code-generator`.
