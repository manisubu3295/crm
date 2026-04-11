import pg from "pg";
import { getRegistry } from "./registry.js";
import { env } from "../env.js";
import logger from "../logger.js";

const { Pool } = pg;
const _pools = new Map<string, pg.Pool>();

export async function getPool(tenantId: string): Promise<pg.Pool> {
  if (_pools.has(tenantId)) {
    return _pools.get(tenantId)!;
  }

  const registry = getRegistry();
  const config = registry.tenants[tenantId];
  if (!config) throw new Error(`Tenant not found: ${tenantId}`);

  const pool = new Pool({
    connectionString: config.dbUrl,
    max: env.TENANT_DB_POOL_MAX,
    idleTimeoutMillis: env.TENANT_DB_IDLE_MS,
    connectionTimeoutMillis: env.TENANT_DB_CONN_MS,
  });

  // Smoke test
  const client = await pool.connect();
  client.release();

  _pools.set(tenantId, pool);
  logger.info({ tenantId }, "DB pool created");
  return pool;
}

export async function closeAllPools(): Promise<void> {
  for (const [id, pool] of _pools) {
    await pool.end();
    logger.info({ tenantId: id }, "DB pool closed");
  }
  _pools.clear();
}
