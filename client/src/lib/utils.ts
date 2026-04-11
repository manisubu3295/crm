import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(d: string | Date | null | undefined, opts?: Intl.DateTimeFormatOptions): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", opts ?? { day: "2-digit", month: "short", year: "numeric" });
}

export function formatDateTime(d: string | Date | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: true,
    timeZone: "Asia/Kolkata",
  });
}

export function timeAgo(d: string | Date | null | undefined): string {
  if (!d) return "—";
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)   return "just now";
  if (mins < 60)  return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)   return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export const STAGE_LABELS: Record<string, string> = {
  new: "New", contacted: "Contacted", qualified: "Qualified",
  demo: "Demo", interested: "Interested", payment: "Payment",
  admitted: "Admitted", lost: "Lost",
};

export const STAGE_COLORS: Record<string, string> = {
  new:        "bg-gray-100 text-gray-700",
  contacted:  "bg-blue-100 text-blue-700",
  qualified:  "bg-indigo-100 text-indigo-700",
  demo:       "bg-purple-100 text-purple-700",
  interested: "bg-yellow-100 text-yellow-700",
  payment:    "bg-orange-100 text-orange-700",
  admitted:   "bg-green-100 text-green-700",
  lost:       "bg-red-100 text-red-700",
};

export const SCORE_LABEL: Record<string, { label: string; color: string }> = {
  cold:     { label: "Cold",     color: "text-gray-500" },
  warm:     { label: "Warm",     color: "text-yellow-600" },
  hot:      { label: "Hot",      color: "text-orange-600" },
  very_hot: { label: "Very Hot", color: "text-red-600" },
};

export function getScoreLabel(score: number) {
  if (score <= 30) return SCORE_LABEL["cold"]!;
  if (score <= 60) return SCORE_LABEL["warm"]!;
  if (score <= 80) return SCORE_LABEL["hot"]!;
  return SCORE_LABEL["very_hot"]!;
}
