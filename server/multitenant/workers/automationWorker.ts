import { Worker } from "bullmq";
import { getRedisConnection } from "../queues/index.js";
import { getPool } from "../tenant/dbPool.js";
import { communicationService } from "../services/communicationService.js";
import { notificationService } from "../services/notificationService.js";
import logger from "../logger.js";
import type { AutomationAction } from "../../../shared/types.js";

export function startAutomationWorker() {
  const worker = new Worker(
    "crm-automation",
    async (job) => {
      const { tenantId, ruleId, leadId, actions } = job.data as {
        tenantId: string;
        ruleId: string;
        leadId: string;
        actions: AutomationAction[];
      };

      const db = await getPool(tenantId);
      const actionsTaken: unknown[] = [];

      for (const action of actions) {
        try {
          if (action.type === "send_message") {
            const a = action as { type: string; channel: string; templateId?: string; body?: string };

            // Resolve body: prefer explicit body, else fetch from template
            let body = a.body ?? "";
            let subject: string | undefined;

            if (a.templateId) {
              const tmpl = await db.query(
                "SELECT body, subject FROM message_templates WHERE id = $1 AND is_active = TRUE",
                [a.templateId]
              );
              if (tmpl.rows[0]) {
                body = tmpl.rows[0].body;
                subject = tmpl.rows[0].subject ?? undefined;
              }
            }

            if (!body) {
              logger.warn({ ruleId, leadId, action }, "send_message action has no body/template — skipping");
            } else {
              await communicationService.send(db, tenantId, {
                leadId,
                channel: a.channel as "whatsapp" | "email" | "sms" | "ivr" | "manual_call",
                templateId: a.templateId,
                subject,
                body,
              });
              actionsTaken.push({ type: "send_message", channel: a.channel });
            }

          } else if (action.type === "assign_task") {
            const a = action as { taskType: string; title: string; dueHours: number; priority?: string };
            const dueAt = new Date(Date.now() + a.dueHours * 3_600_000);
            const lead = await db.query("SELECT assigned_to FROM leads WHERE id = $1", [leadId]);
            const assignedTo = lead.rows[0]?.assigned_to;
            if (assignedTo) {
              const task = await db.query(
                `INSERT INTO tasks (lead_id, assigned_to, task_type, title, status, priority, due_at)
                 VALUES ($1,$2,$3,$4,'pending',$5,$6) RETURNING id`,
                [leadId, assignedTo, a.taskType, a.title, a.priority ?? "medium", dueAt]
              );
              // Notify assigned counsellor
              notificationService.notify(db, tenantId, assignedTo, "task_assigned",
                `New task: ${a.title}`, { leadId, taskId: task.rows[0]?.id }).catch(() => {});
            }
            actionsTaken.push({ type: "assign_task", title: a.title });

          } else if (action.type === "escalate") {
            const a = action as { toUserId?: string; message?: string };
            const target = a.toUserId ?? await getManagerId(db);
            if (target) {
              const task = await db.query(
                `INSERT INTO tasks (lead_id, assigned_to, task_type, title, status, priority, due_at)
                 VALUES ($1,$2,'follow_up',$3,'pending','urgent', now() + interval '2 hours') RETURNING id`,
                [leadId, target, a.message ?? "Escalation: action required"]
              );
              notificationService.notify(db, tenantId, target, "escalation",
                a.message ?? "Escalation: action required", { leadId, taskId: task.rows[0]?.id }).catch(() => {});
            }
            actionsTaken.push({ type: "escalate" });

          } else if (action.type === "change_stage") {
            const a = action as { toStage: string };
            await db.query(
              "UPDATE leads SET stage = $1, updated_at = now() WHERE id = $2",
              [a.toStage, leadId]
            );
            await db.query(
              "INSERT INTO lead_stage_history (lead_id, to_stage, changed_by, note) VALUES ($1,$2,NULL,'Automation rule')",
              [leadId, a.toStage]
            );
            actionsTaken.push({ type: "change_stage", toStage: a.toStage });

          } else if (action.type === "reassign") {
            const a = action as { toUserId: string };
            await db.query(
              "UPDATE leads SET assigned_to = $1, updated_at = now() WHERE id = $2",
              [a.toUserId, leadId]
            );
            actionsTaken.push({ type: "reassign", toUserId: a.toUserId });
          }

        } catch (err) {
          logger.error({ err, action, leadId }, "Automation action failed");
        }
      }

      // Log execution
      await db.query(
        `INSERT INTO automation_execution_log (rule_id, lead_id, actions_taken, status)
         VALUES ($1, $2, $3, 'success')`,
        [ruleId, leadId, JSON.stringify(actionsTaken)]
      );
      await db.query(
        "UPDATE automation_rules SET execution_count = execution_count + 1 WHERE id = $1",
        [ruleId]
      );

      logger.info({ ruleId, leadId, tenantId, actionsCount: actionsTaken.length }, "Automation rule executed");
    },
    { connection: getRedisConnection(), concurrency: 10 }
  );

  worker.on("failed", (job, err) => {
    logger.error({ jobId: job?.id, err }, "Automation job failed");
  });

  return worker;
}

async function getManagerId(db: import("pg").Pool): Promise<string | null> {
  const res = await db.query(
    "SELECT id FROM users WHERE role IN ('manager','admin') AND is_active = TRUE ORDER BY role DESC LIMIT 1"
  );
  return res.rows[0]?.id ?? null;
}
