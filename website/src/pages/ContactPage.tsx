import { useState } from "react";
import { COURSES } from "../data/courses.js";

export function ContactPage() {
  const [form, setForm] = useState({ name: "", phone: "", email: "", course: "", message: "" });
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
    <>
      {/* Header */}
      <section style={{ background: "var(--white)", borderBottom: "1px solid var(--border)", padding: "64px 0 52px" }}>
        <div className="container" style={{ maxWidth: 580 }}>
          <p className="label">Get In Touch</p>
          <h1 className="heading-xl" style={{ marginBottom: 16 }}>
            Let's talk about<br />
            <span style={{ color: "var(--green)" }}>your future.</span>
          </h1>
          <p className="lead">
            Fill the form and our team will call you within 24 hours. No spam &mdash; just a helpful conversation.
          </p>
        </div>
      </section>

      <section className="section" style={{ background: "var(--bg-alt)" }}>
        <div className="container">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48, alignItems: "start" }} className="contact-grid">

            {/* Form */}
            <div>
              {success ? (
                <div className="card" style={{ padding: "40px 32px", textAlign: "center" }}>
                  <div style={{ marginBottom: 16, display: "flex", justifyContent: "center" }}>
                    <svg width="56" height="56" viewBox="0 0 52 52" fill="none">
                      <circle cx="26" cy="26" r="26" fill="#E8F5E9" />
                      <circle cx="26" cy="26" r="20" fill="#1B6B3A" />
                      <path d="M17 26l7 7 11-12" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <h3 style={{ fontSize: 20, fontWeight: 700, color: "var(--text)", marginBottom: 10 }}>Enquiry Received</h3>
                  <p style={{ color: "var(--text-2)", fontSize: 14.5, lineHeight: 1.7, marginBottom: 24 }}>
                    We'll call you within 24 hours. Meanwhile, explore our free course lessons.
                  </p>
                  <a href="/courses" className="btn btn-primary btn-lg" style={{ display: "inline-flex", justifyContent: "center" }}>
                    Explore Free Lessons &#8594;
                  </a>
                </div>
              ) : (
                <div className="card" style={{ padding: "32px 28px" }}>
                  <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--text)", marginBottom: 24 }}>Send us a message</h2>
                  <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                      <div>
                        <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text-2)", display: "block", marginBottom: 5 }}>Full Name *</label>
                        <input className="field-input" placeholder="Your name" value={form.name} onChange={e => set("name", e.target.value)} required />
                      </div>
                      <div>
                        <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text-2)", display: "block", marginBottom: 5 }}>Phone *</label>
                        <input className="field-input" placeholder="+91 98765 43210" value={form.phone} onChange={e => set("phone", e.target.value)} required />
                      </div>
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
                      <textarea className="field-input" placeholder="Tell us about yourself &#8212; year, college, goals&#8230;" rows={4} value={form.message} onChange={e => set("message", e.target.value)} style={{ resize: "vertical" }} />
                    </div>

                    {error && <p style={{ fontSize: 13, color: "var(--error)", background: "var(--error-bg)", padding: "10px 13px", borderRadius: 7, border: "1px solid #FCA5A5" }}>{error}</p>}

                    <button type="submit" className="btn btn-primary btn-lg" style={{ justifyContent: "center" }} disabled={loading}>
                      {loading ? "Sending…" : "Send Message →"}
                    </button>
                    <p style={{ fontSize: 12, color: "var(--text-3)", textAlign: "center" }}>We respect your privacy. No spam, ever.</p>
                  </form>
                </div>
              )}
            </div>

            {/* Contact details */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Visit */}
              <div className="card" style={{ padding: "22px 24px" }}>
                <div style={{ marginBottom: 10 }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                </div>
                <h3 style={{ fontSize: 14.5, fontWeight: 700, color: "var(--text)", marginBottom: 8 }}>Visit Us</h3>
                <p style={{ fontSize: 14, color: "var(--text-2)", lineHeight: 1.65, marginBottom: 1 }}>GEM Plaza, Sankaran Pillai Road</p>
                <p style={{ fontSize: 14, color: "var(--text-2)", lineHeight: 1.65, marginBottom: 1 }}>Tiruchirappalli (Trichy)</p>
                <p style={{ fontSize: 14, color: "var(--text-2)", lineHeight: 1.65, marginBottom: 1 }}>Tamil Nadu 620001</p>
                <p style={{ fontSize: 12.5, color: "var(--text-3)", marginTop: 6 }}>Mon &ndash; Sat, 9 AM &ndash; 6 PM</p>
              </div>

              {/* Phone */}
              <div className="card" style={{ padding: "22px 24px" }}>
                <div style={{ marginBottom: 10 }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.27h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 8.9a16 16 0 0 0 6 6l.91-.91a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 21.73 16z" />
                  </svg>
                </div>
                <h3 style={{ fontSize: 14.5, fontWeight: 700, color: "var(--text)", marginBottom: 8 }}>Call or WhatsApp</h3>
                <a href="tel:+919442344796" style={{ display: "block", fontSize: 14.5, color: "var(--green)", fontWeight: 600, marginBottom: 3, textDecoration: "none" }}>
                  +91 94423 44796
                </a>
                <p style={{ fontSize: 12.5, color: "var(--text-3)", marginTop: 6 }}>Available 9 AM &ndash; 6 PM</p>
              </div>

              {/* Email */}
              <div className="card" style={{ padding: "22px 24px" }}>
                <div style={{ marginBottom: 10 }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                </div>
                <h3 style={{ fontSize: 14.5, fontWeight: 700, color: "var(--text)", marginBottom: 8 }}>Email</h3>
                <a href="mailto:info@marcellotech.com" style={{ display: "block", fontSize: 14.5, color: "var(--green)", fontWeight: 600, marginBottom: 3, textDecoration: "none" }}>
                  info@marcellotech.com
                </a>
                <p style={{ fontSize: 12.5, color: "var(--text-3)", marginTop: 6 }}>Response within 4 hours</p>
              </div>

              <a
                href="https://wa.me/919442344796?text=Hi%2C%20I%20want%20to%20know%20more%20about%20Marcellotech"
                target="_blank" rel="noopener noreferrer"
                className="btn btn-primary btn-lg"
                style={{ justifyContent: "center", background: "#16A34A", textDecoration: "none", display: "flex" }}
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}>
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                Chat on WhatsApp
              </a>
            </div>
          </div>
        </div>
      </section>

      <style>{`
        @media (max-width: 768px) {
          .contact-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </>
  );
}
