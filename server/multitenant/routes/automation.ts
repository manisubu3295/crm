import { Router } from "express";
import { tenantFromHeader, authAndTenantGuard, requireRole } from "../auth/tenantGuard.js";
import type { TenantRequest } from "../types.js";

const router = Router();
const guard = [tenantFromHeader as any, authAndTenantGuard as any];
const managerGuard = [...guard, requireRole("admin", "manager") as any];

// GET /api/automation/rules
router.get("/rules", ...guard, async (req: TenantRequest, res) => {
  const result = await req.db.query(
    `SELECT ar.*, u.full_name AS created_by_name
     FROM automation_rules ar
     LEFT JOIN users u ON ar.created_by = u.id
     ORDER BY ar.created_at DESC`
  );
  res.json({ ok: true, data: result.rows });
});

// POST /api/automation/rules
router.post("/rules", ...managerGuard, async (req: TenantRequest, res) => {
  const { name, description, triggerEvent, triggerConditions, actions, delayMinutes } = req.body as {
    name: string; description?: string; triggerEvent: string;
    triggerConditions?: unknown; actions: unknown[]; delayMinutes?: number;
  };
  if (!name || !triggerEvent || !actions?.length) {
    res.status(400).json({ ok: false, message: "name, triggerEvent, actions required" });
    return;
  }
  const result = await req.db.query(
    `INSERT INTO automation_rules (name, description, trigger_event, trigger_conditions, actions, delay_minutes, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [name, description ?? null, triggerEvent, triggerConditions ? JSON.stringify(triggerConditions) : null,
     JSON.stringify(actions), delayMinutes ?? 0, req.user!.sub]
  );
  res.status(201).json({ ok: true, data: result.rows[0] });
});

// PATCH /api/automation/rules/:id
router.patch("/rules/:id", ...managerGuard, async (req: TenantRequest, res) => {
  const { name, description, triggerEvent, isActive, actions, triggerConditions, delayMinutes } = req.body as {
    name?: string; description?: string; triggerEvent?: string;
    isActive?: boolean; actions?: unknown[]; triggerConditions?: unknown; delayMinutes?: number;
  };
  const sets: string[] = [];
  const params: unknown[] = [req.params["id"]];
  let p = 2;
  if (name !== undefined)              { sets.push(`name = $${p++}`); params.push(name); }
  if (description !== undefined)       { sets.push(`description = $${p++}`); params.push(description); }
  if (triggerEvent !== undefined)      { sets.push(`trigger_event = $${p++}`); params.push(triggerEvent); }
  if (isActive !== undefined)          { sets.push(`is_active = $${p++}`); params.push(isActive); }
  if (actions !== undefined)           { sets.push(`actions = $${p++}`); params.push(JSON.stringify(actions)); }
  if (triggerConditions !== undefined) { sets.push(`trigger_conditions = $${p++}`); params.push(JSON.stringify(triggerConditions)); }
  if (delayMinutes !== undefined)      { sets.push(`delay_minutes = $${p++}`); params.push(delayMinutes); }
  if (!sets.length) { res.json({ ok: true }); return; }
  await req.db.query(`UPDATE automation_rules SET ${sets.join(", ")} WHERE id = $1`, params);
  res.json({ ok: true });
});

// DELETE /api/automation/rules/:id
router.delete("/rules/:id", ...managerGuard, async (req: TenantRequest, res) => {
  await req.db.query("UPDATE automation_rules SET is_active = FALSE WHERE id = $1", [req.params["id"]]);
  res.json({ ok: true });
});

// GET /api/automation/logs  — execution history
router.get("/logs", ...guard, async (req: TenantRequest, res) => {
  const { ruleId, leadId } = req.query as { ruleId?: string; leadId?: string };
  const conditions: string[] = ["1=1"];
  const params: unknown[] = [];
  let p = 1;
  if (ruleId) { conditions.push(`ael.rule_id = $${p++}`); params.push(ruleId); }
  if (leadId) { conditions.push(`ael.lead_id = $${p++}`); params.push(leadId); }

  const result = await req.db.query(
    `SELECT ael.*, ar.name AS rule_name, l.full_name AS lead_name
     FROM automation_execution_log ael
     JOIN automation_rules ar ON ael.rule_id = ar.id
     JOIN leads l ON ael.lead_id = l.id
     WHERE ${conditions.join(" AND ")}
     ORDER BY ael.triggered_at DESC LIMIT 100`,
    params
  );
  res.json({ ok: true, data: result.rows });
});

// GET /api/automation/triggers  — list of available trigger event types
router.get("/triggers", ...guard, (_req, res) => {
  res.json({
    ok: true,
    data: [
      { event: "lead_created",          label: "New Lead Created" },
      { event: "lead_stage_changed",    label: "Lead Stage Changed" },
      { event: "lead_assigned",         label: "Lead Assigned to Counsellor" },
      { event: "no_response_24h",       label: "No Response after 24 Hours" },
      { event: "no_response_48h",       label: "No Response after 48 Hours" },
      { event: "demo_scheduled",        label: "Demo Scheduled" },
      { event: "demo_completed",        label: "Demo Completed" },
      { event: "payment_link_sent",     label: "Payment Link Sent" },
      { event: "payment_pending_24h",   label: "Payment Pending for 24 Hours" },
      { event: "task_overdue",          label: "Task Overdue" },
      { event: "sla_breach",            label: "SLA Breach" },
    ],
  });
});

export default router;
