import { Router } from "express";
import { tenantFromHeader, authAndTenantGuard } from "../auth/tenantGuard.js";
import type { TenantRequest } from "../types.js";

const router = Router();
const guard = [tenantFromHeader as any, authAndTenantGuard as any];

// ─── GET /api/quotations ──────────────────────────────────────
router.get("/", ...guard, async (req: TenantRequest, res) => {
  const { leadId, companyId, status, page = "1", limit = "50" } = req.query as Record<string, string>;
  const pg  = Math.max(1, parseInt(page));
  const lm  = Math.min(200, parseInt(limit));
  const off = (pg - 1) * lm;

  const conds: string[] = ["1=1"];
  const params: unknown[] = [];
  let p = 1;
  if (leadId)    { conds.push(`q.lead_id    = $${p++}`); params.push(leadId); }
  if (companyId) { conds.push(`q.company_id = $${p++}`); params.push(companyId); }
  if (status)    { conds.push(`q.status     = $${p++}`); params.push(status); }
  const where = conds.join(" AND ");

  const [rows, count] = await Promise.all([
    req.db.query(
      `SELECT q.*,
              l.full_name AS lead_name,
              co.name AS company_name,
              u.full_name AS created_by_name
       FROM quotations q
       LEFT JOIN leads l ON l.id = q.lead_id
       LEFT JOIN companies co ON co.id = q.company_id
       LEFT JOIN users u ON u.id = q.created_by
       WHERE ${where}
       ORDER BY q.created_at DESC
       LIMIT $${p} OFFSET $${p + 1}`,
      [...params, lm, off]
    ),
    req.db.query(`SELECT COUNT(*) FROM quotations q WHERE ${where}`, params),
  ]);
  res.json({ ok: true, data: rows.rows, meta: { total: parseInt(count.rows[0].count), page: pg, limit: lm } });
});

// ─── POST /api/quotations ─────────────────────────────────────
router.post("/", ...guard, async (req: TenantRequest, res) => {
  const user = (req as any).user as { id: string };
  const { lead_id, company_id, items = [], subtotal = 0, discount = 0, total, valid_until, notes } = req.body as Record<string, unknown>;

  const computedTotal = total ?? (parseFloat(String(subtotal)) - parseFloat(String(discount)));

  const quoteNoRow = await req.db.query("SELECT nextval('quote_no_seq') AS n");
  const quoteNo = `QT-${new Date().getFullYear()}-${String(quoteNoRow.rows[0].n).padStart(4, "0")}`;

  const row = await req.db.query(
    `INSERT INTO quotations (lead_id,company_id,quote_no,items,subtotal,discount,total,valid_until,notes,created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
    [lead_id??null, company_id??null, quoteNo, JSON.stringify(items), subtotal, discount, computedTotal, valid_until??null, notes??null, user.id]
  );
  res.status(201).json({ ok: true, data: row.rows[0] });
});

// ─── GET /api/quotations/:id ──────────────────────────────────
router.get("/:id", ...guard, async (req: TenantRequest, res) => {
  const row = await req.db.query(
    `SELECT q.*, l.full_name AS lead_name, l.phone AS lead_phone,
            co.name AS company_name, co.phone AS company_phone,
            u.full_name AS created_by_name
     FROM quotations q
     LEFT JOIN leads l ON l.id = q.lead_id
     LEFT JOIN companies co ON co.id = q.company_id
     LEFT JOIN users u ON u.id = q.created_by
     WHERE q.id = $1`,
    [req.params.id]
  );
  if (!row.rows.length) { res.status(404).json({ ok: false, message: "Not found" }); return; }
  res.json({ ok: true, data: row.rows[0] });
});

// ─── PATCH /api/quotations/:id ────────────────────────────────
router.patch("/:id", ...guard, async (req: TenantRequest, res) => {
  const f = req.body as Record<string, unknown>;
  const row = await req.db.query(
    `UPDATE quotations SET
       items=COALESCE($2::jsonb, items), subtotal=COALESCE($3,subtotal),
       discount=COALESCE($4,discount), total=COALESCE($5,total),
       status=COALESCE($6,status), valid_until=COALESCE($7,valid_until),
       notes=COALESCE($8,notes), updated_at=now()
     WHERE id=$1 RETURNING *`,
    [req.params.id,
     f.items ? JSON.stringify(f.items) : null,
     f.subtotal??null, f.discount??null, f.total??null,
     f.status??null, f.valid_until??null, f.notes??null]
  );
  if (!row.rows.length) { res.status(404).json({ ok: false, message: "Not found" }); return; }
  res.json({ ok: true, data: row.rows[0] });
});

export default router;
