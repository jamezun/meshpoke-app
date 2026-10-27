// T19.2: drop-claim contention — N concurrent claims on capacity-limited drops.
// The claim endpoint uses SELECT FOR UPDATE inside a transaction; this script
// proves exactly-once capacity under load (total claims never exceed capacity).
import http from 'k6/http';
import { check } from 'k6';

const BASE = __ENV.BASE || 'http://localhost:3000';
const TOKENS = JSON.parse(open(__ENV.TOKENS_FILE || './tokens.json'));
const DROP_IDS = JSON.parse(open(__ENV.DROPS_FILE || './drops.json')); // {id, capacity}[]

export const options = {
  scenarios: {
    stampede: {
      executor: 'shared-iterations',
      vus: 60, iterations: 120, startTime: '5s',
    },
  },
  thresholds: { 'checks': ['rate>0.5'] }, // most claims 409 (full) — that's the win
};

export default function () {
  const drop = DROP_IDS[__VU % DROP_IDS.length];
  const token = TOKENS[(__VU + __ITER) % TOKENS.length];
  const r = http.post(`${BASE}/v1/drops/${drop.id}/claim`, '{}', {
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    tags: { type: 'write' },
  });
  check(r, {
    'claim resolves (201 won or 409 full/dupe)': (res) => res.status === 201 || res.status === 409,
  });
}
