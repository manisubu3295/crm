import { Router } from "express";
import { tenantFromHeader, authAndTenantGuard, requireRole } from "../auth/tenantGuard.js";
import type { TenantRequest } from "../types.js";

const router = Router();
const guard        = [tenantFromHeader as any, authAndTenantGuard as any];
const managerGuard = [...guard, requireRole("admin", "manager") as any];

// GET /api/reengagement
router.get("/", ...guard, async (req: TenantRequest, res) => {
  const result = await req.db.query(
    `SELECT rc.*,
       mt.name AS template_name,
       (SELECT COUNT(*) FROM reengagement_log rl WHERE rl.campaign_id = rc.id) AS total_sent,
       (SELECT COUNT(*) FROM reengagement_log rl WHERE rl.campaign_id = rc.id AND rl.response_received = TRUE) AS total_responses
     FROM reengagement_campaigns rc
     LEFT JOIN message_templates mt ON rc.template_id = mt.id
     ORDER BY rc.created_at DESC`
  );
  res.json({ ok: true, data: result.rows });
});

// GET /api/reengagement/:id/leads — preview dormant leads that would be targeted
router.get("/:id/leads", ...guard, async (req: TenantRequest, res) => {
  const campaign = await req.db.query(
    "SELECT * FROM reengagement_campaigns WHERE id = $1", [req.params["id"]]
  );
  if (!campaign.rows[0]) { res.status(404).json({ ok: false, message: "Not found" }); return; }
  const c = campaign.rows[0];

  const leads = await req.db.query(
    c.target_stage
      ? `SELECT l.id, l.lead_no, l.full_name, l.phone, l.stage, l.last_contacted_at,
           EXTRACT(DAY FROM now() - l.last_contacted_at)::int AS dormant_days,
           (SELECT COUNT(*) FROM reengagement_log rl WHERE rl.lead_id = l.id AND rl.campaign_id = $3) AS attempts
         FROM leads l
         WHERE l.re_engagement_eligible = TRUE
           AND l.stage NOT IN ('admitted','lost')
           AND l.stage = $2
           AND (l.last_contacted_at IS NULL OR l.last_contacted_at < now() - ($1 || ' days')::INTERVAL)
         ORDER BY l.last_contacted_at ASC NULLS FIRST
         LIMIT 50`
      : `SELECT l.id, l.lead_no, l.full_name, l.phone, l.stage, l.last_contacted_at,
           EXTRACT(DAY FROM now() - l.last_contacted_at)::int AS dormant_days,
           (SELECT COUNT(*) FROM reengagement_log rl WHERE rl.lead_id = l.id AND rl.campaign_id = $2) AS attempts
         FROM leads l
         WHERE l.re_engagement_eligible = TRUE
           AND l.stage NOT IN ('admitted','lost')
           AND (l.last_contacted_at IS NULL OR l.last_contacted_at < now() - ($1 || ' days')::INTERVAL)
         ORDER BY l.last_contacted_at ASC NULLS FIRST
         LIMIT 50`,
    c.target_stage ? [c.dormant_days, c.target_stage, c.id] : [c.dormant_days, c.id]
  );
  res.json({ ok: true, data: leads.rows });
});

// GET /api/reengagement/:id/log — send history
router.get("/:id/log", ...guard, async (req: TenantRequest, res) => {
  const result = await req.db.query(
    `SELECT rl.*, l.full_name AS lead_name, l.phone AS lead_phone
     FROM reengagement_log rl
     JOIN leads l ON rl.lead_id = l.id
     WHERE rl.campaign_id = $1
     ORDER BY rl.sent_at DESC LIMIT 100`,
    [req.params["id"]]
  );
  res.json({ ok: true, data: result.rows });
});

// POST /api/reengagement
router.post("/", ...managerGuard, async (req: TenantRequest, res) => {
  const { name, description, targetStage, dormantDays, channel, templateId, maxAttempts } = req.body as {
    name: string; description?: string; targetStage?: string; dormantDays: number;
    channel: string; templateId?: string; maxAttempts?: number;
  };
  if (!name || !dormantDays || !channel) {
    res.status(400).json({ ok: false, message: "name, dormantDays, channel required" });
    return;
  }
  const result = await req.db.query(
    `INSERT INTO reengagement_campaigns (name, description, target_stage, dormant_days, channel, template_id, max_attempts)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [name, description ?? null, targetStage ?? null, dormantDays, channel, templateId ?? null, maxAttempts ?? 3]
  );
  res.status(201).json({ ok: true, data: result.rows[0] });
});

// PATCH /api/reengagement/:id
router.patch("/:id", ...managerGuard, async (req: TenantRequest, res) => {
  const { name, dormantDays, channel, templateId, maxAttempts, isActive } = req.body as {
    name?: string; dormantDays?: number; channel?: string; templateId?: string;
    maxAttempts?: number; isActive?: boolean;
  };
  const sets: string[] = [];
  const params: unknown[] = [req.params["id"]];
  let p = 2;
  if (name !== undefined)        { sets.push(`name = $${p++}`); params.push(name); }
  if (dormantDays !== undefined) { sets.push(`dormant_days = $${p++}`); params.push(dormantDays); }
  if (channel !== undefined)     { sets.push(`channel = $${p++}`); params.push(channel); }
  if (templateId !== undefined)  { sets.push(`template_id = $${p++}`); params.push(templateId); }
  if (maxAttempts !== undefined) { sets.push(`max_attempts = $${p++}`); params.push(maxAttempts); }
  if (isActive !== undefined)    { sets.push(`is_active = $${p++}`); params.push(isActive); }
  if (!sets.length) { res.json({ ok: true }); return; }
  await req.db.query(`UPDATE reengagement_campaigns SET ${sets.join(", ")} WHERE id = $1`, params);
  res.json({ ok: true });
});

// DELETE /api/reengagement/:id
router.delete("/:id", ...managerGuard, async (req: TenantRequest, res) => {
  await req.db.query("UPDATE reengagement_campaigns SET is_active = FALSE WHERE id = $1", [req.params["id"]]);
  res.json({ ok: true });
});

export default router;
