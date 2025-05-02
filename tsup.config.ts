import { defineConfig, type Format, type Options } from 'tsup';

const common = ['src/index.ts'];
const presets = ['src/presets/graphql-codegen.ts'];

export default defineConfig([
  mkConfig('cjs', ...common, ...presets),
  mkConfig('esm', ...common, ...presets, 'src/cli.ts'),
]);

function mkConfig(format: Format, ...entry: string[]): Options {
  return {
    entry,
    platform: 'node',
    format,
    dts: format === 'esm',
    cjsInterop: true,
    splitting: true,
    minify: false,
    skipNodeModulesBundle: true,
  };
}
