import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "../lib/queryClient.js";
import type { ApiSuccess } from "@shared/types.js";
import type { Lead } from "@shared/schema.js";

type LeadsResponse = ApiSuccess<Lead[]> & { meta: { total: number; page: number; limit: number } };

export function useLeads(filters?: Record<string, string | number>) {
  return useQuery({
    queryKey: ["leads", filters],
    queryFn: () => {
      const params = new URLSearchParams(filters as Record<string, string> ?? {});
      return apiRequest<LeadsResponse>("GET", `/api/leads?${params}`);
    },
  });
}

export function useLead(id: string) {
  return useQuery({
    queryKey: ["lead", id],
    queryFn: () => apiRequest<ApiSuccess<any>>("GET", `/api/leads/${id}`),
    enabled: !!id,
  });
}

export function useCreateLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: unknown) => apiRequest("POST", "/api/leads", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["leads"] }),
  });
}

export function useUpdateLeadStage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, stage, note }: { id: string; stage: string; note?: string }) =>
      apiRequest("PATCH", `/api/leads/${id}/stage`, { stage, note }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["leads"] });
      qc.invalidateQueries({ queryKey: ["lead", vars.id] });
    },
  });
}

export function useAssignLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, userId }: { id: string; userId: string }) =>
      apiRequest("PATCH", `/api/leads/${id}/assign`, { userId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["leads"] }),
  });
}
