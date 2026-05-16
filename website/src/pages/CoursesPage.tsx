import { Link } from "wouter";
import { COURSES } from "../data/courses.js";

interface CoursesPageProps {
  onEnquire: (course?: string) => void;
}

export function CoursesPage({ onEnquire }: CoursesPageProps) {
  return (
    <>
      {/* Header */}
      <section style={{ background: "var(--white)", borderBottom: "1px solid var(--border)", padding: "64px 0 52px" }}>
        <div className="container">
          <p className="label">Our Programs</p>
          <h1 className="heading-xl" style={{ marginBottom: 16, maxWidth: 560 }}>
            Pick your track.<br />
            <span style={{ color: "var(--green)" }}>Start for free.</span>
          </h1>
          <p className="lead" style={{ maxWidth: 520 }}>
            Each course has free sample lessons and an interactive quiz so you can test the waters before enrolling.
          </p>
        </div>
      </section>

      {/* Course list */}
      <section className="section" style={{ background: "var(--bg-alt)" }}>
        <div className="container">
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {COURSES.map(course => (
              <div key={course.id} className="card" style={{ padding: 0, overflow: "hidden" }}>
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "4px 1fr",
                }}>
                  {/* Colour stripe */}
                  <div style={{ background: course.color }} />

                  <div style={{ padding: "30px 32px" }}>
                    {/* Header row */}
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 16, flexWrap: "wrap", marginBottom: 18, justifyContent: "space-between" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                        <div style={{
                          width: 48, height: 48, borderRadius: 12,
                          background: `${course.color}15`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 24, flexShrink: 0,
                          border: `1px solid ${course.color}30`,
                        }}>
                          {course.icon}
                        </div>
                        <div>
                          <h2 style={{ fontSize: 18, fontWeight: 800, color: "var(--text)", lineHeight: 1.2 }}>{course.title}</h2>
                          <p style={{ fontSize: 13, color: "var(--text-2)", marginTop: 3 }}>{course.tagline}</p>
                        </div>
                      </div>

                      <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, padding: "4px 11px", borderRadius: 6, background: "var(--bg-alt)", border: "1px solid var(--border)", color: "var(--text-2)" }}>
                          {course.duration}
                        </span>
                        <span style={{ fontSize: 12, fontWeight: 600, padding: "4px 11px", borderRadius: 6, background: "var(--bg-alt)", border: "1px solid var(--border)", color: "var(--text-2)" }}>
                          {course.level}
                        </span>
                      </div>
                    </div>

                    {/* Skills */}
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 18 }}>
                      {course.skills.map(s => (
                        <span key={s} style={{
                          fontSize: 11.5, fontWeight: 600, padding: "3px 10px", borderRadius: 4,
                          background: "var(--bg-green)", color: "var(--green)", border: "1px solid var(--border-2)",
                        }}>{s}</span>
                      ))}
                    </div>

                    {/* Outcomes */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 6, marginBottom: 22 }}>
                      {course.outcomes.map(o => (
                        <div key={o} style={{ display: "flex", gap: 7, fontSize: 13, color: "var(--text-2)", lineHeight: 1.55 }}>
                          <span style={{ color: "var(--success)", flexShrink: 0 }}>&#10003;</span>
                          <span>{o}</span>
                        </div>
                      ))}
                    </div>

                    {/* Actions */}
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                      <Link href={`/courses/${course.id}`}>
                        <button className="btn btn-primary" style={{ fontSize: 14 }}>
                          Free Lesson + Quiz &#8594;
                        </button>
                      </Link>
                      <button onClick={() => onEnquire(course.id)} className="btn btn-secondary" style={{ fontSize: 14 }}>
                        Enquire for This Course
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
