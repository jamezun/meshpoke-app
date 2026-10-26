/**
 * PII at rest: AES-256-GCM (random IV) for phone_e164 storage + HMAC-SHA256
 * deterministic hash column for uniqueness lookups without decrypting.
 * Key: PII_ENCRYPTION_KEY (64 hex chars = 32 bytes) — one key, no rotation
 * protocol (ponytail: swap to envelope encryption if key rotation ever matters).
 */
import { createCipheriv, createDecipheriv, createHmac, randomBytes } from 'node:crypto';

let key: Buffer | null = null;

function getKey(): Buffer {
  if (!key) {
    const hex = process.env.PII_ENCRYPTION_KEY;
    if (!hex || !/^[0-9a-f]{64}$/i.test(hex)) {
      throw new Error('PII_ENCRYPTION_KEY must be 64 hex chars (32 bytes)');
    }
    key = Buffer.from(hex, 'hex');
  }
  return key;
}

/** Encrypt → `v1:<iv-b64>:<ct-b64>` (auth tag appended to ciphertext). */
export function encryptPii(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', getKey(), iv);
  const ct = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString('base64')}:${Buffer.concat([ct, tag]).toString('base64')}`;
}

/** Decrypt a `v1:iv:ct` envelope. Throws on tamper (GCM tag check). */
export function decryptPii(envelope: string): string {
  const [version, ivB64, dataB64] = envelope.split(':');
  if (version !== 'v1' || !ivB64 || !dataB64) throw new Error('bad PII envelope');
  const data = Buffer.from(dataB64, 'base64');
  const ct = data.subarray(0, -16);
  const tag = data.subarray(-16);
  const decipher = createDecipheriv('aes-256-gcm', getKey(), Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString('utf8');
}

/** Deterministic HMAC — store in a separate column for uniqueness lookups. */
export function piiHash(plaintext: string): string {
  return createHmac('sha256', getKey()).update(plaintext).digest('hex');
}
