/**
 * R2 (S3-compatible) storage. Private bucket; access only via presigned URLs.
 * env: R2_ENDPOINT, R2_BUCKET, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY (optional in dev → stub mode)
 */
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export type Storage = {
  presignPut(key: string, contentType: string, expiresIn?: number): Promise<string>;
  presignGet(key: string, expiresIn?: number): Promise<string>; // 10 min default
  get(key: string): Promise<Uint8Array | null>;
  put(key: string, body: Uint8Array, contentType: string): Promise<void>;
  del(key: string): Promise<void>;
};

let client: S3Client | null = null;
let bucket = 'meshpoke-photos';

export function storageFromEnv(env: NodeJS.ProcessEnv): Storage | null {
  if (!env.R2_ENDPOINT) return null; // stub mode — tests inject their own
  client ??= new S3Client({
    region: 'auto',
    endpoint: env.R2_ENDPOINT,
    credentials: { accessKeyId: env.R2_ACCESS_KEY_ID!, secretAccessKey: env.R2_SECRET_ACCESS_KEY! },
  });
  bucket = env.R2_BUCKET ?? bucket;
  return {
    async presignPut(key, contentType, expiresIn = 900) {
      return getSignedUrl(client!, new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: contentType }), { expiresIn });
    },
    async presignGet(key, expiresIn = 600) {
      return getSignedUrl(client!, new GetObjectCommand({ Bucket: bucket, Key: key }), { expiresIn });
    },
    async get(key) {
      try {
        const res = await client!.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
        return new Uint8Array(await res.Body!.transformToByteArray());
      } catch {
        return null;
      }
    },
    async put(key, body, contentType) {
      await client!.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: contentType }));
    },
    async del(key) {
      await client!.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
    },
  };
}
