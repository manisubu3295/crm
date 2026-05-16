import { FAQSection } from "../components/FAQSection.js";

interface AboutPageProps {
  onEnquire: () => void;
}

const TEAM = [
  {
    name: "Dr. Ramesh Kumar",
    role: "Founder & Director",
    bio: "12 years in VLSI and embedded systems. Previously with Qualcomm's chip design team. Founded Marcellotech to give Tamil Nadu's engineers the practical depth global companies actually look for.",
    img: "https://images.unsplash.com/photo-1560250097-0dc05fce5cb5?w=200&h=200&auto=format&fit=crop&q=80",
    initials: "RK",
  },
  {
    name: "Preethi Subramanian",
    role: "Head of AI & Machine Learning",
    bio: "IIT Madras alumna. 8 years at MNCs with 30+ Scopus publications. Designed Marcellotech's research-to-publication pipeline that places papers in top-indexed journals within 18 days.",
    img: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&h=200&auto=format&fit=crop&q=80",
    initials: "PS",
  },
  {
    name: "Senthil Nathan",
    role: "Cloud & Security Lead",
    bio: "AWS Certified Solutions Architect with 10 years in cloud infrastructure across fintech and healthcare. Builds industry-ready Cloud curriculum that matches current hiring patterns.",
    img: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200&h=200&auto=format&fit=crop&q=80",
    initials: "SN",
  },
  {
    name: "Dr. Kavitha Rajan",
    role: "Research & Publications Lead",
    bio: "PhD in Electrical Engineering, 50+ peer-reviewed publications. Designed the Scopus workflow that has helped 2,400+ students co-author indexed research papers during their training.",
    img: "https://images.unsplash.com/photo-1594744803329-e58b31de8bf5?w=200&h=200&auto=format&fit=crop&q=80",
    initials: "KR",
  },
];

const MILESTONES = [
  { year: "2018", event: "Founded in Trichy with 12 students and 1 mentor — a single room at GEM Plaza." },
  { year: "2020", event: "Crossed 500 students. Launched the Scopus research-publication track." },
  { year: "2022", event: "60+ college partnerships across Tamil Nadu. 850+ indexed papers published." },
  { year: "2024", event: "Expanded to Cloud, Cybersecurity and FullStack. 2,400+ students trained." },
  { year: "2026", event: "Digital platform and CRM launched. Programs now accessible across South India." },
];

const ABOUT_FAQ = [
  { q: "When was Marcellotech founded and where?", a: "Marcellotech was founded in 2018 in Tiruchirappalli (Trichy), Tamil Nadu, with just 12 students and one mentor in a single room at GEM Plaza. Today the same facility trains hundreds of students each year across 8 technical domains." },
  { q: "Who are the trainers at Marcellotech?", a: "All trainers are working engineers or PhD researchers with a minimum of 5 years of industry experience. We do not employ fresh graduates as trainers. The team includes former employees of Qualcomm, MNC IT firms, AWS-certified architects, and published researchers." },
  { q: "How many students have been trained at Marcellotech?", a: "As of 2026, Marcellotech has trained more than 2,400 students from 60+ colleges across Tamil Nadu, including NIT Trichy, PSG Tech, Thiagarajar College of Engineering, Anna University affiliates, and many more." },
  { q: "What makes Marcellotech different from other coaching institutes?", a: "Three things: (1) Every student works on a real project — not a textbook exercise. (2) We have a dedicated publication team that gets your research paper Scopus-indexed, often within 18 days. (3) Placement support continues until you are hired — it does not end with the course." },
];

