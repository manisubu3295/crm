interface Props {
  onEnquire: () => void;
}

const DOMAINS = [
  { name: "Python", cat: "Programming" },
  { name: "Java", cat: "Programming" },
  { name: "AI / ML", cat: "AI & ML" },
  { name: "Deep Learning", cat: "AI & ML" },
  { name: "NLP", cat: "AI & ML" },
  { name: "Image Processing", cat: "AI & ML" },
  { name: "OpenCV", cat: "AI & ML" },
  { name: "IoT", cat: "Hardware & IoT" },
  { name: "Arduino", cat: "Hardware & IoT" },
  { name: "Raspberry Pi", cat: "Hardware & IoT" },
  { name: "NodeMCU", cat: "Hardware & IoT" },
  { name: "Robotics", cat: "Hardware & IoT" },
  { name: "Gesture Control", cat: "Hardware & IoT" },
  { name: "Android", cat: "Hardware & IoT" },
  { name: "VLSI", cat: "Advanced Tech" },
  { name: "FPGA", cat: "Advanced Tech" },
  { name: "Cloud Computing", cat: "Advanced Tech" },
  { name: "Blockchain", cat: "Advanced Tech" },
  { name: "Network Security", cat: "Advanced Tech" },
  { name: "Data Science", cat: "Data & Analytics" },
  { name: "Big Data", cat: "Data & Analytics" },
  { name: "MATLAB", cat: "Data & Analytics" },
  { name: "Power Electronics", cat: "Electrical" },
  { name: "Renewable Energy", cat: "Electrical" },
  { name: "EV Projects", cat: "Electrical" },
  { name: "Antenna Design", cat: "Electrical" },
  { name: "Communication", cat: "Electrical" },
];

const CATEGORIES = ["All", "Programming", "AI & ML", "Hardware & IoT", "Advanced Tech", "Data & Analytics", "Electrical"];

const HOW_IT_WORKS = [
  { step: "01", title: "Pick your domain", desc: "Choose from 29+ domains. Not sure? Tell us your department and year — we'll suggest the best fit." },
  { step: "02", title: "Get a custom proposal", desc: "Our engineers review your requirements and send a scoped project proposal within 24 hours." },
  { step: "03", title: "Build with mentorship", desc: "Work on your project with weekly check-ins. We guide the code, circuit, or model — you own the output." },
  { step: "04", title: "Demo & publish", desc: "Final demo, documentation, and support for conference paper / journal submission included." },
];

const WHO = [
  { abbr: "UG", title: "Final Year Students", desc: "UG & PG — get a working project that impresses your department and placement interviewers." },
  { abbr: "RS", title: "Research Scholars", desc: "PhD / M.Phil candidates looking for implementation support for Scopus / IEEE publications." },
  { abbr: "FC", title: "Faculty", desc: "Need a prototype for your funded research? We build it — you focus on the paper." },
];

import { useState } from "react";
import { FAQSection } from "../components/FAQSection.js";

