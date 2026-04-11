import { Router } from "express";
import bcrypt from "bcryptjs";
import { tenantFromHeader, authAndTenantGuard } from "../auth/tenantGuard.js";
import { signToken } from "../auth/jwt.js";
import { authRateLimit } from "../middleware/security.js";
import { loginSchema } from "../../../shared/types.js";
import type { TenantRequest } from "../types.js";

const router = Router();

// POST /api/auth/login
router.post("/login", authRateLimit, tenantFromHeader as any, async (req: TenantRequest, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ ok: false, code: "VALIDATION_ERROR", message: "Invalid input" });
    return;
  }

  const { username, password } = parsed.data;
  const result = await req.db.query(
    "SELECT * FROM users WHERE username = $1 AND is_active = TRUE",
    [username]
  );

  const user = result.rows[0];
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    res.status(401).json({ ok: false, code: "INVALID_CREDENTIALS", message: "Invalid username or password" });
    return;
  }

  const token = signToken({ sub: user.id, tenantId: req.tenantId, role: user.role });

  res.json({
    ok: true,
    token,
    tenantId: req.tenantId,
    user: {
      id: user.id,
      username: user.username,
      fullName: user.full_name,
      role: user.role,
      email: user.email,
    },
  });
});

// GET /api/auth/me
router.get(
  "/me",
  tenantFromHeader as any,
  authAndTenantGuard as any,
  async (req: TenantRequest, res) => {
    const result = await req.db.query(
      "SELECT id, username, full_name, email, phone, role FROM users WHERE id = $1",
      [req.user!.sub]
    );
    if (!result.rows[0]) {
      res.status(404).json({ ok: false, code: "NOT_FOUND", message: "User not found" });
      return;
    }
    res.json({ ok: true, data: result.rows[0] });
  }
);

export default router;
