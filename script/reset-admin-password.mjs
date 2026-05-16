import pg from "pg";
import bcrypt from "bcryptjs";
const pool = new pg.Pool({ connectionString: "postgresql://postgres:admin123@localhost:5432/crmdb" });
const hash = await bcrypt.hash("Admin@1234", 12);
await pool.query("UPDATE users SET password_hash=$1 WHERE username='admin'", [hash]);
console.log("Password reset to Admin@1234");
await pool.end();
