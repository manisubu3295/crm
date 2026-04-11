import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Trophy, Target, TrendingUp, Users, Plus, ChevronUp, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "../components/layout/AppShell.js";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card.js";
import { Button } from "../components/ui/button.js";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog.js";
import { Label } from "../components/ui/label.js";
import { Input } from "../components/ui/input.js";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select.js";
import { Progress } from "../components/ui/progress.js";
import { Badge } from "../components/ui/badge.js";
import { apiRequest } from "../lib/queryClient.js";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export function LeaderboardPage() {
  const qc = useQueryClient();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [showSetTarget, setShowSetTarget] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["leaderboard", month, year],
    queryFn: () => apiRequest<any>("GET", `/api/targets/leaderboard?month=${month}&year=${year}`),
    staleTime: 60_000,
  });
  const rows: any[] = data?.data ?? [];

  return (
    <AppShell title="Revenue Leaderboard">
      {/* Controls */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <Select value={String(month)} onValueChange={(v) => setMonth(parseInt(v))}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>{MONTHS.map((m, i) => <SelectItem key={i+1} value={String(i+1)}>{m}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={String(year)} onValueChange={(v) => setYear(parseInt(v))}>
          <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
          <SelectContent>
            {[now.getFullYear()-1, now.getFullYear(), now.getFullYear()+1].map((y) => (
              <SelectItem key={y} value={String(y)}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="ml-auto">
          <Button variant="outline" onClick={() => setShowSetTarget(true)}><Target className="h-4 w-4" /> Set Targets</Button>
        </div>
      </div>

      {/* Summary KPIs */}
      {rows.length > 0 && (
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: "Total Target", value: `₹${rows.reduce((s,r)=>s+parseFloat(r.revenue_target??0),0).toLocaleString("en-IN")}`, icon: Target, color: "text-indigo-600" },
            { label: "Total Collected", value: `₹${rows.reduce((s,r)=>s+parseFloat(r.collected??0),0).toLocaleString("en-IN")}`, icon: TrendingUp, color: "text-emerald-600" },
            { label: "Total Admissions", value: rows.reduce((s,r)=>s+parseInt(r.admissions??0),0), icon: Users, color: "text-blue-600" },
            { label: "Avg Achievement", value: `${Math.round(rows.reduce((s,r)=>s+parseFloat(r.pct??0),0)/rows.length)}%`, icon: Trophy, color: "text-amber-600" },
          ].map(({ label, value, icon: Icon, color }) => (
            <Card key={label} className="border-0 shadow-sm">
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`p-2 rounded-lg bg-gray-50 ${color}`}><Icon className="h-4 w-4" /></div>
                <div><p className="text-xs text-gray-500">{label}</p><p className="font-bold">{value}</p></div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Leaderboard Table */}
      {isLoading ? (
        <div className="py-16 text-center text-gray-400">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="py-16 text-center text-gray-400">
          <Trophy className="mx-auto h-12 w-12 text-gray-200 mb-3" />
          <p>No data for this period. Targets may not be set yet.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                {["Rank","Counsellor","Revenue Target","Collected","Achievement","Admissions","Tasks Done"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y bg-white">
              {rows.map((r, idx) => {
                const pct = parseFloat(r.pct ?? 0);
                const progressColor = pct >= 100 ? "bg-emerald-500" : pct >= 70 ? "bg-amber-500" : "bg-red-500";
                const textColor = pct >= 100 ? "text-emerald-700" : pct >= 70 ? "text-amber-600" : "text-red-600";
                const medal = idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `#${idx + 1}`;
                return (
                  <tr key={r.user_id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-4 font-bold text-gray-700">{medal}</td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold shrink-0">
                          {r.counsellor_name?.charAt(0) ?? "?"}
                        </div>
                        <div>
                          <p className="font-medium">{r.counsellor_name}</p>
                          <p className="text-xs text-gray-400">{r.username}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 font-mono text-sm">₹{parseFloat(r.revenue_target ?? 0).toLocaleString("en-IN")}</td>
                    <td className="px-4 py-4 font-mono text-sm font-semibold">₹{parseFloat(r.collected ?? 0).toLocaleString("en-IN")}</td>
                    <td className="px-4 py-4 w-44">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                          <div className={`h-full rounded-full transition-all ${progressColor}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                        </div>
                        <span className={`text-xs font-semibold w-10 text-right ${textColor}`}>{Math.round(pct)}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <Badge className="bg-blue-100 text-blue-700">{r.admissions ?? 0}</Badge>
                    </td>
                    <td className="px-4 py-4 text-center text-gray-600">{r.tasks_done ?? 0}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showSetTarget && <SetTargetsDialog onClose={() => setShowSetTarget(false)} month={month} year={year} onSaved={() => qc.invalidateQueries({ queryKey: ["leaderboard"] })} />}
    </AppShell>
  );
}

// ─── Set Targets Dialog ───────────────────────────────────────
function SetTargetsDialog({ onClose, month, year, onSaved }: { onClose: () => void; month: number; year: number; onSaved: () => void }) {
  const [userId, setUserId] = useState("");
  const [revTarget, setRevTarget] = useState("");
  const [admTarget, setAdmTarget] = useState("");

  const { data: usersData } = useQuery({ queryKey: ["users"], queryFn: () => apiRequest<any>("GET", "/api/admin/users") });
  const users: any[] = usersData?.data ?? [];

  const mutation = useMutation({
    mutationFn: (body: any) => apiRequest<any>("POST", "/api/targets", body),
    onSuccess: () => { toast.success("Target saved"); onSaved(); onClose(); },
    onError: () => toast.error("Failed to save target"),
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Set Monthly Target</DialogTitle></DialogHeader>
        <p className="text-sm text-gray-500">{["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][month-1]} {year}</p>
        <div className="space-y-3 py-2">
          <div>
            <Label>Counsellor</Label>
            <Select value={userId || "none"} onValueChange={(v) => setUserId(v === "none" ? "" : v)}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Select counsellor" /></SelectTrigger>
              <SelectContent>{users.map((u) => <SelectItem key={u.id} value={u.id}>{u.full_name ?? u.username}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Revenue Target (₹)</Label><Input className="mt-1" type="number" min="0" value={revTarget} onChange={(e) => setRevTarget(e.target.value)} placeholder="500000" /></div>
          <div><Label>Admission Target</Label><Input className="mt-1" type="number" min="0" value={admTarget} onChange={(e) => setAdmTarget(e.target.value)} placeholder="20" /></div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={!userId || !revTarget || mutation.isPending}
            onClick={() => mutation.mutate({ user_id: userId, month, year, revenue_target: parseFloat(revTarget), admission_target: parseInt(admTarget || "0") })}>
            {mutation.isPending ? "Saving…" : "Save Target"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
