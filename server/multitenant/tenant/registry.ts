import fs from "fs";
import type { TenantRegistry } from "../types.js";
import { env } from "../env.js";
import logger from "../logger.js";

let _registry: TenantRegistry = { tenants: {} };

export function loadRegistry(): void {
  try {
    const raw = fs.readFileSync(env.TENANT_REGISTRY_PATH, "utf-8");
    _registry = JSON.parse(raw) as TenantRegistry;
    logger.info({ count: Object.keys(_registry.tenants).length }, "Tenant registry loaded");
  } catch (err) {
    logger.warn({ err, path: env.TENANT_REGISTRY_PATH }, "Could not load tenant registry — starting empty");
  }
}

export function getRegistry(): TenantRegistry {
  return _registry;
}

export function registerTenant(id: string, config: TenantRegistry["tenants"][string]): void {
  _registry.tenants[id] = config;
  // Persist back to file
  fs.writeFileSync(env.TENANT_REGISTRY_PATH, JSON.stringify(_registry, null, 2));
  logger.info({ tenantId: id }, "Tenant registered and persisted");
}