export function AboutPage({ onEnquire }: AboutPageProps) {
  return (
    <>
      {/* Hero */}
      <section style={{
        background: "var(--white)",
        borderBottom: "1px solid var(--border)",
        padding: "72px 0 0",
        overflow: "hidden",
      }}>
        <div className="container">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 440px", gap: 56, alignItems: "flex-end" }} className="hero-grid">
            <div style={{ paddingBottom: 64 }}>
              <p className="label">Our Story</p>
              <h1 className="heading-xl" style={{ marginBottom: 22 }}>
                Built by engineers,<br />
                <span style={{ color: "var(--green)" }}>for engineers.</span>
              </h1>
              <p className="lead" style={{ marginBottom: 32 }}>
                Marcellotech started with one observation: engineering colleges teach theory, but companies hire people who can build things. We exist to close that gap — with real projects, real mentors, and measurable outcomes.
              </p>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <button onClick={onEnquire} className="btn btn-primary btn-lg">Talk to Our Team →</button>
                <a href="tel:+919442344796" className="btn btn-secondary btn-lg" style={{ textDecoration: "none" }}>Call Us</a>
              </div>
            </div>

            {/* Hero image */}
            <div className="hide-mobile" style={{ alignSelf: "flex-end" }}>
              <img
                src="https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=880&auto=format&fit=crop&q=80"
                alt="Engineering students working in Marcellotech's lab — Trichy"
                style={{
                  width: "100%", borderRadius: "16px 16px 0 0",
                  display: "block", objectFit: "cover", height: 340,
                }}
                loading="lazy"
                onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="section-sm" style={{ background: "var(--bg-alt)" }}>
        <div className="container">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 16 }}>
            {[
              { value: "2,400+", label: "Students Trained" },
              { value: "1,200+", label: "Projects Delivered" },
              { value: "850+", label: "Indexed Publications" },
              { value: "60+", label: "College Partners" },
              { value: "18 days", label: "Avg. Paper Acceptance" },
              { value: "94%", label: "Placement Rate" },
            ].map(({ value, label }) => (
              <div key={label} className="card" style={{ padding: "20px 18px", textAlign: "center" }}>
                <div className="stat-val" style={{ marginBottom: 4 }}>{value}</div>
                <div style={{ fontSize: 12.5, color: "var(--text-3)", fontWeight: 500 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why us */}
      <section className="section" style={{ background: "var(--white)" }}>
        <div className="container">
          <p className="label">Why Marcellotech</p>
          <h2 className="heading-lg" style={{ marginBottom: 12, maxWidth: 420 }}>
            We don't just teach.<br />We make you employable.
          </h2>
          <p style={{ color: "var(--text-2)", fontSize: 15, lineHeight: 1.7, marginBottom: 44, maxWidth: 540 }}>
            Every decision we make — from curriculum design to mentor selection — is driven by one question: will this help a student get hired at a company they're proud of?
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 28 }}>
            {[
              { abbr: "01", title: "Project-based from day one", desc: "Every concept is backed by a real deliverable. By week 4 you have a working prototype to show in interviews — not just slides." },
              { abbr: "02", title: "Industry mentors, not teachers", desc: "All trainers have 5–15 years at product companies. They teach what actually gets you hired, not what's in the textbook." },
              { abbr: "03", title: "Research publication track", desc: "Dedicated Scopus and WoS paper support. 18-day average acceptance. Invaluable for PG applications and research scholar profiles." },
              { abbr: "04", title: "Placement until you land", desc: "Resume reviews, mock interviews, and direct referrals. We stay involved and keep refining your profile until you receive an offer." },
            ].map(({ abbr, title, desc }) => (
              <div key={title} style={{ paddingLeft: 20, borderLeft: "3px solid var(--green)" }}>
                <div style={{
                  fontSize: 11, fontWeight: 800, color: "var(--green)",
                  letterSpacing: "0.08em", marginBottom: 8, opacity: 0.7,
                }}>{abbr}</div>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", marginBottom: 7 }}>{title}</h3>
                <p style={{ fontSize: 13.5, color: "var(--text-2)", lineHeight: 1.75 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="section" style={{ background: "var(--bg-alt)" }}>
        <div className="container" style={{ maxWidth: 680 }}>
          <p className="label">Our Journey</p>
          <h2 className="heading-lg" style={{ marginBottom: 40 }}>How we got here.</h2>
          <div style={{ position: "relative" }}>
            <div style={{ position: "absolute", left: 13, top: 8, bottom: 8, width: 2, background: "var(--border)" }} />
            <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
              {MILESTONES.map(({ year, event }) => (
                <div key={year} style={{ display: "flex", gap: 28, paddingLeft: 4 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: "50%", flexShrink: 0, marginTop: 2,
                    background: "var(--green)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1,
                  }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: "white" }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 12.5, fontWeight: 800, color: "var(--green)", marginBottom: 5, letterSpacing: "0.04em" }}>{year}</div>
                    <p style={{ fontSize: 15, color: "var(--text-2)", lineHeight: 1.7 }}>{event}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="section" style={{ background: "var(--white)" }}>
        <div className="container">
          <p className="label">The Team</p>
          <h2 className="heading-lg" style={{ marginBottom: 10 }}>The people behind it.</h2>
          <p style={{ color: "var(--text-2)", fontSize: 15, lineHeight: 1.7, marginBottom: 40, maxWidth: 480 }}>
            Engineers and researchers who left comfortable industry careers to build the training institute they wish had existed when they were students.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20 }}>
            {TEAM.map(({ name, role, bio, img, initials }) => (
              <div key={name} className="card" style={{ padding: 0, overflow: "hidden" }}>
                <div style={{
                  height: 180, background: "linear-gradient(145deg, var(--bg-green), var(--bg-alt))",
                  display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden",
                }}>
                  <img
                    src={img}
                    alt={name}
                    style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }}
                    loading="lazy"
                    onError={e => {
                      const el = e.currentTarget as HTMLImageElement;
                      el.style.display = "none";
                      const parent = el.parentElement!;
                      parent.innerHTML = `<div style="width:72px;height:72px;border-radius:50%;background:var(--green);display:flex;align-items:center;justify-content:center;color:#fff;font-size:26px;font-weight:800">${initials}</div>`;
                    }}
                  />
                </div>
                <div style={{ padding: "20px 20px 22px" }}>
                  <h3 style={{ fontSize: 15.5, fontWeight: 700, color: "var(--text)", marginBottom: 3 }}>{name}</h3>
                  <div style={{ fontSize: 13, color: "var(--green)", fontWeight: 600, marginBottom: 10 }}>{role}</div>
                  <p style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.7 }}>{bio}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <FAQSection
        bg="var(--bg-alt)"
        title="About Marcellotech — answered."
        items={ABOUT_FAQ}
      />

      {/* CTA */}
      <section style={{ background: "var(--dark)", padding: "72px 0", borderTop: "3px solid var(--green)" }}>
        <div className="container" style={{ maxWidth: 520 }}>
          <h2 style={{ fontSize: "clamp(1.6rem, 3vw, 2.4rem)", fontWeight: 800, color: "#F8FAFC", letterSpacing: "-0.02em", marginBottom: 12 }}>
            Want to talk to us?
          </h2>
          <p style={{ color: "#94A3B8", fontSize: 15, marginBottom: 28, lineHeight: 1.7 }}>
            No sales pitch — just an honest conversation about your goals and whether we're the right fit.
          </p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button onClick={onEnquire} className="btn btn-primary btn-lg">Talk to Our Team →</button>
            <a
              href="https://wa.me/919442344796"
              target="_blank" rel="noopener noreferrer"
              style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "15px 24px", borderRadius: 100, fontSize: 16, fontWeight: 600,
                color: "#fff", background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.18)", textDecoration: "none",
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
