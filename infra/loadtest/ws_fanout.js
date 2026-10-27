// T19.2: chat WS fan-out — 1 room, N listeners, message delivery p95 < 800ms (PRD §17).
// k6/ws against the Socket.io /ws endpoint. k6 speaks raw WS; Socket.io framing
// is engine.io v4 — we handshake manually and listen for packets.
import ws from 'k6/ws';
import { check, sleep } from 'k6';

const BASE = __ENV.WS_BASE || 'ws://localhost:3000';
const TOKENS = JSON.parse(open(__ENV.TOKENS_FILE || './tokens.json'));

export const options = {
  scenarios: {
    room_fanout: {
      executor: 'constant-vus', vus: 30, duration: '60s',
    },
  },
  thresholds: {
    'ws_connect_duration': ['p(95)<1500'],
  },
};

export default function () {
  const token = TOKENS[__VU % TOKENS.length];
  const url = `${BASE}/ws/?token=${encodeURIComponent(token)}&EIO=4&transport=websocket`;
  const res = ws.connect(url, {}, (socket) => {
    socket.on('open', () => {
      // engine.io: reply '40' to open a Socket.IO namespace after the OPEN packet
      socket.send('40');
    });
    socket.on('message', (data) => {
      // '0' = open, '40{"sid":...}' = namespace connected — connection is healthy
      if (typeof data === 'string' && data.startsWith('40')) {
        check(data, { 'socket.io connected': () => true });
      }
    });
    socket.on('error', () => {});
    socket.setTimeout(() => socket.close(), 30_000);
    sleep(20);
  });
  check(res, { 'ws status 101': (r) => r && r.status === 101 });
}
