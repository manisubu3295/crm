import type { Pool } from "pg";
import type { InsertLead } from "../../../shared/schema.js";
import type { LeadQuery } from "../../../shared/types.js";
import { duplicateDetectionService } from "./duplicateDetectionService.js";
import { leadScoringService } from "./leadScoringService.js";
import { automationService } from "./automationService.js";
import { emitToTenant } from "../lib/socketEmitter.js";
import { notificationService } from "./notificationService.js";
import logger from "../logger.js";

export const leadService = {
  async list(db: Pool, tenantId: string, query: LeadQuery) {
    const conditions: string[] = ["1=1"];
    const params: unknown[] = [];
    let p = 1;

    if (query.stage) { conditions.push(`stage = $${p++}`); params.push(query.stage); }
    if (query.source) { conditions.push(`source = $${p++}`); params.push(query.source); }
    if (query.assignedTo) { conditions.push(`assigned_to = $${p++}`); params.push(query.assignedTo); }
    if (query.campaignId) { conditions.push(`campaign_id = $${p++}`); params.push(query.campaignId); }
    if (query.search) {
      conditions.push(`(full_name ILIKE $${p} OR phone ILIKE $${p} OR email ILIKE $${p})`);
      params.push(`%${query.search}%`);
      p++;
    }
    if (query.fromDate) { conditions.push(`created_at >= $${p++}`); params.push(query.fromDate); }
    if (query.toDate)   { conditions.push(`created_at <= $${p++}`); params.push(query.toDate); }

    const where = conditions.join(" AND ");
    const offset = (query.page - 1) * query.limit;

    const [rows, count] = await Promise.all([
      db.query(
        `SELECT l.*, u.full_name AS assigned_to_name, c.name AS course_name
         FROM leads l
         LEFT JOIN users u ON l.assigned_to = u.id
         LEFT JOIN courses c ON l.course_id = c.id
         WHERE ${where}
         ORDER BY l.created_at DESC
         LIMIT $${p} OFFSET $${p + 1}`,
        [...params, query.limit, offset]
      ),
      db.query(`SELECT COUNT(*) FROM leads WHERE ${where}`, params),
    ]);

    return {
      data: rows.rows,
      meta: {
        total: parseInt(count.rows[0].count),
        page: query.page,
        limit: query.limit,
      },
    };
  },

  async getById(db: Pool, id: string) {
    const [lead, stageHistory, tasks, comms] = await Promise.all([
      db.query(
        `SELECT l.*, u.full_name AS assigned_to_name, c.name AS course_name, camp.name AS campaign_name
         FROM leads l
         LEFT JOIN users u ON l.assigned_to = u.id
         LEFT JOIN courses c ON l.course_id = c.id
         LEFT JOIN campaigns camp ON l.campaign_id = camp.id
         WHERE l.id = $1`,
        [id]
      ),
      db.query(
        "SELECT * FROM lead_stage_history WHERE lead_id = $1 ORDER BY changed_at DESC",
        [id]
      ),
      db.query(
        "SELECT t.*, u.full_name AS assigned_to_name FROM tasks t LEFT JOIN users u ON t.assigned_to = u.id WHERE t.lead_id = $1 ORDER BY t.due_at DESC LIMIT 20",
        [id]
      ),
      db.query(
        "SELECT * FROM communication_logs WHERE lead_id = $1 ORDER BY created_at DESC LIMIT 50",
        [id]
      ),
    ]);

    if (!lead.rows[0]) return null;

    return {
      ...lead.rows[0],
      stageHistory: stageHistory.rows,
      tasks: tasks.rows,
      communications: comms.rows,
    };
  },

  async create(db: Pool, tenantId: string, data: InsertLead, createdBy?: string) {
    // Duplicate check
    const dupResult = await duplicateDetectionService.check(db, {
      phone: data.phone,
      email: data.email ?? undefined,
      fullName: data.fullName,
    });

    // Initial lead score
    const score = leadScoringService.calculateInitial(data);

    const result = await db.query(
      `INSERT INTO leads
         (full_name, email, phone, alternate_phone, city, qualification,
          course_id, source, campaign_id, ad_id, form_id, stage,
          lead_score, assigned_to, is_duplicate, duplicate_of)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'new',$12,$13,$14,$15)
       RETURNING *`,
      [
        data.fullName, data.email, data.phone, data.alternatePhone,
        data.city, data.qualification, data.courseId, data.source,
        data.campaignId, data.adId, data.formId, score,
        data.assignedTo,
        dupResult.isDuplicate,
        dupResult.matchedLeadId ?? null,
      ]
    );

    const lead = result.rows[0];

    // Record initial stage history
    await db.query(
      "INSERT INTO lead_stage_history (lead_id, to_stage, changed_by) VALUES ($1, 'new', $2)",
      [lead.id, createdBy ?? null]
    );

    // Fire automation trigger
    await automationService.processEvent(db, tenantId, "lead_created", lead.id, {
      stage: "new",
      source: data.source,
    });

    // Real-time event
    emitToTenant(tenantId, "lead:created", { leadId: lead.id, leadNo: lead.lead_no });

    logger.info({ leadId: lead.id, leadNo: lead.lead_no, tenantId }, "Lead created");
    return { lead, duplicate: dupResult };
  },

  async updateStage(db: Pool, tenantId: string, id: string, toStage: string, changedBy: string, note?: string) {
    const prev = await db.query("SELECT stage FROM leads WHERE id = $1", [id]);
    if (!prev.rows[0]) throw Object.assign(new Error("Lead not found"), { status: 404 });

    const fromStage = prev.rows[0].stage;
    if (fromStage === toStage) return prev.rows[0];

    const updates: Record<string, unknown> = { stage: toStage, updated_at: new Date() };
    if (toStage === "admitted") updates["admitted_at"] = new Date();

    await db.query(
      "UPDATE leads SET stage = $1, updated_at = now(), admitted_at = CASE WHEN $1='admitted' THEN now() ELSE admitted_at END WHERE id = $2",
      [toStage, id]
    );

    await db.query(
      "INSERT INTO lead_stage_history (lead_id, from_stage, to_stage, changed_by, note) VALUES ($1,$2,$3,$4,$5)",
      [id, fromStage, toStage, changedBy, note ?? null]
    );

    await automationService.processEvent(db, tenantId, "lead_stage_changed", id, {
      fromStage,
      toStage,
    });

    // Real-time event
    emitToTenant(tenantId, "lead:stage_changed", { leadId: id, from: fromStage, to: toStage });

    return { id, fromStage, toStage };
  },

  async assign(db: Pool, tenantId: string, id: string, toUserId: string) {
    await db.query(
      "UPDATE leads SET assigned_to = $1, updated_at = now() WHERE id = $2",
      [toUserId, id]
    );
    await automationService.processEvent(db, tenantId, "lead_assigned", id, { toUserId });

    // Notify the assigned counsellor
    notificationService.notify(db, tenantId, toUserId, "lead_assigned",
      "New lead assigned to you", { leadId: id }).catch(() => {});

    return { id, assignedTo: toUserId };
  },

  async update(db: Pool, id: string, data: Partial<InsertLead>) {
    const fields = Object.entries(data)
      .filter(([, v]) => v !== undefined)
      .map(([k, _], i) => `${toSnake(k)} = $${i + 2}`)
      .join(", ");
    const values = Object.values(data).filter((v) => v !== undefined);

    await db.query(
      `UPDATE leads SET ${fields}, updated_at = now() WHERE id = $1`,
      [id, ...values]
    );
    return { id };
  },
};

function toSnake(s: string) {
  return s.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
}
