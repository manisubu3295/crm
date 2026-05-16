import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/courses", label: "Courses" },
  { href: "/certified", label: "Certified Training" },
  { href: "/projects", label: "Projects" },
  { href: "/products", label: "Products" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

interface HeaderProps {
  onEnquire: () => void;
  onHideAnnouncement?: () => void;
}

export function Header({ onEnquire }: HeaderProps) {
  const [location] = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [announcementVisible, setAnnouncementVisible] = useState(true);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 4);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  useEffect(() => setMenuOpen(false), [location]);

  const ANNOUNCEMENT_H = announcementVisible ? 38 : 0;
  const HEADER_H = 66;
  const TOTAL_H = ANNOUNCEMENT_H + HEADER_H;

  useEffect(() => {
    document.documentElement.style.setProperty("--header-h", `${TOTAL_H}px`);
  }, [TOTAL_H]);

  return (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 50 }}>

      {/* ── Announcement bar ──────────────────────────────── */}
      {announcementVisible && (
        <div style={{
          background: "var(--green-dark)",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          padding: "0 16px",
          height: 38,
          fontSize: 13,
          fontWeight: 500,
          letterSpacing: "0.01em",
        }}>
          <span style={{
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            width: 18, height: 18, borderRadius: "50%",
            background: "rgba(255,255,255,0.22)", fontSize: 10, fontWeight: 800, letterSpacing: 0,
          }}>N</span>
          <span>
            Summer Batch 2026 — Limited seats available.&nbsp;
            <button
              onClick={onEnquire}
              style={{
                background: "rgba(255,255,255,0.18)",
                border: "1px solid rgba(255,255,255,0.4)",
                color: "#fff",
                borderRadius: 5,
                padding: "2px 10px",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Reserve a Spot →
            </button>
          </span>
          <button
            onClick={() => setAnnouncementVisible(false)}
            style={{
              position: "absolute", right: 12,
              background: "none", border: "none", color: "rgba(255,255,255,0.7)",
              cursor: "pointer", fontSize: 16, lineHeight: 1, padding: "2px 4px",
            }}
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      )}

      {/* ── Main nav ──────────────────────────────────────── */}
      <header style={{
        background: scrolled ? "rgba(255,255,255,0.88)" : "rgba(255,255,255,0.98)",
        backdropFilter: scrolled ? "blur(16px) saturate(1.6)" : "none",
        WebkitBackdropFilter: scrolled ? "blur(16px) saturate(1.6)" : "none",
        borderBottom: "1px solid var(--border)",
        boxShadow: scrolled
          ? "0 4px 24px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)"
          : "0 1px 3px rgba(0,0,0,0.04)",
        transition: "background 0.3s, box-shadow 0.3s, backdrop-filter 0.3s",
      }}>
        <div className="container" style={{ display: "flex", alignItems: "center", height: HEADER_H, gap: 8 }}>

          {/* Logo */}
          <Link href="/">
            <div style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
              <div style={{
                width: 36, height: 36,
                background: "var(--green)",
                borderRadius: 9,
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "white", fontSize: 17, fontWeight: 900,
                boxShadow: "0 2px 8px rgba(27,107,58,0.4)",
              }}>M</div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: "var(--text)", letterSpacing: "-0.02em", lineHeight: 1.1 }}>
                  Marcellotech
                </div>
                <div style={{ fontSize: 10, color: "var(--text-3)", fontWeight: 500, letterSpacing: "0.04em" }}>
                  Engineering Training
                </div>
              </div>
            </div>
          </Link>

          {/* Desktop nav — centred */}
          <nav className="hide-mobile" style={{ display: "flex", alignItems: "center", gap: 2, margin: "0 auto" }}>
            {NAV.map(({ href, label }) => {
              const active = href === "/" ? location === "/" : location.startsWith(href);
              return (
                <Link key={href} href={href}>
                  <span style={{
                    display: "block",
                    padding: "7px 15px",
                    borderRadius: 7,
                    fontSize: 14,
                    fontWeight: active ? 600 : 500,
                    color: active ? "var(--green)" : "var(--text-2)",
                    background: active ? "var(--bg-green)" : "transparent",
                    cursor: "pointer",
                    transition: "color 0.2s, background 0.2s",
                    borderBottom: active ? "2px solid var(--green)" : "2px solid transparent",
                  }}
                    onMouseEnter={e => {
                      if (!active) {
                        (e.currentTarget as HTMLElement).style.color = "var(--text)";
                        (e.currentTarget as HTMLElement).style.background = "var(--bg-alt)";
                      }
                    }}
                    onMouseLeave={e => {
                      if (!active) {
                        (e.currentTarget as HTMLElement).style.color = "var(--text-2)";
                        (e.currentTarget as HTMLElement).style.background = "transparent";
                      }
                    }}
                  >
                    {label}
                  </span>
                </Link>
              );
            })}
          </nav>

          {/* CTA buttons */}
          <div className="hide-mobile" style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: "auto" }}>
            <a
              href="https://wa.me/919442344796"
              target="_blank" rel="noopener noreferrer"
              style={{
                display: "flex", alignItems: "center", gap: 5,
                padding: "8px 14px", borderRadius: 100, fontSize: 13, fontWeight: 600,
                color: "var(--green)", background: "var(--bg-green)", border: "1.5px solid var(--border-2)",
                textDecoration: "none",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              WhatsApp
            </a>
            <button
              onClick={onEnquire}
              className="btn btn-primary"
              style={{ padding: "9px 20px", fontSize: 14, borderRadius: 8 }}
            >
              Enquire Now
            </button>
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMenuOpen(m => !m)}
            className="show-mobile"
            style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", padding: 8 }}
            aria-label="Menu"
          >
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              {menuOpen ? (
                <path d="M4 4l14 14M18 4L4 18" stroke="var(--text)" strokeWidth="2" strokeLinecap="round" />
              ) : (
                <>
                  <line x1="3" y1="6" x2="19" y2="6" stroke="var(--text)" strokeWidth="2" strokeLinecap="round" />
                  <line x1="3" y1="11" x2="19" y2="11" stroke="var(--text)" strokeWidth="2" strokeLinecap="round" />
                  <line x1="3" y1="16" x2="19" y2="16" stroke="var(--text)" strokeWidth="2" strokeLinecap="round" />
                </>
              )}
            </svg>
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div style={{ background: "var(--white)", borderTop: "1px solid var(--border)", padding: "8px 24px 20px" }}>
            {NAV.map(({ href, label }) => {
              const active = href === "/" ? location === "/" : location.startsWith(href);
              return (
                <Link key={href} href={href}>
                  <div style={{
                    padding: "13px 0",
                    borderBottom: "1px solid var(--border)",
                    fontSize: 15, fontWeight: 500,
                    color: active ? "var(--green)" : "var(--text-2)",
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                  }}>
                    {label}
                    {active && <span style={{ color: "var(--green)", fontSize: 12, fontWeight: 700 }}>●</span>}
                  </div>
                </Link>
              );
            })}
            <button
              onClick={() => { setMenuOpen(false); onEnquire(); }}
              className="btn btn-primary btn-lg"
              style={{ marginTop: 16, width: "100%", justifyContent: "center" }}
            >
              Enquire Now — Free
            </button>
          </div>
        )}
      </header>
    </div>
  );
}
