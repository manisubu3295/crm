import { Router } from "express";
import { tenantFromHeader, authAndTenantGuard, requireRole } from "../auth/tenantGuard.js";
import type { TenantRequest } from "../types.js";

const router = Router();
const guard = [tenantFromHeader as any, authAndTenantGuard as any];
const managerGuard = [...guard, requireRole("admin", "manager") as any];

// GET /api/campaigns
router.get("/", ...guard, async (req: TenantRequest, res) => {
  const result = await req.db.query(
    `SELECT c.*,
       COALESCE(s.leads_count, 0) AS total_leads,
       COALESCE(s.admitted_count, 0) AS total_admitted,
       COALESCE(s.spend, 0) AS total_spend
     FROM campaigns c
     LEFT JOIN LATERAL (
       SELECT SUM(leads_count) AS leads_count,
              SUM(admitted_count) AS admitted_count,
              SUM(spend) AS spend
       FROM campaign_stats WHERE campaign_id = c.id
     ) s ON TRUE
     WHERE c.is_active = TRUE
     ORDER BY c.created_at DESC`
  );
  res.json({ ok: true, data: result.rows });
});

// GET /api/campaigns/:id/stats  — ROI breakdown
router.get("/:id/stats", ...guard, async (req: TenantRequest, res) => {
  const [campaign, dailyStats, stageFunnel] = await Promise.all([
    req.db.query("SELECT * FROM campaigns WHERE id = $1", [req.params["id"]]),
    req.db.query(
      `SELECT date, leads_count, contacted_count, admitted_count, spend, cost_per_lead, cost_per_admission
       FROM campaign_stats WHERE campaign_id = $1 ORDER BY date DESC LIMIT 30`,
      [req.params["id"]]
    ),
    req.db.query(
      `SELECT stage, COUNT(*) AS count
       FROM leads WHERE campaign_id = $1
       GROUP BY stage ORDER BY stage`,
      [req.params["id"]]
    ),
  ]);

  if (!campaign.rows[0]) { res.status(404).json({ ok: false, code: "NOT_FOUND", message: "Campaign not found" }); return; }

  res.json({ ok: true, data: { campaign: campaign.rows[0], dailyStats: dailyStats.rows, stageFunnel: stageFunnel.rows } });
});

// POST /api/campaigns
router.post("/", ...managerGuard, async (req: TenantRequest, res) => {
  const { name, source, metaCampaignId, metaAdsetId, startDate, endDate, budget } = req.body as {
    name: string; source: string; metaCampaignId?: string; metaAdsetId?: string;
    startDate?: string; endDate?: string; budget?: number;
  };
  if (!name || !source) { res.status(400).json({ ok: false, message: "name and source required" }); return; }

  const result = await req.db.query(
    `INSERT INTO campaigns (name, source, meta_campaign_id, meta_adset_id, start_date, end_date, budget)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [name, source, metaCampaignId ?? null, metaAdsetId ?? null, startDate ?? null, endDate ?? null, budget ?? null]
  );
  res.status(201).json({ ok: true, data: result.rows[0] });
});

// PATCH /api/campaigns/:id
router.patch("/:id", ...managerGuard, async (req: TenantRequest, res) => {
  const { name, budget, isActive, endDate } = req.body as { name?: string; budget?: number; isActive?: boolean; endDate?: string; };
  const sets: string[] = [];
  const params: unknown[] = [req.params["id"]];
  let p = 2;
  if (name !== undefined)     { sets.push(`name = $${p++}`); params.push(name); }
  if (budget !== undefined)   { sets.push(`budget = $${p++}`); params.push(budget); }
  if (isActive !== undefined) { sets.push(`is_active = $${p++}`); params.push(isActive); }
  if (endDate !== undefined)  { sets.push(`end_date = $${p++}`); params.push(endDate); }
  if (!sets.length) { res.json({ ok: true }); return; }
  await req.db.query(`UPDATE campaigns SET ${sets.join(", ")} WHERE id = $1`, params);
  res.json({ ok: true });
});

export default router;
