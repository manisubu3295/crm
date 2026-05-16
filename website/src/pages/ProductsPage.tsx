import { useState } from "react";
import { FAQSection } from "../components/FAQSection.js";

interface Product {
  id: string;
  name: string;
  sku: string;
  cat: "Arduino" | "Raspberry Pi" | "IoT Kits";
  mrp: number;
  price: number;
  img: string;
  tag?: string;
  specs?: string[];
}

const BASE = "https://www.marcellotech.com/";

const PRODUCTS: Product[] = [
  {
    id: "MT-101", sku: "MT-101", cat: "Arduino",
    name: "Arduino UNO R3 (DIP)",
    mrp: 382, price: 347,
    img: BASE + "images/products/MT-101-uno-dip-400x400.jpg",
    tag: "Best Seller",
    specs: ["ATmega328P", "14 digital I/O", "6 analog inputs", "16 MHz clock"],
  },
  {
    id: "MT-102", sku: "MT-102", cat: "Arduino",
    name: "Arduino UNO SMD (CH340)",
    mrp: 300, price: 273,
    img: BASE + "images/products/MT-102-uno-smd-ch340-400x400.jpg",
    specs: ["CH340 USB chip", "SMD package", "14 digital I/O", "Compatible with UNO shields"],
  },
  {
    id: "MT-103", sku: "MT-103", cat: "Arduino",
    name: "Arduino Nano",
    mrp: 277, price: 252,
    img: BASE + "images/products/MT-103-nano-400x400.jpg",
    specs: ["ATmega328", "Breadboard friendly", "22 I/O pins", "Mini USB"],
  },
  {
    id: "MT-104", sku: "MT-104", cat: "Arduino",
    name: "Arduino MEGA 2560",
    mrp: 751, price: 683,
    img: BASE + "images/products/MT-104-mega2560-400x400.jpg",
    specs: ["ATmega2560", "54 digital I/O", "16 analog inputs", "256 KB flash"],
  },
  {
    id: "MT-201", sku: "MT-201", cat: "Raspberry Pi",
    name: "Raspberry Pi 4 — 4 GB",
    mrp: 7500, price: 7000,
    img: BASE + "images/products/MT-201-202-203-1-400x400.jpg",
    tag: "Most Popular",
    specs: ["Quad-core Cortex-A72", "4 GB LPDDR4", "2× USB 3.0", "Dual 4K HDMI"],
  },
  {
    id: "MT-202", sku: "MT-202", cat: "Raspberry Pi",
    name: "Raspberry Pi 4 — 2 GB",
    mrp: 4500, price: 4250,
    img: BASE + "images/products/MT-201-202-203-1-400x400.jpg",
    specs: ["Quad-core Cortex-A72", "2 GB LPDDR4", "2× USB 3.0", "Dual 4K HDMI"],
  },
  {
    id: "MT-203", sku: "MT-203", cat: "Raspberry Pi",
    name: "Raspberry Pi 4 — 1 GB",
    mrp: 3292, price: 2993,
    img: BASE + "images/products/MT-201-202-203-1-400x400.jpg",
    specs: ["Quad-core Cortex-A72", "1 GB LPDDR4", "2× USB 3.0", "Dual 4K HDMI"],
  },
  {
    id: "MT-204", sku: "MT-204", cat: "Raspberry Pi",
    name: "Raspberry Pi 3 Model B+",
    mrp: 4000, price: 3600,
    img: BASE + "images/products/MT-204-1-400x400.jpg",
    specs: ["1.4 GHz Cortex-A53", "1 GB LPDDR2", "Dual-band WiFi", "Bluetooth 4.2"],
  },
  {
    id: "NOD-01", sku: "NOD-01", cat: "IoT Kits",
    name: "IoT Water Quality Management Kit",
    mrp: 174, price: 158,
    img: BASE + "images/products/nod1.jpg",
    specs: ["NodeMCU ESP8266", "pH + turbidity sensors", "Cloud dashboard", "Ready to build"],
  },
  {
    id: "NOD-02", sku: "NOD-02", cat: "IoT Kits",
    name: "IoT Smart Parking System Kit",
    mrp: 2079, price: 1890,
    img: BASE + "images/products/nod2.png",
    tag: "Project Ready",
    specs: ["NodeMCU + IR sensors", "LCD display", "App-controlled", "Complete components"],
  },
  {
    id: "NOD-03", sku: "NOD-03", cat: "IoT Kits",
    name: "IoT Blind Navigation System Kit",
    mrp: 924, price: 840,
    img: BASE + "images/products/node3.jpg",
    specs: ["Ultrasonic sensors", "Audio feedback module", "NodeMCU", "Wearable design"],
  },
  {
    id: "NOD-04", sku: "NOD-04", cat: "IoT Kits",
    name: "IoT Waste Segregation System Kit",
    mrp: 636, price: 578,
    img: BASE + "images/products/node4.png",
    specs: ["IR + moisture sensors", "Servo motor", "NodeMCU", "3-bin sorting"],
  },
];

