import { Router } from "express";
import bcrypt from "bcryptjs";
import multer from "multer";
import { tenantFromHeader, authAndTenantGuard, requireRole } from "../auth/tenantGuard.js";
import { importService } from "../services/importService.js";
import { env } from "../env.js";
import { registerTenant } from "../tenant/registry.js";
import { ensureTenantReady } from "../tenant/ensureReady.js";
import type { TenantRequest } from "../types.js";

const router = Router();
const guard = [tenantFromHeader as any, authAndTenantGuard as any];
const adminGuard = [...guard, requireRole("admin") as any];

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// ─── Users ────────────────────────────────────────────────────

router.get("/users", ...adminGuard, async (req: TenantRequest, res) => {
  const result = await req.db.query(
    "SELECT id, username, full_name, email, phone, role, is_active, created_at FROM users ORDER BY full_name"
  );
  res.json({ ok: true, data: result.rows });
});

router.post("/users", ...adminGuard, async (req: TenantRequest, res) => {
  const { username, password, fullName, email, phone, role } = req.body as {
    username: string; password: string; fullName: string; email?: string; phone?: string; role?: string;
  };
  if (!username || !password || !fullName) {
    res.status(400).json({ ok: false, message: "username, password, fullName required" });
    return;
  }
  const hash = await bcrypt.hash(password, 12);
  const result = await req.db.query(
    `INSERT INTO users (username, password_hash, full_name, email, phone, role)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, username, full_name, email, role`,
    [username, hash, fullName, email ?? null, phone ?? null, role ?? "counsellor"]
  );
  res.status(201).json({ ok: true, data: result.rows[0] });
});

router.patch("/users/:id", ...adminGuard, async (req: TenantRequest, res) => {
  const { fullName, email, phone, role, isActive, password } = req.body as {
    fullName?: string; email?: string; phone?: string; role?: string; isActive?: boolean; password?: string;
  };
  const sets: string[] = [];
  const params: unknown[] = [req.params["id"]];
  let p = 2;
  if (fullName !== undefined)  { sets.push(`full_name = $${p++}`); params.push(fullName); }
  if (email !== undefined)     { sets.push(`email = $${p++}`); params.push(email); }
  if (phone !== undefined)     { sets.push(`phone = $${p++}`); params.push(phone); }
  if (role !== undefined)      { sets.push(`role = $${p++}`); params.push(role); }
  if (isActive !== undefined)  { sets.push(`is_active = $${p++}`); params.push(isActive); }
  if (password)                { sets.push(`password_hash = $${p++}`); params.push(await bcrypt.hash(password, 12)); }
  if (!sets.length) { res.json({ ok: true }); return; }
  await req.db.query(`UPDATE users SET ${sets.join(", ")} WHERE id = $1`, params);
  res.json({ ok: true });
});

// ─── Courses ──────────────────────────────────────────────────

router.get("/courses/stats", ...guard, async (req: TenantRequest, res) => {
  const r = await req.db.query(`
    SELECT
      COUNT(*)::int                                   AS total_courses,
      COUNT(*) FILTER (WHERE is_active)::int          AS active_courses,
      COALESCE((SELECT COUNT(*) FROM batches), 0)::int AS total_batches,
      COALESCE((SELECT COUNT(*) FROM enrollments), 0)::int AS total_enrollments,
      COALESCE((SELECT SUM(amount) FROM payments WHERE status = 'completed'), 0)::numeric AS total_revenue
    FROM courses
  `);
  res.json({ ok: true, data: r.rows[0] });
});

router.get("/courses", ...guard, async (req: TenantRequest, res) => {
  const result = await req.db.query(`
    SELECT
      c.*,
      COUNT(DISTINCT b.id)::int  AS batch_count,
      COUNT(DISTINCT e.id)::int  AS enrollment_count,
      COUNT(DISTINCT l.id)::int  AS lead_count
    FROM courses c
    LEFT JOIN batches      b ON b.course_id = c.id
    LEFT JOIN enrollments  e ON e.batch_id  = b.id
    LEFT JOIN leads        l ON l.course_id = c.id
    GROUP BY c.id
    ORDER BY c.sort_order, c.name
  `);
  res.json({ ok: true, data: result.rows });
});

