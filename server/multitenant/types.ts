import type { Request } from "express";
import type { Pool } from "pg";
import type { JwtPayload } from "../../shared/types.js";

// Tenant registry entry
export type TenantConfig = {
  dbUrl: string;
  displayName: string;
  createDbForce?: boolean;
};

export type TenantRegistry = {
  tenants: Record<string, TenantConfig>;
};

// Express request extended with tenant context
export interface TenantRequest extends Request {
  tenantId: string;
  db: Pool;
  user?: JwtPayload;
}

// Automation action union
export type AutomationActionType =
  | "send_message"
  | "assign_task"
  | "escalate"
  | "change_stage"
  | "reassign";
