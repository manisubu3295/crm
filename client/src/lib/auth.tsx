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

    const text = await res.text();
    let data: Partial<AuthResponse> & { ok?: boolean; message?: string } = {};
    try {
      data = text ? (JSON.parse(text) as Partial<AuthResponse> & { ok?: boolean; message?: string }) : {};
    } catch {
      throw new Error(`Login failed (${res.status}). Server returned an invalid response.`);
    }

    if (!res.ok || !data.ok) {
      throw new Error(data.message ?? `Login failed (${res.status})`);
    }

    if (!data.token || !data.tenantId || !data.user) {
      throw new Error("Login failed. Missing auth data in server response.");
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
