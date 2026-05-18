import { defineConfig, type Format, type UserConfig } from 'tsdown';

const common = ['src/index.ts'];
const presets = ['src/presets/graphql-codegen.ts'];

export default defineConfig([
  mkConfig('cjs', ...common, ...presets),
  mkConfig('esm', ...common, ...presets, 'src/cli.ts'),
]);

function mkConfig(format: Format, ...entry: string[]): UserConfig {
  return {
    entry,
    platform: 'node',
    format,
    dts: format === 'esm',
    minify: false,
    unbundle: true,
    deps: {
      skipNodeModulesBundle: true,
    },
  };
}
