// T19.2: k6 load scripts. Run against staging:
//   k6 run -e BASE=https://api-staging.meshpoke.com viewport.js
// Auth: mint a batch of GoTrue tokens first (see README.md) into tokens.json.
// PRD §17 NFR targets: p95 < 300ms reads, < 600ms writes.
import http from 'k6/http';
import { check } from 'k6';

const BASE = __ENV.BASE || 'http://localhost:3000';
const TOKENS = JSON.parse(open(__ENV.TOKENS_FILE || './tokens.json')); // string[]

export const options = {
  scenarios: {
    viewport_burst: {
      executor: 'ramping-arrival-rate',
      startRate: 5, timeUnit: '1s',
      preAllocatedVUs: 20, maxVUs: 100,
      stages: [
        { target: 20, duration: '30s' },   // normal browsing
        { target: 120, duration: '20s' },  // Friday-evening burst
        { target: 20, duration: '30s' },
      ],
    },
  },
  thresholds: {
    'http_req_duration{type:read}': ['p(95)<300'],
    'checks': ['rate>0.99'],
  },
};

export default function () {
  const token = TOKENS[(__VU + __ITER) % TOKENS.length];
  const headers = { authorization: `Bearer ${token}` };
  // map viewport (bbox = Central + TST, max 0.5° span enforced server-side)
  const r1 = http.get(`${BASE}/v1/map/viewport?bbox=113.9,22.15,114.35,22.55`, { headers, tags: { type: 'read' } });
  check(r1, { 'viewport 200': (r) => r.status === 200 });
  const r2 = http.get(`${BASE}/v1/districts`, { headers, tags: { type: 'read' } });
  check(r2, { 'districts 200': (r) => r.status === 200 });
}
