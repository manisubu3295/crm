/**
 * Patches Express 4's internal Layer so that async route handlers that throw
 * (or return a rejected promise) automatically forward the error to next().
 * Without this, Express 4 silently drops the error and sends no response,
 * causing the client to receive an empty body → JSON parse error.
 */
import { createRequire } from "module";
const require = createRequire(import.meta.url);

export function patchAsyncErrors() {
  const Layer = require("express/lib/router/layer");
  const original: Function = Layer.prototype.handle_request;

  Layer.prototype.handle_request = function (
    req: unknown,
    res: unknown,
    next: (err?: unknown) => void
  ) {
    try {
      const ret: unknown = original.call(this, req, res, next);
      if (ret && typeof (ret as Promise<unknown>).catch === "function") {
        (ret as Promise<unknown>).catch(next);
      }
    } catch (err) {
      next(err);
    }
  };
}
