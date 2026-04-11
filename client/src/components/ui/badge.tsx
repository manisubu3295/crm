import { cn } from "../../lib/utils.js";
import type { HTMLAttributes } from "react";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "outline" | "success" | "warning" | "destructive" | "indigo" | "cyan";
}

const variants: Record<string, string> = {
  default:     "bg-slate-100 text-slate-700 border border-slate-200",
  outline:     "border border-border text-muted-foreground",
  success:     "bg-emerald-50 text-emerald-700 border border-emerald-100",
  warning:     "bg-amber-50 text-amber-700 border border-amber-100",
  destructive: "bg-red-50 text-red-700 border border-red-100",
  indigo:      "bg-indigo-50 text-indigo-700 border border-indigo-100",
  cyan:        "bg-cyan-50 text-cyan-700 border border-cyan-100",
};

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold leading-none",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}
