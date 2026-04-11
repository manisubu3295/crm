import type { Response, NextFunction } from "express";
import type { TenantRequest } from "../types.js";
import { verifyToken } from "./jwt.js";
import { getPool } from "../tenant/dbPool.js";
import { getRegistry } from "../tenant/registry.js";
import logger from "../logger.js";

// Extracts X-Tenant header and attaches db pool to request
export async function tenantFromHeader(
  req: TenantRequest,
  res: Response,
  next: NextFunction
) {
  const tenantId = req.headers["x-tenant"] as string | undefined;

  if (!tenantId) {
    res.status(400).json({ ok: false, code: "MISSING_TENANT", message: "X-Tenant header required" });
    return;
  }

  const registry = getRegistry();
  if (!registry.tenants[tenantId]) {
    res.status(404).json({ ok: false, code: "TENANT_NOT_FOUND", message: "Unknown tenant" });
    return;
  }

  try {
    req.tenantId = tenantId;
    req.db = await getPool(tenantId);
    next();
  } catch (err) {
    logger.error({ err, tenantId }, "Failed to get tenant DB pool");
    res.status(503).json({ ok: false, code: "DB_UNAVAILABLE", message: "Database unavailable" });
  }
}

// Verifies JWT and validates tenant claim matches X-Tenant header
export function authAndTenantGuard(
  req: TenantRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers["authorization"];
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ ok: false, code: "MISSING_TOKEN", message: "Bearer token required" });
    return;
  }

  const token = authHeader.slice(7);
  try {
    const payload = verifyToken(token);

    if (payload.tenantId !== req.tenantId) {
      res.status(403).json({ ok: false, code: "TENANT_MISMATCH", message: "Token tenant mismatch" });
      return;
    }

    req.user = payload;
    next();
  } catch {
    res.status(401).json({ ok: false, code: "INVALID_TOKEN", message: "Invalid or expired token" });
  }
}

// Role-based guard factory
export function requireRole(...roles: string[]) {
  return (req: TenantRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ ok: false, code: "FORBIDDEN", message: "Insufficient permissions" });
      return;
    }
    next();
  };
}
