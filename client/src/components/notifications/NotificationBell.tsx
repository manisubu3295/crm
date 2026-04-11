import { useState, useEffect } from "react";
import { Bell, X, Check, CheckCheck, ExternalLink } from "lucide-react";
import { Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "../../lib/queryClient.js";
import { timeAgo } from "../../lib/utils.js";
import { useAuth } from "../../lib/auth.js";
import { getSocket } from "../../lib/socket.js";

type Notification = {
  id: string;
  type: string;
  title: string;
  body?: string;
  lead_id?: string;
  lead_name?: string;
  lead_no?: string;
  is_read: boolean;
  created_at: string;
};

const TYPE_ICON: Record<string, string> = {
  task_overdue:    "⏰",
  sla_breach:      "🚨",
  lead_assigned:   "👤",
  message_replied: "💬",
  lead_created:    "✨",
  escalation:      "⬆️",
};

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const { user, tenantId } = useAuth();
  const qc = useQueryClient();

  const { data } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => apiRequest<{ ok: true; data: Notification[]; unreadCount: number }>("GET", "/api/notifications?limit=20"),
    refetchInterval: 60_000,
  });

  const readAll = useMutation({
    mutationFn: () => apiRequest("PATCH", "/api/notifications/read-all", {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const readOne = useMutation({
    mutationFn: (id: string) => apiRequest("PATCH", `/api/notifications/${id}/read`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const clearRead = useMutation({
    mutationFn: () => apiRequest("DELETE", "/api/notifications", {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  // Listen for real-time notification events
  useEffect(() => {
    if (!user || !tenantId) return;
    const socket = getSocket(tenantId, user.id);
    socket.on("notification", () => qc.invalidateQueries({ queryKey: ["notifications"] }));
    return () => { socket.off("notification"); };
  }, [user, tenantId, qc]);

  const unread = data?.unreadCount ?? 0;
  const notifications = data?.data ?? [];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />

          {/* Panel */}
          <div className="absolute right-0 top-full z-30 mt-2 w-80 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
              <span className="text-sm font-semibold text-gray-900">
                Notifications {unread > 0 && <span className="ml-1 text-xs text-gray-500">({unread} new)</span>}
              </span>
              <div className="flex gap-1">
                {unread > 0 && (
                  <button onClick={() => readAll.mutate()} title="Mark all read"
                    className="rounded p-1 text-gray-400 hover:text-blue-600">
                    <CheckCheck className="h-4 w-4" />
                  </button>
                )}
                <button onClick={() => clearRead.mutate()} title="Clear read"
                  className="rounded p-1 text-gray-400 hover:text-red-500">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* List */}
            <div className="max-h-[400px] overflow-y-auto">
              {notifications.length === 0 && (
                <div className="py-10 text-center">
                  <Bell className="mx-auto mb-2 h-8 w-8 text-gray-200" />
                  <p className="text-sm text-gray-400">All caught up!</p>
                </div>
              )}
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={`flex items-start gap-3 border-b border-gray-50 px-4 py-3 last:border-0 hover:bg-gray-50 ${!n.is_read ? "bg-blue-50/40" : ""}`}
                >
                  <span className="mt-0.5 text-base">{TYPE_ICON[n.type] ?? "🔔"}</span>
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm ${!n.is_read ? "font-medium text-gray-900" : "text-gray-700"}`}>{n.title}</p>
                    {n.body && <p className="mt-0.5 line-clamp-2 text-xs text-gray-500">{n.body}</p>}
                    {n.lead_name && (
                      <Link href={`/leads/${n.lead_id}`}>
                        <a className="mt-0.5 flex items-center gap-1 text-xs text-blue-600 hover:underline" onClick={() => setOpen(false)}>
                          <ExternalLink className="h-3 w-3" />{n.lead_name} · {n.lead_no}
                        </a>
                      </Link>
                    )}
                    <p className="mt-1 text-xs text-gray-400">{timeAgo(n.created_at)}</p>
                  </div>
                  {!n.is_read && (
                    <button onClick={() => readOne.mutate(n.id)} className="mt-0.5 shrink-0 rounded p-0.5 text-gray-300 hover:text-blue-500">
                      <Check className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
