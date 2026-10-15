import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  NotFound,
  NoSuchKey,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import {
  assertValidObjectKey,
  type DownloadUrlOptions,
  type ObjectStorage,
  type PutObjectOptions,
  type StorageBody,
  type StoredObject,
  type StoredObjectInfo,
} from "@/server/storage/types";

export interface S3StorageConfig {
  bucket: string;
  region: string;
  /** Custom endpoint for S3-compatible services (MinIO, R2, Tigris, etc.). */
  endpoint?: string;
  accessKeyId: string;
  secretAccessKey: string;
  forcePathStyle: boolean;
}

function isNotFound(error: unknown): boolean {
  return error instanceof NotFound || error instanceof NoSuchKey;
}

function contentDisposition(filename: string): string {
  const ascii = filename.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_");
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

/** Production driver for any S3-compatible object store. */
export class S3CompatibleStorage implements ObjectStorage {
  readonly driver = "s3" as const;
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(config: S3StorageConfig) {
    this.bucket = config.bucket;
    this.client = new S3Client({
      region: config.region,
      ...(config.endpoint ? { endpoint: config.endpoint } : {}),
      forcePathStyle: config.forcePathStyle,
      credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
    });
  }

  async put(key: string, body: StorageBody, options: PutObjectOptions): Promise<void> {
    assertValidObjectKey(key);
    if (!(body instanceof Uint8Array) && options.contentLength === undefined) {
      throw new Error("contentLength is required for streamed uploads");
    }
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: options.contentType,
        ...(options.contentLength !== undefined ? { ContentLength: options.contentLength } : {}),
      }),
    );
  }

  async head(key: string): Promise<StoredObjectInfo | null> {
    assertValidObjectKey(key);
    try {
      const result = await this.client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }));
      return { key, size: result.ContentLength ?? 0, contentType: result.ContentType ?? null };
    } catch (error) {
      if (isNotFound(error)) return null;
      throw error;
    }
  }

  async get(key: string): Promise<StoredObject | null> {
    assertValidObjectKey(key);
    try {
      const result = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
      if (!result.Body) return null;
      return {
        key,
        size: result.ContentLength ?? 0,
        contentType: result.ContentType ?? null,
        body: result.Body.transformToWebStream() as ReadableStream<Uint8Array>,
      };
    } catch (error) {
      if (isNotFound(error)) return null;
      throw error;
    }
  }

  async delete(key: string): Promise<void> {
    assertValidObjectKey(key);
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }

  async createDownloadUrl(key: string, options: DownloadUrlOptions): Promise<string | null> {
    assertValidObjectKey(key);
    return getSignedUrl(
      this.client,
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
        ResponseContentType: options.contentType,
        ResponseContentDisposition: contentDisposition(options.filename),
      }),
      { expiresIn: options.expiresInSeconds },
    );
  }
}
