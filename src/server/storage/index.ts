import type { Env } from "@/server/env";
import { getEnv } from "@/server/env";
import { LocalFilesystemStorage } from "@/server/storage/local-storage";
import type { ObjectStorage } from "@/server/storage/types";

export type { ObjectStorage } from "@/server/storage/types";

export async function createObjectStorage(env: Env): Promise<ObjectStorage> {
  if (env.STORAGE_DRIVER === "local") return new LocalFilesystemStorage(env.STORAGE_LOCAL_DIR);

  // Loaded lazily so the AWS SDK is only initialised when the S3 driver is configured.
  const { S3CompatibleStorage } = await import("@/server/storage/s3-storage");
  // env.ts guarantees these are present when STORAGE_DRIVER is "s3".
  return new S3CompatibleStorage({
    bucket: env.S3_BUCKET!,
    region: env.S3_REGION!,
    ...(env.S3_ENDPOINT ? { endpoint: env.S3_ENDPOINT } : {}),
    accessKeyId: env.S3_ACCESS_KEY_ID!,
    secretAccessKey: env.S3_SECRET_ACCESS_KEY!,
    forcePathStyle: env.S3_FORCE_PATH_STYLE,
  });
}

let storage: Promise<ObjectStorage> | undefined;

export function getObjectStorage(): Promise<ObjectStorage> {
  storage ??= createObjectStorage(getEnv());
  return storage;
}
