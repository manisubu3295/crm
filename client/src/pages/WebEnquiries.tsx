import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "../components/layout/AppShell.js";
import { Badge } from "../components/ui/badge.js";
import { Input } from "../components/ui/input.js";
import { Search, Globe, Phone, Mail, BookOpen, MessageSquare, ExternalLink } from "lucide-react";
import { Link } from "wouter";
import { getAuthHeaders } from "../lib/queryClient.js";
import { formatDateTime } from "../lib/utils.js";

interface Enquiry {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  course: string | null;
  message: string | null;
  status: string;
  lead_id: string | null;
  created_at: string;
}

const STATUS_COLOR: Record<string, string> = {
  new:       "bg-blue-100 text-blue-700",
  contacted: "bg-yellow-100 text-yellow-700",
  converted: "bg-green-100 text-green-700",
  closed:    "bg-gray-100 text-gray-500",
};

async function fetchEnquiries(): Promise<Enquiry[]> {
  const res = await fetch("/api/enquiries", { headers: getAuthHeaders() });
  if (!res.ok) throw new Error("Failed to load enquiries");
  const json = await res.json();
  return json.data ?? [];
}

async function updateStatus(id: string, status: string) {
  const res = await fetch(`/api/enquiries/${id}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error("Failed to update status");
}

export function WebEnquiriesPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const { data: enquiries = [], isLoading, refetch } = useQuery({
    queryKey: ["web-enquiries"],
    queryFn: fetchEnquiries,
    staleTime: 30_000,
  });

  const filtered = enquiries.filter(e => {
    const matchesSearch =
      !search ||
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.phone.includes(search) ||
      (e.email ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (e.course ?? "").toLowerCase().includes(search.toLowerCase());
    const matchesStatus = !statusFilter || e.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleStatusChange = async (id: string, status: string) => {
    await updateStatus(id, status);
    refetch();
  };

  const counts = enquiries.reduce((acc, e) => {
    acc[e.status] = (acc[e.status] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <AppShell title="Web Enquiries">
      {/* Stats strip */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Total",     value: enquiries.length,       color: "text-foreground" },
          { label: "New",       value: counts["new"] ?? 0,      color: "text-blue-600" },
          { label: "Contacted", value: counts["contacted"] ?? 0, color: "text-yellow-600" },
          { label: "Converted", value: counts["converted"] ?? 0, color: "text-green-600" },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="mb-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search name, phone, course…"
            className="pl-8"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
        >
          <option value="">All statuses</option>
          <option value="new">New</option>
          <option value="contacted">Contacted</option>
          <option value="converted">Converted</option>
          <option value="closed">Closed</option>
        </select>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Globe className="h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            {enquiries.length === 0 ? "No website enquiries yet." : "No results match your filter."}
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Contact</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Course / Message</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Lead</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map(e => (
                  <tr key={e.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                      {formatDateTime(e.created_at)}
                    </td>
                    <td className="px-4 py-3 font-medium text-foreground">
                      {e.name}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <a
                          href={`tel:${e.phone}`}
                          className="flex items-center gap-1.5 text-xs text-foreground hover:text-green-600 transition-colors"
                        >
                          <Phone className="h-3 w-3 text-muted-foreground" />
                          {e.phone}
                        </a>
                        {e.email && (
                          <a
                            href={`mailto:${e.email}`}
                            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <Mail className="h-3 w-3" />
                            {e.email}
                          </a>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 max-w-[280px]">
                      {e.course && (
                        <div className="flex items-start gap-1.5 text-xs text-foreground mb-1">
                          <BookOpen className="h-3 w-3 mt-0.5 text-green-600 shrink-0" />
                          <span className="font-medium">{e.course}</span>
                        </div>
                      )}
                      {e.message && (
                        <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
                          <MessageSquare className="h-3 w-3 mt-0.5 shrink-0" />
                          <span className="line-clamp-2">{e.message}</span>
                        </div>
                      )}
                      {!e.course && !e.message && (
                        <span className="text-xs text-muted-foreground/50">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        className={`text-xs font-semibold rounded-full px-2.5 py-1 border-0 cursor-pointer outline-none ${STATUS_COLOR[e.status] ?? STATUS_COLOR["new"]}`}
                        value={e.status}
                        onChange={ev => handleStatusChange(e.id, ev.target.value)}
                      >
                        <option value="new">New</option>
                        <option value="contacted">Contacted</option>
                        <option value="converted">Converted</option>
                        <option value="closed">Closed</option>
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      {e.lead_id ? (
                        <Link
                          href={`/leads/${e.lead_id}`}
                          className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors"
                        >
                          View <ExternalLink className="h-3 w-3" />
                        </Link>
                      ) : (
                        <span className="text-xs text-muted-foreground/40">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2.5 border-t border-border bg-muted/20 text-xs text-muted-foreground">
            {filtered.length} of {enquiries.length} enquiries
          </div>
        </div>
      )}
    </AppShell>
  );
}
