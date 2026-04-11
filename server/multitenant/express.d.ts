import type { Pool } from "pg";
import type { JwtPayload } from "../../shared/types.js";

declare global {
  namespace Express {
    interface Request {
      tenantId: string;
      db: Pool;
      user?: JwtPayload;
    }
  }
}

export {};
