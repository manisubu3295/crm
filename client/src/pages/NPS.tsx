import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Star, TrendingUp, ThumbsUp, ThumbsDown, Minus, Send, Search } from "lucide-react";
import { AppShell } from "../components/layout/AppShell.js";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card.js";
import { Badge } from "../components/ui/badge.js";
import { Button } from "../components/ui/button.js";
import { Input } from "../components/ui/input.js";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select.js";
import { apiRequest } from "../lib/queryClient.js";
import { formatDate } from "../lib/utils.js";

const SCORE_COLOR = (score: number) => {
  if (score >= 9) return "bg-emerald-100 text-emerald-700";
  if (score >= 7) return "bg-amber-100 text-amber-700";
  return "bg-red-100 text-red-700";
};

const CAT_ICON: Record<string, JSX.Element> = {
  promoter:  <ThumbsUp  className="h-3.5 w-3.5" />,
  passive:   <Minus     className="h-3.5 w-3.5" />,
  detractor: <ThumbsDown className="h-3.5 w-3.5" />,
};

const CAT_COLOR: Record<string, string> = {
  promoter:  "bg-emerald-100 text-emerald-700",
  passive:   "bg-amber-100  text-amber-700",
  detractor: "bg-red-100    text-red-700",
};

export function NPSPage() {
  const [courseId, setCourseId] = useState("");
  const [search, setSearch] = useState("");

  const { data: statsData } = useQuery({
    queryKey: ["nps-stats", courseId],
    queryFn: () => apiRequest<any>("GET", `/api/nps/stats${courseId ? `?courseId=${courseId}` : ""}`),
    staleTime: 30_000,
  });
  const stats = statsData?.data?.overall ?? {};
  const byCourse: any[] = statsData?.data?.byCourse ?? [];

  const { data: listData, isLoading } = useQuery({
    queryKey: ["nps-list", courseId],
    queryFn: () => apiRequest<any>("GET", `/api/nps?limit=100${courseId ? `&courseId=${courseId}` : ""}`),
    staleTime: 30_000,
  });
  const responses: any[] = (listData?.data ?? []).filter((r: any) =>
    !search || r.student_name?.toLowerCase().includes(search.toLowerCase()) || r.student_phone?.includes(search)
  );

  const { data: coursesData } = useQuery({
    queryKey: ["courses"],
    queryFn: () => apiRequest<any>("GET", "/api/admin/courses"),
  });
  const courses: any[] = coursesData?.data ?? [];

  const npsScore = parseFloat(stats.nps_score ?? "0");
  const npsColor = npsScore >= 50 ? "text-emerald-600" : npsScore >= 0 ? "text-amber-600" : "text-red-600";

  return (
    <AppShell title="Student NPS & Feedback">
      {/* Filters */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <Select value={courseId || "all"} onValueChange={(v) => setCourseId(v === "all" ? "" : v)}>
          <SelectTrigger className="w-48"><SelectValue placeholder="All courses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All courses</SelectItem>
            {courses.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
          <Input placeholder="Search student…" className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 mb-6">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 text-center">
            <p className={`text-3xl font-bold ${npsColor}`}>{stats.nps_score ?? "—"}</p>
            <p className="text-xs text-gray-500 mt-1">NPS Score</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-gray-800">{stats.responses ?? 0}</p>
            <p className="text-xs text-gray-500 mt-1">Responses / {stats.sent ?? 0} sent</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-gray-800">{stats.avg_score ?? "—"}</p>
            <p className="text-xs text-gray-500 mt-1">Avg Score</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex justify-between items-center text-xs mb-1">
              <span className="text-emerald-700 font-semibold">{stats.promoters ?? 0} P</span>
              <span className="text-amber-700 font-semibold">{stats.passives ?? 0} N</span>
              <span className="text-red-700 font-semibold">{stats.detractors ?? 0} D</span>
            </div>
            <div className="flex h-2 rounded overflow-hidden gap-0.5">
              <div className="bg-emerald-400 transition-all" style={{ flex: parseInt(stats.promoters ?? "0") }} />
              <div className="bg-amber-400 transition-all" style={{ flex: parseInt(stats.passives ?? "0") }} />
              <div className="bg-red-400 transition-all"   style={{ flex: parseInt(stats.detractors ?? "0") }} />
            </div>
            <p className="text-xs text-gray-500 mt-1 text-center">Promoter / Passive / Detractor</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* By Course breakdown */}
        {byCourse.length > 0 && (
          <Card className="border-0 shadow-sm lg:col-span-1">
            <CardHeader className="pb-2"><CardTitle className="text-sm">NPS by Course</CardTitle></CardHeader>
            <CardContent className="divide-y">
              {byCourse.map((c) => (
                <div key={c.course_id ?? "unknown"} className="flex items-center justify-between py-2.5">
                  <div>
                    <p className="text-sm font-medium">{c.course_name ?? "Unknown"}</p>
                    <p className="text-xs text-gray-400">{c.responses} responses · avg {c.avg_score}</p>
                  </div>
                  <span className={`text-sm font-bold ${parseFloat(c.nps_score ?? "0") >= 50 ? "text-emerald-600" : parseFloat(c.nps_score ?? "0") >= 0 ? "text-amber-600" : "text-red-600"}`}>
                    {c.nps_score ?? "—"}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Response list */}
        <Card className={`border-0 shadow-sm ${byCourse.length > 0 ? "lg:col-span-2" : "lg:col-span-3"}`}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Star className="h-4 w-4 text-amber-500" /> Responses
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="py-8 text-center text-gray-400">Loading…</div>
            ) : responses.filter((r) => r.responded_at).length === 0 ? (
              <div className="py-8 text-center text-gray-400">
                <TrendingUp className="mx-auto h-8 w-8 text-gray-200 mb-2" />
                <p>No responses yet</p>
              </div>
            ) : (
              <div className="divide-y">
                {responses.filter((r) => r.responded_at).map((r) => (
                  <div key={r.id} className="flex items-start gap-3 px-4 py-3">
                    <div className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold shrink-0 ${SCORE_COLOR(r.score)}`}>
                      {r.score}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium">{r.student_name}</p>
                        <Badge className={`text-[10px] ${CAT_COLOR[r.category]} flex items-center gap-1`}>
                          {CAT_ICON[r.category]} {r.category}
                        </Badge>
                        {r.course_name && <span className="text-xs text-indigo-600">{r.course_name}</span>}
                      </div>
                      {r.comment && <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">{r.comment}</p>}
                      <p className="text-xs text-gray-400 mt-0.5">{r.student_phone} · {formatDate(r.responded_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Awaiting response */}
      {responses.filter((r) => !r.responded_at).length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2 flex items-center gap-2">
            <Send className="h-4 w-4" /> Surveys Sent — Awaiting Response ({responses.filter((r) => !r.responded_at).length})
          </h3>
          <div className="divide-y rounded-lg border overflow-hidden bg-white">
            {responses.filter((r) => !r.responded_at).slice(0, 20).map((r) => (
              <div key={r.id} className="flex items-center gap-3 px-4 py-2.5">
                <div className="h-7 w-7 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500 shrink-0">
                  {r.student_name?.charAt(0) ?? "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{r.student_name}</p>
                  <p className="text-xs text-gray-400">{r.student_phone} · Sent {formatDate(r.sent_at)}</p>
                </div>
                {r.course_name && <span className="text-xs text-indigo-600 shrink-0">{r.course_name}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </AppShell>
  );
}
