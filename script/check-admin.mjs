import pg from "pg";
import bcrypt from "bcryptjs";
const pool = new pg.Pool({ connectionString: "postgresql://postgres:admin123@localhost:5432/crmdb" });
const r = await pool.query("SELECT username, password_hash, is_active FROM users WHERE username='admin'");
const u = r.rows[0];
if (!u) { console.log("NO USER FOUND"); process.exit(1); }
const ok = await bcrypt.compare("Admin@1234", u.password_hash);
console.log("is_active:", u.is_active, "| password match:", ok);
await pool.end();
