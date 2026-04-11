import type { Pool } from "pg";
import type { TriggerEvent, AutomationAction } from "../../../shared/types.js";
import { automationQueue } from "../queues/automationQueue.js";
import logger from "../logger.js";

export const automationService = {
  async processEvent(
    db: Pool,
    tenantId: string,
    event: TriggerEvent,
    leadId: string,
    context: Record<string, unknown> = {}
  ) {
    const rules = await db.query(
      `SELECT * FROM automation_rules
       WHERE trigger_event = $1 AND is_active = TRUE
       ORDER BY created_at ASC`,
      [event]
    );

    for (const rule of rules.rows) {
      // Evaluate trigger_conditions (simple key-value match)
      if (rule.trigger_conditions) {
        const conditions = rule.trigger_conditions as Record<string, unknown>;
        const match = Object.entries(conditions).every(
          ([k, v]) => context[k] === v
        );
        if (!match) continue;
      }

      await automationQueue.add(
        "execute-rule",
        {
          tenantId,
          ruleId: rule.id,
          leadId,
          actions: rule.actions as AutomationAction[],
          context,
        },
        {
          delay: rule.delay_minutes * 60 * 1000,
          attempts: 3,
          backoff: { type: "exponential", delay: 5000 },
          removeOnComplete: { count: 1000 },
          removeOnFail: { count: 500 },
        }
      );

      logger.debug({ ruleId: rule.id, leadId, event }, "Automation rule enqueued");
    }
  },
};
