import { useEffect } from "react";

interface SEOProps {
  title: string;
  description: string;
  keywords?: string;
  canonical?: string;
  ogImage?: string;
  jsonLd?: object | object[];
}

const SITE_URL = "https://www.marcellotech.com";
const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.jpg`;

function setMeta(attr: string, key: string, value: string) {
  let el = document.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", value);
}

function setLink(rel: string, href: string) {
  let el = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

export function SEOHead({ title, description, keywords, canonical, ogImage, jsonLd }: SEOProps) {
  useEffect(() => {
    document.title = title;

    setMeta("name", "description", description);
    setMeta("name", "robots", "index, follow");
    if (keywords) setMeta("name", "keywords", keywords);

    const canonicalUrl = canonical ? `${SITE_URL}${canonical}` : SITE_URL;
    setLink("canonical", canonicalUrl);

    const image = ogImage ?? DEFAULT_OG_IMAGE;
    setMeta("property", "og:title", title);
    setMeta("property", "og:description", description);
    setMeta("property", "og:type", "website");
    setMeta("property", "og:url", canonicalUrl);
    setMeta("property", "og:image", image);
    setMeta("property", "og:site_name", "Marcellotech");
    setMeta("property", "og:locale", "en_IN");

    setMeta("name", "twitter:card", "summary_large_image");
    setMeta("name", "twitter:title", title);
    setMeta("name", "twitter:description", description);
    setMeta("name", "twitter:image", image);
    setMeta("name", "twitter:site", "@marcellotech");

    // JSON-LD structured data
    const schemas = jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : [];
    // Remove previous dynamic JSON-LD scripts
    document.querySelectorAll('script[data-seo="true"]').forEach(s => s.remove());
    schemas.forEach(schema => {
      const script = document.createElement("script");
      script.type = "application/ld+json";
      script.setAttribute("data-seo", "true");
      script.textContent = JSON.stringify(schema);
      document.head.appendChild(script);
    });

    return () => {
      document.querySelectorAll('script[data-seo="true"]').forEach(s => s.remove());
    };
  }, [title, description, keywords, canonical, ogImage, jsonLd]);

  return null;
}

// ── Shared JSON-LD schemas ────────────────────────────────────────────

export const LOCAL_BUSINESS_SCHEMA = {
  "@context": "https://schema.org",
  "@type": ["EducationalOrganization", "LocalBusiness"],
  name: "Marcellotech",
  alternateName: "Marcello Technology",
  url: "https://www.marcellotech.com",
  logo: "https://www.marcellotech.com/logo.png",
  image: "https://www.marcellotech.com/og-image.jpg",
  description: "Engineering training institute in Trichy offering hands-on programs in IoT, AI/ML, VLSI, Cloud Computing with Scopus publication support and 94% placement rate.",
  foundingDate: "2018",
  address: {
    "@type": "PostalAddress",
    streetAddress: "No 3, GEM Plaza, Ground Floor, Sankaran Pillai Road",
    addressLocality: "Tiruchirappalli",
    addressRegion: "Tamil Nadu",
    postalCode: "620002",
    addressCountry: "IN",
  },
  geo: {
    "@type": "GeoCoordinates",
    latitude: 10.7905,
    longitude: 78.7047,
  },
  telephone: "+91-9442344796",
  email: "info@marcellotech.com",
  openingHoursSpecification: {
    "@type": "OpeningHoursSpecification",
    dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    opens: "09:00",
    closes: "18:00",
  },
  sameAs: [
    "https://www.marcellotech.com",
  ],
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: "4.9",
    reviewCount: "312",
    bestRating: "5",
  },
};

export function faqSchema(items: { q: string; a: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map(({ q, a }) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a },
    })),
  };
}

export function breadcrumbSchema(items: { name: string; url: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map(({ name, url }, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name,
      item: `https://www.marcellotech.com${url}`,
    })),
  };
}
