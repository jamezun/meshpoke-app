import { describe, expect, test } from 'vitest';
import { scanOutgoing, scanIncoming, scameterUrl } from '../src/scam-patterns.js';

test('T13.2 scam fixtures: flagged', () => {
  const cases: Array<[string, keyof ReturnType<typeof scanOutgoing>['flags']]> = [
    ['Guaranteed 40% return per month, join my ETH pool', 'scam-investment'],
    ['buy USDT now 穩賺', 'scam-crypto'],
    ['move to telegram @fastmoney_hk', 'scam-move-offplatform'],
    ['Download this app for exclusive content', 'scam-download'],
    ['add my wa 9123 4567', 'contact-phone'],
    ['ping me @hkguy_88', 'contact-handle'],
    ['email me at win.big123@fastmail.xyz', 'contact-email'],
    ['see www.hksuperdeals.vip', 'link-detected'],
  ];
  for (const [text, flag] of cases) {
    const { flags, requireConfirm } = scanOutgoing(text);
    expect(flags[flag], text).toBe(true);
    expect(requireConfirm).toBe(true);
  }
});

test('T13.2 benign messages: not flagged', () => {
  for (const text of [
    'See you at the spot tonight!',
    'I usually play tennis on Saturdays',
    'cool, bringing a friend',
    '誰去周五晚餐？',
  ]) {
    const { flags, requireConfirm } = scanOutgoing(text);
    expect(Object.values(flags).some(Boolean), text).toBe(false);
    expect(requireConfirm).toBe(false);
    const inc = scanIncoming(text);
    expect(inc.warn).toBe(false);
  }
});

test('T13.2 incoming warn only for scam classes, not mere contacts', () => {
  expect(scanIncoming('my ig is @hkguy').warn).toBe(false); // contact → banner-ish, not scam warn
  expect(scanIncoming('crypto profit guaranteed').warn).toBe(true);
});

test('T13.2 scameter url encodes', () => {
  expect(scameterUrl('www.bad.vip')).toBe('https://cyberdefender.hk/en/scameter/?q=www.bad.vip');
});
