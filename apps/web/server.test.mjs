import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spotMetaTags } from './server.mjs';

test('spotMetaTags builds OG from share fields, no member data', () => {
  const html = spotMetaTags({
    name: 'Friday doubles', template: 'tennis', district: 'Central and Western',
    state: 'forming', headcount: 2, maxHeadcount: 4, eventDate: null,
  });
  assert.ok(html.includes('og:title'));
  assert.ok(html.includes('Friday doubles · MeshPoke'));
  assert.ok(html.includes('Tennis · Central and Western · forming now · 2 seats left'));
  assert.ok(!html.includes('member'));
});

test('escapes quotes in names', () => {
  const html = spotMetaTags({ name: 'Bob"s "crew"' });
  assert.ok(!html.includes('Bob"s'));
  assert.ok(html.includes('&quot;'));
});
