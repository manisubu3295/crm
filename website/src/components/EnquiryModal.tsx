import { useState } from "react";
import { COURSES } from "../data/courses.js";

interface EnquiryModalProps {
  onClose: () => void;
  defaultCourse?: string;
}

export function EnquiryModal({ onClose, defaultCourse }: EnquiryModalProps) {
  const [form, setForm] = useState({ name: "", phone: "", email: "", course: defaultCourse ?? "", message: "" });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const set = (k: keyof typeof form, v: string) => setForm(f => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) { setError("Name and phone are required."); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/public/enquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json() as { ok: boolean; error?: string };
      if (!data.ok) throw new Error(data.error ?? "Failed to submit");
      setSuccess(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: "var(--white)",
        borderRadius: 16,
        padding: "36px 32px",
        maxWidth: 460,
        width: "100%",
        position: "relative",
        maxHeight: "92vh",
        overflowY: "auto",
        boxShadow: "var(--shadow-md)",
        border: "1px solid var(--border)",
      }}>
        <button onClick={onClose} style={{
          position: "absolute", top: 14, right: 14,
          background: "var(--bg-alt)", border: "1px solid var(--border)",
          cursor: "pointer", width: 30, height: 30,
          borderRadius: 7, color: "var(--text-2)",
          fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center",
        }}>×</button>

        {success ? (
          <div style={{ textAlign: "center", padding: "12px 0 4px" }}>
            <div style={{ marginBottom: 14, display: "flex", justifyContent: "center" }}>
              <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
                <circle cx="26" cy="26" r="26" fill="#E8F5E9" />
                <circle cx="26" cy="26" r="20" fill="#1B6B3A" />
                <path d="M17 26l7 7 11-12" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h3 style={{ fontSize: 20, fontWeight: 700, color: "var(--text)", marginBottom: 8 }}>Enquiry Received</h3>
            <p style={{ color: "var(--text-2)", fontSize: 14, marginBottom: 24, lineHeight: 1.7 }}>
              Our counsellors will call you within 24 hours.
            </p>
            <button onClick={onClose} className="btn btn-primary btn-lg" style={{ width: "100%", justifyContent: "center" }}>
              Close
            </button>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: 24 }}>
              <p className="label">Free Consultation</p>
              <h3 style={{ fontSize: 20, fontWeight: 700, color: "var(--text)" }}>Get in touch with us</h3>
              <p style={{ color: "var(--text-2)", fontSize: 13.5, marginTop: 5 }}>
                We'll call you back within 24 hours — no spam.
              </p>
            </div>

            <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text-2)", display: "block", marginBottom: 5 }}>Full Name *</label>
                <input className="field-input" placeholder="Your name" value={form.name} onChange={e => set("name", e.target.value)} required />
              </div>

              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text-2)", display: "block", marginBottom: 5 }}>Phone Number *</label>
                <input className="field-input" placeholder="+91 98765 43210" value={form.phone} onChange={e => set("phone", e.target.value)} required />
              </div>

              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text-2)", display: "block", marginBottom: 5 }}>Email (optional)</label>
                <input className="field-input" type="email" placeholder="you@email.com" value={form.email} onChange={e => set("email", e.target.value)} />
              </div>

              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text-2)", display: "block", marginBottom: 5 }}>Course Interest</label>
                <select className="field-input" value={form.course} onChange={e => set("course", e.target.value)}>
                  <option value="">Select a course</option>
                  {COURSES.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                  <option value="other">Not sure yet</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text-2)", display: "block", marginBottom: 5 }}>Message (optional)</label>
                <textarea className="field-input" placeholder="Anything you'd like us to know…" rows={3} value={form.message} onChange={e => set("message", e.target.value)} style={{ resize: "vertical", minHeight: 76 }} />
              </div>

              {error && (
                <p style={{ fontSize: 13, color: "var(--error)", background: "var(--error-bg)", padding: "10px 14px", borderRadius: 7, border: "1px solid #FCA5A5" }}>{error}</p>
              )}

              <button type="submit" className="btn btn-primary btn-lg" style={{ justifyContent: "center", marginTop: 2 }} disabled={loading}>
                {loading ? "Sending…" : "Send Enquiry →"}
              </button>
              <p style={{ fontSize: 12, color: "var(--text-3)", textAlign: "center" }}>
                We respect your privacy. No spam, ever.
              </p>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
