import { Router } from "express";
import { tenantFromHeader, authAndTenantGuard } from "../auth/tenantGuard.js";
import { reportService } from "../services/reportService.js";
import { reportExportSchema } from "../../../shared/types.js";
import type { TenantRequest } from "../types.js";

const router = Router();
const guard = [tenantFromHeader as any, authAndTenantGuard as any];

// GET /api/reports/funnel
router.get("/funnel", ...guard, async (req: TenantRequest, res) => {
  const { fromDate, toDate } = req.query as { fromDate?: string; toDate?: string };
  const dateFilter = buildDateFilter(fromDate, toDate);

  const result = await req.db.query(
    `SELECT
       stage,
       COUNT(*) AS count,
       ROUND(100.0 * COUNT(*) / NULLIF(SUM(COUNT(*)) OVER (), 0), 1) AS pct
     FROM leads
     WHERE 1=1 ${dateFilter.sql}
     GROUP BY stage
     ORDER BY
       CASE stage
         WHEN 'new' THEN 1 WHEN 'contacted' THEN 2 WHEN 'qualified' THEN 3
         WHEN 'demo' THEN 4 WHEN 'interested' THEN 5 WHEN 'payment' THEN 6
         WHEN 'admitted' THEN 7 WHEN 'lost' THEN 8 ELSE 9
       END`,
    dateFilter.params
  );

  // Conversion rate: new → admitted
  const totals = await req.db.query(
    `SELECT
       COUNT(*) FILTER (WHERE stage != 'lost') AS active,
       COUNT(*) FILTER (WHERE stage = 'admitted') AS admitted,
       COUNT(*) FILTER (WHERE stage = 'lost') AS lost,
       COUNT(*) AS total
     FROM leads WHERE 1=1 ${dateFilter.sql}`,
    dateFilter.params
  );

  res.json({ ok: true, data: { stages: result.rows, totals: totals.rows[0] } });
});

// GET /api/reports/counsellor
router.get("/counsellor", ...guard, async (req: TenantRequest, res) => {
  const { fromDate, toDate, counsellorId } = req.query as { fromDate?: string; toDate?: string; counsellorId?: string };
  const dateFilter = buildDateFilter(fromDate, toDate);

  let userFilter = "";
  const params = [...dateFilter.params];
  if (counsellorId) { userFilter = `AND l.assigned_to = $${params.length + 1}`; params.push(counsellorId); }

  const result = await req.db.query(
    `SELECT
       u.id, u.full_name,
       COUNT(DISTINCT l.id) AS total_leads,
       COUNT(DISTINCT l.id) FILTER (WHERE l.stage = 'admitted') AS admissions,
       COUNT(DISTINCT t.id) FILTER (WHERE t.task_type = 'call' AND t.status = 'done') AS calls_made,
       COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'overdue') AS overdue_tasks,
       ROUND(AVG(l.lead_score), 1) AS avg_lead_score,
       ROUND(100.0 * COUNT(DISTINCT l.id) FILTER (WHERE l.stage = 'admitted') /
             NULLIF(COUNT(DISTINCT l.id), 0), 1) AS conversion_rate
     FROM users u
     LEFT JOIN leads l ON l.assigned_to = u.id ${dateFilter.sql.replace("WHERE 1=1", "AND 1=1")}
     LEFT JOIN tasks t ON t.lead_id = l.id
     WHERE u.role = 'counsellor' AND u.is_active = TRUE ${userFilter}
     GROUP BY u.id, u.full_name
     ORDER BY admissions DESC`,
    params
  );

  res.json({ ok: true, data: result.rows });
});

