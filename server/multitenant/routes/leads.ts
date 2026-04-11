import { Router } from "express";
import { tenantFromHeader, authAndTenantGuard } from "../auth/tenantGuard.js";
import { leadService } from "../services/leadService.js";
import { duplicateDetectionService } from "../services/duplicateDetectionService.js";
import { insertLeadSchema } from "../../../shared/schema.js";
import { leadQuerySchema } from "../../../shared/types.js";
import type { TenantRequest } from "../types.js";

const router = Router();
const guard = [tenantFromHeader as any, authAndTenantGuard as any];

// ── Specific routes MUST come before /:id ──────────────────────

// GET /api/leads/export
router.get("/export", ...guard, async (req: TenantRequest, res) => {
  const { reportService } = await import("../services/reportService.js");
  const { fromDate, toDate, stage, assignedTo } = req.query as Record<string, string>;
  const buffer = await reportService.exportExcel(req.db, "all_leads", { fromDate, toDate, stage, assignedTo });
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="leads-export-${Date.now()}.xlsx"`);
  res.send(buffer);
});

// GET /api/leads/import-template
router.get("/import-template", ...guard, (_req, res) => {
  import("exceljs").then(({ default: ExcelJS }) => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Leads Import");
    ws.columns = [
      { header: "Full Name *",    key: "full_name",      width: 22 },
      { header: "Phone *",        key: "phone",          width: 16 },
      { header: "Email",          key: "email",          width: 28 },
      { header: "City",           key: "city",           width: 16 },
      { header: "Qualification",  key: "qualification",  width: 18 },
      { header: "Course",         key: "course",         width: 20 },
      { header: "Source",         key: "source",         width: 16 },
      { header: "Campaign",       key: "campaign",       width: 20 },
    ];
    const row = ws.getRow(1);
    row.font = { bold: true, color: { argb: "FFFFFFFF" } };
    row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E40AF" } };
    ws.addRow(["John Doe", "9876543210", "john@email.com", "Chennai", "B.Tech", "Full Stack Dev", "walk_in", ""]);
    ws.addRow(["Jane Smith", "8765432109", "", "Bangalore", "B.Sc", "Data Science", "website", ""]);
    wb.xlsx.writeBuffer().then((buf) => {
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", 'attachment; filename="leads-import-template.xlsx"');
      res.send(Buffer.from(buf));
    });
  });
});

// POST /api/leads/bulk/assign
router.post("/bulk/assign", ...guard, async (req: TenantRequest, res) => {
  const { ids, userId } = req.body as { ids: string[]; userId: string };
  if (!Array.isArray(ids) || !ids.length || !userId) {
    res.status(400).json({ ok: false, message: "ids (array) and userId required" });
    return;
  }
  const placeholders = ids.map((_, i) => `$${i + 2}`).join(",");
  await req.db.query(
    `UPDATE leads SET assigned_to = $1, updated_at = now() WHERE id IN (${placeholders})`,
    [userId, ...ids]
  );
  res.json({ ok: true, data: { updated: ids.length } });
});

// POST /api/leads/bulk/stage
router.post("/bulk/stage", ...guard, async (req: TenantRequest, res) => {
  const { ids, stage, note } = req.body as { ids: string[]; stage: string; note?: string };
  if (!Array.isArray(ids) || !ids.length || !stage) {
    res.status(400).json({ ok: false, message: "ids (array) and stage required" });
    return;
  }
  const placeholders = ids.map((_, i) => `$${i + 2}`).join(",");
  await req.db.query(
    `UPDATE leads SET stage = $1, updated_at = now() WHERE id IN (${placeholders})`,
    [stage, ...ids]
  );
  for (const id of ids) {
    await req.db.query(
      "INSERT INTO lead_stage_history (lead_id, to_stage, changed_by, note) VALUES ($1,$2,$3,$4)",
      [id, stage, req.user!.sub, note ?? null]
    );
  }
  res.json({ ok: true, data: { updated: ids.length } });
});

// ── Generic CRUD routes ────────────────────────────────────────

// GET /api/leads
router.get("/", ...guard, async (req: TenantRequest, res) => {
  const query = leadQuerySchema.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ ok: false, code: "VALIDATION_ERROR", message: query.error.message });
    return;
  }
  const result = await leadService.list(req.db, req.tenantId, query.data);
  res.json({ ok: true, ...result });
});

// GET /api/leads/:id
router.get("/:id", ...guard, async (req: TenantRequest, res) => {
  const lead = await leadService.getById(req.db, req.params["id"]!);
  if (!lead) { res.status(404).json({ ok: false, code: "NOT_FOUND", message: "Lead not found" }); return; }
  res.json({ ok: true, data: lead });
});

// POST /api/leads
router.post("/", ...guard, async (req: TenantRequest, res) => {
  const parsed = insertLeadSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ ok: false, code: "VALIDATION_ERROR", message: parsed.error.message });
    return;
  }
  const result = await leadService.create(req.db, req.tenantId, parsed.data, req.user!.sub);
  res.status(201).json({ ok: true, data: result });
});

// PATCH /api/leads/:id
router.patch("/:id", ...guard, async (req: TenantRequest, res) => {
  await leadService.update(req.db, req.params["id"]!, req.body);
  res.json({ ok: true, data: { id: req.params["id"] } });
});

// PATCH /api/leads/:id/stage
router.patch("/:id/stage", ...guard, async (req: TenantRequest, res) => {
  const { stage, note } = req.body as { stage: string; note?: string };
  if (!stage) { res.status(400).json({ ok: false, code: "MISSING_STAGE", message: "stage required" }); return; }
  const result = await leadService.updateStage(req.db, req.tenantId, req.params["id"]!, stage, req.user!.sub, note);
  res.json({ ok: true, data: result });
});

// PATCH /api/leads/:id/assign
router.patch("/:id/assign", ...guard, async (req: TenantRequest, res) => {
  const { userId } = req.body as { userId: string };
  if (!userId) { res.status(400).json({ ok: false, code: "MISSING_USER", message: "userId required" }); return; }
  const result = await leadService.assign(req.db, req.tenantId, req.params["id"]!, userId);
  res.json({ ok: true, data: result });
});

// POST /api/leads/:id/merge
router.post("/:id/merge", ...guard, async (req: TenantRequest, res) => {
  const { masterId } = req.body as { masterId: string };
  if (!masterId) { res.status(400).json({ ok: false, code: "MISSING_MASTER", message: "masterId required" }); return; }
  const result = await duplicateDetectionService.merge(req.db, req.params["id"]!, masterId, req.user!.sub);
  res.json({ ok: true, data: result });
});

// ─── GET /api/leads/:id/referrals — leads referred by this person ────────────
router.get("/:id/referrals", ...guard, async (req: TenantRequest, res) => {
  const rows = await req.db.query(
    `SELECT l.id, l.lead_no, l.full_name, l.phone, l.stage, l.admitted_at, l.created_at,
            rr.status AS reward_status, rr.sent_at AS reward_sent_at
     FROM leads l
     LEFT JOIN referral_rewards rr ON rr.referred_id = l.id AND rr.referrer_id = $1
     WHERE l.referred_by = $1
     ORDER BY l.created_at DESC`,
    [req.params.id]
  );
  res.json({ ok: true, data: rows.rows });
});

// ─── GET /api/leads/referral-stats — top referrers ──────────────────────────
router.get("/referral-stats", ...guard, async (req: TenantRequest, res) => {
  const rows = await req.db.query(`
    SELECT
      l.id, l.full_name, l.phone,
      COUNT(r.id)::int                                             AS total_referrals,
      COUNT(r.id) FILTER (WHERE r.stage = 'admitted')::int        AS admitted_referrals,
      COUNT(rr.id) FILTER (WHERE rr.status = 'sent')::int         AS rewards_sent
    FROM leads l
    JOIN leads r ON r.referred_by = l.id
    LEFT JOIN referral_rewards rr ON rr.referrer_id = l.id
    GROUP BY l.id, l.full_name, l.phone
    ORDER BY total_referrals DESC
    LIMIT 20
  `);
  res.json({ ok: true, data: rows.rows });
});

// ─── PATCH /api/leads/:id/referred-by ───────────────────────────────────────
router.patch("/:id/referred-by", ...guard, async (req: TenantRequest, res) => {
  const { referredBy } = req.body as { referredBy: string | null };
  await req.db.query(
    "UPDATE leads SET referred_by = $2, updated_at = now() WHERE id = $1",
    [req.params.id, referredBy ?? null]
  );
  res.json({ ok: true });
});

export default router;
