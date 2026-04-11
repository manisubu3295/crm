import { useState } from "react";
import { Link } from "wouter";
import { CheckSquare, Clock, AlertTriangle, Filter, Phone, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "../components/layout/AppShell.js";
import { Button } from "../components/ui/button.js";
import { Badge } from "../components/ui/badge.js";
import { useTasks, useUpdateTask, useTaskSummary } from "../hooks/useFollowUps.js";
import { Card, CardContent } from "../components/ui/card.js";
import { formatDateTime, timeAgo } from "../lib/utils.js";

const STATUS_TABS = [
  { key: "",         label: "All" },
  { key: "pending",  label: "Pending" },
  { key: "overdue",  label: "Overdue" },
  { key: "done",     label: "Done" },
];

const PRIORITY_COLORS: Record<string, string> = {
  urgent: "border-l-red-500",
  high:   "border-l-orange-500",
  medium: "border-l-blue-400",
  low:    "border-l-gray-300",
};

const TYPE_ICONS: Record<string, React.ReactNode> = {
  call:      <Phone className="h-3.5 w-3.5" />,
  whatsapp:  <MessageSquare className="h-3.5 w-3.5" />,
  demo:      <CheckSquare className="h-3.5 w-3.5" />,
  meeting:   <CheckSquare className="h-3.5 w-3.5" />,
  follow_up: <Clock className="h-3.5 w-3.5" />,
};

export function FollowUpsPage() {
  const [activeTab, setActiveTab] = useState("");
  const [dueToday, setDueToday]   = useState(false);

  const { data: tasks, isLoading } = useTasks({
    ...(activeTab ? { status: activeTab } : {}),
    ...(dueToday  ? { dueToday: true  } : {}),
  });
  const { data: summary } = useTaskSummary();
  const updateTask = useUpdateTask();

  const all = tasks?.data ?? [];

  const markDone = async (id: string) => {
    try {
      await updateTask.mutateAsync({ id, status: "done" });
      toast.success("Task marked done");
    } catch { toast.error("Failed to update task"); }
  };

  return (
    <AppShell title="Follow-Ups">
      {/* Summary cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryCard icon={<Clock className="h-5 w-5 text-blue-600" />}
          label="Due Today" value={summary?.data?.due_today ?? "—"} color="bg-blue-50" />
        <SummaryCard icon={<AlertTriangle className="h-5 w-5 text-red-600" />}
          label="Overdue" value={summary?.data?.overdue ?? "—"} color="bg-red-50" />
        <SummaryCard icon={<CheckSquare className="h-5 w-5 text-green-600" />}
          label="Done Today" value={summary?.data?.completed_today ?? "—"} color="bg-green-50" />
      </div>

      {/* Filters */}
      <div className="mb-4 flex items-center gap-3">
        <div className="flex rounded-lg border border-gray-200 overflow-hidden">
          {STATUS_TABS.map((t) => (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              className={`px-4 py-1.5 text-sm ${activeTab === t.key ? "bg-blue-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}>
              {t.label}
            </button>
          ))}
        </div>
        <button onClick={() => setDueToday(!dueToday)}
          className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm ${dueToday ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-200 bg-white text-gray-600"}`}>
          <Filter className="h-3.5 w-3.5" />
          Due Today
        </button>
      </div>

      {/* Task List */}
      {isLoading && <p className="py-8 text-center text-gray-400">Loading tasks…</p>}
      {!isLoading && all.length === 0 && (
        <div className="py-12 text-center">
          <CheckSquare className="mx-auto mb-3 h-10 w-10 text-gray-200" />
          <p className="text-gray-400">No tasks found</p>
        </div>
      )}

      <div className="space-y-2">
        {all.map((task: any) => {
          const isOverdue = task.status === "overdue" || (task.status === "pending" && new Date(task.due_at) < new Date());
          return (
            <div key={task.id}
              className={`flex items-start gap-4 rounded-xl border bg-white p-4 border-l-4 transition-shadow hover:shadow-sm ${PRIORITY_COLORS[task.priority] ?? "border-l-gray-300"}`}>
              {/* Checkbox */}
              <button onClick={() => markDone(task.id)}
                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors
                  ${task.status === "done" ? "border-green-500 bg-green-500" : "border-gray-300 hover:border-green-400"}`}>
                {task.status === "done" && <svg className="h-3 w-3 text-white" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth={2.5}><polyline points="2 6 5 9 10 3" /></svg>}
              </button>

              {/* Content */}
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className={`font-medium ${task.status === "done" ? "text-gray-400 line-through" : "text-gray-900"}`}>
                      {task.title}
                    </p>
                    <Link href={`/leads/${task.lead_id}`}>
                      <a className="text-sm text-blue-600 hover:underline">{task.lead_name}</a>
                    </Link>
                    <span className="ml-1 text-sm text-gray-500">· {task.lead_phone}</span>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <span className="capitalize text-xs text-gray-500 flex items-center gap-1">
                      {TYPE_ICONS[task.task_type] ?? <CheckSquare className="h-3.5 w-3.5" />}
                      {task.task_type.replace(/_/g," ")}
                    </span>
                    <Badge variant={task.priority === "urgent" ? "destructive" : task.priority === "high" ? "warning" : "outline"}>
                      {task.priority}
                    </Badge>
                  </div>
                </div>

                <div className="mt-1.5 flex items-center gap-3 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span className={isOverdue && task.status !== "done" ? "font-medium text-red-600" : ""}>
                      {isOverdue && task.status !== "done" ? "Overdue · " : "Due "}
                      {formatDateTime(task.due_at)}
                    </span>
                  </span>
                  <span>Assigned to: {task.assigned_to_name}</span>
                </div>

                {task.outcome && (
                  <p className="mt-1.5 rounded-md bg-gray-50 px-2 py-1 text-xs text-gray-600">{task.outcome}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </AppShell>
  );
}

function SummaryCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`rounded-lg p-2 ${color}`}>{icon}</div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            <p className="text-sm text-gray-500">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
