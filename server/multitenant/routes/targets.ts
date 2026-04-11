import { Router } from "express";
import { tenantFromHeader, authAndTenantGuard } from "../auth/tenantGuard.js";
import type { TenantRequest } from "../types.js";

const router = Router();
const guard = [tenantFromHeader as any, authAndTenantGuard as any];

// ─── GET /api/targets/leaderboard?month=&year= ───────────────
router.get("/leaderboard", ...guard, async (req: TenantRequest, res) => {
  const now = new Date();
  const month = parseInt((req.query.month as string) || String(now.getMonth() + 1));
  const year  = parseInt((req.query.year  as string) || String(now.getFullYear()));

  const rows = await req.db.query(
    `SELECT
       u.id, u.username, u.full_name AS counsellor_name, u.phone,
       COALESCE(ct.revenue_target,   0) AS revenue_target,
       COALESCE(ct.admission_target, 0) AS admission_target,
       -- Actual revenue from payments recorded this month and attributed to leads assigned to this counsellor
       COALESCE((
         SELECT SUM(p.amount) FROM payments p
         JOIN leads l2 ON l2.id = p.lead_id
         WHERE l2.assigned_to = u.id
           AND DATE_TRUNC('month', p.paid_at) = make_date($2,$1,1)
           AND p.status = 'completed'
       ), 0) AS collected,
       -- Admissions this month
       COUNT(DISTINCT l.id) FILTER (
         WHERE l.stage = 'admitted'
           AND DATE_TRUNC('month', l.admitted_at) = make_date($2,$1,1)
       ) AS admissions,
       -- Total assigned leads
       COUNT(DISTINCT l.id) AS total_leads,
       -- Tasks done this month
       COUNT(DISTINCT t.id) FILTER (
         WHERE t.status = 'done'
           AND DATE_TRUNC('month', t.completed_at) = make_date($2,$1,1)
       ) AS tasks_done,
       -- Achievement %
       ROUND(100.0 * COALESCE((
         SELECT SUM(p.amount) FROM payments p
         JOIN leads l2 ON l2.id = p.lead_id
         WHERE l2.assigned_to = u.id
           AND DATE_TRUNC('month', p.paid_at) = make_date($2,$1,1)
           AND p.status = 'completed'
       ), 0) / NULLIF(COALESCE(ct.revenue_target, 0), 0), 1) AS pct
     FROM users u
     LEFT JOIN counsellor_targets ct ON ct.user_id = u.id AND ct.month = $1 AND ct.year = $2
     LEFT JOIN leads l ON l.assigned_to = u.id
     LEFT JOIN tasks t ON t.assigned_to = u.id
     WHERE u.role IN ('counsellor','manager') AND u.is_active = true
     GROUP BY u.id, u.username, u.full_name, u.phone, ct.revenue_target, ct.admission_target
     ORDER BY collected DESC`,
    [month, year]
  );
  res.json({ ok: true, data: rows.rows, meta: { month, year } });
});

// ─── GET /api/targets/my?month=&year= ────────────────────────
router.get("/my", ...guard, async (req: TenantRequest, res) => {
  const user = (req as any).user as { id: string };
  const now = new Date();
  const month = parseInt((req.query.month as string) || String(now.getMonth() + 1));
  const year  = parseInt((req.query.year  as string) || String(now.getFullYear()));

  const row = await req.db.query(
    "SELECT * FROM counsellor_targets WHERE user_id=$1 AND month=$2 AND year=$3",
    [user.id, month, year]
  );
  res.json({ ok: true, data: row.rows[0] ?? null });
});

// ─── GET /api/targets ─────────────────────────────────────────
router.get("/", ...guard, async (req: TenantRequest, res) => {
  const { month, year } = req.query as Record<string, string>;
  const conds: string[] = ["1=1"];
  const params: unknown[] = [];
  let p = 1;
  if (month) { conds.push(`ct.month = $${p++}`); params.push(parseInt(month)); }
  if (year)  { conds.push(`ct.year  = $${p++}`); params.push(parseInt(year)); }

  const rows = await req.db.query(
    `SELECT ct.*, u.full_name FROM counsellor_targets ct
     JOIN users u ON u.id = ct.user_id
     WHERE ${conds.join(" AND ")}
     ORDER BY ct.year DESC, ct.month DESC, u.full_name`,
    params
  );
  res.json({ ok: true, data: rows.rows });
});

// ─── POST /api/targets (upsert) ───────────────────────────────
router.post("/", ...guard, async (req: TenantRequest, res) => {
  const { user_id, month, year, revenue_target, admission_target, calls_target } = req.body as Record<string, unknown>;
  if (!user_id || !month || !year) {
    res.status(400).json({ ok: false, message: "user_id, month and year required" }); return;
  }
  const row = await req.db.query(
    `INSERT INTO counsellor_targets (user_id,month,year,revenue_target,admission_target,calls_target)
     VALUES ($1,$2,$3,$4,$5,$6)
     ON CONFLICT (user_id,month,year) DO UPDATE
       SET revenue_target=$4, admission_target=$5, calls_target=$6, updated_at=now()
     RETURNING *`,
    [user_id, month, year, revenue_target ?? 0, admission_target ?? 0, calls_target ?? 0]
  );
  res.json({ ok: true, data: row.rows[0] });
});

// ─── DELETE /api/targets/:id ──────────────────────────────────
router.delete("/:id", ...guard, async (req: TenantRequest, res) => {
  await req.db.query("DELETE FROM counsellor_targets WHERE id=$1", [req.params.id]);
  res.json({ ok: true });
});

export default router;
