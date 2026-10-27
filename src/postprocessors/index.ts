import { ESLint } from './eslint';
import { Oxfmt } from './oxfmt';
import { Prettier } from './prettier';
import type { Postprocessor, PostprocessorId } from './types';

export const postprocessors = [
  new Oxfmt(),
  new ESLint(),
  new Prettier(),
] as const satisfies Postprocessor[];

export type PostprocessorOptions = Record<
  PostprocessorId<(typeof postprocessors)[number]>,
  boolean
>;

export type * from './types';
