import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import type { AuthResponse } from "@shared/types.js";

type AuthUser = AuthResponse["user"] & { tenantId: string };

type AuthCtx = {
  user: AuthUser | null;
  token: string | null;
  tenantId: string | null;
  login: (tenantId: string, username: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const raw = localStorage.getItem("crm_user");
    return raw ? JSON.parse(raw) : null;
  });
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem("crm_token")
  );
  const [tenantId, setTenantId] = useState<string | null>(() =>
    localStorage.getItem("crm_tenant")
  );

  const login = useCallback(async (tid: string, username: string, password: string) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Tenant": tid },
      body: JSON.stringify({ username, password }),
    });

    const data: AuthResponse = await res.json();
    if (!res.ok || !data.ok) {
      throw new Error((data as { message?: string }).message ?? "Login failed");
    }

    localStorage.setItem("crm_token", data.token);
    localStorage.setItem("crm_tenant", data.tenantId);
    localStorage.setItem("crm_user", JSON.stringify({ ...data.user, tenantId: data.tenantId }));

    setToken(data.token);
    setTenantId(data.tenantId);
    setUser({ ...data.user, tenantId: data.tenantId });
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("crm_token");
    localStorage.removeItem("crm_tenant");
    localStorage.removeItem("crm_user");
    setToken(null);
    setTenantId(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, tenantId, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