router.post("/courses", ...adminGuard, async (req: TenantRequest, res) => {
  const { name, description, duration, fee, category, syllabus, certificate_offered, sort_order } =
    req.body as { name: string; description?: string; duration?: string; fee?: number; category?: string; syllabus?: string; certificate_offered?: boolean; sort_order?: number; };
  if (!name) { res.status(400).json({ ok: false, message: "name required" }); return; }
  const result = await req.db.query(
    `INSERT INTO courses (name, description, duration, fee, category, syllabus, certificate_offered, sort_order)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [name, description ?? null, duration ?? null, fee ?? null,
     category ?? null, syllabus ?? null, certificate_offered ?? true, sort_order ?? 0]
  );
  res.status(201).json({ ok: true, data: result.rows[0] });
});

router.patch("/courses/:id", ...adminGuard, async (req: TenantRequest, res) => {
  const { name, description, duration, fee, isActive, category, syllabus, certificate_offered, sort_order } =
    req.body as { name?: string; description?: string; duration?: string; fee?: number; isActive?: boolean; category?: string; syllabus?: string; certificate_offered?: boolean; sort_order?: number; };
  const sets: string[] = [];
  const params: unknown[] = [req.params["id"]];
  let p = 2;
  if (name !== undefined)                 { sets.push(`name = $${p++}`);                  params.push(name); }
  if (description !== undefined)          { sets.push(`description = $${p++}`);           params.push(description); }
  if (duration !== undefined)             { sets.push(`duration = $${p++}`);              params.push(duration); }
  if (fee !== undefined)                  { sets.push(`fee = $${p++}`);                   params.push(fee); }
  if (isActive !== undefined)             { sets.push(`is_active = $${p++}`);             params.push(isActive); }
  if (category !== undefined)             { sets.push(`category = $${p++}`);              params.push(category); }
  if (syllabus !== undefined)             { sets.push(`syllabus = $${p++}`);              params.push(syllabus); }
  if (certificate_offered !== undefined)  { sets.push(`certificate_offered = $${p++}`);  params.push(certificate_offered); }
  if (sort_order !== undefined)           { sets.push(`sort_order = $${p++}`);            params.push(sort_order); }
  if (!sets.length) { res.json({ ok: true }); return; }
  const result = await req.db.query(
    `UPDATE courses SET ${sets.join(", ")} WHERE id = $1 RETURNING *`,
    params
  );
  res.json({ ok: true, data: result.rows[0] });
});

router.delete("/courses/:id", ...adminGuard, async (req: TenantRequest, res) => {
  // Check if any leads or batches reference this course before hard deleting
  const check = await req.db.query(
    `SELECT (SELECT COUNT(*) FROM leads WHERE course_id = $1)::int   AS lead_count,
            (SELECT COUNT(*) FROM batches WHERE course_id = $1)::int AS batch_count`,
    [req.params["id"]]
  );
  const { lead_count, batch_count } = check.rows[0];
  if (lead_count > 0 || batch_count > 0) {
    // Soft-delete: deactivate instead of removing to preserve FK integrity
    await req.db.query("UPDATE courses SET is_active = false WHERE id = $1", [req.params["id"]]);
    res.json({ ok: true, archived: true, message: "Course archived (has linked data)" });
    return;
  }
  await req.db.query("DELETE FROM courses WHERE id = $1", [req.params["id"]]);
  res.json({ ok: true, deleted: true });
});

// ─── SLA Policies ─────────────────────────────────────────────

router.get("/sla-policies", ...adminGuard, async (req: TenantRequest, res) => {
  const result = await req.db.query(
    `SELECT sp.*, u.full_name AS escalate_to_name
     FROM sla_policies sp LEFT JOIN users u ON sp.escalate_to = u.id
     ORDER BY sp.stage`
  );
  res.json({ ok: true, data: result.rows });
});

router.patch("/sla-policies/:id", ...adminGuard, async (req: TenantRequest, res) => {
  const { maxResponseHours, escalateTo } = req.body as { maxResponseHours?: number; escalateTo?: string; };
  const sets: string[] = [];
  const params: unknown[] = [req.params["id"]];
  let p = 2;
  if (maxResponseHours !== undefined) { sets.push(`max_response_hours = $${p++}`); params.push(maxResponseHours); }
  if (escalateTo !== undefined)       { sets.push(`escalate_to = $${p++}`); params.push(escalateTo); }
  if (!sets.length) { res.json({ ok: true }); return; }
  await req.db.query(`UPDATE sla_policies SET ${sets.join(", ")} WHERE id = $1`, params);
  res.json({ ok: true });
});

// ─── App Settings ─────────────────────────────────────────────

router.get("/settings", ...adminGuard, async (req: TenantRequest, res) => {
  const result = await req.db.query("SELECT key, value FROM app_settings ORDER BY key");
  const settings = Object.fromEntries(result.rows.map((r) => [r.key, r.value]));
  res.json({ ok: true, data: settings });
});

router.patch("/settings", ...adminGuard, async (req: TenantRequest, res) => {
  const entries = Object.entries(req.body as Record<string, string>);
  for (const [key, value] of entries) {
    await req.db.query(
      "INSERT INTO app_settings (key, value) VALUES ($1,$2) ON CONFLICT (key) DO UPDATE SET value=$2, updated_at=now()",
      [key, value]
    );
  }
  res.json({ ok: true });
});

// ─── Lead Excel Import ────────────────────────────────────────

router.post("/import/leads", ...adminGuard, upload.single("file"), async (req: TenantRequest, res) => {
  if (!req.file) { res.status(400).json({ ok: false, message: "No file uploaded" }); return; }
  const result = await importService.importLeadsFromExcel(req.db, req.tenantId, req.file.buffer, req.user!.sub);
  res.json({ ok: true, data: result });
});

// ─── Tenant Management (no tenant guard — uses admin key) ─────

router.post("/tenants", async (req, res) => {
  const adminKey = req.headers["x-admin-key"];
  if (adminKey !== env.TENANT_ADMIN_KEY) {
    res.status(403).json({ ok: false, message: "Invalid admin key" });
    return;
  }
  const { id, dbUrl, displayName } = req.body as { id: string; dbUrl: string; displayName: string; };
  if (!id || !dbUrl || !displayName) {
    res.status(400).json({ ok: false, message: "id, dbUrl, displayName required" });
    return;
  }
  registerTenant(id, { dbUrl, displayName });
  await ensureTenantReady(id);
  res.status(201).json({ ok: true, data: { id, displayName } });
});

export default router;
