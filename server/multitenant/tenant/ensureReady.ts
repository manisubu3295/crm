import { Umzug, SequelizeStorage } from "umzug";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import type pg from "pg";
import { getPool } from "./dbPool.js";
import { getRegistry } from "./registry.js";
import logger from "../logger.js";
import { env } from "../env.js";

const MIGRATIONS_DIR = path.resolve(
  fileURLToPath(new URL(".", import.meta.url)),
  "../migrations"
);

async function runMigrations(pool: pg.Pool, tenantId: string): Promise<void> {
  const client = await pool.connect();

  try {
    // Advisory lock prevents concurrent migrations for same tenant
    await client.query("SELECT pg_advisory_lock(hashtext($1))", [tenantId]);

    // Ensure migrations table exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name VARCHAR(255) PRIMARY KEY,
        run_on TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    const files = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith(".sql"))
      .sort();

    for (const file of files) {
      const exists = await client.query(
        "SELECT 1 FROM schema_migrations WHERE name = $1",
        [file]
      );
      if ((exists.rowCount ?? 0) > 0) continue;

      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf-8");

      if (env.MIGRATION_TRANSACTION_ENABLED) {
        await client.query("BEGIN");
        try {
          await client.query(sql);
          await client.query(
            "INSERT INTO schema_migrations(name) VALUES($1)",
            [file]
          );
          await client.query("COMMIT");
        } catch (err) {
          await client.query("ROLLBACK");
          throw err;
        }
      } else {
        await client.query(sql);
        await client.query(
          "INSERT INTO schema_migrations(name) VALUES($1)",
          [file]
        );
      }

      logger.info({ tenantId, migration: file }, "Migration applied");
    }
  } finally {
    await client.query("SELECT pg_advisory_unlock(hashtext($1))", [tenantId]);
    client.release();
  }
}

// Called once on server startup for all registered tenants
export async function ensureAllTenantsReady(): Promise<void> {
  const registry = getRegistry();
  for (const tenantId of Object.keys(registry.tenants)) {
    await ensureTenantReady(tenantId);
  }
}

export async function ensureTenantReady(tenantId: string): Promise<void> {
  const pool = await getPool(tenantId);
  await runMigrations(pool, tenantId);
  logger.info({ tenantId }, "Tenant schema ready");
}