const CATS = ["All", "Arduino", "Raspberry Pi", "IoT Kits"] as const;

const CAT_META: Record<string, { color: string; bg: string }> = {
  "Arduino":       { color: "#00897B", bg: "#E0F2F1" },
  "Raspberry Pi":  { color: "#2E7D32", bg: "#E8F5E9" },
  "IoT Kits":      { color: "#388E3C", bg: "#F1F8E9" },
};

function fmt(n: number) {
  return "₹" + n.toLocaleString("en-IN");
}
function discount(mrp: number, price: number) {
  return Math.round(((mrp - price) / mrp) * 100);
}

function ProductCard({ p, onEnquire }: { p: Product; onEnquire: () => void }) {
  const [imgErr, setImgErr] = useState(false);
  const meta = CAT_META[p.cat];
  const off = discount(p.mrp, p.price);

  const waMsg = encodeURIComponent(
    `Hi, I want to order:\n*${p.name}* (${p.sku})\nPrice: ${fmt(p.price)}\n\nPlease confirm availability.`
  );

  return (
    <div style={{
      background: "var(--white)",
      borderRadius: 16,
      border: "1px solid var(--border)",
      overflow: "hidden",
      display: "flex",
      flexDirection: "column",
      transition: "transform 0.25s, box-shadow 0.25s",
    }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.transform = "translateY(-6px)";
        (e.currentTarget as HTMLElement).style.boxShadow = "0 20px 56px rgba(27,107,58,0.13)";
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.transform = "none";
        (e.currentTarget as HTMLElement).style.boxShadow = "";
      }}
    >
      {/* Image area */}
      <div style={{
        position: "relative",
        background: "linear-gradient(145deg, #F4FAF6, #E8F5E9)",
        aspectRatio: "1 / 1",
        display: "flex", alignItems: "center", justifyContent: "center",
        overflow: "hidden",
      }}>
        {/* Discount badge */}
        <div style={{
          position: "absolute", top: 12, left: 12,
          background: "var(--green)", color: "#fff",
          fontSize: 11, fontWeight: 800, padding: "4px 9px",
          borderRadius: 6, letterSpacing: "0.04em", zIndex: 2,
        }}>
          {off}% OFF
        </div>

        {/* Tag badge */}
        {p.tag && (
          <div style={{
            position: "absolute", top: 12, right: 12,
            background: "#FFF8E1", color: "#F59E0B",
            border: "1px solid #FDE68A",
            fontSize: 10.5, fontWeight: 700, padding: "4px 9px",
            borderRadius: 6, letterSpacing: "0.03em", zIndex: 2,
          }}>
            {p.tag}
          </div>
        )}

        {imgErr ? (
          <div style={{
            width: 72, height: 72, borderRadius: 16,
            background: meta.bg, border: `2px solid ${meta.color}30`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 13, fontWeight: 800, color: meta.color, letterSpacing: "0.04em",
          }}>{p.cat.slice(0, 3).toUpperCase()}</div>
        ) : (
          <img
            src={p.img}
            alt={p.name}
            onError={() => setImgErr(true)}
            style={{ width: "80%", height: "80%", objectFit: "contain", display: "block" }}
          />
        )}
      </div>

      {/* Info */}
      <div style={{ padding: "20px 20px 22px", display: "flex", flexDirection: "column", flex: 1 }}>
        {/* SKU + category */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <span style={{
            fontSize: 10.5, fontWeight: 700, padding: "2px 8px", borderRadius: 4,
            background: meta.bg, color: meta.color, letterSpacing: "0.04em",
          }}>
            {p.sku}
          </span>
          <span style={{ fontSize: 11, color: "var(--text-3)", fontWeight: 500 }}>{p.cat}</span>
        </div>

        <h3 style={{
          fontSize: 15, fontWeight: 700, color: "var(--text)",
          lineHeight: 1.35, marginBottom: 12, flex: 1,
        }}>{p.name}</h3>

        {/* Specs */}
        {p.specs && (
          <div style={{ marginBottom: 14 }}>
            {p.specs.map(s => (
              <div key={s} style={{ display: "flex", gap: 6, alignItems: "flex-start", marginBottom: 3 }}>
                <span style={{ color: "var(--green)", fontWeight: 700, fontSize: 11, marginTop: 1.5 }}>✓</span>
                <span style={{ fontSize: 12, color: "var(--text-2)" }}>{s}</span>
              </div>
            ))}
          </div>
        )}

        {/* Pricing */}
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 14 }}>
          <span style={{ fontSize: 22, fontWeight: 900, color: "var(--green)" }}>{fmt(p.price)}</span>
          <span style={{ fontSize: 13, color: "var(--text-3)", textDecoration: "line-through" }}>{fmt(p.mrp)}</span>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 8 }}>
          <a
            href={`https://wa.me/919442344796?text=${waMsg}`}
            target="_blank" rel="noopener noreferrer"
            style={{
              flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
              gap: 6, padding: "10px 8px", borderRadius: 9, fontSize: 13, fontWeight: 700,
              background: "#25D366", color: "#fff", textDecoration: "none",
              border: "none", cursor: "pointer",
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            Order Now
          </a>
          <button
            onClick={onEnquire}
            style={{
              padding: "10px 14px", borderRadius: 9, fontSize: 12, fontWeight: 600,
              background: "var(--bg-green)", color: "var(--green)",
              border: "1.5px solid var(--border-2)", cursor: "pointer",
            }}
          >
            Enquire
          </button>
        </div>
      </div>
    </div>
  );
}