// GET /api/reports/campaign-roi
router.get("/campaign-roi", ...guard, async (req: TenantRequest, res) => {
  const { fromDate, toDate } = req.query as { fromDate?: string; toDate?: string };
  const dateFilter = buildDateFilter(fromDate, toDate, "c.start_date");

  const result = await req.db.query(
    `SELECT
       c.id, c.name, c.source, c.budget,
       COALESCE(SUM(cs.leads_count), 0) AS total_leads,
       COALESCE(SUM(cs.admitted_count), 0) AS total_admissions,
       COALESCE(SUM(cs.spend), 0) AS total_spend,
       CASE WHEN SUM(cs.leads_count) > 0
         THEN ROUND(SUM(cs.spend) / SUM(cs.leads_count), 2) ELSE 0 END AS cost_per_lead,
       CASE WHEN SUM(cs.admitted_count) > 0
         THEN ROUND(SUM(cs.spend) / SUM(cs.admitted_count), 2) ELSE 0 END AS cost_per_admission,
       ROUND(100.0 * SUM(cs.admitted_count) / NULLIF(SUM(cs.leads_count), 0), 1) AS conversion_rate
     FROM campaigns c
     LEFT JOIN campaign_stats cs ON cs.campaign_id = c.id
     WHERE 1=1 ${dateFilter.sql.replace("WHERE 1=1", "AND 1=1")}
     GROUP BY c.id, c.name, c.source, c.budget
     ORDER BY total_admissions DESC`,
    dateFilter.params
  );

  res.json({ ok: true, data: result.rows });
});

// GET /api/reports/conversion  — daily/weekly trend
router.get("/conversion", ...guard, async (req: TenantRequest, res) => {
  const { period = "7d" } = req.query as { period?: "7d" | "30d" | "90d" };
  const days = period === "90d" ? 90 : period === "30d" ? 30 : 7;

  const result = await req.db.query(
    `SELECT
       DATE_TRUNC('day', created_at)::date AS date,
       COUNT(*) AS leads_created,
       COUNT(*) FILTER (WHERE stage = 'admitted') AS admitted
     FROM leads
     WHERE created_at >= now() - ($1 || ' days')::INTERVAL
     GROUP BY 1
     ORDER BY 1`,
    [days]
  );

  // Source breakdown for the period
  const sources = await req.db.query(
    `SELECT source, COUNT(*) AS count
     FROM leads WHERE created_at >= now() - ($1 || ' days')::INTERVAL
     GROUP BY source ORDER BY count DESC`,
    [days]
  );

  res.json({ ok: true, data: { trend: result.rows, sources: sources.rows } });
});

// GET /api/reports/response-time  — SLA performance
router.get("/response-time", ...guard, async (req: TenantRequest, res) => {
  const result = await req.db.query(
    `SELECT
       u.full_name AS counsellor,
       COUNT(st.id) AS total_sla_cases,
       COUNT(st.id) FILTER (WHERE st.breached = FALSE) AS within_sla,
       COUNT(st.id) FILTER (WHERE st.breached = TRUE) AS breached,
       ROUND(100.0 * COUNT(st.id) FILTER (WHERE st.breached = FALSE) /
             NULLIF(COUNT(st.id), 0), 1) AS sla_compliance_pct
     FROM users u
     JOIN leads l ON l.assigned_to = u.id
     JOIN sla_tracking st ON st.lead_id = l.id
     WHERE u.role = 'counsellor'
     GROUP BY u.id, u.full_name
     ORDER BY sla_compliance_pct ASC`
  );
  res.json({ ok: true, data: result.rows });
});

// POST /api/reports/export  — PDF or Excel download
router.post("/export", ...guard, async (req: TenantRequest, res) => {
  const parsed = reportExportSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ ok: false, code: "VALIDATION_ERROR", message: parsed.error.message });
    return;
  }

  const { type, format, fromDate, toDate, counsellorId, campaignId } = parsed.data;

  if (format === "excel") {
    const buffer = await reportService.exportExcel(req.db, type, { fromDate, toDate, counsellorId, campaignId });
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${type}-report-${Date.now()}.xlsx"`);
    res.send(buffer);
  } else {
    const pdf = await reportService.exportPdf(req.db, req.tenantId, type, { fromDate, toDate });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${type}-report-${Date.now()}.pdf"`);
    res.send(pdf);
  }
});

// ─── Helper ───────────────────────────────────────────────────

function buildDateFilter(fromDate?: string, toDate?: string, col = "created_at") {
  const params: string[] = [];
  const clauses: string[] = [];
  if (fromDate) { params.push(fromDate); clauses.push(`${col} >= $${params.length}`); }
  if (toDate)   { params.push(toDate);   clauses.push(`${col} <= $${params.length}`); }
  return { sql: clauses.length ? `AND ${clauses.join(" AND ")}` : "", params };
}

export default router;
