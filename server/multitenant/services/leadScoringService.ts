import type { InsertLead } from "../../../shared/schema.js";
import type { LeadScoreBreakdown } from "../../../shared/types.js";

/**
 * Rule-based lead scoring (0-100)
 *
 * Weights:
 *   Source           max 30
 *   Profile completeness max 10
 *   (Engagement + response speed updated via updateScore after interactions)
 */
export const leadScoringService = {
  calculateInitial(data: Partial<InsertLead>): number {
    let score = 0;

    // Source score
    const sourceScores: Record<string, number> = {
      walk_in: 25,
      referral: 25,
      meta_ads: 20,
      phone: 20,
      website: 15,
      excel_import: 10,
      manual: 5,
    };
    score += sourceScores[data.source ?? "manual"] ?? 5;

    // Profile completeness
    if (data.email) score += 4;
    if (data.city) score += 3;
    if (data.qualification) score += 3;

    return Math.min(score, 100);
  },

  async recalculate(db: import("pg").Pool, leadId: string): Promise<number> {
    const [lead, comms, history] = await Promise.all([
      db.query("SELECT * FROM leads WHERE id = $1", [leadId]),
      db.query(
        "SELECT channel, status, created_at FROM communication_logs WHERE lead_id = $1 ORDER BY created_at ASC",
        [leadId]
      ),
      db.query(
        "SELECT to_stage, changed_at FROM lead_stage_history WHERE lead_id = $1 ORDER BY changed_at ASC",
        [leadId]
      ),
    ]);

    if (!lead.rows[0]) return 0;
    const l = lead.rows[0];

    let score = leadScoringService.calculateInitial(l);

    // Response speed score (time from created_at to first outbound comm)
    const firstContact = comms.rows.find((c) => c.direction !== "inbound");
    if (firstContact) {
      const diffH =
        (new Date(firstContact.created_at).getTime() - new Date(l.created_at).getTime()) / 3600000;
      if (diffH <= 1) score += 20;
      else if (diffH <= 4) score += 15;
      else if (diffH <= 24) score += 10;
    }

    // Engagement
    const hasReplied = comms.rows.some((c) => c.direction === "inbound");
    if (hasReplied) score += 15;
    const hasEmailOpen = comms.rows.some((c) => c.channel === "email" && c.status === "read");
    if (hasEmailOpen) score += 5;
    const attendedDemo = history.rows.some((h) => h.to_stage === "demo");
    if (attendedDemo) score += 25;

    // Stage progression (5 pts per advance, max 20)
    const stageOrder = ["new","contacted","qualified","demo","interested","payment","admitted"];
    const maxStageIdx = Math.max(...history.rows.map((h) => stageOrder.indexOf(h.to_stage)));
    score += Math.min(maxStageIdx * 5, 20);

    // Recency
    if (l.last_contacted_at) {
      const diffDays =
        (Date.now() - new Date(l.last_contacted_at).getTime()) / 86400000;
      if (diffDays <= 3) score += 10;
      else if (diffDays <= 7) score += 5;
    }

    score = Math.min(score, 100);

    await db.query("UPDATE leads SET lead_score = $1, updated_at = now() WHERE id = $2", [
      score,
      leadId,
    ]);

    return score;
  },

  getLabel(score: number): LeadScoreBreakdown["label"] {
    if (score <= 30) return "cold";
    if (score <= 60) return "warm";
    if (score <= 80) return "hot";
    return "very_hot";
  },
};
