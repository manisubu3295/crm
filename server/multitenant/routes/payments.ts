import { Router } from "express";
import { tenantFromHeader, authAndTenantGuard } from "../auth/tenantGuard.js";
import type { TenantRequest } from "../types.js";

const router = Router();
const guard = [tenantFromHeader as any, authAndTenantGuard as any];

// ─── GET /api/payments/stats ─────────────────────────────────
router.get("/stats", ...guard, async (req: TenantRequest, res) => {
  const rows = await req.db.query(`
    SELECT
      COALESCE(SUM(amount) FILTER (WHERE paid_at::date = CURRENT_DATE AND status='completed'), 0)           AS today,
      COALESCE(SUM(amount) FILTER (WHERE DATE_TRUNC('month', paid_at) = DATE_TRUNC('month', now()) AND status='completed'), 0) AS this_month,
      COALESCE(SUM(amount) FILTER (WHERE status='completed'), 0)                                            AS all_time,
      COUNT(*) FILTER (WHERE status='pending')                                                              AS pending_count,
      COALESCE(SUM(amount) FILTER (WHERE status='pending'), 0)                                              AS pending_amount
    FROM payments
  `);
  res.json({ ok: true, data: rows.rows[0] });
});

// ─── GET /api/payments/revenue-trend ─────────────────────────
router.get("/revenue-trend", ...guard, async (req: TenantRequest, res) => {
  const { days = "30" } = req.query as { days?: string };
  const d = Math.min(90, Math.max(7, parseInt(days)));
  const rows = await req.db.query(
    `SELECT
       paid_at::date AS date,
       SUM(amount) AS revenue,
       COUNT(*) AS count
     FROM payments
     WHERE status = 'completed'
       AND paid_at >= now() - ($1 || ' days')::interval
     GROUP BY paid_at::date
     ORDER BY date`,
    [d]
  );
  res.json({ ok: true, data: rows.rows });
});

// ─── GET /api/payments ───────────────────────────────────────
router.get("/", ...guard, async (req: TenantRequest, res) => {
  const { leadId, method, status, fromDate, toDate, page = "1", limit = "50" } = req.query as Record<string, string>;
  const pg = Math.max(1, parseInt(page));
  const lm = Math.min(200, Math.max(1, parseInt(limit)));
  const offset = (pg - 1) * lm;

  const conds: string[] = ["1=1"];
  const params: unknown[] = [];
  let p = 1;

  if (leadId)   { conds.push(`p.lead_id = $${p++}`);    params.push(leadId); }
  if (method)   { conds.push(`p.method = $${p++}`);     params.push(method); }
  if (status)   { conds.push(`p.status = $${p++}`);     params.push(status); }
  if (fromDate) { conds.push(`p.paid_at >= $${p++}`);   params.push(fromDate); }
  if (toDate)   { conds.push(`p.paid_at <= $${p++}`);   params.push(toDate); }

  const where = conds.join(" AND ");
  const [rows, count] = await Promise.all([
    req.db.query(
      `SELECT p.*, l.full_name AS lead_name, l.phone AS lead_phone,
              u.full_name AS recorded_by_name
       FROM payments p
       LEFT JOIN leads l ON l.id = p.lead_id
       LEFT JOIN users u ON u.id = p.recorded_by
       WHERE ${where}
       ORDER BY p.paid_at DESC
       LIMIT $${p} OFFSET $${p + 1}`,
      [...params, lm, offset]
    ),
    req.db.query(`SELECT COUNT(*) FROM payments p WHERE ${where}`, params),
  ]);

  res.json({ ok: true, data: rows.rows, meta: { total: parseInt(count.rows[0].count), page: pg, limit: lm } });
});

// ─── POST /api/payments ──────────────────────────────────────
router.post("/", ...guard, async (req: TenantRequest, res) => {
  const user = (req as any).user as { id: string };
  const { lead_id, plan_id, amount, method = "cash", status = "completed",
          receipt_no, installment_no = 1, notes, paid_at } = req.body as Record<string, unknown>;

  if (!lead_id || !amount) {
    res.status(400).json({ ok: false, message: "lead_id and amount required" });
    return;
  }

  const row = await req.db.query(
    `INSERT INTO payments (lead_id, plan_id, amount, method, status, receipt_no, installment_no, notes, paid_at, recorded_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,COALESCE($9::timestamptz, now()),$10)
     RETURNING *`,
    [lead_id, plan_id ?? null, amount, method, status, receipt_no ?? null,
     installment_no, notes ?? null, paid_at ?? null, user.id]
  );
  res.status(201).json({ ok: true, data: row.rows[0] });
});

// ─── PATCH /api/payments/:id ─────────────────────────────────
router.patch("/:id", ...guard, async (req: TenantRequest, res) => {
  const { status, notes, receipt_no } = req.body as Record<string, unknown>;
  const row = await req.db.query(
    `UPDATE payments
     SET status = COALESCE($2, status),
         notes  = COALESCE($3, notes),
         receipt_no = COALESCE($4, receipt_no)
     WHERE id = $1 RETURNING *`,
    [req.params.id, status ?? null, notes ?? null, receipt_no ?? null]
  );
  if (!row.rows.length) { res.status(404).json({ ok: false, message: "Not found" }); return; }
  res.json({ ok: true, data: row.rows[0] });
});

// ─── DELETE /api/payments/:id ────────────────────────────────
router.delete("/:id", ...guard, async (req: TenantRequest, res) => {
  await req.db.query("DELETE FROM payments WHERE id = $1", [req.params.id]);
  res.json({ ok: true });
});

// ─── GET /api/payments/by-lead/:leadId ──────────────────────
router.get("/by-lead/:leadId", ...guard, async (req: TenantRequest, res) => {
  const { leadId } = req.params;
  const [plan, payments] = await Promise.all([
    req.db.query("SELECT * FROM payment_plans WHERE lead_id = $1 ORDER BY created_at DESC LIMIT 1", [leadId]),
    req.db.query(
      `SELECT p.*, u.full_name AS recorded_by_name
       FROM payments p LEFT JOIN users u ON u.id = p.recorded_by
       WHERE p.lead_id = $1 ORDER BY p.paid_at DESC`,
      [leadId]
    ),
  ]);
  const totalPaid = payments.rows.reduce((s: number, r: any) => s + parseFloat(r.amount ?? 0), 0);
  res.json({ ok: true, data: { plan: plan.rows[0] ?? null, payments: payments.rows, totalPaid } });
});

// ─── POST /api/payments/plans ────────────────────────────────
router.post("/plans", ...guard, async (req: TenantRequest, res) => {
  const { lead_id, total_fee, discount = 0, installments = 1, notes } = req.body as Record<string, unknown>;
  if (!lead_id || !total_fee) {
    res.status(400).json({ ok: false, message: "lead_id and total_fee required" });
    return;
  }
  const row = await req.db.query(
    `INSERT INTO payment_plans (lead_id, total_fee, discount, installments, notes)
     VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT DO NOTHING
     RETURNING *`,
    [lead_id, total_fee, discount, installments, notes ?? null]
  );
  if (!row.rows.length) {
    // update existing
    const upd = await req.db.query(
      `UPDATE payment_plans
       SET total_fee=$2, discount=$3, installments=$4, notes=COALESCE($5,notes), updated_at=now()
       WHERE lead_id=$1 RETURNING *`,
      [lead_id, total_fee, discount, installments, notes ?? null]
    );
    res.json({ ok: true, data: upd.rows[0] });
    return;
  }
  res.status(201).json({ ok: true, data: row.rows[0] });
});

export default router;