export function ProjectsPage({ onEnquire }: Props) {
  const [active, setActive] = useState("All");

  const filtered = active === "All" ? DOMAINS : DOMAINS.filter(d => d.cat === active);

  return (
    <>
      {/* Hero */}
      <section style={{
        background: "var(--dark)",
        padding: "72px 0 60px",
        position: "relative",
        overflow: "hidden",
      }}>
        <div className="dot-grid" style={{ position: "absolute", inset: 0, opacity: 0.3 }} />
        <div style={{
          position: "absolute", top: "20%", right: "5%",
          width: 360, height: 360, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(27,107,58,0.20) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />
        <div className="container" style={{ position: "relative", zIndex: 1, maxWidth: 680 }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            background: "rgba(27,107,58,0.20)", border: "1px solid rgba(27,107,58,0.40)",
            borderRadius: 8, padding: "5px 14px", marginBottom: 24,
          }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#4ADE80", display: "inline-block", boxShadow: "0 0 8px #4ADE80" }} />
            <span style={{ fontSize: 12.5, fontWeight: 600, color: "#86EFAC", letterSpacing: "0.04em" }}>
              29+ domains · All departments
            </span>
          </div>
          <h1 style={{ fontSize: "clamp(2rem, 4.5vw, 3rem)", fontWeight: 900, color: "#F1F5F9", lineHeight: 1.15, marginBottom: 20, letterSpacing: "-0.02em" }}>
            Final-year projects that<br />
            <span style={{ background: "linear-gradient(135deg, #4ADE80, #34D399)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              actually get published.
            </span>
          </h1>
          <p style={{ fontSize: 17, color: "#94A3B8", lineHeight: 1.8, marginBottom: 36, maxWidth: 520 }}>
            Real implementation across 29+ technical domains — with mentorship, documentation, and Scopus / IEEE paper support.
          </p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button onClick={onEnquire} className="btn btn-primary btn-lg">
              Get a Free Proposal →
            </button>
            <a
              href="https://wa.me/919442344796?text=Hi%2C%20I%20need%20project%20guidance"
              target="_blank" rel="noopener noreferrer"
              style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "15px 24px", borderRadius: 100, fontSize: 15, fontWeight: 600,
                color: "#fff", background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.18)", textDecoration: "none",
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              WhatsApp Us
            </a>
          </div>
        </div>
      </section>

      {/* Stats strip */}
      <div style={{ background: "var(--green)", padding: "20px 0" }}>
        <div className="container" style={{ display: "flex", flexWrap: "wrap", gap: 32, justifyContent: "center" }}>
          {[
            { val: "29+", label: "Technical domains" },
            { val: "850+", label: "Projects completed" },
            { val: "18+", label: "Scopus publications" },
            { val: "24h", label: "Proposal turnaround" },
          ].map(({ val, label }) => (
            <div key={label} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 22, fontWeight: 900, color: "#fff", lineHeight: 1 }}>{val}</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.75)", marginTop: 3, fontWeight: 500 }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Domain grid */}
      <section className="section" style={{ background: "var(--bg-alt)" }}>
        <div className="container">
          <p className="label">29+ Domains</p>
          <h2 className="heading-lg" style={{ marginBottom: 28, maxWidth: 400 }}>
            Pick your domain.
          </h2>

          {/* Category filter */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 32 }}>
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setActive(cat)}
                style={{
                  padding: "7px 18px", borderRadius: 100, fontSize: 13, fontWeight: 600,
                  cursor: "pointer", transition: "all 0.2s",
                  background: active === cat ? "var(--green)" : "var(--white)",
                  color: active === cat ? "#fff" : "var(--text-2)",
                  border: active === cat ? "1.5px solid var(--green)" : "1.5px solid var(--border)",
                }}
              >
                {cat}
              </button>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12 }}>
            {filtered.map(({ name }) => (
              <div
                key={name}
                className="card"
                style={{
                  padding: "18px 16px", display: "flex", alignItems: "center", gap: 12,
                  cursor: "pointer", transition: "transform 0.2s, box-shadow 0.2s",
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.transform = "translateY(-3px)";
                  (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 24px rgba(27,107,58,0.12)";
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.transform = "none";
                  (e.currentTarget as HTMLElement).style.boxShadow = "";
                }}
                onClick={onEnquire}
              >
                <span style={{
                  width: 6, height: 6, borderRadius: "50%",
                  background: "var(--green)", flexShrink: 0, display: "inline-block",
                }} />
                <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--text)", lineHeight: 1.3 }}>{name}</span>
              </div>
            ))}
          </div>

          <div style={{ textAlign: "center", marginTop: 28 }}>
            <p style={{ fontSize: 13.5, color: "var(--text-3)" }}>
              Don't see your domain?{" "}
              <button onClick={onEnquire} style={{ background: "none", border: "none", color: "var(--green)", fontWeight: 700, cursor: "pointer", fontSize: 13.5 }}>
                Contact us →
              </button>
            </p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="section" style={{ background: "var(--white)" }}>
        <div className="container">
          <p className="label">How It Works</p>
          <h2 className="heading-lg" style={{ marginBottom: 48, maxWidth: 380 }}>
            From idea to submission.
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 20 }}>
            {HOW_IT_WORKS.map(({ step, title, desc }) => (
              <div key={step} style={{ position: "relative" }}>
                <div style={{
                  fontSize: 42, fontWeight: 900, color: "var(--green)", opacity: 0.12,
                  lineHeight: 1, marginBottom: 8, fontVariantNumeric: "tabular-nums",
                }}>
                  {step}
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text)", marginBottom: 8 }}>{title}</h3>
                <p style={{ fontSize: 13.5, color: "var(--text-2)", lineHeight: 1.75 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Who is it for */}
      <section className="section-sm" style={{ background: "var(--bg-alt)" }}>
        <div className="container">
          <p className="label" style={{ marginBottom: 28 }}>Who It's For</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
            {WHO.map(({ abbr, title, desc }) => (
              <div key={title} className="card" style={{ padding: "26px 24px" }}>
                <div style={{
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  width: 40, height: 40, borderRadius: 10, marginBottom: 14,
                  background: "var(--bg-green)", border: "1.5px solid var(--border-2)",
                  fontSize: 12, fontWeight: 800, color: "var(--green)", letterSpacing: "0.05em",
                }}>{abbr}</div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text)", marginBottom: 8 }}>{title}</h3>
                <p style={{ fontSize: 13.5, color: "var(--text-2)", lineHeight: 1.7 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <FAQSection
        bg="var(--bg-alt)"
        title="Project guidance — your questions answered."
        items={[
          { q: "What if I don't have a project idea yet?", a: "That's completely fine — most students come to us without a fixed idea. Share your department, year, and interests and we'll suggest 3–5 suitable project topics within 24 hours. The proposal is free." },
          { q: "Do you help with research paper publication?", a: "Yes. Every project completed with us includes publication support for Scopus, WoS, or IEEE-indexed journals. Our research team handles formatting, journal selection, and submission. Our average acceptance time is 18 days." },
          { q: "How much does final-year project guidance cost?", a: "Pricing depends on the domain, complexity, and whether hardware components are required. Contact us with your project requirements and we'll send an exact quote within 24 hours. We offer group discounts for college batches." },
          { q: "Can I work on my project remotely or do I need to visit Trichy?", a: "Both options are available. Software and simulation-based projects can be guided entirely online via video calls and shared tools. Hardware projects may require a few in-person visits to our Trichy facility — we'll clarify this in the proposal." },
          { q: "Is the project work mine or Marcellotech's?", a: "100% yours. You own all rights to the project, the code, the circuit design, and the research paper. We are mentors, not co-owners. The paper is published under your name with your institution affiliation." },
        ]}
      />

      {/* CTA */}
      <section style={{ background: "var(--dark)", padding: "72px 0", borderTop: "3px solid var(--green)" }}>
        <div className="container" style={{ maxWidth: 540 }}>
          <h2 style={{ fontSize: "clamp(1.6rem, 3vw, 2.2rem)", fontWeight: 800, color: "#F8FAFC", letterSpacing: "-0.02em", marginBottom: 12 }}>
            Ready to start your project?
          </h2>
          <p style={{ color: "#94A3B8", fontSize: 15, marginBottom: 28, lineHeight: 1.7 }}>
            Tell us your domain and year — we'll send a scoped proposal in 24 hours. Free consultation, no commitment.
          </p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button onClick={onEnquire} className="btn btn-primary btn-lg">Get Free Proposal →</button>
            <a
              href="https://wa.me/919442344796?text=Hi%2C%20I%20need%20help%20with%20my%20final%20year%20project"
              target="_blank" rel="noopener noreferrer"
              style={{
                display: "flex", alignItems: "center", gap: 8, padding: "15px 24px",
                borderRadius: 9, fontSize: 16, fontWeight: 600, color: "#fff",
                background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.18)",
                textDecoration: "none",
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              WhatsApp
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
