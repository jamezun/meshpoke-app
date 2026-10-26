import { describe, it, expect } from 'vitest';
import { encryptPii, decryptPii, piiHash } from '../src/db/pii.js';
import { encodeCursor, decodeCursor, cursorWhere } from '../src/db/pagination.js';

process.env.PII_ENCRYPTION_KEY = 'a'.repeat(64);

describe('PII encryption (T1.5)', () => {
  it('round-trips and is non-deterministic (random IV)', () => {
    const phone = '+85291234567';
    const a = encryptPii(phone);
    const b = encryptPii(phone);
    expect(a).not.toBe(b); // random IV → same plaintext, different ciphertext
    expect(decryptPii(a)).toBe(phone);
    expect(decryptPii(b)).toBe(phone);
  });

  it('rejects tampering (GCM tag) and bad envelopes', () => {
    const env = encryptPii('+85291234567');
    const [v, iv, ct] = env.split(':');
    const flipped = ct.slice(0, -2) + (ct.endsWith('A=') ? 'B=' : 'A=');
    expect(() => decryptPii(`${v}:${iv}:${flipped}`)).toThrow();
    expect(() => decryptPii('garbage')).toThrow();
  });

  it('deterministic hash for uniqueness lookup', () => {
    expect(piiHash('+85291234567')).toBe(piiHash('+85291234567'));
    expect(piiHash('+85291234567')).not.toBe(piiHash('+85291234568'));
    expect(piiHash('+85291234567')).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe('cursor pagination (T1.5)', () => {
  it('encode/decode round-trip; null on garbage', () => {
    const c = { createdAt: new Date('2026-10-26T12:00:00.000Z'), id: 'abc-123' };
    const dec = decodeCursor(encodeCursor(c));
    expect(dec!.createdAt.getTime()).toBe(c.createdAt.getTime());
    expect(dec!.id).toBe(c.id);
    expect(decodeCursor('!!!not-base64??')).toBeNull();
    expect(decodeCursor(null)).toBeNull();
  });

  it('cursorWhere builds row-value comparison', () => {
    const cursor = { createdAt: new Date(0), id: 'x' };
    const w = cursorWhere('created_at', 'id', cursor);
    expect(w.sql).toBe('(created_at, id) < ($1, $2)');
    expect(w.params).toEqual([cursor.createdAt, 'x']);
  });
});
