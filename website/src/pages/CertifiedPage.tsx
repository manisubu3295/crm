import { FAQSection } from "../components/FAQSection.js";

interface Props {
  onEnquire: () => void;
}

const PROGRAMS = [
  {
    abbr: "OC",
    type: "On-Campus Workshop",
    audience: "For engineering colleges · final-year students",
    duration: "1 – 3 days",
    accent: "#2E7D32",
    desc: "We bring the trainer, curriculum, and equipment directly to your campus. Students stay in their college. No logistics overhead for the institution.",
    includes: [
      "Trainer travels to your campus",
      "Hands-on lab sessions with real hardware",
      "Certificate of participation for every student",
      "Customisable to your college's curriculum gap",
    ],
  },
  {
    abbr: "IP",
    type: "Inplant Training (IPT)",
    audience: "Students in vacation period",
    duration: "1 – 2 weeks",
    accent: "#00897B",
    desc: "Students spend their vacation at our Trichy facility working with real equipment and engineers. High-intensity, hands-on exposure in a professional environment.",
    includes: [
      "At our GEM Plaza facility, Trichy",
      "Daily hands-on sessions (9 AM – 5 PM)",
      "Industry-recognised IPT certificate",
      "Project demo on last day",
    ],
  },
  {
    abbr: "IN",
    type: "Internship",
    audience: "All college students — UG, PG, Research Scholars",
    duration: "1 – 6 months",
    accent: "#388E3C",
    desc: "Work on live industry projects alongside our engineers. Counted as academic internship credit by most affiliated universities. Certificate accepted by placement cells.",
    includes: [
      "Live project work (not toy exercises)",
      "Weekly mentoring sessions",
      "LinkedIn-ready industry certificate",
      "18 domains to choose from",
    ],
  },
  {
    abbr: "FD",
    type: "Faculty Development Program",
    audience: "Assistant / Associate / Professors",
    duration: "2 – 5 days",
    accent: "#558B2F",
    desc: "Technical upskilling for engineering faculty. Counts toward AICTE-mandated professional development hours. Participants leave with updated syllabus material they can use immediately.",
    includes: [
      "Hands-on labs (not just theory)",
      "Detailed course material provided",
      "FDP certificate (government-recognised format)",
      "AICTE professional development credit-eligible",
    ],
  },
];

const SUBJECTS = [
  { name: "Embedded / IoT", abbr: "" },
  { name: "VLSI / MATLAB", abbr: "" },
  { name: "AI / Robotics", abbr: "" },
  { name: "Power Electronics & Drives", abbr: "" },
  { name: "Android Development", abbr: "" },
  { name: "Web Design", abbr: "" },
  { name: "Machine Learning", abbr: "" },
  { name: "Python / Java / .Net / PHP", abbr: "" },
  { name: "FullStack Development", abbr: "" },
  { name: "DevOps", abbr: "" },
];

