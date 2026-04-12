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

// GET /api/reports/revenue  — monthly fee collection + course-wise breakdown
router.get("/revenue", ...guard, async (req: TenantRequest, res) => {
  const { fromDate, toDate } = req.query as { fromDate?: string; toDate?: string };
  const df = buildDateFilter(fromDate, toDate, "p.paid_at");

  const [monthly, byCourse] = await Promise.all([
    req.db.query(
      `SELECT
         DATE_TRUNC('month', p.paid_at)::date AS month,
         SUM(p.amount) AS revenue,
         COUNT(*) AS payments
       FROM payments p
       WHERE p.status = 'completed' ${df.sql}
       GROUP BY 1 ORDER BY 1`,
      df.params
    ),
    req.db.query(
      `SELECT
         c.name AS course_name,
         SUM(p.amount) AS revenue,
         COUNT(DISTINCT p.lead_id) AS students,
         COUNT(*) AS payments
       FROM payments p
       JOIN leads l ON l.id = p.lead_id
       LEFT JOIN courses c ON c.id = l.course_id
       WHERE p.status = 'completed' ${df.sql}
       GROUP BY c.name ORDER BY revenue DESC`,
      df.params
    ),
  ]);

  const total = monthly.rows.reduce((s: number, r: any) => s + parseFloat(r.revenue), 0);
  res.json({ ok: true, data: { monthly: monthly.rows, byCourse: byCourse.rows, total } });
});

// GET /api/reports/source  — lead source attribution
router.get("/source", ...guard, async (req: TenantRequest, res) => {
  const { fromDate, toDate } = req.query as { fromDate?: string; toDate?: string };
  const df = buildDateFilter(fromDate, toDate);

  const result = await req.db.query(
    `SELECT
       COALESCE(source, 'unknown') AS source,
       COUNT(*) AS total_leads,
       COUNT(*) FILTER (WHERE stage = 'admitted') AS admissions,
       ROUND(100.0 * COUNT(*) FILTER (WHERE stage = 'admitted') / NULLIF(COUNT(*), 0), 1) AS conversion_rate,
       ROUND(AVG(lead_score), 1) AS avg_score
     FROM leads
     WHERE 1=1 ${df.sql}
     GROUP BY source ORDER BY admissions DESC`,
    df.params
  );
  res.json({ ok: true, data: result.rows });
});

// GET /api/reports/nps-trend  — NPS score trend month-by-month
router.get("/nps-trend", ...guard, async (req: TenantRequest, res) => {
  const { fromDate, toDate } = req.query as { fromDate?: string; toDate?: string };
  const df = buildDateFilter(fromDate, toDate, "n.responded_at");

  const [trend, byCourse] = await Promise.all([
    req.db.query(
      `SELECT
         DATE_TRUNC('month', n.responded_at)::date AS month,
         ROUND(AVG(n.score), 2) AS avg_score,
         COUNT(*) FILTER (WHERE n.category='promoter')  AS promoters,
         COUNT(*) FILTER (WHERE n.category='passive')   AS passives,
         COUNT(*) FILTER (WHERE n.category='detractor') AS detractors,
         COUNT(*) AS responses,
         ROUND(
           (COUNT(*) FILTER (WHERE n.category='promoter') - COUNT(*) FILTER (WHERE n.category='detractor'))::numeric
           / NULLIF(COUNT(*), 0) * 100, 1
         ) AS nps_score
       FROM nps_responses n
       WHERE n.responded_at IS NOT NULL ${df.sql}
       GROUP BY 1 ORDER BY 1`,
      df.params
    ),
    req.db.query(
      `SELECT
         c.name AS course_name,
         ROUND(AVG(n.score), 2) AS avg_score,
         COUNT(*) AS responses,
         ROUND(
           (COUNT(*) FILTER (WHERE n.category='promoter') - COUNT(*) FILTER (WHERE n.category='detractor'))::numeric
           / NULLIF(COUNT(*), 0) * 100, 1
         ) AS nps_score
       FROM nps_responses n
       LEFT JOIN courses c ON c.id = n.course_id
       WHERE n.responded_at IS NOT NULL ${df.sql}
       GROUP BY c.name ORDER BY nps_score DESC NULLS LAST`,
      df.params
    ),
  ]);

  res.json({ ok: true, data: { trend: trend.rows, byCourse: byCourse.rows } });
});

