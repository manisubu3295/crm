import { Router } from "express";
import { tenantFromHeader, authAndTenantGuard } from "../auth/tenantGuard.js";
import type { TenantRequest } from "../types.js";

const router = Router();
const guard = [tenantFromHeader as any, authAndTenantGuard as any];

// ─── GET /api/placements/stats ────────────────────────────────
router.get("/stats", ...guard, async (req: TenantRequest, res) => {
  const rows = await req.db.query(`
    SELECT
      COUNT(*)::int                                                 AS total_placed,
      COUNT(*) FILTER (WHERE verified)::int                        AS verified,
      ROUND(AVG(package_lpa) FILTER (WHERE package_lpa IS NOT NULL), 2) AS avg_package,
      MAX(package_lpa)                                             AS max_package,
      MIN(package_lpa) FILTER (WHERE package_lpa IS NOT NULL)     AS min_package,
      COUNT(DISTINCT company)::int                                 AS companies_count,
      COUNT(*) FILTER (WHERE placement_date >= DATE_TRUNC('year', now()))::int AS this_year,
      -- Placement rate: placed vs total admitted
      ROUND(100.0 * COUNT(DISTINCT p.lead_id) /
        NULLIF((SELECT COUNT(*) FROM leads WHERE stage = 'admitted'), 0), 1) AS placement_rate
    FROM placements p
  `);
  res.json({ ok: true, data: rows.rows[0] });
});

// ─── GET /api/placements/by-course ───────────────────────────
router.get("/by-course", ...guard, async (req: TenantRequest, res) => {
  const rows = await req.db.query(`
    SELECT
      c.id AS course_id, c.name AS course,
      COUNT(p.id)::int AS placed,
      ROUND(AVG(p.package_lpa), 2) AS avg_package,
      MAX(p.package_lpa) AS max_package
    FROM placements p
    JOIN leads l ON l.id = p.lead_id
    JOIN courses c ON c.id = l.course_id
    GROUP BY c.id, c.name
    ORDER BY placed DESC
  `);
  res.json({ ok: true, data: rows.rows });
});

// ─── GET /api/placements/top-companies ───────────────────────
router.get("/top-companies", ...guard, async (req: TenantRequest, res) => {
  const rows = await req.db.query(`
    SELECT company, COUNT(*)::int AS count, ROUND(AVG(package_lpa), 2) AS avg_package
    FROM placements
    GROUP BY company
    ORDER BY count DESC
    LIMIT 15
  `);
  res.json({ ok: true, data: rows.rows });
});

// ─── GET /api/placements ─────────────────────────────────────
router.get("/", ...guard, async (req: TenantRequest, res) => {
  const { courseId, company, verified, page = "1", limit = "50", search } = req.query as Record<string, string>;
  const pg = Math.max(1, parseInt(page));
  const lm = Math.min(200, Math.max(1, parseInt(limit)));
  const offset = (pg - 1) * lm;

  const conds: string[] = ["1=1"];
  const params: unknown[] = [];
  let p = 1;

  if (courseId)  { conds.push(`l.course_id = $${p++}`); params.push(courseId); }
  if (company)   { conds.push(`p.company ILIKE $${p++}`); params.push(`%${company}%`); }
  if (verified === "true")  conds.push("p.verified = TRUE");
  if (verified === "false") conds.push("p.verified = FALSE");
  if (search)    { conds.push(`(l.full_name ILIKE $${p} OR p.company ILIKE $${p} OR p.role ILIKE $${p})`); params.push(`%${search}%`); p++; }

  const where = conds.join(" AND ");

  const [rows, count] = await Promise.all([
    req.db.query(
      `SELECT p.*,
              l.full_name AS student_name, l.phone AS student_phone,
              c.name AS course_name,
              u.full_name AS created_by_name
       FROM placements p
       JOIN leads l ON l.id = p.lead_id
       LEFT JOIN courses c ON c.id = l.course_id
       LEFT JOIN users u ON u.id = p.created_by
       WHERE ${where}
       ORDER BY p.placement_date DESC
       LIMIT $${p} OFFSET $${p + 1}`,
      [...params, lm, offset]
    ),
    req.db.query(`SELECT COUNT(*) FROM placements p JOIN leads l ON l.id = p.lead_id WHERE ${where}`, params),
  ]);

  res.json({ ok: true, data: rows.rows, meta: { total: parseInt(count.rows[0].count), page: pg, limit: lm } });
});

// ─── POST /api/placements ────────────────────────────────────
router.post("/", ...guard, async (req: TenantRequest, res) => {
  const user = (req as any).user as { id: string };
  const { lead_id, enrollment_id, company, role, package_lpa, placement_date,
          mode = "campus", location, notes } = req.body as Record<string, unknown>;

  if (!lead_id || !company || !role) {
    res.status(400).json({ ok: false, message: "lead_id, company, role required" });
    return;
  }

  const row = await req.db.query(
    `INSERT INTO placements
       (lead_id, enrollment_id, company, role, package_lpa, placement_date, mode, location, notes, created_by)
     VALUES ($1,$2,$3,$4,$5,COALESCE($6::date, CURRENT_DATE),$7,$8,$9,$10)
     RETURNING *`,
    [lead_id, enrollment_id ?? null, company, role, package_lpa ?? null,
     placement_date ?? null, mode, location ?? null, notes ?? null, user.id]
  );
  res.status(201).json({ ok: true, data: row.rows[0] });
});

// ─── PATCH /api/placements/:id ───────────────────────────────
router.patch("/:id", ...guard, async (req: TenantRequest, res) => {
  const user = (req as any).user as { id: string };
  const { company, role, package_lpa, placement_date, mode, location, notes, verified } = req.body as Record<string, unknown>;

  const sets: string[] = ["updated_at = now()"];
  const params: unknown[] = [req.params.id];
  let p = 2;

  if (company !== undefined)        { sets.push(`company=$${p++}`); params.push(company); }
  if (role !== undefined)           { sets.push(`role=$${p++}`); params.push(role); }
  if (package_lpa !== undefined)    { sets.push(`package_lpa=$${p++}`); params.push(package_lpa); }
  if (placement_date !== undefined) { sets.push(`placement_date=$${p++}::date`); params.push(placement_date); }
  if (mode !== undefined)           { sets.push(`mode=$${p++}`); params.push(mode); }
  if (location !== undefined)       { sets.push(`location=$${p++}`); params.push(location); }
  if (notes !== undefined)          { sets.push(`notes=$${p++}`); params.push(notes); }
  if (verified !== undefined) {
    sets.push(`verified=$${p++}`); params.push(verified);
    sets.push(`verified_by=$${p++}`); params.push(user.id);
  }

  const row = await req.db.query(
    `UPDATE placements SET ${sets.join(",")} WHERE id=$1 RETURNING *`,
    params
  );
  if (!row.rows.length) { res.status(404).json({ ok: false, message: "Not found" }); return; }
  res.json({ ok: true, data: row.rows[0] });
});

// ─── DELETE /api/placements/:id ──────────────────────────────
router.delete("/:id", ...guard, async (req: TenantRequest, res) => {
  await req.db.query("DELETE FROM placements WHERE id=$1", [req.params.id]);
  res.json({ ok: true });
});

export default router;
