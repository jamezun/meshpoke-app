/**
 * Keyset pagination. Cursor = base64("<ISO ts>|<uuid>"), ordered `created_at DESC, id DESC`.
 * Not RFC-4122-ordered — stable tiebreak only.
 */
export type Cursor = { createdAt: Date; id: string };

export function encodeCursor(c: Cursor): string {
  return Buffer.from(`${c.createdAt.toISOString()}|${c.id}`).toString('base64url');
}

export function decodeCursor(raw: string | null | undefined): Cursor | null {
  if (!raw) return null;
  const [ts, id] = Buffer.from(raw, 'base64url').toString('utf8').split('|');
  const createdAt = new Date(ts);
  if (!id || Number.isNaN(createdAt.getTime())) return null;
  return { createdAt, id };
}

/** `(created_at, id) < (cursor.ts, cursor.id)` row-value comparison for DESC lists. */
export function cursorWhere(colTs: string, colId: string, cursor: Cursor): { sql: string; params: unknown[] } {
  return {
    sql: `(${colTs}, ${colId}) < ($1, $2)`,
    params: [cursor.createdAt, cursor.id],
  };
}
