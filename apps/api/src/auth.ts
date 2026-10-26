/**
 * GoTrue JWT verification + guards.
 * Ponytail: HS256 shared secret only; JWKS/RS256 switch is a config-level swap
 * (GOTRUE_JWT_SECRET → JWKS URL) if we ever run multi-instance GoTrue.
 */
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { jwtVerify } from 'jose';
import { getPool } from './db/client.js';
import { Redis } from 'ioredis';

export type AuthUser = {
  id: string;
  role: 'user' | 'admin';
  phoneVerified: boolean;
  /** false until /me/onboard creates the users row; routes that need a row check this. */
  onboarded: boolean;
};

declare module 'fastify' {
  interface FastifyRequest {
    user: AuthUser | null;
  }
  interface FastifyInstance {
    authenticate: (req: FastifyRequest, reply: FastifyReply) => Promise<unknown>;
    requirePhoneVerified: (req: FastifyRequest, reply: FastifyReply) => Promise<unknown>;
    requireRole: (role: AuthUser['role']) => (req: FastifyRequest, reply: FastifyReply) => Promise<unknown>;
  }
}

type UserRow = { id: string; is_admin: boolean; phone_verified_at: Date | null; liveness_state: string };

function toAuthUser(row: UserRow): AuthUser {
  return {
    id: row.id,
    role: row.is_admin ? 'admin' : 'user',
    phoneVerified: row.phone_verified_at !== null,
    onboarded: true,
  };
}

export function registerAuth(app: FastifyInstance, dbUrl: string, redis: Redis, jwtSecret: string) {
  const pool = getPool(dbUrl);
  const secret = new TextEncoder().encode(jwtSecret);

  app.decorateRequest('user', null);

  app.decorate('authenticate', async (req: FastifyRequest, reply: FastifyReply) => {
    const header = req.headers.authorization;
    const token = header?.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) {
      return reply.code(401).send({ type: 'about:blank', title: 'Unauthorized', status: 401 });
    }
    let claims: Record<string, unknown>;
    try {
      const verified = await jwtVerify(token, secret, { algorithms: ['HS256'] });
      claims = verified.payload as Record<string, unknown>;
    } catch {
      return reply.code(401).send({ type: 'about:blank', title: 'Unauthorized', status: 401, detail: 'invalid or expired token' });
    }
    const sub = typeof claims.sub === 'string' ? claims.sub : null;
    if (!sub) {
      return reply.code(401).send({ type: 'about:blank', title: 'Unauthorized', status: 401, detail: 'missing sub' });
    }

    // cache user claims 60s (revocation lag acceptable — token itself is 1h)
    const cacheKey = `auth:user:${sub}`;
    let cached: string | null = null;
    try {
      cached = await redis.get(cacheKey);
    } catch {
      // cache down → fall through to DB
    }
    if (cached) {
      req.user = JSON.parse(cached) as AuthUser;
      return;
    }

    const { rows } = await pool.query<UserRow>(
      `SELECT id, phone_verified_at, liveness_state, is_admin FROM users WHERE id = $1`,
      [sub],
    );
    if (rows.length === 0) {
      // valid GoTrue token, no users row yet → onboarding candidate (not an error)
      req.user = { id: sub, role: 'user', phoneVerified: false, onboarded: false };
      try {
        await redis.set(cacheKey, JSON.stringify(req.user), 'EX', 60);
      } catch {
        // cache down → auth still succeeded
      }
      return;
    }
    req.user = toAuthUser(rows[0]);
    try {
      await redis.set(cacheKey, JSON.stringify(req.user), 'EX', 60);
    } catch {
      // cache down → auth still succeeded
    }
  });

  app.decorate('requirePhoneVerified', async (req: FastifyRequest, reply: FastifyReply) => {
    if (!req.user?.phoneVerified) {
      return reply.code(403).send({ type: 'about:blank', title: 'Phone verification required', status: 403 });
    }
  });

  app.decorate('requireRole', (role: AuthUser['role']) => {
    return async (req: FastifyRequest, reply: FastifyReply) => {
      if (req.user?.role !== role) {
        return reply.code(403).send({ type: 'about:blank', title: 'Forbidden', status: 403 });
      }
    };
  });
}
