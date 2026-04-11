import { getIo } from "./ioRegistry.js";

export function emitToTenant(tenantId: string, event: string, payload: Record<string, unknown>) {
  const io = getIo();
  if (!io) return;
  io.to(`tenant:${tenantId}`).emit(event, payload);
}

export function emitToUser(userId: string, event: string, payload: Record<string, unknown>) {
  const io = getIo();
  if (!io) return;
  io.to(`user:${userId}`).emit(event, payload);
}
