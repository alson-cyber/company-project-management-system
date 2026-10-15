import { createReadStream } from "node:fs";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import {
  assertValidObjectKey,
  type ObjectStorage,
  type PutObjectOptions,
  type StorageBody,
  type StoredObject,
  type StoredObjectInfo,
} from "@/server/storage/types";

interface ObjectMetadata {
  contentType: string;
}

async function toBuffer(body: StorageBody): Promise<Uint8Array> {
  if (body instanceof Uint8Array) return body;
  return new Uint8Array(await new Response(body).arrayBuffer());
}

function isMissing(error: unknown): boolean {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}

/** Development driver: stores objects on the local filesystem under a root directory. */
export class LocalFilesystemStorage implements ObjectStorage {
  readonly driver = "local" as const;
  private readonly root: string;

  constructor(rootDirectory: string) {
    this.root = path.resolve(rootDirectory);
  }

  private resolve(key: string): string {
    assertValidObjectKey(key);
    const filePath = path.resolve(this.root, key);
    if (!filePath.startsWith(this.root + path.sep)) throw new Error("Object key escapes storage root");
    return filePath;
  }

  async put(key: string, body: StorageBody, options: PutObjectOptions): Promise<void> {
    const filePath = this.resolve(key);
    const bytes = await toBuffer(body);
    if (options.contentLength !== undefined && options.contentLength !== bytes.byteLength) {
      throw new Error("Content length does not match body size");
    }
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, bytes);
    const metadata: ObjectMetadata = { contentType: options.contentType };
    await writeFile(`${filePath}.meta.json`, JSON.stringify(metadata));
  }

  async head(key: string): Promise<StoredObjectInfo | null> {
    const filePath = this.resolve(key);
    try {
      const [info, metadata] = await Promise.all([stat(filePath), readFile(`${filePath}.meta.json`, "utf8")]);
      return { key, size: info.size, contentType: (JSON.parse(metadata) as ObjectMetadata).contentType ?? null };
    } catch (error) {
      if (isMissing(error)) return null;
      throw error;
    }
  }

  async get(key: string): Promise<StoredObject | null> {
    const info = await this.head(key);
    if (!info) return null;
    const stream = Readable.toWeb(createReadStream(this.resolve(key))) as ReadableStream<Uint8Array>;
    return { ...info, body: stream };
  }

  async delete(key: string): Promise<void> {
    const filePath = this.resolve(key);
    await rm(filePath, { force: true });
    await rm(`${filePath}.meta.json`, { force: true });
  }

  async createDownloadUrl(): Promise<string | null> {
    return null;
  }
}
