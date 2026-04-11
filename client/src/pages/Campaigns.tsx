import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, TrendingUp, Users, IndianRupee } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "../components/layout/AppShell.js";
import { Button } from "../components/ui/button.js";
import { Badge } from "../components/ui/badge.js";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card.js";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog.js";
import { Input } from "../components/ui/input.js";
import { apiRequest } from "../lib/queryClient.js";
import { formatDate } from "../lib/utils.js";
import { useForm } from "react-hook-form";

const SOURCES = ["meta_ads","google_ads","email","sms","referral","organic","other"];

export function CampaignsPage() {
  const [showNew, setShowNew] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const qc = useQueryClient();

  const { data } = useQuery({
    queryKey: ["campaigns"],
    queryFn: () => apiRequest<{ ok: true; data: any[] }>("GET", "/api/campaigns"),
  });

  const { data: stats } = useQuery({
    queryKey: ["campaign-stats", selected],
    enabled: !!selected,
    queryFn: () => apiRequest<{ ok: true; data: any }>("GET", `/api/campaigns/${selected}/stats`),
  });

  const toggle = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      apiRequest("PATCH", `/api/campaigns/${id}`, { isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["campaigns"] }),
  });

  const campaigns = data?.data ?? [];

  return (
    <AppShell title="Campaigns">
      <div className="mb-5 flex justify-between">
        <p className="text-sm text-gray-500">{campaigns.length} campaigns</p>
        <Button onClick={() => setShowNew(true)}>
          <Plus className="h-4 w-4" /> New Campaign
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {campaigns.map((c) => (
          <Card key={c.id} className={`cursor-pointer transition-shadow hover:shadow-md ${selected === c.id ? "ring-2 ring-blue-500" : ""}`}
            onClick={() => setSelected(selected === c.id ? null : c.id)}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-base">{c.name}</CardTitle>
                  <p className="mt-0.5 text-xs capitalize text-gray-500">{c.source.replace(/_/g," ")}</p>
                </div>
                <button onClick={(e) => { e.stopPropagation(); toggle.mutate({ id: c.id, isActive: !c.is_active }); }}
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${c.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                  {c.is_active ? "Active" : "Paused"}
                </button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3 text-center">
                <Metric icon={<Users className="h-4 w-4 text-blue-600" />} value={c.total_leads ?? 0} label="Leads" />
                <Metric icon={<TrendingUp className="h-4 w-4 text-green-600" />} value={c.total_admitted ?? 0} label="Admitted" />
                <Metric icon={<IndianRupee className="h-4 w-4 text-orange-600" />}
                  value={c.total_spend ? `₹${parseInt(c.total_spend).toLocaleString("en-IN")}` : "—"}
                  label="Spend" />
              </div>
              {(c.start_date || c.end_date) && (
                <p className="mt-3 text-xs text-gray-400">
                  {c.start_date ? formatDate(c.start_date) : "—"} → {c.end_date ? formatDate(c.end_date) : "Ongoing"}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
        {campaigns.length === 0 && (
          <div className="col-span-3 py-16 text-center text-gray-400">
            <TrendingUp className="mx-auto mb-3 h-10 w-10 text-gray-200" />
            <p>No campaigns yet. Create your first campaign.</p>
          </div>
        )}
      </div>

      {/* Campaign detail stats */}
      {selected && stats?.data && (
        <Card className="mt-6">
          <CardHeader><CardTitle>Daily Stats — {stats.data.campaign?.name}</CardTitle></CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-left">
                  {["Date","Leads","Contacted","Admitted","Spend","CPL","CPA"].map((h) => (
                    <th key={h} className="px-4 py-3 font-medium text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stats.data.dailyStats?.map((d: any) => (
                  <tr key={d.date} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{d.date}</td>
                    <td className="px-4 py-3">{d.leads_count}</td>
                    <td className="px-4 py-3">{d.contacted_count}</td>
                    <td className="px-4 py-3 text-green-700 font-medium">{d.admitted_count}</td>
                    <td className="px-4 py-3">{d.spend ? `₹${parseFloat(d.spend).toFixed(0)}` : "—"}</td>
                    <td className="px-4 py-3">{d.cost_per_lead ? `₹${parseFloat(d.cost_per_lead).toFixed(0)}` : "—"}</td>
                    <td className="px-4 py-3">{d.cost_per_admission ? `₹${parseFloat(d.cost_per_admission).toFixed(0)}` : "—"}</td>
                  </tr>
                ))}
                {!stats.data.dailyStats?.length && (
                  <tr><td colSpan={7} className="py-6 text-center text-gray-400">No daily data yet</td></tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      <NewCampaignDialog open={showNew} onClose={() => setShowNew(false)} />
    </AppShell>
  );
}

function Metric({ icon, value, label }: { icon: React.ReactNode; value: string | number; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      {icon}
      <span className="text-base font-bold text-gray-900">{value}</span>
      <span className="text-xs text-gray-500">{label}</span>
    </div>
  );
}

function NewCampaignDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const { register, handleSubmit, reset } = useForm<any>();

  const create = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/campaigns", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["campaigns"] }); toast.success("Campaign created"); reset(); onClose(); },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>New Campaign</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit((d) => {
          if (d.startDate && d.endDate && d.endDate < d.startDate) {
            toast.error("End date must be after start date"); return;
          }
          create.mutate(d);
        })} className="space-y-3 mt-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Name *</label>
            <Input {...register("name", { required: true })} placeholder="Q1 Meta Ads" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Source *</label>
              <select {...register("source", { required: true })}
                className="flex h-9 w-full rounded-md border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {SOURCES.map((s) => <option key={s} value={s}>{s.replace(/_/g," ")}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Budget (₹)</label>
              <Input {...register("budget")} type="number" placeholder="50000" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Start Date</label>
              <Input {...register("startDate")} type="date" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">End Date</label>
              <Input {...register("endDate")} type="date" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Meta Campaign ID</label>
            <Input {...register("metaCampaignId")} placeholder="Optional" />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={create.isPending}>Create</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
