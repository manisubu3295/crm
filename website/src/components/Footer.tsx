import { Link } from "wouter";

interface FooterProps {
  onEnquire: () => void;
}

// In dev, CRM Vite runs on 5173; in production both apps share the same domain.
const CRM_LOGIN = import.meta.env.DEV ? "http://localhost:5173/login" : "/login";

export function Footer({ onEnquire }: FooterProps) {
  return (
    <footer style={{ background: "#111827", color: "#E5E7EB", paddingTop: 64, paddingBottom: 36 }}>
      <div className="container">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 40, marginBottom: 48 }}>

          {/* Brand */}
          <div style={{ gridColumn: "span 1" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <div style={{ width: 30, height: 30, background: "var(--green)", borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 800, fontSize: 14 }}>M</div>
              <span style={{ fontWeight: 800, fontSize: 16, color: "#F9FAFB" }}>Marcellotech</span>
            </div>
            <p style={{ fontSize: 13.5, color: "#9CA3AF", lineHeight: 1.75, maxWidth: 220 }}>
              Building industry-ready engineers through hands-on training, real projects, and placement support.
            </p>
            <p style={{ fontSize: 13, color: "#6B7280", marginTop: 16 }}>Trichy, Tamil Nadu, India</p>
          </div>

          {/* Courses */}
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#6B7280", marginBottom: 14 }}>Courses</p>
            {[
              { href: "/courses/iot", label: "IoT & Embedded Systems" },
              { href: "/courses/ai-ml", label: "AI & Machine Learning" },
              { href: "/courses/vlsi", label: "VLSI Design" },
              { href: "/courses/cloud-security", label: "Cloud & Cybersecurity" },
            ].map(({ href, label }) => (
              <Link key={href} href={href}>
                <div
                  style={{ fontSize: 14, color: "#9CA3AF", marginBottom: 9, cursor: "pointer", transition: "color 0.15s" }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "#E5E7EB"}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "#9CA3AF"}
                >
                  {label}
                </div>
              </Link>
            ))}
          </div>

          {/* Company */}
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#6B7280", marginBottom: 14 }}>Company</p>
            {[
              { href: "/about", label: "About Us" },
              { href: "/contact", label: "Contact" },
            ].map(({ href, label }) => (
              <Link key={href} href={href}>
                <div
                  style={{ fontSize: 14, color: "#9CA3AF", marginBottom: 9, cursor: "pointer", transition: "color 0.15s" }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "#E5E7EB"}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "#9CA3AF"}
                >
                  {label}
                </div>
              </Link>
            ))}
          </div>

          {/* Contact */}
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#6B7280", marginBottom: 14 }}>Reach Us</p>
            <p style={{ fontSize: 13.5, color: "#9CA3AF", marginBottom: 8, lineHeight: 1.6 }}>
              <a href="mailto:info@marcellotech.com" style={{ color: "#93C5FD" }}>info@marcellotech.com</a>
            </p>
            <p style={{ fontSize: 13.5, color: "#9CA3AF", marginBottom: 16 }}>
              <a href="tel:+919442344796" style={{ color: "#93C5FD" }}>+91 94423 44796</a>
            </p>
            <button onClick={onEnquire} className="btn btn-primary" style={{ fontSize: 13, padding: "9px 18px" }}>
              Enquire Now
            </button>
          </div>
        </div>

        {/* Bottom bar */}
        <div style={{ borderTop: "1px solid #1F2937", paddingTop: 24, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
          <p style={{ fontSize: 13, color: "#4B5563" }}>&#169; 2026 Marcellotech. All rights reserved.</p>
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <p style={{ fontSize: 13, color: "#4B5563" }}>Mon &#8211; Sat, 9 AM &#8211; 6 PM</p>
            <a
              href={CRM_LOGIN}
              style={{ fontSize: 12, color: "#4B5563", textDecoration: "none", transition: "color 0.15s" }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "#9CA3AF"}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "#4B5563"}
            >
              Staff Login
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