export function CertifiedPage({ onEnquire }: Props) {
  return (
    <>
      {/* Hero */}
      <section style={{
        background: "var(--white)",
        borderBottom: "1px solid var(--border)",
        padding: "64px 0 56px",
      }}>
        <div className="container" style={{ maxWidth: 680 }}>
          <p className="label">Industry-Certified Programs</p>
          <h1 className="heading-xl" style={{ marginBottom: 20 }}>
            Certified training for<br />
            <span style={{ color: "var(--green)" }}>students &amp; colleges.</span>
          </h1>
          <p className="lead" style={{ marginBottom: 32 }}>
            4 flexible program formats across 10 technical domains. Every program ends with a certificate — recognised by colleges, universities, and industry.
          </p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button onClick={onEnquire} className="btn btn-primary btn-lg">
              Register Interest →
            </button>
            <a
              href="tel:+919442344796"
              className="btn btn-secondary btn-lg"
              style={{ textDecoration: "none" }}
            >
              Call Us
            </a>
          </div>
        </div>
      </section>

      {/* Program cards */}
      <section className="section" style={{ background: "var(--bg-alt)" }}>
        <div className="container">
          <p className="label">The 4 Formats</p>
          <h2 className="heading-lg" style={{ marginBottom: 36, maxWidth: 440 }}>
            Choose how you want to learn.
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {PROGRAMS.map(p => (
              <div key={p.type} className="card" style={{ padding: 0, overflow: "hidden" }}>
                <div style={{ display: "grid", gridTemplateColumns: "4px 1fr" }}>
                  <div style={{ background: p.accent }} />
                  <div style={{ padding: "30px 32px" }}>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 16, flexWrap: "wrap", marginBottom: 16, justifyContent: "space-between" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                        <div style={{
                          display: "flex", alignItems: "center", justifyContent: "center",
                          width: 48, height: 48, borderRadius: 12, flexShrink: 0,
                          background: `${p.accent}14`, border: `1.5px solid ${p.accent}35`,
                          fontSize: 13, fontWeight: 800, color: p.accent, letterSpacing: "0.04em",
                        }}>{p.abbr}</div>
                        <div>
                          <h3 style={{ fontSize: 18, fontWeight: 800, color: "var(--text)", lineHeight: 1.2 }}>{p.type}</h3>
                          <p style={{ fontSize: 13, color: "var(--text-2)", marginTop: 3 }}>{p.audience}</p>
                        </div>
                      </div>
                      <span style={{
                        fontSize: 12, fontWeight: 700, padding: "5px 13px",
                        borderRadius: 6, border: `1.5px solid ${p.accent}`,
                        color: p.accent, background: `${p.accent}10`,
                        whiteSpace: "nowrap",
                      }}>
                        {p.duration}
                      </span>
                    </div>

                    <p style={{ fontSize: 14.5, color: "var(--text-2)", lineHeight: 1.75, marginBottom: 18, maxWidth: 600 }}>
                      {p.desc}
                    </p>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 8, marginBottom: 22 }}>
                      {p.includes.map(item => (
                        <div key={item} style={{ display: "flex", gap: 8, fontSize: 13, color: "var(--text-2)", alignItems: "flex-start" }}>
                          <span style={{ color: "#16A34A", fontWeight: 700, flexShrink: 0 }}>✓</span>
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>

                    <button onClick={onEnquire} className="btn btn-primary" style={{ fontSize: 14 }}>
                      Enquire for {p.type} →
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Subject areas */}
      <section className="section" style={{ background: "var(--white)" }}>
        <div className="container">
          <p className="label">10 Subject Areas</p>
          <h2 className="heading-lg" style={{ marginBottom: 12, maxWidth: 440 }}>
            Available across all program formats.
          </h2>
          <p style={{ color: "var(--text-2)", fontSize: 15, marginBottom: 36 }}>
            Pick any subject. We fit the duration and format to your college's schedule.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
            {SUBJECTS.map(({ name }) => (
              <div key={name} className="card" style={{ padding: "18px 20px", display: "flex", gap: 10, alignItems: "center" }}>
                <span style={{
                  width: 6, height: 6, borderRadius: "50%",
                  background: "var(--green)", flexShrink: 0, display: "inline-block",
                }} />
                <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>{name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Who is this for */}
      <section className="section-sm" style={{ background: "var(--bg-alt)" }}>
        <div className="container">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
            {[
              { abbr: "ST", who: "Students", desc: "Apply for IPT or Internship during your vacation or semester gap. We accommodate 1st year through final year." },
              { abbr: "CL", who: "Colleges & Departments", desc: "Schedule an on-campus workshop or FDP for your batch. We handle the curriculum, trainers, and certificates." },
              { abbr: "FC", who: "Faculty", desc: "Join a Faculty Development Program. Get hands-on with the latest tools and earn AICTE-eligible development hours." },
            ].map(({ abbr, who, desc }) => (
              <div key={who} className="card" style={{ padding: "24px 22px" }}>
                <div style={{
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  width: 40, height: 40, borderRadius: 10, marginBottom: 14,
                  background: "var(--bg-green)", border: "1.5px solid var(--border-2)",
                  fontSize: 12, fontWeight: 800, color: "var(--green)", letterSpacing: "0.05em",
                }}>{abbr}</div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text)", marginBottom: 8 }}>{who}</h3>
                <p style={{ fontSize: 13.5, color: "var(--text-2)", lineHeight: 1.7 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <FAQSection
        bg="var(--white)"
        title="Certified programs — your questions answered."
        items={[
          { q: "What is the difference between Inplant Training (IPT) and an Internship?", a: "IPT is a 1–2 week intensive program ideal for vacation periods — students come to our Trichy facility for full-day hands-on sessions and leave with an industry-recognised IPT certificate. Internships run for 1–6 months with live project work alongside our engineers, counted as academic internship credit by most affiliated universities." },
          { q: "Is the FDP certificate recognised by AICTE?", a: "Yes. Our Faculty Development Program certificate follows the government-recognised format and is eligible for AICTE mandatory professional development hours. It is also accepted by most universities as proof of technical upskilling." },
          { q: "Can our college schedule a workshop without prior notice?", a: "We request at least 2 weeks' notice for campus workshops so we can assign the right trainer and prepare lab equipment. For FDPs and IPT batches we prefer 4 weeks. That said, WhatsApp us — we often accommodate shorter timelines." },
          { q: "Do students need to bring any equipment?", a: "No. For all certified programs, we provide the hardware, software, and course material. Students only need to bring a laptop (for software-focused topics). For campus workshops, we bring all equipment to your institution." },
          { q: "Is there a minimum batch size for a campus workshop?", a: "The minimum batch size is 30 students for a campus workshop. For FDPs, the minimum is 15 faculty members. Inplant training and internships are open to individual students with no minimum." },
        ]}
      />

      {/* CTA */}
      <section style={{ background: "var(--dark)", padding: "72px 0", borderTop: "3px solid var(--green)" }}>
        <div className="container" style={{ maxWidth: 540 }}>
          <h2 style={{ fontSize: "clamp(1.6rem, 3vw, 2.2rem)", fontWeight: 800, color: "#F8FAFC", letterSpacing: "-0.02em", marginBottom: 12 }}>
            Ready to book a program?
          </h2>
          <p style={{ color: "#94A3B8", fontSize: 15, marginBottom: 28, lineHeight: 1.7 }}>
            Fill in your details and we'll call you within 24 hours with a custom proposal for your college or batch.
          </p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button onClick={onEnquire} className="btn btn-primary btn-lg">Book a Program →</button>
            <a
              href="https://wa.me/919442344796?text=Hi%2C%20I%20want%20to%20know%20about%20certified%20training%20programs"
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
