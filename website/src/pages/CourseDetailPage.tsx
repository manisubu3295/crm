import { useState } from "react";
import { Link } from "wouter";
import { COURSES } from "../data/courses.js";
import { QuizSection } from "../components/QuizSection.js";

interface Props {
  id: string;
  onEnquire: (course?: string) => void;
}

function Accordion({ title, summary, points, index }: { title: string; summary: string; points: string[]; index: number }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="card" style={{ overflow: "hidden" }}>
      <button className="accordion-btn" onClick={() => setOpen(o => !o)}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{
            width: 28, height: 28, borderRadius: 7, background: open ? "var(--green)" : "var(--bg-alt)",
            border: `1.5px solid ${open ? "var(--green)" : "var(--border)"}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 12, fontWeight: 700, flexShrink: 0,
            color: open ? "white" : "var(--text-2)",
            transition: "all 0.15s",
          }}>
            {index + 1}
          </span>
          <span style={{ fontSize: 15, fontWeight: 600, color: open ? "var(--green)" : "var(--text)", transition: "color 0.15s" }}>{title}</span>
        </div>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s", flexShrink: 0 }}>
          <path d="M4 6l4 4 4-4" stroke="var(--text-3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <div style={{ padding: "0 20px 22px", borderTop: "1px solid var(--border)" }}>
          <p style={{ fontSize: 14, color: "var(--text-2)", lineHeight: 1.75, marginTop: 16, marginBottom: 14 }}>{summary}</p>
          <ul style={{ display: "flex", flexDirection: "column", gap: 9 }}>
            {points.map(p => (
              <li key={p} style={{ display: "flex", gap: 9, fontSize: 13.5, color: "var(--text-2)", lineHeight: 1.6 }}>
                <span style={{ color: "var(--green)", flexShrink: 0, marginTop: 2, fontWeight: 700 }}>â€º</span>
                {p}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function CourseDetailPage({ id, onEnquire }: Props) {
  const [tab, setTab] = useState<"fundamentals" | "quiz">("fundamentals");
  const course = COURSES.find(c => c.id === id);

  if (!course) {
    return (
      <div className="section" style={{ textAlign: "center" }}>
        <p style={{ color: "var(--text-2)", marginBottom: 16 }}>Course not found.</p>
        <Link href="/courses"><button className="btn btn-primary">View All Courses</button></Link>
      </div>
    );
  }

  return (
    <>
      {/* Hero */}
      <section style={{ background: "var(--white)", borderBottom: "1px solid var(--border)", padding: "56px 0 48px" }}>
        <div className="container">
          <Link href="/courses">
            <span style={{ fontSize: 13, color: "var(--text-2)", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4, marginBottom: 24 }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "var(--green)"}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "var(--text-2)"}
            >
              â† All Courses
            </span>
          </Link>

          <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 18, flexWrap: "wrap" }}>
            <div style={{
              width: 52, height: 52, borderRadius: 13,
              background: `${course.color}18`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 28, flexShrink: 0,
              border: `1px solid ${course.color}35`,
            }}>{course.icon}</div>
            <div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 600, padding: "3px 10px", borderRadius: 5, background: "var(--bg-alt)", border: "1px solid var(--border)", color: "var(--text-2)" }}>â± {course.duration}</span>
                <span style={{ fontSize: 12, fontWeight: 600, padding: "3px 10px", borderRadius: 5, background: "var(--bg-alt)", border: "1px solid var(--border)", color: "var(--text-2)" }}>{course.level}</span>
              </div>
              <h1 className="heading-lg">{course.title}</h1>
              <p style={{ fontSize: 16, color: "var(--text-2)", marginTop: 6, lineHeight: 1.6 }}>{course.tagline}</p>
            </div>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {course.skills.map(s => (
              <span key={s} style={{
                fontSize: 12, fontWeight: 600, padding: "3px 10px", borderRadius: 5,
                background: "var(--bg-green)", color: "var(--green)", border: "1px solid var(--border-2)",
              }}>{s}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="section" style={{ background: "var(--bg-alt)" }}>
        <div className="container">
          {/* Tab switcher */}
          <div style={{
            display: "inline-flex", background: "var(--white)", borderRadius: 9,
            border: "1px solid var(--border)", padding: 3, marginBottom: 32, gap: 3,
            boxShadow: "var(--shadow-xs)",
          }}>
            {(["fundamentals", "quiz"] as const).map(t => (
              <button key={t} onClick={() => setTab(t)} style={{
                padding: "9px 20px", borderRadius: 7, border: "none", cursor: "pointer",
                fontSize: 13.5, fontWeight: 600, transition: "all 0.15s",
                background: tab === t ? "var(--green)" : "transparent",
                color: tab === t ? "white" : "var(--text-2)",
              }}>
                {t === "fundamentals" ? "ðŸ“– Free Fundamentals" : "ðŸ§ª Take the Quiz"}
              </button>
            ))}
          </div>

          {tab === "fundamentals" && (
            <>
              <div style={{ marginBottom: 24 }}>
                <h2 className="heading-md" style={{ marginBottom: 6 }}>5 core concepts â€” learn them free</h2>
                <p style={{ fontSize: 14, color: "var(--text-2)" }}>Click each topic to expand. This is what you'll deeply understand by week 2 of the course.</p>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {course.fundamentals.map((f, i) => (
                  <Accordion key={f.title} title={f.title} summary={f.summary} points={f.points} index={i} />
                ))}
              </div>

              <div className="card" style={{ marginTop: 24, padding: "22px 26px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
                <div>
                  <p style={{ fontWeight: 700, color: "var(--text)", fontSize: 15, marginBottom: 3 }}>Now test yourself ðŸ§ª</p>
                  <p style={{ fontSize: 13, color: "var(--text-2)" }}>5 quick questions â€” see how much you already know.</p>
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <button onClick={() => setTab("quiz")} className="btn btn-primary" style={{ fontSize: 14 }}>Take the Quiz â†’</button>
                  <button onClick={() => onEnquire(course.id)} className="btn btn-secondary" style={{ fontSize: 14 }}>Enquire Now</button>
                </div>
              </div>
            </>
          )}

          {tab === "quiz" && (
            <>
              <div style={{ marginBottom: 24 }}>
                <h2 className="heading-md" style={{ marginBottom: 6 }}>Quiz â€” {course.title}</h2>
                <p style={{ fontSize: 14, color: "var(--text-2)" }}>5 questions Â· No login Â· See your score and explanations instantly</p>
              </div>
              <QuizSection questions={course.quiz} onEnquire={() => onEnquire(course.id)} />
            </>
          )}

          {/* Outcomes */}
          <div style={{ marginTop: 56, paddingTop: 48, borderTop: "1px solid var(--border)" }}>
            <h2 className="heading-md" style={{ marginBottom: 22 }}>What you'll achieve</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
              {course.outcomes.map(o => (
                <div key={o} className="card" style={{ padding: "16px 18px", display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <span style={{ color: "var(--green)", fontWeight: 700, flexShrink: 0, fontSize: 16 }}>âœ¦</span>
                  <p style={{ fontSize: 13.5, color: "var(--text-2)", lineHeight: 1.65 }}>{o}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Final CTA */}
          <div style={{
            marginTop: 48, padding: "40px 36px",
            background: "#111827", borderRadius: 14,
            textAlign: "center",
          }}>
            <h3 style={{ fontSize: "clamp(1.3rem, 2.5vw, 1.7rem)", fontWeight: 800, color: "#F9FAFB", letterSpacing: "-0.02em", marginBottom: 10 }}>
              Interested in {course.title}?
            </h3>
            <p style={{ color: "#9CA3AF", fontSize: 15, marginBottom: 24, maxWidth: 380, margin: "0 auto 24px" }}>
              Free counselling â€” we'll answer all your questions.
            </p>
            <button onClick={() => onEnquire(course.id)} className="btn btn-primary btn-lg">
              Enquire for This Course â†’
            </button>
          </div>
        </div>
      </section>
    </>
  );
}
