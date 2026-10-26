import 'dotenv/config';
import { writeFile } from 'node:fs/promises';
import { buildApp } from '../src/app.js';
import { loadConfig } from '../src/config.js';

const config = loadConfig();
const app = await buildApp({ config });
await app.ready();
const spec = app.swagger();
await writeFile(new URL('../openapi.json', import.meta.url), JSON.stringify(spec, null, 2) + '\n');
await app.close();
console.log('wrote apps/api/openapi.json');
