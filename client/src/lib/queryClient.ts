import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
      refetchOnWindowFocus: true,
    },
  },
});

export function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem("crm_token");
  const tenantId = localStorage.getItem("crm_tenant");
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (tenantId) headers["X-Tenant"] = tenantId;
  return headers;
}

export async function apiRequest<T>(
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  const res = await fetch(path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let data: Record<string, unknown> = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    // Server sent non-JSON (HTML error page, plain text, etc.)
    throw Object.assign(new Error(`Server error (${res.status})`), { status: res.status });
  }

  if (res.status === 401) {
    // Token expired or invalid — clear session and redirect to login
    localStorage.removeItem("crm_token");
    localStorage.removeItem("crm_tenant");
    localStorage.removeItem("crm_user");
    window.location.href = "/login";
    throw Object.assign(new Error("Session expired. Please log in again."), { status: 401 });
  }

  if (!res.ok || !data["ok"]) {
    throw Object.assign(new Error((data["message"] as string) ?? "Request failed"), {
      code: data["code"],
      status: res.status,
    });
  }

  return data as T;
}
