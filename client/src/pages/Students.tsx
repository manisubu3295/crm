import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  GraduationCap, Search, Phone, Mail, BookOpen,
  User, TrendingUp, Calendar, MessageSquare, ChevronRight,
} from "lucide-react";
import { AppShell } from "../components/layout/AppShell.js";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card.js";
import { Badge } from "../components/ui/badge.js";
import { Input } from "../components/ui/input.js";
import { apiRequest } from "../lib/queryClient.js";

function fmt(n: number | string | undefined) {
  return n ? Math.round(Number(n)) : 0;
}

function timeAgo(iso: string | null) {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  if (d > 0) return `${d}d ago`;
  if (h > 0) return `${h}h ago`;
  return "just now";
}

function ScoreDot({ score }: { score: number }) {
  const color = score >= 75 ? "bg-emerald-500" : score >= 50 ? "bg-amber-500" : "bg-slate-300";
  return (
    <span className="flex items-center gap-1.5">
      <span className={`inline-block h-2 w-2 rounded-full ${color}`} />
      <span className="text-xs text-muted-foreground">{score}</span>
    </span>
  );
}

export function StudentsPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const { data: stats } = useQuery({
    queryKey: ["student-stats"],
    queryFn: () => apiRequest<any>("GET", "/api/students/stats"),
    staleTime: 60_000,
  });

  const { data, isLoading } = useQuery({
    queryKey: ["students", search, page],
    queryFn: () => apiRequest<any>("GET", `/api/students?search=${encodeURIComponent(search)}&page=${page}&limit=20`),
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });

  const students = data?.data ?? [];
  const meta = data?.meta ?? { total: 0, page: 1, limit: 20 };

  return (
    <AppShell title="Students">
      {/* Stats row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 mb-6">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50">
              <GraduationCap className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats?.data?.total ?? 0}</p>
              <p className="text-xs text-muted-foreground">Total Students</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50">
              <TrendingUp className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats?.data?.thisMonth ?? 0}</p>
              <p className="text-xs text-muted-foreground">Admitted This Month</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Top Courses</p>
            <div className="space-y-1">
              {(stats?.data?.byCourse ?? []).slice(0, 3).map((r: any) => (
                <div key={r.course} className="flex items-center justify-between">
                  <span className="truncate text-xs text-foreground">{r.course}</span>
                  <Badge variant="secondary" className="text-[10px]">{r.count}</Badge>
                </div>
              ))}
              {!stats?.data?.byCourse?.length && <p className="text-xs text-muted-foreground">No data</p>}
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Top Counsellors</p>
            <div className="space-y-1">
              {(stats?.data?.byCounsellor ?? []).slice(0, 3).map((r: any) => (
                <div key={r.counsellor} className="flex items-center justify-between">
                  <span className="truncate text-xs text-foreground">{r.counsellor}</span>
                  <Badge variant="secondary" className="text-[10px]">{r.count}</Badge>
                </div>
              ))}
              {!stats?.data?.byCounsellor?.length && <p className="text-xs text-muted-foreground">No data</p>}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search + table */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-base">Admitted Students</CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search name, phone, email…"
                className="pl-8 h-8 text-sm"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading && (
            <div className="py-16 text-center text-sm text-muted-foreground">Loading…</div>
          )}
          {!isLoading && students.length === 0 && (
            <div className="py-16 text-center">
              <GraduationCap className="mx-auto h-10 w-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm font-medium text-muted-foreground">No admitted students yet</p>
              <p className="text-xs text-muted-foreground mt-1">Convert leads to "Admitted" stage to see them here</p>
            </div>
          )}
          {students.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    {["Student", "Contact", "Course", "Score", "Counsellor", "Admitted", "Last Contact", ""].map(h => (
                      <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {students.map((s: any) => (
                    <tr key={s.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors group">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-foreground">{s.full_name}</p>
                        <p className="text-[11px] text-muted-foreground">{s.lead_no}</p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Phone className="h-3 w-3" />{s.phone}
                          </div>
                          {s.email && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Mail className="h-3 w-3" /><span className="truncate max-w-[140px]">{s.email}</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {s.course_name ? (
                          <div className="flex items-center gap-1.5">
                            <BookOpen className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                            <span className="text-xs font-medium text-foreground">{s.course_name}</span>
                          </div>
                        ) : <span className="text-xs text-muted-foreground">—</span>}
                      </td>
                      <td className="px-4 py-3"><ScoreDot score={s.lead_score ?? 0} /></td>
                      <td className="px-4 py-3">
                        {s.counsellor_name ? (
                          <div className="flex items-center gap-1.5">
                            <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <span className="text-xs">{s.counsellor_name}</span>
                          </div>
                        ) : <span className="text-xs text-muted-foreground">Unassigned</span>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {s.admitted_at ? new Date(s.admitted_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <MessageSquare className="h-3 w-3" />
                          {timeAgo(s.last_message_at)}
                        </div>
                        <p className="text-[10px] text-muted-foreground/60">{fmt(s.total_messages)} msgs</p>
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/leads/${s.id}`}>
                          <span className="flex items-center gap-1 text-[11px] text-indigo-600 hover:underline opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                            View <ChevronRight className="h-3 w-3" />
                          </span>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {meta.total > meta.limit && (
            <div className="flex items-center justify-between border-t px-4 py-3">
              <p className="text-xs text-muted-foreground">
                {(meta.page - 1) * meta.limit + 1}–{Math.min(meta.page * meta.limit, meta.total)} of {meta.total}
              </p>
              <div className="flex gap-2">
                <button
                  disabled={meta.page <= 1}
                  onClick={() => setPage(p => p - 1)}
                  className="rounded-lg border px-3 py-1.5 text-xs font-medium disabled:opacity-40 hover:bg-muted transition-colors"
                >Prev</button>
                <button
                  disabled={meta.page * meta.limit >= meta.total}
                  onClick={() => setPage(p => p + 1)}
                  className="rounded-lg border px-3 py-1.5 text-xs font-medium disabled:opacity-40 hover:bg-muted transition-colors"
                >Next</button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}
