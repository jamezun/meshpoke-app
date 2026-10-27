// T19.2: merchant scan bursts — staff hitting POST /merchant/scan during a busy
// drop night. QR tokens rotate every 30s; most traffic is verify + replay checks
// (Redis) before any DB write. p95 < 600ms (write).
import http from 'k6/http';
import { check } from 'k6';

const BASE = __ENV.BASE || 'http://localhost:3000';
const STAFF_TOKEN = __ENV.STAFF_TOKEN; // merchant owner token
// mint a guest QR via GET /v1/me/qr per run (see README) and paste payloads here:
const QR_PAYLOADS = JSON.parse(open(__ENV.QR_FILE || './qr.json')); // string[]

export const options = {
  scenarios: {
    scans: {
      executor: 'ramping-arrival-rate',
      startRate: 2, timeUnit: '1s', preAllocatedVUs: 10, maxVUs: 40,
      stages: [
        { target: 5, duration: '30s' },
        { target: 25, duration: '20s' }, // door rush
        { target: 5, duration: '30s' },
      ],
    },
  },
  thresholds: {
    'http_req_duration{type:write}': ['p(95)<600'],
    'checks': ['rate>0.9'], // replays 409 are expected and fine
  },
};

export default function () {
  const qr = QR_PAYLOADS[(__VU + __ITER) % QR_PAYLOADS.length];
  const r = http.post(`${BASE}/v1/merchant/scan`, JSON.stringify({ qrPayload: qr }), {
    headers: { authorization: `Bearer ${STAFF_TOKEN}`, 'content-type': 'application/json' },
    tags: { type: 'write' },
  });
  check(r, {
    'scan resolves (201/409 replay/422 nothing-to-check-in)': (res) => [201, 409, 422].includes(res.status),
  });
}
