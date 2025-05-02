import { createContext, generate } from '@graphql-codegen/cli';
import type { CodegenJob } from '../types';

export type GraphqlCodegenOptions = {
  config?: string;
  project?: string;
};

export function graphqlCodegen(options: GraphqlCodegenOptions = {}) {
  return async (): Promise<CodegenJob[]> => {
    const context = await createContext({
      config: options.config ?? '',
      project: options.project ?? '',
      watch: false,
      require: [],
      overwrite: false,
      silent: false,
      errorsOnly: false,
      profile: false,
      verbose: true,
      debug: true,
    });

    const config = context.getConfig();

    return Object.entries(config.generates).map(([output, options]) => {
      const input = [
        ...normalizeDocuments(config.documents),
        ...(Array.isArray(options) ? [] : normalizeDocuments(options.documents)),
      ];

      return {
        input,
        output,
        cacheBy: 'contents',
        generate: async (files) => {
          const [generatedFile] = await generate(
            {
              ...config,
              documents: files.map((file) => file.localPath),
              generates: {
                [output]: {
                  ...options,
                  documents: undefined,
                },
              },
            },
            false,
          );

          return generatedFile.content;
        },
      };
    });
  };
}

type Loader = {
  [path: string]: {
    loader: string;
  };
};

function normalizeDocuments(documents?: (string | Loader)[] | string | Loader): string[] {
  if (documents === undefined) {
    return [];
  }

  if (!Array.isArray(documents)) {
    documents = [documents];
  }

  for (const document of documents) {
    if (typeof document !== 'string') {
      throw new Error('Custom loaders are not supported');
    }
  }

  return documents as string[];
}
