import type { Request, Response, NextFunction } from "express";
import logger from "../logger.js";

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  const status = (err as { status?: number }).status ?? 500;
  const message =
    err instanceof Error ? err.message : "Internal server error";

  logger.error({ err, path: req.path, method: req.method }, "Unhandled error");

  if (res.headersSent) return;

  res.status(status).json({
    ok: false,
    code: "INTERNAL_ERROR",
    message:
      process.env.NODE_ENV === "production"
        ? "An unexpected error occurred"
        : message,
  });
}
