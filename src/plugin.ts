import { Codegen } from './codegen';
import type { CodegenInput, CodegenOptions } from './types';

export type Plugin = {
  name: string;
  buildStart(): Promise<void>;
  watchChange(id: string): Promise<void>;
};

export function codegen(...jobs: CodegenInput[]): Plugin;
export function codegen(options: CodegenOptions, ...jobs: CodegenInput[]): Plugin;
export function codegen(
  jobOrOptions: CodegenInput | CodegenOptions,
  ...moreJobs: CodegenInput[]
): Plugin;
export function codegen(
  jobOrOptions: CodegenInput | CodegenOptions,
  ...moreJobs: CodegenInput[]
): Plugin {
  const init = Codegen.init(jobOrOptions, ...moreJobs);

  return {
    name: 'pluggable-codegen',
    async buildStart(): Promise<void> {
      const codegen = await init;
      await codegen.generateAll();
    },
    async watchChange(id: string): Promise<void> {
      const codegen = await init;
      await codegen.generateMatching(id);
    },
  };
}
