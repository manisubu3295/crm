import { useEffect, useState } from "react";

const SESSION_KEY = "mt_ad_shown";

const CAMPAIGN = {
  imageUrl: "/campaign.jpg",
  badge: "Summer Batch 2026",
  headline: "Transform Your Engineering Career in 8 Weeks",
  subline: "Hands-on IoT · AI/ML · VLSI · Cloud training with real projects, Scopus publications & 94% placement support.",
  highlight: "Limited Seats — Batch Starts June 2026",
  cta: "Book Free Counselling →",
  dismiss: "Maybe Later",
};

interface Props {
  onEnquire: () => void;
}

export function AdCampaignPopup({ onEnquire }: Props) {
  const [visible, setVisible] = useState(false);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem(SESSION_KEY)) return;
    const t = setTimeout(() => setVisible(true), 1500);
    return () => clearTimeout(t);
  }, []);

  const close = () => {
    sessionStorage.setItem(SESSION_KEY, "1");
    setVisible(false);
  };

  const handleEnquire = () => {
    close();
    onEnquire();
  };

  if (!visible) return null;

  return (
    <div
      onClick={close}
      style={{
        position: "fixed", inset: 0,
        background: "rgba(10,10,20,0.62)",
        backdropFilter: "blur(4px)",
        zIndex: 200,
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "24px 16px",
        animation: "fadeIn 0.25s ease",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "var(--white)",
          borderRadius: 16,
          overflow: "hidden",
          width: "100%",
          maxWidth: 480,
          boxShadow: "0 24px 64px rgba(0,0,0,0.28), 0 4px 16px rgba(0,0,0,0.12)",
          position: "relative",
          animation: "slideUp 0.28s ease",
        }}
      >
        {/* Close button */}
        <button
          onClick={close}
          aria-label="Close"
          style={{
            position: "absolute", top: 12, right: 12, zIndex: 10,
            width: 32, height: 32, borderRadius: "50%",
            background: "rgba(0,0,0,0.45)", border: "none", cursor: "pointer",
            color: "#fff", fontSize: 18, fontWeight: 700,
            display: "flex", alignItems: "center", justifyContent: "center",
            lineHeight: 1,
          }}
        >
          &times;
        </button>

        {/* Campaign image — place campaign.jpg in website/public/ */}
        {!imgError ? (
          <img
            src={CAMPAIGN.imageUrl}
            alt="Campaign"
            onError={() => setImgError(true)}
            style={{ width: "100%", height: 220, objectFit: "cover", display: "block" }}
          />
        ) : (
          /* Designed fallback banner — green brand colours */
          <div style={{
            height: 200,
            background: "linear-gradient(135deg, #0D3D1F 0%, #1B6B3A 50%, #2E8B57 100%)",
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            padding: "28px 32px", textAlign: "center", gap: 10,
          }}>
            <div style={{
              width: 56, height: 56, borderRadius: 14,
              background: "rgba(255,255,255,0.15)",
              border: "1.5px solid rgba(255,255,255,0.35)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 13, fontWeight: 800, color: "#fff", letterSpacing: "0.04em",
            }}>M</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", letterSpacing: "-0.02em", lineHeight: 1.2 }}>
              Summer Batch 2026
            </div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.78)", fontWeight: 500 }}>
              IoT &middot; AI/ML &middot; VLSI &middot; Cloud &amp; Security
            </div>
            <div style={{
              marginTop: 4, display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center",
            }}>
              {["Real Projects", "Scopus Papers", "94% Placement"].map(t => (
                <span key={t} style={{
                  background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)",
                  color: "#fff", borderRadius: 5, padding: "3px 10px", fontSize: 11, fontWeight: 600,
                }}>
                  {t}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Content */}
        <div style={{ padding: "24px 28px 28px" }}>
          <span style={{
            display: "inline-block",
            background: "var(--bg-green)", color: "var(--green)",
            border: "1px solid var(--border-2)",
            borderRadius: 5, fontSize: 11, fontWeight: 700,
            padding: "3px 10px", letterSpacing: "0.04em", textTransform: "uppercase",
            marginBottom: 12,
          }}>
            {CAMPAIGN.badge}
          </span>

          <h2 style={{
            fontSize: 20, fontWeight: 800, color: "var(--text)",
            letterSpacing: "-0.02em", lineHeight: 1.25, marginBottom: 10,
          }}>
            {CAMPAIGN.headline}
          </h2>

          <p style={{ fontSize: 14, color: "var(--text-2)", lineHeight: 1.7, marginBottom: 14 }}>
            {CAMPAIGN.subline}
          </p>

          <div style={{
            display: "flex", alignItems: "center", gap: 7,
            background: "#FFFBEB", border: "1px solid #FDE68A",
            borderRadius: 7, padding: "9px 13px", marginBottom: 20,
          }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#92400E" }}>
              {CAMPAIGN.highlight}
            </span>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={handleEnquire}
              className="btn btn-primary"
              style={{ flex: 1, justifyContent: "center", fontSize: 15, padding: "13px 20px" }}
            >
              {CAMPAIGN.cta}
            </button>
            <button
              onClick={close}
              className="btn btn-secondary"
              style={{ padding: "13px 18px", fontSize: 14 }}
            >
              {CAMPAIGN.dismiss}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn  { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(24px) } to { opacity: 1; transform: translateY(0) } }
      `}</style>
    </div>
  );
}
