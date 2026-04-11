import { Router } from "express";
import { tenantFromHeader, authAndTenantGuard } from "../auth/tenantGuard.js";
import { insertTaskSchema } from "../../../shared/schema.js";
import { taskQuerySchema } from "../../../shared/types.js";
import { followUpQueue } from "../queues/followUpQueue.js";
import { automationService } from "../services/automationService.js";
import type { TenantRequest } from "../types.js";

const router = Router();
const guard = [tenantFromHeader as any, authAndTenantGuard as any];

// GET /api/tasks
router.get("/", ...guard, async (req: TenantRequest, res) => {
  const q = taskQuerySchema.safeParse(req.query);
  if (!q.success) { res.status(400).json({ ok: false, code: "VALIDATION_ERROR", message: q.error.message }); return; }

  const conditions: string[] = ["1=1"];
  const params: unknown[] = [];
  let p = 1;

  if (q.data.assignedTo) { conditions.push(`t.assigned_to = $${p++}`); params.push(q.data.assignedTo); }
  if (q.data.status)     { conditions.push(`t.status = $${p++}`); params.push(q.data.status); }
  if (q.data.dueToday)   { conditions.push(`t.due_at::date = CURRENT_DATE`); }
  if (q.data.overdue)    { conditions.push(`t.due_at < now() AND t.status NOT IN ('done','cancelled')`); }

  // Counsellors only see their own tasks
  if (req.user!.role === "counsellor") {
    conditions.push(`t.assigned_to = $${p++}`);
    params.push(req.user!.sub);
  }

  const where = conditions.join(" AND ");
  const offset = (q.data.page - 1) * q.data.limit;

  const [rows, count] = await Promise.all([
    req.db.query(
      `SELECT t.*,
              l.full_name AS lead_name, l.phone AS lead_phone,
              u.full_name AS assigned_to_name
       FROM tasks t
       JOIN leads l ON t.lead_id = l.id
       JOIN users u ON t.assigned_to = u.id
       WHERE ${where}
       ORDER BY
         CASE t.priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END,
         t.due_at ASC
       LIMIT $${p} OFFSET $${p + 1}`,
      [...params, q.data.limit, offset]
    ),
    req.db.query(`SELECT COUNT(*) FROM tasks t WHERE ${where}`, params),
  ]);

  res.json({ ok: true, data: rows.rows, meta: { total: parseInt(count.rows[0].count), page: q.data.page, limit: q.data.limit } });
});

// GET /api/tasks/today-summary  — counsellor dashboard widget
router.get("/today-summary", ...guard, async (req: TenantRequest, res) => {
  const userId = req.user!.role === "counsellor" ? req.user!.sub : null;
  const filter = userId ? "AND t.assigned_to = $1" : "";
  const params = userId ? [userId] : [];

  const result = await req.db.query(
    `SELECT
       COUNT(*) FILTER (WHERE t.status IN ('pending','in_progress') AND t.due_at::date = CURRENT_DATE) AS due_today,
       COUNT(*) FILTER (WHERE t.status = 'overdue') AS overdue,
       COUNT(*) FILTER (WHERE t.status = 'done' AND t.completed_at::date = CURRENT_DATE) AS completed_today,
       COUNT(*) FILTER (WHERE t.status = 'pending' AND t.reminder_at <= now()) AS reminders_due
     FROM tasks t
     WHERE 1=1 ${filter}`,
    params
  );

  res.json({ ok: true, data: result.rows[0] });
});

// POST /api/tasks
router.post("/", ...guard, async (req: TenantRequest, res) => {
  const parsed = insertTaskSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ ok: false, code: "VALIDATION_ERROR", message: parsed.error.message }); return; }

  const d = parsed.data;
  const result = await req.db.query(
    `INSERT INTO tasks (lead_id, opportunity_id, assigned_to, task_type, title, description, status, priority, due_at, reminder_at, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,'pending',$7,$8,$9,$10) RETURNING *`,
    [d.leadId, d.opportunityId ?? null, d.assignedTo, d.taskType, d.title, d.description ?? null, d.priority, d.dueAt, d.reminderAt ?? null, req.user!.sub]
  );

  const task = result.rows[0];

  // Schedule reminder via BullMQ if reminderAt is set
  if (d.reminderAt) {
    const delay = new Date(d.reminderAt).getTime() - Date.now();
    if (delay > 0) {
      await followUpQueue.add("send-reminder", { taskId: task.id, tenantId: req.tenantId }, { delay });
    }
  }

  res.status(201).json({ ok: true, data: task });
});

// PATCH /api/tasks/:id
router.patch("/:id", ...guard, async (req: TenantRequest, res) => {
  const { status, outcome, priority, dueAt, reminderAt, title, description } = req.body as {
    status?: string; outcome?: string; priority?: string;
    dueAt?: string; reminderAt?: string; title?: string; description?: string;
  };

  const sets: string[] = ["updated_at = now()"];
  const params: unknown[] = [req.params["id"]];
  let p = 2;

  if (status)       { sets.push(`status = $${p++}`); params.push(status); }
  if (outcome)      { sets.push(`outcome = $${p++}`); params.push(outcome); }
  if (priority)     { sets.push(`priority = $${p++}`); params.push(priority); }
  if (dueAt)        { sets.push(`due_at = $${p++}`); params.push(dueAt); }
  if (reminderAt)   { sets.push(`reminder_at = $${p++}`); params.push(reminderAt); }
  if (title)        { sets.push(`title = $${p++}`); params.push(title); }
  if (description)  { sets.push(`description = $${p++}`); params.push(description); }

  if (status === "done") { sets.push("completed_at = now()"); }

  const result = await req.db.query(
    `UPDATE tasks SET ${sets.join(", ")} WHERE id = $1 RETURNING lead_id`,
    params
  );

  // Fire task_overdue automation if marking overdue
  if (status === "overdue" && result.rows[0]) {
    await automationService.processEvent(req.db, req.tenantId, "task_overdue", result.rows[0].lead_id, {});
  }

  res.json({ ok: true, data: { id: req.params["id"] } });
});

// DELETE /api/tasks/:id  (soft: cancel)
router.delete("/:id", ...guard, async (req: TenantRequest, res) => {
  await req.db.query("UPDATE tasks SET status='cancelled', updated_at=now() WHERE id=$1", [req.params["id"]]);
  res.json({ ok: true });
});

export default router;
