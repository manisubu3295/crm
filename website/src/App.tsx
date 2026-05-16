import { useState } from "react";
import { Route, Switch, useLocation } from "wouter";
import { Header } from "./components/Header.js";
import { Footer } from "./components/Footer.js";
import { EnquiryModal } from "./components/EnquiryModal.js";
import { AdCampaignPopup } from "./components/AdCampaignPopup.js";
import { SEOHead, LOCAL_BUSINESS_SCHEMA, faqSchema, breadcrumbSchema } from "./components/SEOHead.js";
import { Home } from "./pages/Home.js";
import { CoursesPage } from "./pages/CoursesPage.js";
import { CourseDetailPage } from "./pages/CourseDetailPage.js";
import { AboutPage } from "./pages/AboutPage.js";
import { ContactPage } from "./pages/ContactPage.js";
import { CertifiedPage } from "./pages/CertifiedPage.js";
import { ProjectsPage } from "./pages/ProjectsPage.js";
import { ProductsPage } from "./pages/ProductsPage.js";

const HOME_FAQ = [
  { q: "What engineering courses does Marcellotech offer in Trichy?", a: "We offer 8-week hands-on programs in IoT & Embedded Systems, AI/ML, VLSI Design, Cloud Computing, FullStack Development, Power Electronics, Android Development, and Robotics — all based at our Tiruchirappalli facility." },
  { q: "Do you provide job placement assistance?", a: "Yes — placement support is included until you land an offer. This covers resume preparation, mock interviews, LinkedIn optimisation, and direct referrals to our industry partners. Our current placement rate is 94% within 60 days of course completion." },
  { q: "Are Marcellotech certificates recognised by universities?", a: "Yes. Our training certificates are accepted by placement cells and are recognised by affiliated universities including Anna University and Madurai Kamaraj University. Faculty Development Program (FDP) certificates are AICTE professional-development credit–eligible." },
  { q: "How long are the training programs?", a: "Standard courses run 8 weeks (weekday batches). We also offer 1–3 day campus workshops, 1–2 week inplant training (IPT), and 1–6 month internships that can be customised for college batches." },
  { q: "What is the fee for engineering training at Marcellotech?", a: "Fees vary by program and duration. We offer group discounts for college batches and flexible instalment options. Call or WhatsApp us for an exact quote — free counselling is always available." },
  { q: "Where is Marcellotech located?", a: "We are at No 3, GEM Plaza, Ground Floor, Sankaran Pillai Road, Tiruchirappalli (Trichy) 620002, Tamil Nadu. Easily accessible from NIT Trichy, PSG Tech, and all major colleges in the region." },
];

