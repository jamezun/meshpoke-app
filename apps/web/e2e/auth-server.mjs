// Minimal GoTrue stand-in for e2e: password grant + refresh, signed with the shared e2e secret.
// Reads e2e/.state/users.json (written by apps/api/scripts/e2e-seed.ts).
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { SignJWT } from 'jose';

const SECRET = new TextEncoder().encode(process.env.E2E_GOTRUE_JWT_SECRET ?? 'e2e-secret-e2e-secret-e2e-secret-e2e-secret');
const PASSWORD = 'E2ePassw0rd!';
const users = JSON.parse(readFileSync(new URL('./.state/users.json', import.meta.url), 'utf8'));
const byEmail = { 'member@e2e.test': users.member, 'host@e2e.test': users.host };
const byRefresh = new Map(Object.values(byEmail).map((id) => [id, id]));

async function mint(userId, email) {
  const access_token = await new SignJWT({ role: 'authenticated' }).setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId).setIssuedAt().setExpirationTime('2h').sign(SECRET);
  return {
    access_token, token_type: 'bearer', expires_in: 7200, expires_at: Math.floor(Date.now() / 1000) + 7200,
    refresh_token: `e2e-refresh-${userId}`, user: { id: userId, email, aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' },
  };
}

const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'POST, GET, OPTIONS' };
createServer((req, res) => {
  if (req.method === 'OPTIONS') { res.writeHead(204, CORS); return res.end(); }
  const chunks = [];
  req.on('data', (c) => chunks.push(c));
  req.on('end', async () => {
    const url = req.url.replace(/^\/auth\/v1/, '').split('?')[0];
    const json = (body) => { res.writeHead(200, { ...CORS, 'content-type': 'application/json' }); res.end(JSON.stringify(body)); };
    if (url === '/token' && req.method === 'POST') {
      const raw = Buffer.concat(chunks).toString();
      const b = raw.startsWith('{') ? JSON.parse(raw || '{}') : Object.fromEntries(new URLSearchParams(raw));
      const gt = b.grant_type ?? new URL(req.url, 'http://x').searchParams.get('grant_type');
      let id = null;
      if (gt === 'password' && byEmail[b.email] && b.password === PASSWORD) id = byEmail[b.email];
      if (gt === 'refresh_token' && byRefresh.has(b.refresh_token)) id = byRefresh.get(b.refresh_token);
      if (!id) { res.writeHead(400, { ...CORS, 'content-type': 'application/json' }); return res.end(JSON.stringify({ error: 'invalid_grant', error_description: 'Invalid credentials' })); }
      const email = Object.keys(byEmail).find((e) => byEmail[e] === id);
      return json(await mint(id, email));
    }
    if (url === '/user' || url === '/logout' || url === '/health') { res.writeHead(200, CORS); return res.end('{}'); }
    res.writeHead(404); res.end('{}');
  });
}).listen(9998, '127.0.0.1', () => console.log('e2e auth server :9998'));
