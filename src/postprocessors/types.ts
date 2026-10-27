export interface Postprocessor {
  readonly id: string;
  readonly packageName: string;
  readonly conflicts: string[];
  apply(source: string, path: string): Promise<string> | string;
}

export type PostprocessorId<P extends Postprocessor> = P extends { id: infer Id } ? Id : never;
