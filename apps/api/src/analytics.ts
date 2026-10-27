// T19.1: PostHog server-side capture. Direct HTTP, no SDK — fire-and-forget,
// no-op without POSTHOG_API_KEY (local dev + tests stay silent).
// ponytail: single-process, in-process queue only; move to outbox if volume matters.

let host = '';
let key = '';

export function initAnalytics(h: string | undefined, k: string | undefined) {
  host = h ?? '';
  key = k ?? '';
}

export function capture(event: string, distinctId: string, properties: Record<string, unknown> = {}) {
  if (!host || !key) return;
  void fetch(`${host}/capture/`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ api_key: key, event, distinct_id: distinctId, properties, timestamp: new Date().toISOString() }),
  }).catch(() => { /* analytics must never break a request */ });
}

/** Feature flag via PostHog decide API (admin context). Null without config. */
export async function fetchFlag<T = Record<string, unknown>>(distinctId: string, flagKey: string): Promise<T | null> {
  if (!host || !key) return null;
  try {
    const res = await fetch(`${host}/decide/?v=3`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ api_key: key, distinct_id: distinctId }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { featureFlags?: Record<string, unknown> };
    const flag = data.featureFlags?.[flagKey];
    if (flag === undefined || typeof flag === 'boolean') return null;
    return JSON.parse(String(flag)) as T;
  } catch { return null; }
}