export function ProductsPage({ onEnquire }: { onEnquire: () => void }) {
  const [cat, setCat] = useState<typeof CATS[number]>("All");

  const filtered = cat === "All" ? PRODUCTS : PRODUCTS.filter(p => p.cat === cat);
  const counts: Record<string, number> = { All: PRODUCTS.length };
  CATS.slice(1).forEach(c => { counts[c] = PRODUCTS.filter(p => p.cat === c).length; });

  return (
    <>
      {/* ── Hero ── */}
      <section style={{
        background: "var(--dark)",
        padding: "72px 0 64px",
        position: "relative", overflow: "hidden",
      }}>
        <div className="dot-grid" style={{ position: "absolute", inset: 0, opacity: 0.3 }} />
        <div style={{
          position: "absolute", top: "10%", right: "4%",
          width: 400, height: 400, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(27,107,58,0.22) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />
        <div style={{
          position: "absolute", bottom: "0%", left: "0%",
          width: 280, height: 280, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(0,137,123,0.15) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />
        <div className="container" style={{ position: "relative", zIndex: 1 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 40, alignItems: "center" }} className="hero-grid">
            <div style={{ maxWidth: 560 }}>
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                background: "rgba(27,107,58,0.20)", border: "1px solid rgba(27,107,58,0.40)",
                borderRadius: 8, padding: "5px 14px", marginBottom: 22,
              }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#4ADE80", display: "inline-block", boxShadow: "0 0 8px #4ADE80" }} />
                <span style={{ fontSize: 12.5, fontWeight: 600, color: "#86EFAC", letterSpacing: "0.04em" }}>
                  Sourced & tested by our engineers
                </span>
              </div>

              <h1 style={{
                fontSize: "clamp(2rem, 4.5vw, 3rem)", fontWeight: 900, color: "#F1F5F9",
                lineHeight: 1.15, marginBottom: 20, letterSpacing: "-0.02em",
              }}>
                Hardware kits for{" "}
                <span style={{ background: "linear-gradient(135deg, #4ADE80, #34D399)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                  real projects.
                </span>
              </h1>
              <p style={{ fontSize: 17, color: "#94A3B8", lineHeight: 1.8, marginBottom: 36 }}>
                Arduino, Raspberry Pi &amp; ready-to-use IoT project kits. Each kit ships with all components — just build.
              </p>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <a
                  href="https://wa.me/919442344796?text=Hi%2C%20I%20want%20to%20order%20hardware%20components"
                  target="_blank" rel="noopener noreferrer"
                  className="btn btn-primary btn-lg"
                  style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 8 }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                  Order on WhatsApp
                </a>
                <button onClick={onEnquire} className="btn btn-secondary btn-lg"
                  style={{ background: "rgba(255,255,255,0.06)", color: "#E2E8F0", border: "1.5px solid rgba(255,255,255,0.16)" }}>
                  Ask a Question
                </button>
              </div>
            </div>

            {/* Hero stats panel */}
            <div className="hide-mobile" style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.10)",
              borderRadius: 16, padding: "28px 32px",
              backdropFilter: "blur(16px)",
              display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px 36px",
            }}>
              {[
                { val: "12+", label: "Products" },
                { val: "3",   label: "Categories" },
                { val: "100%",label: "Tested" },
                { val: "24h", label: "Dispatch" },
              ].map(({ val, label }) => (
                <div key={label} style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 22, fontWeight: 900, color: "#4ADE80", lineHeight: 1 }}>{val}</div>
                  <div style={{ fontSize: 11, color: "#64748B", marginTop: 3, fontWeight: 500 }}>{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Trust bar ── */}
      <div style={{
        background: "var(--green-dark)", borderBottom: "1px solid rgba(255,255,255,0.06)",
        padding: "12px 0",
      }}>
        <div className="container" style={{ display: "flex", flexWrap: "wrap", gap: 24, justifyContent: "center" }}>
          {[
            "Engineer-tested components",
            "All parts included in kit",
            "WhatsApp support after purchase",
            "Best price in Trichy",
          ].map(text => (
            <div key={text} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13, color: "#86EFAC", fontWeight: 500 }}>
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#4ADE80", flexShrink: 0, display: "inline-block" }} />
              <span>{text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Products grid ── */}
      <section className="section" style={{ background: "var(--bg-alt)" }}>
        <div className="container">
          {/* Category tabs */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 36 }}>
            {CATS.map(c => (
              <button
                key={c}
                onClick={() => setCat(c)}
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "9px 20px", borderRadius: 100, fontSize: 13.5, fontWeight: 600,
                  cursor: "pointer", transition: "all 0.2s",
                  background: cat === c ? "var(--green)" : "var(--white)",
                  color: cat === c ? "#fff" : "var(--text-2)",
                  border: cat === c ? "1.5px solid var(--green)" : "1.5px solid var(--border)",
                  boxShadow: cat === c ? "0 4px 16px rgba(27,107,58,0.25)" : "none",
                }}
              >
                {c}
                <span style={{
                  background: cat === c ? "rgba(255,255,255,0.22)" : "var(--bg-alt)",
                  color: cat === c ? "#fff" : "var(--text-3)",
                  fontSize: 11, fontWeight: 700,
                  padding: "1px 7px", borderRadius: 20,
                }}>
                  {counts[c]}
                </span>
              </button>
            ))}
          </div>

          {/* Grid */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(270px, 1fr))",
            gap: 20,
          }}>
            {filtered.map(p => (
              <ProductCard key={p.id} p={p} onEnquire={onEnquire} />
            ))}
          </div>
        </div>
      </section>

      {/* ── How to order ── */}
      <section className="section" style={{ background: "var(--white)" }}>
        <div className="container">
          <p className="label">Simple Process</p>
          <h2 className="heading-lg" style={{ marginBottom: 48, maxWidth: 360 }}>How to order.</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 20 }}>
            {[
              { n: "01", title: "Pick your product", desc: "Browse the catalogue. Click \"Order on WhatsApp\" on any product." },
              { n: "02", title: "WhatsApp us", desc: "We confirm availability and share the bank/UPI details." },
              { n: "03", title: "Pay & confirm", desc: "Transfer via UPI or bank transfer. Send the screenshot on WhatsApp." },
              { n: "04", title: "Receive in 24 h", desc: "We dispatch from our Trichy facility. You can also collect in person." },
            ].map(({ n, title, desc }) => (
              <div key={n}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: "50%",
                    background: "var(--bg-green)", border: "2px solid var(--border-2)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 13, fontWeight: 800, color: "var(--green)",
                  }}>{n}</div>
                  <span style={{ fontSize: 11, fontWeight: 800, color: "var(--green)", letterSpacing: "0.06em" }}>STEP {n}</span>
                </div>
                <h3 style={{ fontSize: 15.5, fontWeight: 700, color: "var(--text)", marginBottom: 6 }}>{title}</h3>
                <p style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.75 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <FAQSection
        bg="var(--bg-alt)"
        title="Hardware orders — answered."
        items={[
          { q: "Do you ship components outside Tiruchirappalli?", a: "Yes. We ship across Tamil Nadu and can dispatch to any major city in India via courier. Standard shipping takes 3–5 business days. WhatsApp us before ordering and we'll confirm availability and shipping cost to your location." },
          { q: "Are the Arduino and Raspberry Pi units original?", a: "Yes. We source directly from authorised distributors and test every unit before dispatch. All products come with a 7-day replacement guarantee for manufacturing defects." },
          { q: "How do I pay for my order?", a: "We accept UPI (PhonePe, GPay, Paytm), bank transfer (NEFT/IMPS), and cash for in-person collection from our Trichy facility. WhatsApp your order and we'll share payment details." },
          { q: "Do the IoT project kits come pre-assembled?", a: "IoT project kits include all components (board, sensors, wires, breadboard) in one package. They are not pre-assembled — building it yourself is part of the learning. We include a step-by-step guide and support you on WhatsApp if you get stuck." },
          { q: "Can I collect components in person at your Trichy office?", a: "Yes — in-person collection is available at GEM Plaza, Trichy, Mon–Sat from 9 AM to 6 PM. There is no extra charge and you get the item immediately. WhatsApp us before you come to confirm the item is in stock." },
        ]}
      />

      {/* ── CTA ── */}
      <section style={{ background: "var(--dark)", padding: "72px 0", borderTop: "3px solid var(--green)" }}>
        <div className="container" style={{ maxWidth: 560, textAlign: "center" }}>
          
          <h2 style={{ fontSize: "clamp(1.6rem, 3vw, 2.2rem)", fontWeight: 800, color: "#F8FAFC", letterSpacing: "-0.02em", marginBottom: 12 }}>
            Need a bulk order?
          </h2>
          <p style={{ color: "#94A3B8", fontSize: 15, marginBottom: 32, lineHeight: 1.7 }}>
            Colleges and departments get special pricing on bulk kit orders for labs and workshops.
            WhatsApp us with your requirement and we'll send a quote within 2 hours.
          </p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
            <a
              href="https://wa.me/919442344796?text=Hi%2C%20I%20need%20a%20bulk%20quote%20for%20hardware%20components"
              target="_blank" rel="noopener noreferrer"
              className="btn btn-primary btn-lg"
              style={{ textDecoration: "none" }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              WhatsApp for Bulk Quote
            </a>
            <a
              href="tel:+919442344796"
              className="btn btn-secondary btn-lg"
              style={{
                textDecoration: "none",
                background: "rgba(255,255,255,0.06)",
                color: "#E2E8F0",
                border: "1.5px solid rgba(255,255,255,0.16)",
              }}
            >
              Call Us
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
