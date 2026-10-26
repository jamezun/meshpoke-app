import createClient from 'openapi-fetch';
import type { paths } from './schema.generated.js';

export type { components, operations, paths } from './schema.generated.js';

export interface MeshPokeClientOptions {
  /** API base URL, e.g. https://api.meshpoke.com/v1 or http://localhost:3000/v1 */
  baseUrl: string;
  /** Bearer token getter (GoTrue access token). */
  getToken?: () => string | Promise<string>;
}

export function createMeshPokeClient(opts: MeshPokeClientOptions) {
  const client = createClient<paths>({
    baseUrl: opts.baseUrl,
    fetch: async (input, init) =>
      globalThis.fetch(input, {
        ...init,
        headers: {
          ...init?.headers,
          ...(opts.getToken ? { Authorization: `Bearer ${await opts.getToken()}` } : {}),
        },
      }),
  });
  return client;
}
