import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "../lib/queryClient.js";
import type { ApiSuccess } from "@shared/types.js";

export function useTasks(filters?: Record<string, string | boolean>) {
  return useQuery({
    queryKey: ["tasks", filters],
    queryFn: () => {
      const params = new URLSearchParams(
        Object.entries(filters ?? {}).reduce<Record<string, string>>((acc, [k, v]) => {
          if (v !== undefined) acc[k] = String(v);
          return acc;
        }, {})
      );
      return apiRequest<ApiSuccess<unknown[]>>("GET", `/api/tasks?${params}`);
    },
    refetchInterval: 60_000, // refresh every minute for overdue updates
  });
}

export function useTaskSummary() {
  return useQuery({
    queryKey: ["tasks", "summary"],
    queryFn: () => apiRequest<ApiSuccess<{ due_today: string; overdue: string; completed_today: string }>>("GET", "/api/tasks/today-summary"),
    refetchInterval: 60_000,
  });
}

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: unknown) => apiRequest("POST", "/api/tasks", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });
}

export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Record<string, unknown>) =>
      apiRequest("PATCH", `/api/tasks/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}
