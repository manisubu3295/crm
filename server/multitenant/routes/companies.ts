import { Router } from "express";
import { tenantFromHeader, authAndTenantGuard } from "../auth/tenantGuard.js";
import type { TenantRequest } from "../types.js";

const router = Router();
const guard = [tenantFromHeader as any, authAndTenantGuard as any];

// ─── GET /api/companies/stats ─────────────────────────────────
router.get("/stats", ...guard, async (req: TenantRequest, res) => {
  const rows = await req.db.query(`
    SELECT
      (SELECT COUNT(*) FROM companies) AS total_companies,
      (SELECT COUNT(*) FROM corporate_deals WHERE stage NOT IN ('won','lost')) AS active_deals,
      (SELECT COUNT(*) FROM corporate_deals WHERE stage = 'won') AS won_deals,
      (SELECT COALESCE(SUM(total_value),0) FROM corporate_deals WHERE stage = 'won') AS won_value,
      (SELECT COALESCE(SUM(total_value),0) FROM corporate_deals WHERE stage NOT IN ('won','lost')) AS pipeline_value
  `);
  res.json({ ok: true, data: rows.rows[0] });
});

// ─── GET /api/companies ───────────────────────────────────────
router.get("/", ...guard, async (req: TenantRequest, res) => {
  const { search, page = "1", limit = "50" } = req.query as Record<string, string>;
  const pg  = Math.max(1, parseInt(page));
  const lm  = Math.min(200, Math.max(1, parseInt(limit)));
  const off = (pg - 1) * lm;

  const conds: string[] = ["1=1"];
  const params: unknown[] = [];
  let p = 1;
  if (search) { conds.push(`(c.name ILIKE $${p} OR c.contact_person ILIKE $${p} OR c.phone ILIKE $${p})`); params.push(`%${search}%`); p++; }
  const where = conds.join(" AND ");

  const [rows, count] = await Promise.all([
    req.db.query(
      `SELECT c.*,
              u.full_name AS assigned_to_name,
              (SELECT COUNT(*) FROM corporate_deals d WHERE d.company_id = c.id AND d.stage NOT IN ('won','lost')) AS active_deals,
              (SELECT COALESCE(SUM(total_value),0) FROM corporate_deals d WHERE d.company_id = c.id AND d.stage = 'won') AS won_value
       FROM companies c
       LEFT JOIN users u ON u.id = c.assigned_to
       WHERE ${where}
       ORDER BY c.updated_at DESC
       LIMIT $${p} OFFSET $${p + 1}`,
      [...params, lm, off]
    ),
    req.db.query(`SELECT COUNT(*) FROM companies c WHERE ${where}`, params),
  ]);
  res.json({ ok: true, data: rows.rows, meta: { total: parseInt(count.rows[0].count), page: pg, limit: lm } });
});

