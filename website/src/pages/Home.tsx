import { Link } from "wouter";
import { useEffect, useRef, useState } from "react";
import { COURSES } from "../data/courses.js";
import { FAQSection } from "../components/FAQSection.js";

interface HomeProps {
  onEnquire: (course?: string) => void;
}

/* ── Scroll-reveal wrapper ── */
function Reveal({
  children, delay = 0, from = "bottom",
}: {
  children: React.ReactNode;
  delay?: number;
  from?: "bottom" | "left" | "right";
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setVis(true); obs.disconnect(); }
    }, { threshold: 0.1 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  const transforms: Record<string, string> = {
    bottom: "translateY(32px)",
    left: "translateX(-28px)",
    right: "translateX(28px)",
  };
  return (
    <div ref={ref} style={{
      opacity: vis ? 1 : 0,
      transform: vis ? "none" : transforms[from],
      transition: `opacity 0.7s cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform 0.7s cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
    }}>
      {children}
    </div>
  );
}

/* ── Count-up number ── */
function CountUp({ end, suffix = "", prefix = "", duration = 1600 }: {
  end: number; suffix?: string; prefix?: string; duration?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setStarted(true); obs.disconnect(); }
    }, { threshold: 0.5 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  useEffect(() => {
    if (!started) return;
    let start = 0;
    const tick = (ts: number) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      setCount(Math.floor((1 - Math.pow(1 - p, 3)) * end));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [started, end, duration]);
  return <span ref={ref}>{prefix}{count}{suffix}</span>;
}

const CERTIFIED_PROGRAMS = [
  { abbr: "OC", type: "On-Campus Workshop", duration: "1–3 days", accent: "#2E7D32",
    desc: "We come to your campus with trainers and hardware. Students learn without leaving college." },
  { abbr: "IP", type: "Inplant Training", duration: "1–2 weeks", accent: "#00897B",
    desc: "Hands-on exposure at our Trichy facility. Certificate on completion." },
  { abbr: "IN", type: "Internship", duration: "1–6 months", accent: "#388E3C",
    desc: "Live project experience across 18 domains. Open to all college students." },
  { abbr: "FD", type: "Faculty Dev Program", duration: "2–5 days", accent: "#558B2F",
    desc: "AICTE-eligible development hours. Hands-on labs, not just slides." },
];

const CERTIFIED_SUBJECTS = [
  "Embedded / IoT", "VLSI / MATLAB", "AI / Robotics", "Power Electronics",
  "Android Dev", "Web Design", "Machine Learning", "Python / Java / .Net",
  "FullStack Dev", "DevOps",
];

const TRUST_COLLEGES = ["NIT Trichy", "Anna University", "PSG Tech", "Thiagarajar", "Kongu Engg", "Karunya"];

export function Home({ onEnquire }: HomeProps) {
  return (
    <>
      {/* ══════════════════════════════════════════════════
          HERO — dark, premium, full-viewport
      ══════════════════════════════════════════════════ */}
      <section style={{
        background: "var(--dark)",
        minHeight: "calc(100vh - var(--header-h, 104px))",
        display: "flex", alignItems: "center",
        padding: "80px 0 72px",
        position: "relative",
        overflow: "hidden",
      }}>
        {/* ── Background video ── */}
        <video
          autoPlay
          muted
          loop
          playsInline
          style={{
            position: "absolute", inset: 0,
            width: "100%", height: "100%",
            objectFit: "cover",
            zIndex: 0,
            opacity: 0.38,
          }}
        >
          <source src="/video.mp4" type="video/mp4" />
        </video>

        {/* Dark gradient overlay — keeps text readable over the video */}
        <div style={{
          position: "absolute", inset: 0, zIndex: 1,
          background: "linear-gradient(110deg, rgba(6,14,9,0.82) 0%, rgba(6,14,9,0.55) 55%, rgba(6,14,9,0.72) 100%)",
          pointerEvents: "none",
        }} />

        {/* Background layers */}
        <div className="dot-grid" style={{ position: "absolute", inset: 0, opacity: 0.25, zIndex: 2 }} />
        {/* Glowing orbs */}
        <div style={{
          position: "absolute", top: "15%", right: "8%",
          width: 480, height: 480, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(27,107,58,0.22) 0%, transparent 70%)",
          pointerEvents: "none", zIndex: 2,
        }} />
        <div style={{
          position: "absolute", bottom: "10%", left: "5%",
          width: 320, height: 320, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(0,121,107,0.14) 0%, transparent 70%)",
          pointerEvents: "none", zIndex: 2,
        }} />

        <div className="container" style={{ position: "relative", zIndex: 3 }}>
          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 420px",
            gap: 64,
            alignItems: "center",
          }} className="hero-grid">

            {/* Left content */}
            <div>
              {/* Badge */}
              <div className="fade-up" style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                background: "rgba(27,107,58,0.20)",
                border: "1px solid rgba(27,107,58,0.40)",
                borderRadius: 8, padding: "6px 14px", marginBottom: 28,
              }}>
                <span style={{
                  width: 7, height: 7, borderRadius: "50%",
                  background: "#4ADE80", display: "inline-block",
                  boxShadow: "0 0 8px #4ADE80",
                  animation: "pulseGlow 2s infinite",
                }} />
                <span style={{ fontSize: 12.5, fontWeight: 600, color: "#86EFAC", letterSpacing: "0.04em" }}>
                  Enrolling now · Batch starts June 2026
                </span>
              </div>

              {/* Headline */}
              <h1 className="heading-xl fade-up delay-1" style={{ color: "#F1F5F9", marginBottom: 20 }}>
                From engineering<br />
                student to{" "}
                <span className="text-gradient">employed.</span>
              </h1>

              <p className="fade-up delay-2" style={{
                fontSize: 18, color: "#94A3B8", lineHeight: 1.8,
                maxWidth: 480, marginBottom: 36,
              }}>
                8-week hands-on training in IoT, AI/ML, VLSI &amp; Cloud —
                real projects, Scopus publications, and placement support until you're hired.
              </p>

              {/* CTAs */}
              <div className="fade-up delay-3" style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 52 }}>
                <button
                  onClick={() => onEnquire()}
                  className="btn btn-primary btn-lg"
                  style={{ animation: "pulseGlow 3s 1.5s infinite" }}
                >
                  Book Free Counselling →
                </button>
                <Link href="/courses">
                  <button className="btn btn-ghost-white btn-lg">Try a Free Lesson</button>
                </Link>
              </div>

              {/* Stats strip */}
              <div className="fade-up delay-4" style={{
                display: "flex", gap: 0, flexWrap: "wrap",
                borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: 32,
              }}>
                {[
                  { end: 2400, suffix: "+", label: "Students trained" },
                  { end: 94, suffix: "%", label: "Placement rate" },
                  { end: 18, suffix: " days", label: "Avg. Scopus acceptance" },
                ].map(({ end, suffix, label }, i) => (
                  <div key={label} style={{
                    paddingRight: 32, marginRight: 32,
                    borderRight: i < 2 ? "1px solid rgba(255,255,255,0.1)" : "none",
                  }}>
                    <div style={{
                      fontFamily: "Sora, Inter, sans-serif",
                      fontSize: "clamp(1.7rem, 3vw, 2.3rem)",
                      fontWeight: 800, letterSpacing: "-0.04em",
                      background: "var(--grad-text)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      backgroundClip: "text",
                      lineHeight: 1,
                    }}>
                      <CountUp end={end} suffix={suffix} />
                    </div>
                    <div style={{ fontSize: 12.5, color: "#64748B", marginTop: 6, fontWeight: 500 }}>{label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right — Bento stat cards */}
            <div className="hide-mobile" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {[
                { delay: 150, val: "2,400+", label: "Students Trained", accent: "#34A870" },
                { delay: 250, val: "94%",    label: "Placed in 60 days", accent: "#10B981" },
                { delay: 350, val: "850+",   label: "Scopus Papers", accent: "#26A69A" },
                { delay: 450, val: "60+",    label: "College Partners", accent: "#558B2F" },
              ].map(({ delay, val, label, accent }) => (
                <div key={label} className="glass fade-up" style={{
                  animationDelay: `${delay}ms`,
                  padding: "22px 20px",
                  borderTop: `2px solid ${accent}`,
                  transition: "transform 0.3s, box-shadow 0.3s",
                }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.transform = "translateY(-4px)";
                    (e.currentTarget as HTMLElement).style.boxShadow = `0 12px 40px ${accent}30`;
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.transform = "none";
                    (e.currentTarget as HTMLElement).style.boxShadow = "none";
                  }}
                >
                  <div style={{
                    width: 6, height: 6, borderRadius: "50%",
                    background: accent, marginBottom: 14,
                  }} />
                  <div style={{
                    fontFamily: "Sora, Inter, sans-serif",
                    fontSize: "1.8rem", fontWeight: 800,
                    color: accent, letterSpacing: "-0.03em", lineHeight: 1,
                  }}>{val}</div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", marginTop: 5, fontWeight: 500 }}>{label}</div>
                </div>
              ))}

              {/* Mini testimonial spans full width */}
              <div className="glass fade-up delay-5" style={{
                gridColumn: "1 / -1", padding: "18px 20px",
                display: "flex", gap: 12, alignItems: "flex-start",
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
                  background: "linear-gradient(135deg, #1B6B3A, #00796B)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "#fff", fontWeight: 700, fontSize: 14,
                }}>A</div>
                <div>
                  <p style={{ fontSize: 12.5, color: "rgba(255,255,255,0.65)", lineHeight: 1.65 }}>
                    "Got placed at a semiconductor firm at 7.8 LPA — had both an IoT prototype and a Scopus paper."
                  </p>
                  <p style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 6, fontWeight: 500 }}>
                    Arun Kumar · NIT Trichy · IoT batch 2025
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════
          PROGRAMS — 2x2 premium cards
      ══════════════════════════════════════════════════ */}
      <section className="section" style={{ background: "var(--white)" }}>
        <div className="container">
          <Reveal>
            <p className="label">4 Programs</p>
            <h2 className="heading-lg" style={{ maxWidth: 380, marginBottom: 12 }}>
              Pick your track.
            </h2>
            <p style={{ color: "var(--text-2)", fontSize: 15, marginBottom: 44 }}>
              Each has free sample lessons. Try before you commit.
            </p>
          </Reveal>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(248px, 1fr))",
            gap: 16,
          }}>
            {COURSES.map((course, i) => (
              <Reveal key={course.id} delay={i * 80}>
                <Link href={`/courses/${course.id}`}>
                  <div style={{
                    background: "var(--white)",
                    borderRadius: 16,
                    border: "1px solid var(--border)",
                    padding: "28px 24px",
                    height: "100%",
                    cursor: "pointer",
                    position: "relative",
                    overflow: "hidden",
                    transition: "transform 0.25s cubic-bezier(0.16,1,0.3,1), box-shadow 0.25s, border-color 0.25s",
                  }}
                    onMouseEnter={e => {
                      const el = e.currentTarget as HTMLElement;
                      el.style.transform = "translateY(-6px)";
                      el.style.boxShadow = `0 20px 56px ${course.color}22, 0 4px 16px rgba(0,0,0,0.06)`;
                      el.style.borderColor = course.color;
                    }}
                    onMouseLeave={e => {
                      const el = e.currentTarget as HTMLElement;
                      el.style.transform = "none";
                      el.style.boxShadow = "var(--shadow-sm)";
                      el.style.borderColor = "var(--border)";
                    }}
                  >
                    {/* Gradient top bar */}
                    <div style={{
                      position: "absolute", top: 0, left: 0, right: 0, height: 3,
                      background: `linear-gradient(90deg, ${course.color}, ${course.color}88)`,
                    }} />

                    {/* Icon */}
                    <div style={{
                      width: 52, height: 52, borderRadius: 13,
                      background: `${course.color}14`,
                      border: `1px solid ${course.color}30`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 26, marginBottom: 18,
                      boxShadow: `0 4px 16px ${course.color}20`,
                    }}>
                      {course.icon}
                    </div>

                    <h3 style={{ fontSize: 16.5, fontWeight: 700, color: "var(--text)", marginBottom: 6, lineHeight: 1.3 }}>
                      {course.title}
                    </h3>
                    <p style={{ fontSize: 13.5, color: "var(--text-2)", lineHeight: 1.7, marginBottom: 18 }}>
                      {course.tagline}
                    </p>

                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 20 }}>
                      {course.skills.slice(0, 3).map(s => (
                        <span key={s} style={{
                          fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 5,
                          background: `${course.color}12`, color: course.color,
                          border: `1px solid ${course.color}28`,
                        }}>{s}</span>
                      ))}
                    </div>

                    <div style={{
                      display: "flex", alignItems: "center", gap: 5,
                      fontSize: 13, fontWeight: 700, color: course.color,
                    }}>
                      Free lesson + quiz
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M3 7h8M7 3l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>

          <Reveal delay={200}>
            <div style={{ textAlign: "center", marginTop: 32 }}>
              <Link href="/courses">
                <span style={{
                  fontSize: 14, fontWeight: 600, color: "var(--green)",
                  borderBottom: "1.5px solid var(--green)", paddingBottom: 2,
                  cursor: "pointer", opacity: 0.8,
                }}>
                  Compare all programs in detail →
                </span>
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════
          CERTIFIED — green-tinted bg, 4 program cards
      ══════════════════════════════════════════════════ */}
      <section className="section" style={{
        background: "linear-gradient(180deg, #E8F5E9 0%, #F4FAF6 100%)",
        borderTop: "1px solid var(--border)",
        borderBottom: "1px solid var(--border)",
      }}>
        <div className="container">
          <Reveal>
            <p className="label">Industry-Certified</p>
            <h2 className="heading-lg" style={{ maxWidth: 460, marginBottom: 12 }}>
              4 certified program formats.
            </h2>
            <p style={{ color: "var(--text-2)", fontSize: 15, marginBottom: 44, maxWidth: 480 }}>
              From a 1-day campus workshop to a 6-month internship. Every program ends with a certificate.
            </p>
          </Reveal>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 14, marginBottom: 32,
          }}>
            {CERTIFIED_PROGRAMS.map((p, i) => (
              <Reveal key={p.type} delay={i * 70}>
                <div style={{
                  background: "var(--white)", borderRadius: 14,
                  border: "1px solid var(--border)",
                  padding: "24px 22px",
                  borderTop: `3px solid ${p.accent}`,
                  transition: "transform 0.25s, box-shadow 0.25s",
                }}
                  onMouseEnter={e => {
                    const el = e.currentTarget as HTMLElement;
                    el.style.transform = "translateY(-4px)";
                    el.style.boxShadow = `0 16px 48px ${p.accent}20`;
                  }}
                  onMouseLeave={e => {
                    const el = e.currentTarget as HTMLElement;
                    el.style.transform = "none";
                    el.style.boxShadow = "none";
                  }}
                >
                  <div style={{
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                    width: 42, height: 42, borderRadius: 10, marginBottom: 12,
                    background: `${p.accent}18`, border: `1.5px solid ${p.accent}40`,
                    fontSize: 13, fontWeight: 800, color: p.accent, letterSpacing: "0.04em",
                  }}>{p.abbr}</div>
                  <div style={{
                    fontSize: 10.5, fontWeight: 700, letterSpacing: "0.08em",
                    textTransform: "uppercase", color: p.accent, marginBottom: 6,
                  }}>{p.duration}</div>
                  <h3 style={{ fontSize: 15.5, fontWeight: 700, color: "var(--text)", marginBottom: 8, lineHeight: 1.3 }}>
                    {p.type}
                  </h3>
                  <p style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.75 }}>{p.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal delay={300}>
            <div style={{
              background: "var(--white)", borderRadius: 12,
              border: "1px solid var(--border)", padding: "20px 24px",
              display: "flex", flexWrap: "wrap", alignItems: "center", gap: 16,
            }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <p style={{ fontSize: 11.5, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 12 }}>
                  10 subject areas across all formats
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                  {CERTIFIED_SUBJECTS.map(s => (
                    <span key={s} style={{
                      fontSize: 12, fontWeight: 600, padding: "4px 11px",
                      borderRadius: 5, background: "var(--bg-green)",
                      color: "var(--green)", border: "1px solid var(--border-2)",
                    }}>{s}</span>
                  ))}
                </div>
              </div>
              <button onClick={() => onEnquire()} className="btn btn-primary" style={{ flexShrink: 0, fontSize: 14 }}>
                Register Interest →
              </button>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════
          SERVICES — Internship · Projects · Products
      ══════════════════════════════════════════════════ */}
      <section className="section" style={{ background: "var(--white)" }}>
        <div className="container">
          <Reveal>
            <p className="label">Also from Marcellotech</p>
            <h2 className="heading-lg" style={{ marginBottom: 40, maxWidth: 360 }}>
              More ways we help.
            </h2>
          </Reveal>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(290px, 1fr))", gap: 16 }}>
            {([
              {
                abbr: "IN", accent: "#1B6B3A",
                title: "Internship Program",
                desc: "Live project experience across 18 domains. Open to all college students — UG, PG, Research Scholars. Certificate on completion.",
                chips: ["Cloud Computing", "Data Science", "IoT", "Python", "Cyber Security", "Blockchain", "Robotics", "Big Data"],
                chipStyle: { background: "var(--bg-green)", color: "var(--green)", border: "1px solid var(--border-2)" },
                more: "+10 more",
                cta: "Apply for Internship →",
                delay: 0,
              },
              {
                abbr: "PG", accent: "#00796B",
                title: "Project Guidance",
                desc: "Final-year project support across 28+ domains. From ideation to working prototype — our engineers guide every step.",
                chips: ["IoT", "VLSI", "AI / ML", "Deep Learning", "Image Processing", "Arduino", "Raspberry Pi", "MATLAB"],
                chipStyle: { background: "#E0F2F1", color: "#00796B", border: "1px solid #80CBC4" },
                more: "+20 more",
                cta: "Get Project Guidance →",
                delay: 80,
              },
              {
                abbr: "HW", accent: "#16A34A",
                title: "Hardware & Kits",
                desc: "Arduino, Raspberry Pi, NodeMCU and ready-to-use IoT project kits. Sourced and tested by our engineers.",
                chips: ["Arduino UNO R3", "Raspberry Pi 4", "NodeMCU", "Sensors", "IoT Project Kits"],
                chipStyle: { background: "#F0FDF4", color: "#15803D", border: "1px solid #BBF7D0" },
                more: "",
                cta: "Browse Products →",
                delay: 160,
                href: "https://www.marcellotech.com/products",
              },
            ] as const).map(({ abbr, accent, title, desc, chips, chipStyle, more, cta, delay, href }: {
              abbr: string; accent: string; title: string; desc: string;
              chips: readonly string[]; chipStyle: object; more: string;
              cta: string; delay: number; href?: string;
            }) => (
              <Reveal key={title} delay={delay}>
                <div style={{
                  background: "var(--white)", borderRadius: 14, border: "1px solid var(--border)",
                  padding: "28px 26px", height: "100%",
                  borderTop: `3px solid ${accent}`,
                  transition: "transform 0.25s, box-shadow 0.25s",
                  display: "flex", flexDirection: "column",
                }}
                  onMouseEnter={e => {
                    const el = e.currentTarget as HTMLElement;
                    el.style.transform = "translateY(-4px)";
                    el.style.boxShadow = `0 16px 48px ${accent}18`;
                  }}
                  onMouseLeave={e => {
                    const el = e.currentTarget as HTMLElement;
                    el.style.transform = "none";
                    el.style.boxShadow = "none";
                  }}
                >
                  <div style={{
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                    width: 44, height: 44, borderRadius: 10, marginBottom: 14,
                    background: `${accent}14`, border: `1.5px solid ${accent}35`,
                    fontSize: 12, fontWeight: 800, color: accent, letterSpacing: "0.05em",
                  }}>{abbr}</div>
                  <h3 style={{ fontSize: 17, fontWeight: 800, color: "var(--text)", marginBottom: 8 }}>{title}</h3>
                  <p style={{ fontSize: 13.5, color: "var(--text-2)", lineHeight: 1.75, marginBottom: 18 }}>{desc}</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 22, flex: 1 }}>
                    {chips.map(d => (
                      <span key={d} style={{ fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 4, ...chipStyle }}>{d}</span>
                    ))}
                    {more && (
                      <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 4, background: "var(--bg-alt)", color: "var(--text-3)", border: "1px solid var(--border)" }}>{more}</span>
                    )}
                  </div>
                  {href ? (
                    <a href={href} target="_blank" rel="noopener noreferrer"
                      className="btn btn-secondary" style={{ fontSize: 13, textDecoration: "none", justifyContent: "center" }}>
                      {cta}
                    </a>
                  ) : (
                    <button onClick={() => onEnquire()} className="btn btn-primary" style={{ fontSize: 13, justifyContent: "center" }}>
                      {cta}
                    </button>
                  )}
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════
          PROOF — dark, premium quote
      ══════════════════════════════════════════════════ */}
      <section style={{ background: "var(--dark-2)", padding: "96px 0" }}>
        <div className="container">
          <div style={{
            display: "grid", gridTemplateColumns: "1fr 1fr", gap: 64, alignItems: "center",
          }} className="proof-grid">

            <Reveal from="left">
              <p className="label" style={{ color: "#4ADE80" }}>Student Story</p>
              <div style={{
                fontFamily: "Georgia, serif", fontSize: 72,
                lineHeight: 1, color: "#4ADE80", opacity: 0.3, marginBottom: 4,
              }}>"</div>
              <p style={{
                fontSize: "clamp(17px, 2vw, 20px)", color: "#E2E8F0",
                lineHeight: 1.8, fontWeight: 500, marginBottom: 28,
              }}>
                I walked into my placement interview with an IoT device I built myself
                and a Scopus paper with my name on it. No other candidate had that.
                Got placed at a semiconductor firm at 7.8 LPA.
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <img
                  src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=96&h=96&auto=format&fit=crop&q=80"
                  alt="Arun Kumar — Marcellotech student"
                  width={48} height={48}
                  style={{ borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: "2px solid rgba(74,222,128,0.4)" }}
                  onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                />
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: "#F1F5F9" }}>Arun Kumar</div>
                  <div style={{ fontSize: 13, color: "#64748B", marginTop: 2 }}>IoT & Embedded Systems · NIT Trichy, 2025</div>
                </div>
              </div>
            </Reveal>

            <Reveal from="right" delay={100}>
              <div style={{
                background: "rgba(255,255,255,0.04)", borderRadius: 16,
                border: "1px solid rgba(255,255,255,0.08)", padding: "32px 28px",
              }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 16 }}>
                  Students from
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 28 }}>
                  {TRUST_COLLEGES.map(c => (
                    <span key={c} style={{
                      fontSize: 13, fontWeight: 600, color: "#94A3B8",
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 6, padding: "5px 12px",
                    }}>{c}</span>
                  ))}
                  <span style={{
                    fontSize: 13, fontWeight: 600, color: "#475569",
                    background: "transparent", border: "1px solid rgba(255,255,255,0.06)",
                    borderRadius: 6, padding: "5px 12px",
                  }}>+ 54 more</span>
                </div>

                <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", paddingTop: 22 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                    {[
                      { n: <CountUp end={850} suffix="+" />, l: "Papers published" },
                      { n: <CountUp end={60} suffix="+" />, l: "College partners" },
                      { n: <CountUp end={1200} suffix="+" />, l: "Projects delivered" },
                      { n: <CountUp end={8} suffix=" weeks" />, l: "To career-ready" },
                    ].map(({ n, l }) => (
                      <div key={l}>
                        <div style={{
                          fontFamily: "Sora, Inter, sans-serif",
                          fontSize: "1.5rem", fontWeight: 800,
                          background: "var(--grad-text)",
                          WebkitBackgroundClip: "text",
                          WebkitTextFillColor: "transparent",
                          backgroundClip: "text",
                          letterSpacing: "-0.03em",
                        }}>{n}</div>
                        <div style={{ fontSize: 12, color: "#475569", marginTop: 3 }}>{l}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <Link href="/about">
                  <div style={{
                    marginTop: 22, fontSize: 13, fontWeight: 600,
                    color: "#4ADE80", cursor: "pointer",
                    display: "inline-flex", alignItems: "center", gap: 4,
                  }}>
                    Read our full story →
                  </div>
                </Link>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════
          FAQ
      ══════════════════════════════════════════════════ */}
      <FAQSection
        bg="var(--bg-alt)"
        title="Everything you need to know."
        subtitle="Answers to the questions we hear most often. If yours isn't here, WhatsApp us — we reply within the hour."
        items={[
          { q: "What engineering courses does Marcellotech offer in Trichy?", a: "We offer 8-week hands-on programs in IoT & Embedded Systems, AI/ML, VLSI Design, Cloud Computing, FullStack Development, Power Electronics, Android Development, and Robotics — all at our Tiruchirappalli (Trichy) facility, with real project work every week." },
          { q: "Do you help with job placement after the course?", a: "Yes — placement support is included and continues until you land an offer. This includes resume preparation, mock interviews, LinkedIn optimisation, and direct referrals to our industry partners. Our current placement rate is 94% within 60 days of completing the program." },
          { q: "Are the certificates recognised by universities and companies?", a: "Yes. Our course certificates are accepted by placement cells and recognised by affiliated universities including Anna University and Madurai Kamaraj University. Faculty Development Program (FDP) certificates are AICTE professional-development credit–eligible." },
          { q: "How long are the programs and what are the batch timings?", a: "Standard courses run 8 weeks on weekdays. We also offer 1–3 day campus workshops, 1–2 week inplant training (IPT), and 1–6 month internships. Batch timings can be customised for college schedules — call us to check current slots." },
          { q: "What is the course fee and are there instalment options?", a: "Fees vary by program. We offer group discounts for college batches of 10 or more students and flexible 2–3 instalment options. Free counselling is always available — just WhatsApp or call us and we'll give you exact pricing within minutes." },
          { q: "Can Marcellotech come to our college for training?", a: "Absolutely. Our On-Campus Workshop format brings the trainer, curriculum, and lab equipment directly to your institution. We handle everything — you just provide the venue. This is our most popular format for final-year batches and departments." },
        ]}
      />

      {/* ══════════════════════════════════════════════════
          CTA BAND — gradient, single action
      ══════════════════════════════════════════════════ */}
      <section style={{
        background: "linear-gradient(135deg, #060E09 0%, #0D3D1F 50%, #1B6B3A 100%)",
        backgroundSize: "200% 200%",
        animation: "gradientShift 8s ease infinite",
        padding: "88px 0",
        position: "relative", overflow: "hidden",
      }}>
        <div className="dot-grid" style={{ position: "absolute", inset: 0, opacity: 0.4 }} />
        <div className="container" style={{ maxWidth: 640, position: "relative", zIndex: 1 }}>
          <Reveal>
            <p style={{
              fontSize: 11.5, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase",
              color: "#4ADE80", marginBottom: 16,
            }}>
              Limited seats · June 2026 batch
            </p>
            <h2 style={{
              fontFamily: "Sora, Inter, sans-serif",
              fontSize: "clamp(1.8rem, 4vw, 2.8rem)",
              fontWeight: 800, color: "#F8FAFC",
              letterSpacing: "-0.028em", lineHeight: 1.15, marginBottom: 14,
            }}>
              Your next career move<br />starts with one call.
            </h2>
            <p style={{
              color: "#94A3B8", fontSize: 16, lineHeight: 1.75,
              marginBottom: 36, maxWidth: 460,
            }}>
              No sales pitch. A 15-minute conversation with a mentor who'll tell you
              exactly which track fits your background and goals.
            </p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <button
                onClick={() => onEnquire()}
                className="btn btn-primary btn-lg"
                style={{ animation: "pulseGlow 3s 0.5s infinite" }}
              >
                Book Free Counselling →
              </button>
              <a
                href="https://wa.me/919442344796?text=Hi%2C%20I%20want%20to%20know%20about%20Marcellotech%20courses"
                target="_blank" rel="noopener noreferrer"
                className="btn btn-ghost-white btn-lg"
                style={{ textDecoration: "none" }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                WhatsApp
              </a>
            </div>
          </Reveal>
        </div>
      </section>

      <style>{`
        @media (max-width: 900px) {
          .hero-grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 768px) {
          .proof-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </>
  );
}
