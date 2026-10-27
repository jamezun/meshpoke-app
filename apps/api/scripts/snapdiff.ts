import fs from 'node:fs';
import { getTableConfig } from 'drizzle-orm/pg-core';
import * as schema from '../src/db/schema/index.js';

const snap = JSON.parse(fs.readFileSync('drizzle/meta/0017_snapshot.json', 'utf8'));
for (const v of Object.values(schema)) {
  try {
    const t = getTableConfig(v as never);
    const key = `public.${t.name}`;
    if (!snap.tables[key]) { console.log('MISSING TABLE in snapshot:', t.name); continue; }
    const scols = new Set(Object.values(snap.tables[key].columns as Record<string, { name: string }>).map((c) => c.name));
    const cols = new Set(t.columns.map((c) => c.name));
    const added = [...cols].filter((c) => !scols.has(c));
    const removed = [...scols].filter((c) => !cols.has(c));
    if (added.length || removed.length) console.log(t.name, '-> schema+ :', added, '| snapshot-only :', removed);
  } catch { /* skip non-table exports */ }
void 0;
}
console.log('done');