// ─── POST /api/companies ──────────────────────────────────────
router.post("/", ...guard, async (req: TenantRequest, res) => {
  const user = (req as any).user as { id: string };
  const { name, industry, contact_person, phone, email, city, website, gst_number, notes, assigned_to } = req.body as Record<string, unknown>;
  if (!name) { res.status(400).json({ ok: false, message: "name required" }); return; }
  const row = await req.db.query(
    `INSERT INTO companies (name,industry,contact_person,phone,email,city,website,gst_number,notes,assigned_to,created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
    [name, industry??null, contact_person??null, phone??null, email??null, city??null, website??null, gst_number??null, notes??null, assigned_to??null, user.id]
  );
  res.status(201).json({ ok: true, data: row.rows[0] });
});

// ─── GET /api/companies/:id ───────────────────────────────────
router.get("/:id", ...guard, async (req: TenantRequest, res) => {
  const [company, contacts, deals] = await Promise.all([
    req.db.query(
      `SELECT c.*, u.full_name AS assigned_to_name FROM companies c LEFT JOIN users u ON u.id=c.assigned_to WHERE c.id=$1`,
      [req.params.id]
    ),
    req.db.query(
      `SELECT cc.*, l.full_name AS lead_name, l.phone AS lead_phone FROM company_contacts cc LEFT JOIN leads l ON l.id=cc.lead_id WHERE cc.company_id=$1 ORDER BY cc.is_primary DESC`,
      [req.params.id]
    ),
    req.db.query(
      `SELECT d.*, c.name AS course_name, u.full_name AS assigned_to_name FROM corporate_deals d LEFT JOIN courses c ON c.id=d.course_id LEFT JOIN users u ON u.id=d.assigned_to WHERE d.company_id=$1 ORDER BY d.created_at DESC`,
      [req.params.id]
    ),
  ]);
  if (!company.rows.length) { res.status(404).json({ ok: false, message: "Not found" }); return; }
  res.json({ ok: true, data: { ...company.rows[0], contacts: contacts.rows, deals: deals.rows } });
});

// ─── PATCH /api/companies/:id ─────────────────────────────────
router.patch("/:id", ...guard, async (req: TenantRequest, res) => {
  const f = req.body as Record<string, unknown>;
  const row = await req.db.query(
    `UPDATE companies SET
       name=COALESCE($2,name), industry=COALESCE($3,industry), contact_person=COALESCE($4,contact_person),
       phone=COALESCE($5,phone), email=COALESCE($6,email), city=COALESCE($7,city),
       website=COALESCE($8,website), gst_number=COALESCE($9,gst_number),
       notes=COALESCE($10,notes), assigned_to=COALESCE($11,assigned_to), updated_at=now()
     WHERE id=$1 RETURNING *`,
    [req.params.id, f.name??null, f.industry??null, f.contact_person??null, f.phone??null, f.email??null, f.city??null, f.website??null, f.gst_number??null, f.notes??null, f.assigned_to??null]
  );
  if (!row.rows.length) { res.status(404).json({ ok: false, message: "Not found" }); return; }
  res.json({ ok: true, data: row.rows[0] });
});

// ─── POST /api/companies/:id/contacts ────────────────────────
router.post("/:id/contacts", ...guard, async (req: TenantRequest, res) => {
  const { lead_id, role, is_primary = false } = req.body as Record<string, unknown>;
  const row = await req.db.query(
    `INSERT INTO company_contacts (company_id,lead_id,role,is_primary) VALUES ($1,$2,$3,$4) RETURNING *`,
    [req.params.id, lead_id??null, role??null, is_primary]
  );
  res.status(201).json({ ok: true, data: row.rows[0] });
});

// ─── DELETE /api/companies/:id/contacts/:contactId ────────────
router.delete("/:id/contacts/:contactId", ...guard, async (req: TenantRequest, res) => {
  await req.db.query("DELETE FROM company_contacts WHERE id=$1 AND company_id=$2", [req.params.contactId, req.params.id]);
  res.json({ ok: true });
});

// ─── POST /api/companies/:id/deals ───────────────────────────
router.post("/:id/deals", ...guard, async (req: TenantRequest, res) => {
  const user = (req as any).user as { id: string };
  const { name, course_id, total_value = 0, trainees_count = 0, stage = "prospect", expected_close_date, notes } = req.body as Record<string, unknown>;
  if (!name) { res.status(400).json({ ok: false, message: "name required" }); return; }
  const row = await req.db.query(
    `INSERT INTO corporate_deals (company_id,name,course_id,total_value,trainees_count,stage,expected_close_date,notes,assigned_to)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
    [req.params.id, name, course_id??null, total_value, trainees_count, stage, expected_close_date??null, notes??null, user.id]
  );
  res.status(201).json({ ok: true, data: row.rows[0] });
});

// ─── PATCH /api/companies/deals/:dealId ──────────────────────
router.patch("/deals/:dealId", ...guard, async (req: TenantRequest, res) => {
  const f = req.body as Record<string, unknown>;
  const wonAt = f.stage === "won" ? "now()" : "won_at";
  const row = await req.db.query(
    `UPDATE corporate_deals SET
       name=COALESCE($2,name), stage=COALESCE($3,stage), total_value=COALESCE($4,total_value),
       trainees_count=COALESCE($5,trainees_count), notes=COALESCE($6,notes),
       lost_reason=COALESCE($7,lost_reason), expected_close_date=COALESCE($8,expected_close_date),
       won_at = CASE WHEN $3='won' THEN now() ELSE won_at END,
       updated_at=now()
     WHERE id=$1 RETURNING *`,
    [req.params.dealId, f.name??null, f.stage??null, f.total_value??null, f.trainees_count??null, f.notes??null, f.lost_reason??null, f.expected_close_date??null]
  );
  if (!row.rows.length) { res.status(404).json({ ok: false, message: "Not found" }); return; }
  res.json({ ok: true, data: row.rows[0] });
});

export default router;