// GET /api/reports/batch-fill  — batch fill rate
router.get("/batch-fill", ...guard, async (req: TenantRequest, res) => {
  const { courseId } = req.query as { courseId?: string };
  const params: unknown[] = [];
  const cond = courseId ? `AND b.course_id = $${params.push(courseId)}` : "";

  const result = await req.db.query(
    `SELECT
       b.id, b.name AS batch_name, b.capacity, b.start_date, b.end_date,
       b.is_active, b.mode, b.batch_type,
       c.name AS course_name,
       COUNT(e.id) AS enrolled,
       ROUND(100.0 * COUNT(e.id) / NULLIF(b.capacity, 0), 1) AS fill_pct,
       b.capacity - COUNT(e.id) AS seats_left
     FROM batches b
     LEFT JOIN courses c ON c.id = b.course_id
     LEFT JOIN enrollments e ON e.batch_id = b.id
     WHERE 1=1 ${cond}
     GROUP BY b.id, b.name, b.capacity, b.start_date, b.end_date, b.is_active, b.mode, b.batch_type, c.name
     ORDER BY b.start_date DESC NULLS LAST, fill_pct DESC`,
    params
  );

  const summary = {
    total: result.rows.length,
    full: result.rows.filter((r: any) => parseFloat(r.fill_pct) >= 100).length,
    healthy: result.rows.filter((r: any) => parseFloat(r.fill_pct) >= 70 && parseFloat(r.fill_pct) < 100).length,
    low: result.rows.filter((r: any) => parseFloat(r.fill_pct) < 70).length,
    avgFill: result.rows.length
      ? Math.round(result.rows.reduce((s: number, r: any) => s + parseFloat(r.fill_pct ?? 0), 0) / result.rows.length)
      : 0,
  };

  res.json({ ok: true, data: result.rows, meta: summary });
});

// GET /api/reports/placement  — placement rate per course
router.get("/placement", ...guard, async (req: TenantRequest, res) => {
  const { fromDate, toDate } = req.query as { fromDate?: string; toDate?: string };
  const df = buildDateFilter(fromDate, toDate, "p.placed_at");

  const [byCourse, topCompanies, trend] = await Promise.all([
    req.db.query(
      `SELECT
         c.name AS course_name, c.id AS course_id,
         COUNT(DISTINCT e.lead_id) AS total_students,
         COUNT(DISTINCT p.lead_id) AS placed,
         ROUND(100.0 * COUNT(DISTINCT p.lead_id) / NULLIF(COUNT(DISTINCT e.lead_id), 0), 1) AS placement_rate,
         ROUND(AVG(p.package_lpa) FILTER (WHERE p.package_lpa IS NOT NULL), 2) AS avg_package_lpa
       FROM courses c
       LEFT JOIN leads l ON l.course_id = c.id
       LEFT JOIN enrollments e ON e.lead_id = l.id
       LEFT JOIN placements p ON p.lead_id = l.id AND p.verified = TRUE ${df.sql.replace("AND", "AND p.")}
       GROUP BY c.id, c.name ORDER BY placed DESC`,
      df.params
    ),
    req.db.query(
      `SELECT company, COUNT(*) AS placements, ROUND(AVG(package_lpa), 2) AS avg_package_lpa
       FROM placements WHERE verified = TRUE ${df.sql}
       GROUP BY company ORDER BY placements DESC LIMIT 10`,
      df.params
    ),
    req.db.query(
      `SELECT DATE_TRUNC('month', placed_at)::date AS month, COUNT(*) AS placements,
              ROUND(AVG(package_lpa), 2) AS avg_lpa
       FROM placements WHERE verified = TRUE ${df.sql}
       GROUP BY 1 ORDER BY 1`,
      df.params
    ),
  ]);

  res.json({ ok: true, data: { byCourse: byCourse.rows, topCompanies: topCompanies.rows, trend: trend.rows } });
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
