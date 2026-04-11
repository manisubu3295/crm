/**
 * Seed script — creates the initial admin user in the crmdb tenant.
 * Run: npx tsx script/seed-admin.ts
 */
import pg from "pg";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";

const DB_URL = "postgresql://postgres:admin123@localhost:5432/crmdb";

const MIGRATIONS_DIR = path.resolve("server/multitenant/migrations");

const pool = new pg.Pool({ connectionString: DB_URL });

async function runMigrations(client: pg.PoolClient) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name VARCHAR(255) PRIMARY KEY,
      run_on TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  const files = fs.readdirSync(MIGRATIONS_DIR).filter(f => f.endsWith(".sql")).sort();

  for (const file of files) {
    const { rowCount } = await client.query(
      "SELECT 1 FROM schema_migrations WHERE name = $1", [file]
    );
    if ((rowCount ?? 0) > 0) {
      console.log(`  ⏭  skipped ${file}`);
      continue;
    }
    console.log(`  ▶  running ${file}`);
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf-8");
    await client.query("BEGIN");
    try {
      await client.query(sql);
      await client.query("INSERT INTO schema_migrations(name) VALUES($1)", [file]);
      await client.query("COMMIT");
      console.log(`  ✓  ${file}`);
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    }
  }
}

async function seedAdmin(client: pg.PoolClient) {
  const existing = await client.query(
    "SELECT id FROM users WHERE username = $1", ["admin"]
  );
  if ((existing.rowCount ?? 0) > 0) {
    console.log("  ℹ  admin user already exists, skipping");
    return;
  }

  const hash = await bcrypt.hash("Admin@1234", 12);
  await client.query(
    `INSERT INTO users (username, password_hash, full_name, email, role)
     VALUES ($1, $2, $3, $4, $5)`,
    ["admin", hash, "Super Admin", "admin@aadhirai.in", "admin"]
  );
  console.log("  ✓  admin user created");

  // Insert default SLA policies for all stages
  const stages = ["new","contacted","qualified","demo","interested","payment","admitted","lost"];
  const defaultHours = { new: 2, contacted: 4, qualified: 8, demo: 24, interested: 24, payment: 12, admitted: 48, lost: 72 };
  for (const stage of stages) {
    const hrs = defaultHours[stage as keyof typeof defaultHours];
    await client.query(
      `INSERT INTO sla_policies (stage, max_response_hours) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [stage, hrs]
    );
  }
  console.log("  ✓  default SLA policies created");

  // Insert default app settings
  await client.query(
    `INSERT INTO app_settings (institution_name, timezone) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
    ["Aadhirai Institution", "Asia/Kolkata"]
  );
  console.log("  ✓  app settings created");
}

async function main() {
  console.log("🔗 Connecting to crmdb…");
  const client = await pool.connect();
  try {
    console.log("📦 Running migrations…");
    await runMigrations(client);
    console.log("🌱 Seeding admin…");
    await seedAdmin(client);
    console.log("\n✅ Done!\n");
    console.log("────────────────────────────────────");
    console.log("  Login at: http://localhost:5173");
    console.log("  Institution ID : aadhirai");
    console.log("  Username       : admin");
    console.log("  Password       : Admin@1234");
    console.log("────────────────────────────────────\n");
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(err => { console.error("❌ Seed failed:", err); process.exit(1); });
