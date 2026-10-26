/**
 * Message safety hooks (T7.3): link detection (blocked for unverified,
 * flagged otherwise), per-user message rate limit 20/min (Redis),
 * applied on WS message:send and mirrored for REST posting.
 */
import type { FastifyInstance } from 'fastify';
import type { Redis } from 'ioredis';

export const MSG_RATE_LIMIT_PER_MIN = 20;

// link-shaped patterns: URLs, www., and handle-ish schemes we still flag
const LINK_RE = /\b(?:https?:\/\/|www\.)\S+/i;
const HANDLE_RE = /(?:^|\s)@[\w.]{3,}/; // social handles — flagged not blocked

export function detectFlags(body: string): { hasLink: boolean; hasHandle: boolean } {
  return { hasLink: LINK_RE.test(body), hasHandle: HANDLE_RE.test(body) };
}

export function messageGuard(
  verified: boolean,
  body: string,
): { ok: true; flags: Record<string, boolean> } | { ok: false; error: string } {
  const { hasLink, hasHandle } = detectFlags(body);
  if (hasLink && !verified) return { ok: false, error: 'link_not_allowed' };
  const flags: Record<string, boolean> = { 'link-detected': hasLink, 'handle-detected': hasHandle };
  return { ok: true, flags: Object.fromEntries(Object.entries(flags).filter(([, v]) => v)) };
}

/** Sliding-window-ish fixed window in Redis: key per user per minute. */
export async function checkMsgRate(redis: Redis, userId: string): Promise<boolean> {
  const key = `msg-rate:${userId}:${Math.floor(Date.now() / 60_000)}`;
  const n = await redis.incr(key);
  if (n === 1) await redis.expire(key, 120);
  return n <= MSG_RATE_LIMIT_PER_MIN;
}
