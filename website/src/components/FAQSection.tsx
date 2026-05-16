import { useState } from "react";

interface FAQItem {
  q: string;
  a: string;
}

interface FAQSectionProps {
  items: FAQItem[];
  title?: string;
  subtitle?: string;
  bg?: string;
}

export function FAQSection({
  items,
  title = "Frequently Asked Questions",
  subtitle,
  bg = "var(--white)",
}: FAQSectionProps) {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section className="section" style={{ background: bg }} aria-label="FAQ">
      <div className="container" style={{ maxWidth: 760 }}>
        <p className="label">FAQ</p>
        <h2 className="heading-lg" style={{ marginBottom: subtitle ? 10 : 40, maxWidth: 480 }}>
          {title}
        </h2>
        {subtitle && (
          <p style={{ color: "var(--text-2)", fontSize: 15, lineHeight: 1.7, marginBottom: 40, maxWidth: 520 }}>
            {subtitle}
          </p>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {items.map((item, i) => {
            const isOpen = open === i;
            return (
              <div
                key={i}
                style={{
                  borderTop: i === 0 ? "1px solid var(--border)" : "none",
                  borderBottom: "1px solid var(--border)",
                }}
              >
                <button
                  onClick={() => setOpen(isOpen ? null : i)}
                  aria-expanded={isOpen}
                  style={{
                    width: "100%", display: "flex", alignItems: "center",
                    justifyContent: "space-between", gap: 20,
                    padding: "22px 4px",
                    background: "none", border: "none", cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <span style={{
                    fontSize: 16, fontWeight: 600, color: "var(--text)",
                    lineHeight: 1.4,
                  }}>
                    {item.q}
                  </span>
                  <span style={{
                    width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                    background: isOpen ? "var(--green)" : "var(--bg-alt)",
                    border: `1.5px solid ${isOpen ? "var(--green)" : "var(--border)"}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    transition: "background 0.2s, transform 0.25s",
                    transform: isOpen ? "rotate(45deg)" : "none",
                    color: isOpen ? "#fff" : "var(--text-2)",
                    fontSize: 17, fontWeight: 400, lineHeight: 1,
                  }}>
                    +
                  </span>
                </button>

                <div style={{
                  overflow: "hidden",
                  maxHeight: isOpen ? 400 : 0,
                  transition: "max-height 0.35s cubic-bezier(0.16,1,0.3,1)",
                }}>
                  <p style={{
                    fontSize: 14.5, color: "var(--text-2)", lineHeight: 1.8,
                    padding: "0 4px 22px",
                  }}>
                    {item.a}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: 36, padding: "20px 24px", borderRadius: 12, background: "var(--bg-green)", border: "1px solid var(--border-2)", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <p style={{ fontSize: 14.5, fontWeight: 600, color: "var(--text)", marginBottom: 2 }}>Still have questions?</p>
            <p style={{ fontSize: 13, color: "var(--text-2)" }}>Our counsellors are available Mon–Sat, 9 AM to 6 PM.</p>
          </div>
          <a
            href="https://wa.me/919442344796"
            target="_blank" rel="noopener noreferrer"
            style={{
              display: "inline-flex", alignItems: "center", gap: 7,
              padding: "10px 20px", borderRadius: 100, fontSize: 13.5, fontWeight: 700,
              background: "#25D366", color: "#fff", textDecoration: "none", flexShrink: 0,
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            Ask on WhatsApp
          </a>
        </div>
      </div>
    </section>
  );
}