function SEORouter() {
  const [loc] = useLocation();

  if (loc === "/" || loc === "") {
    return (
      <SEOHead
        title="Marcellotech | Engineering Training Institute in Trichy — IoT, AI, VLSI, Cloud"
        description="Hands-on engineering training in Tiruchirappalli. IoT, AI/ML, VLSI, Cloud Computing — real projects, Scopus publications, 94% placement in 60 days. 2,400+ students trained since 2018."
        keywords="engineering training trichy, IoT course tiruchirappalli, VLSI training Tamil Nadu, AI ML course trichy, embedded systems training, Scopus publication support, inplant training trichy"
        canonical="/"
        jsonLd={[LOCAL_BUSINESS_SCHEMA, faqSchema(HOME_FAQ)]}
      />
    );
  }
  if (loc.startsWith("/courses")) {
    return (
      <SEOHead
        title="Engineering Courses in Trichy | IoT, AI/ML, VLSI, Cloud — Marcellotech"
        description="8-week hands-on engineering courses in Tiruchirappalli. IoT, AI/ML, VLSI, Cloud, FullStack, Android & more. Real projects, Scopus publication support, placement guaranteed."
        keywords="IoT course trichy, VLSI course tiruchirappalli, AI ML training trichy, cloud computing course Tamil Nadu, embedded systems course trichy"
        canonical="/courses"
        jsonLd={[LOCAL_BUSINESS_SCHEMA, breadcrumbSchema([{ name: "Home", url: "/" }, { name: "Courses", url: "/courses" }])]}
      />
    );
  }
  if (loc === "/certified") {
    return (
      <SEOHead
        title="Certified Training Programs Trichy | Campus Workshop, IPT, Internship, FDP — Marcellotech"
        description="Industry-certified programs for students and faculty in Tiruchirappalli. On-campus workshops, inplant training (1–2 weeks), internships (up to 6 months), and AICTE-eligible FDP. 10 technical domains."
        keywords="inplant training trichy, campus workshop Tamil Nadu, FDP AICTE trichy, internship training tiruchirappalli, certified engineering training"
        canonical="/certified"
        jsonLd={[LOCAL_BUSINESS_SCHEMA, breadcrumbSchema([{ name: "Home", url: "/" }, { name: "Certified Training", url: "/certified" }])]}
      />
    );
  }
  if (loc === "/projects") {
    return (
      <SEOHead
        title="Final Year Project Guidance Trichy | 29+ Domains, Scopus Support — Marcellotech"
        description="Final-year project guidance across 29+ domains in Tiruchirappalli. IoT, VLSI, AI/ML, Robotics, Python, Deep Learning and more. Scopus/IEEE paper support included. Free proposal in 24 hours."
        keywords="final year project guidance trichy, project guidance tiruchirappalli, Scopus paper support, engineering project help Tamil Nadu, IEEE publication support"
        canonical="/projects"
        jsonLd={[LOCAL_BUSINESS_SCHEMA, breadcrumbSchema([{ name: "Home", url: "/" }, { name: "Projects", url: "/projects" }])]}
      />
    );
  }
  if (loc === "/products") {
    return (
      <SEOHead
        title="Buy Arduino, Raspberry Pi & IoT Kits in Trichy | Marcellotech Hardware Store"
        description="Arduino UNO, Mega, Nano; Raspberry Pi 4 & 3; and ready-to-use IoT project kits available in Tiruchirappalli. Engineer-tested, best price, WhatsApp ordering."
        keywords="buy arduino trichy, raspberry pi tiruchirappalli, IoT kit trichy, arduino uno trichy, NodeMCU kit Tamil Nadu, electronic components trichy"
        canonical="/products"
        jsonLd={[LOCAL_BUSINESS_SCHEMA, breadcrumbSchema([{ name: "Home", url: "/" }, { name: "Products", url: "/products" }])]}
      />
    );
  }
  if (loc === "/about") {
    return (
      <SEOHead
        title="About Marcellotech | Engineering Training Since 2018 — Tiruchirappalli"
        description="Marcellotech was founded in 2018 in Trichy to close the gap between engineering theory and industry practice. 2,400+ students trained, 850+ Scopus papers, 60+ college partners."
        keywords="about marcellotech, engineering institute trichy, marcellotech history, trichy training institute"
        canonical="/about"
        jsonLd={[LOCAL_BUSINESS_SCHEMA, breadcrumbSchema([{ name: "Home", url: "/" }, { name: "About", url: "/about" }])]}
      />
    );
  }
  if (loc === "/contact") {
    return (
      <SEOHead
        title="Contact Marcellotech | Trichy Engineering Training — Call, WhatsApp or Visit"
        description="Contact Marcellotech in Tiruchirappalli. Visit GEM Plaza, call +91 9442344796, or WhatsApp us. Mon–Sat 9 AM to 6 PM. Free counselling available."
        keywords="contact marcellotech, marcellotech address trichy, engineering training contact trichy"
        canonical="/contact"
        jsonLd={[LOCAL_BUSINESS_SCHEMA]}
      />
    );
  }
  return null;
}

export default function App() {
  const [enquiryOpen, setEnquiryOpen] = useState(false);
  const [enquiryCourse, setEnquiryCourse] = useState("");

  const openEnquiry = (course = "") => {
    setEnquiryCourse(course);
    setEnquiryOpen(true);
  };

  return (
    <>
      <SEORouter />
      <Header onEnquire={() => openEnquiry()} />
      <main style={{ paddingTop: "var(--header-h, 104px)" }}>
        <Switch>
          <Route path="/" component={() => <Home onEnquire={openEnquiry} />} />
          <Route path="/courses" component={() => <CoursesPage onEnquire={openEnquiry} />} />
          <Route path="/courses/:id" component={({ params }) => <CourseDetailPage id={params.id} onEnquire={openEnquiry} />} />
          <Route path="/certified" component={() => <CertifiedPage onEnquire={() => openEnquiry()} />} />
          <Route path="/projects" component={() => <ProjectsPage onEnquire={() => openEnquiry()} />} />
          <Route path="/products" component={() => <ProductsPage onEnquire={() => openEnquiry()} />} />
          <Route path="/about" component={() => <AboutPage onEnquire={openEnquiry} />} />
          <Route path="/contact" component={() => <ContactPage />} />
          <Route component={() => <Home onEnquire={openEnquiry} />} />
        </Switch>
      </main>
      <Footer onEnquire={() => openEnquiry()} />
      <AdCampaignPopup onEnquire={() => openEnquiry()} />
      {enquiryOpen && <EnquiryModal onClose={() => setEnquiryOpen(false)} defaultCourse={enquiryCourse} />}
    </>
  );
}
