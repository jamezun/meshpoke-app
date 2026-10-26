// T6.5: spot share pages — tiny SSR handler for /s/{id} OG metadata.
// Serves dist/ statically; intercepts /s/:id, fetches spot from API, injects OG tags.
// Run: node server.mjs (PORT, API_URL, WEB_DIR envs; defaults 8080)
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';

const PORT = Number(process.env.PORT ?? 8080);
const API_URL = process.env.API_URL ?? 'http://localhost:4000/v1';
const WEB_DIR = process.env.WEB_DIR ?? 'dist';

const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.txt': 'text/plain',
};

/// Build OG meta tags from a spot row (PRD §6.1: template, district, date state, seats left — NO member data).
export function spotMetaTags(spot) {
  const title = spot.name || 'MeshPoke spot';
  const seatsLeft = spot.maxHeadcount != null ? Math.max(0, spot.maxHeadcount - (spot.headcount ?? 0)) : null;
  const bits = [
    spot.template && cap(spot.template),
    spot.district,
    spot.eventDate && !spot.eventDate.startsWith('1970') ? new Date(spot.eventDate).toLocaleDateString('en-HK', { weekday: 'short', month: 'short', day: 'numeric' }) : null,
    spot.state === 'forming' ? 'forming now' : spotsStateLabel(spot.state),
    seatsLeft != null ? `${seatsLeft} seat${seatsLeft === 1 ? '' : 's'} left` : null,
  ].filter(Boolean).join(' · ');
  const desc = `${title} — ${bits || 'a MeshPoke spot'}. Open in the app to join.`;
  const og = (p, c) => `<meta property="${p}" content="${esc(c)}">`;
  return [
    og('og:title', `${title} · MeshPoke`), og('og:description', desc), og('og:type', 'article'),
    `<meta name="twitter:card" content="summary">`, `<title>${esc(title)} · MeshPoke</title>`,
  ].join('\n    ');
}

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ');
const spotsStateLabel = (s) => (s ? cap(s) : '');
const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

async function shell() {
  return readFile(join(WEB_DIR, 'index.html'), 'utf8');
}

async function spot(id) {
  try {
    const res = await fetch(`${API_URL}/spots/${encodeURIComponent(id)}/share`, { signal: AbortSignal.timeout(2500) });
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? '/', `http://localhost:${PORT}`);
    const m = url.pathname.match(/^\/s\/([A-Za-z0-9-]+)/);
    if (m && !extname(url.pathname)) {
      const s = await spot(m[1]);
      const html = (await shell()).replace('<head>', `<head>\n    ${s ? spotMetaTags(s) : '<title>MeshPoke spot</title>'}`);
      res.writeHead(200, { 'Content-Type': 'text/html' }).end(html);
      return;
    }
    // static
    const file = join(WEB_DIR, url.pathname === '/' ? 'index.html' : url.pathname);
    const body = await readFile(file).catch(() => null);
    if (body == null) {
      const html = await shell(); // SPA fallback for client routes
      res.writeHead(200, { 'Content-Type': 'text/html' }).end(html);
      return;
    }
    res.writeHead(200, { 'Content-Type': MIME[extname(file)] ?? 'application/octet-stream' }).end(body);
  } catch {
    res.writeHead(500).end();
  }
});

export { server };
if (import.meta.url === `file://${process.argv[1]}`) {
  server.listen(PORT, () => console.log(`web SSR+static on :${PORT}`));
}
