import { beforeAll } from 'vitest';
import { GenericContainer, Wait, type StartedTestContainer } from 'testcontainers';

export interface TestInfra {
  dbUrl: string;
  redisUrl: string;
  containers: StartedTestContainer[];
}

let infra: TestInfra | undefined;
let starting: Promise<TestInfra> | undefined;

export async function startInfra(): Promise<TestInfra> {
  if (infra) return infra;
  if (!starting) starting = start();
  return starting;
}

const start = async (): Promise<TestInfra> => {
  const dbContainer = await new GenericContainer('postgis/postgis:15-3.4')
    .withEnvironment({ POSTGRES_USER: 'postgres', POSTGRES_PASSWORD: 'postgres', POSTGRES_DB: 'meshpoke_test' })
    .withExposedPorts(5432)
    .withWaitStrategy(Wait.forLogMessage(/database system is ready to accept connections/, 2))
    .start();

  const redisContainer = await new GenericContainer('redis:7')
    .withExposedPorts(6379)
    .withWaitStrategy(Wait.forLogMessage(/Ready to accept connections/))
    .start();

  return {
    dbUrl: `postgres://postgres:postgres@${dbContainer.getHost()}:${dbContainer.getMappedPort(5432)}/meshpoke_test`,
    redisUrl: `redis://${redisContainer.getHost()}:${redisContainer.getMappedPort(6379)}`,
    containers: [dbContainer, redisContainer],
  };
};

export const stopInfra = async (): Promise<void> => {
  if (!infra) return;
  await Promise.all(infra.containers.map((c) => c.stop()));
  infra = undefined;
  starting = undefined;
};

/** Vitest lifecycle wiring: starts infra in beforeAll. The TEST FILE must call `await stopInfra()` in its own afterAll AFTER closing app-owned pools (hook order otherwise races container shutdown against pool teardown). */
export function useInfra(): Promise<TestInfra> {
  beforeAll(async () => {
    infra = await startInfra();
  });
  // The promise resolves once beforeAll populated `infra`; tests always run after that.
  return new Promise<TestInfra>((resolve) => {
    const poll = () => (infra ? resolve(infra) : setTimeout(poll, 50));
    poll();
  });
}
