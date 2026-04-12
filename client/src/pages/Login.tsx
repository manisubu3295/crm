import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";import { useLocation } from "wouter";import { Loader2, MessageSquare, Users, BarChart2, Zap, BookOpen } from "lucide-react";
import { useAuth } from "../lib/auth.js";
import { Button } from "../components/ui/button.js";
import { Input } from "../components/ui/input.js";
import { LoginGuide, UserGuide } from "../components/guide/UserGuide.js";

const schema = z.object({
  tenantId: z.string().min(1, "Institution ID required"),
  username: z.string().min(1, "Username required"),
  password: z.string().min(1, "Password required"),
});
type FormData = z.infer<typeof schema>;

const FEATURES = [
  { icon: Users,    text: "360° Lead Management" },
  { icon: BarChart2, text: "Real-time Analytics" },
  { icon: Zap,       text: "Smart Automation" },
];

export function LoginPage() {
  const { login } = useAuth();
  const [, navigate] = useLocation();
  const [loading, setLoading] = useState(false);
  const [showLoginGuide, setShowLoginGuide] = useState(false);
  const [showFullGuide, setShowFullGuide] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { tenantId: "", username: "admin", password: "" },
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      await login(data.tenantId, data.username, data.password);
      navigate("/");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {showLoginGuide && (
        <LoginGuide
          onClose={() => setShowLoginGuide(false)}
          onOpenFull={() => { setShowLoginGuide(false); setShowFullGuide(true); }}
        />
      )}
      {showFullGuide && (
        <UserGuide onClose={() => setShowFullGuide(false)} />
      )}
      {/* Left panel — dark brand */}
      <div className="hidden lg:flex lg:w-[420px] flex-col justify-between bg-slate-900 p-10 shrink-0">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 shadow-lg shadow-indigo-500/30">
            <MessageSquare className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-[15px] font-bold text-white tracking-tight">Aadhirai CRM</p>
            <p className="text-[11px] text-slate-400">Lead Management Platform</p>
          </div>
        </div>

        {/* Hero */}
        <div className="space-y-6">
          <div>
            <h2 className="text-3xl font-bold text-white leading-snug">
              Grow admissions.<br />Smarter.
            </h2>
            <p className="mt-3 text-sm text-slate-400 leading-relaxed">
              The all-in-one CRM designed for training institutions — track every lead, automate follow-ups, and close more admissions.
            </p>
          </div>
          <div className="space-y-3">
            {FEATURES.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-800 border border-slate-700">
                  <Icon className="h-3.5 w-3.5 text-indigo-400" />
                </div>
                <span className="text-sm text-slate-300">{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Guide link */}
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => setShowLoginGuide(true)}
            className="flex items-center gap-2 text-[12px] text-slate-400 hover:text-indigo-400 transition-colors group w-fit"
          >
            <BookOpen className="h-3.5 w-3.5 group-hover:text-indigo-400" />
            What is Aadhirai CRM? · View Guide
          </button>
          <p className="text-[11px] text-slate-600">© 2026 Aadhirai Technologies</p>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex flex-1 items-center justify-center bg-background p-6">
        <div className="w-full max-w-[380px]">
          {/* Mobile logo */}
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500">
              <MessageSquare className="h-4.5 w-4.5 text-white" />
            </div>
            <div>
              <p className="text-[14px] font-bold text-foreground">Aadhirai CRM</p>
              <p className="text-[11px] text-muted-foreground">Lead Management Platform</p>
            </div>
          </div>

          <div className="mb-7">
            <h1 className="text-2xl font-bold text-foreground">Welcome back</h1>
            <p className="mt-1 text-sm text-muted-foreground">Sign in to your institution account</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-foreground">Institution ID</label>
              <Input placeholder="e.g. aadhirai-training" {...register("tenantId")} />
              {errors.tenantId && <p className="mt-1.5 text-[11px] text-red-500">{errors.tenantId.message}</p>}
            </div>

            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-foreground">Username</label>
              <Input placeholder="admin" {...register("username")} />
              {errors.username && <p className="mt-1.5 text-[11px] text-red-500">{errors.username.message}</p>}
            </div>

            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-foreground">Password</label>
              <Input type="password" placeholder="••••••••" {...register("password")} />
              {errors.password && <p className="mt-1.5 text-[11px] text-red-500">{errors.password.message}</p>}
            </div>

            <Button
              type="submit"
              className="mt-2 w-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-500/20"
              disabled={loading}
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Sign In
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
