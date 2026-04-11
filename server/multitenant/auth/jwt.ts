import jwt from "jsonwebtoken";
import { env } from "../env.js";
import type { JwtPayload } from "../../../shared/types.js";

const EXPIRY = "7d";

export function signToken(payload: Omit<JwtPayload, "iat" | "exp">): string {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: EXPIRY });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
}
