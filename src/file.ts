import { readFile } from 'node:fs/promises';
import { relative } from 'node:path';

export class File {
  public readonly fullPath: string;
  public readonly localPath: string;
  #contents?: Promise<Buffer>;

  constructor(path: string, rootDir: string) {
    this.fullPath = path;
    this.localPath = relative(rootDir, path).replace(/^\.(?:\/|$)/, '');
  }

  async buffer(): Promise<Buffer> {
    return (this.#contents ??= readFile(this.fullPath));
  }

  async text(encoding: BufferEncoding = 'utf-8'): Promise<string> {
    const contents = await this.buffer();
    return contents.toString(encoding);
  }

  async json(): Promise<any> {
    return JSON.parse(await this.text());
  }
}
