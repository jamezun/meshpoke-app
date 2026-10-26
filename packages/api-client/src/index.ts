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
    fetch: async (request: Request) => {
      const token = await opts.getToken?.();
      if (token) request.headers.set('Authorization', `Bearer ${token}`);
      return globalThis.fetch(request);
    },
  });
  return client;
}
