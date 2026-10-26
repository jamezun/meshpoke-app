import { describe, expect, it } from 'vitest';
import { messageGuard } from '../src/safety.js';

describe('T7.3 message safety', () => {
  it('link from unverified rejected', () => {
    expect(messageGuard(false, 'check https://scam.example now')).toMatchObject({ ok: false, error: 'link_not_allowed' });
  });
  it('www. counts as a link', () => {
    expect(messageGuard(false, 'see www.foo.com')).toMatchObject({ ok: false, error: 'link_not_allowed' });
  });
  it('link from verified allowed, flagged', () => {
    const g = messageGuard(true, 'https://ok.example page');
    expect(g.ok).toBe(true);
    if (g.ok) expect(g.flags['link-detected']).toBe(true);
  });
  it('clean body no flags', () => {
    const g = messageGuard(true, 'tennis at 7?');
    expect(g.ok && Object.keys(g.flags)).toHaveLength(0);
  });
  it('handle flagged but allowed for verified', () => {
    const g = messageGuard(true, 'add me @somebody.hk');
    expect(g.ok).toBe(true);
    if (g.ok) expect(g.flags['handle-detected']).toBe(true);
  });
});
