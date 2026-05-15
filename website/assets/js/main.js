/* ═══════════════════════════════════════════════════════════════════
   AADHIRAI INNOVATIONS — main.js
   Apex Design System
   ═══════════════════════════════════════════════════════════════════ */

const CRM_URL   = window.location.port === '8080' ? 'http://localhost:5173' : '';
const CRM_LOGIN = CRM_URL + '/login';

/* ── Scroll reveal ────────────────────────────────────────────── */
const revealObs = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('in');
      revealObs.unobserve(e.target);
    }
  });
}, { threshold: 0.1, rootMargin: '0px 0px -48px 0px' });

document.querySelectorAll('.reveal, .reveal-up, .reveal-left, .reveal-right').forEach(el =>
  revealObs.observe(el)
);

/* ── Stagger orchestration ────────────────────────────────────── */
document.querySelectorAll('[data-stagger]').forEach(scope => {
  const items = scope.querySelectorAll('.reveal, .reveal-up, .reveal-left, .reveal-right');
  items.forEach((item, idx) => {
    item.style.setProperty('--reveal-delay', `${Math.min(idx, 8) * 80}ms`);
  });
});

[
  '.hero-stats',
  '.why-grid',
  '.courses-grid',
  '.projects-grid',
  '.research-grid',
  '.intern-grid',
  '.kits-grid',
  '.testi-mini-grid',
].forEach(sel => {
  document.querySelectorAll(sel).forEach(scope => {
    const items = scope.querySelectorAll('.reveal, .reveal-up, .reveal-left, .reveal-right, .hero-stat, .intern-track, .proj-card, .kit-card, .testi-mini');
    items.forEach((item, idx) => {
      if (!item.style.getPropertyValue('--reveal-delay')) {
        item.style.setProperty('--reveal-delay', `${Math.min(idx, 9) * 70}ms`);
      }
    });
  });
});

/* ── Animated counters ────────────────────────────────────────── */
function animCount(el, target, suffix, duration = 1800) {
  const t0 = performance.now();
  const fmt = n => n.toLocaleString('en-IN') + suffix;
  function tick(now) {
    const p = Math.min((now - t0) / duration, 1);
    const e = 1 - Math.pow(1 - p, 3);
    el.textContent = fmt(Math.floor(e * target));
    if (p < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

const countObs = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (!e.isIntersecting) return;
    const el = e.target;
    animCount(el, +el.dataset.target, el.dataset.suffix || '');
    countObs.unobserve(el);
  });
}, { threshold: 0.5 });

document.querySelectorAll('[data-counter]').forEach(el => countObs.observe(el));

/* ── Hero 3D tilt card ────────────────────────────────────────── */
const tiltWrap = document.getElementById('hero-card-3d');
const tiltCard = document.getElementById('hero-card-inner');

if (tiltWrap && tiltCard && window.matchMedia('(pointer: fine)').matches) {
  tiltWrap.addEventListener('mousemove', e => {
    const rect = tiltWrap.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width  - 0.5;
    const y = (e.clientY - rect.top)  / rect.height - 0.5;
    tiltCard.style.transform =
      `perspective(800px) rotateY(${x * 14}deg) rotateX(${-y * 10}deg) translateZ(8px)`;
  });
  tiltWrap.addEventListener('mouseleave', () => {
    tiltCard.style.transform = '';
  });
}

/* ── Hero layered parallax ────────────────────────────────────── */
const hero = document.getElementById('hero');
const heroVideo = document.querySelector('.hero-video');
const heroEyebrow = document.querySelector('.hero-eyebrow');
const heroHeadline = document.querySelector('.hero-h1');
const heroFoot = document.querySelector('.hero-foot');
const heroStats = document.querySelector('.hero-stats');
const heroProofItems = Array.from(document.querySelectorAll('.hero-proof-item'));
const heroStatCards = Array.from(document.querySelectorAll('.hero-stat'));
const caseSection = document.getElementById('case-outcomes');
const caseCards = Array.from(document.querySelectorAll('.case-card'));
const whySection = document.getElementById('why');
const pillars = Array.from(document.querySelectorAll('.pillar'));
const coursesSection = document.getElementById('courses');
const courseCards = Array.from(document.querySelectorAll('.course-card'));
const projectsSection = document.getElementById('projects');
const filterChips = Array.from(document.querySelectorAll('.chip'));
const projectCards = Array.from(document.querySelectorAll('.proj-card'));
const researchSection = document.getElementById('research');
const researchCards = Array.from(document.querySelectorAll('.research-card'));
const internshipSection = document.getElementById('internship');
const internTracks = Array.from(document.querySelectorAll('.intern-track'));
const kitsSection = document.getElementById('kits');
const kitCards = Array.from(document.querySelectorAll('.kit-card'));
const journeySection = document.getElementById('journey');
const journeySteps = Array.from(document.querySelectorAll('.j-step'));
const testimonialSection = document.getElementById('testimonial');
const testimonialMain = document.querySelector('.testi-big');
const testimonialMiniCards = Array.from(document.querySelectorAll('.testi-mini'));
const alumniSection = document.getElementById('alumni');
const alumniPills = Array.from(document.querySelectorAll('.alumni-pill'));
const leadFormSection = document.getElementById('lead-form');
const leadIntro = document.querySelector('.form-intro');
const leadCard = document.querySelector('.form-card');
const contactSection = document.getElementById('contact');
const contactVisual = document.querySelector('.contact-vis');
const contactRows = Array.from(document.querySelectorAll('.contact-row'));
const ctaBandSection = document.getElementById('cta-band');
const ctaTitle = document.querySelector('.cta-title');
const ctaButtons = Array.from(document.querySelectorAll('#cta-band .btn'));
const prefersReducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

let prefersReducedMotion = prefersReducedMotionQuery.matches;
let motionDepthScale = 1;
let pointerTiltScale = 1;
let enablePointerFX = false;

function recalcMotionProfile() {
  prefersReducedMotion = prefersReducedMotionQuery.matches;

  const isTablet = window.innerWidth <= 1120;
  const isPhone = window.innerWidth <= 820;
  const saveData = Boolean(navigator.connection && navigator.connection.saveData);
  const lowCoreCount = typeof navigator.hardwareConcurrency === 'number' && navigator.hardwareConcurrency > 0 && navigator.hardwareConcurrency <= 4;
  const lowMemory = typeof navigator.deviceMemory === 'number' && navigator.deviceMemory > 0 && navigator.deviceMemory <= 4;
  const lowPowerDevice = saveData || lowCoreCount || lowMemory;

  if (prefersReducedMotion) {
    motionDepthScale = 0;
    pointerTiltScale = 0;
    enablePointerFX = false;
  } else if (lowPowerDevice || isPhone) {
    motionDepthScale = 0.5;
    pointerTiltScale = 0.42;
    enablePointerFX = false;
  } else if (isTablet) {
    motionDepthScale = 0.72;
    pointerTiltScale = 0.7;
    enablePointerFX = window.matchMedia('(pointer: fine)').matches;
  } else {
    motionDepthScale = 1;
    pointerTiltScale = 1;
    enablePointerFX = window.matchMedia('(pointer: fine)').matches;
  }

  document.body.classList.toggle('motion-lite', motionDepthScale > 0 && motionDepthScale < 1);
  document.body.classList.toggle('motion-off', motionDepthScale === 0);
}

const scaledPx = value => `${(value * motionDepthScale).toFixed(2)}px`;
const scaledDeg = value => `${(value * pointerTiltScale).toFixed(2)}deg`;

recalcMotionProfile();

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

let motionFrame = null;

function updatePremiumSectionMotion() {
  motionFrame = null;

  if (hero) {
    const rect = hero.getBoundingClientRect();
    const progress = clamp((window.innerHeight - rect.top) / (rect.height + window.innerHeight * 0.2), 0, 1);
    hero.style.setProperty('--hero-scroll-progress', progress.toFixed(3));

    if (!prefersReducedMotion) {
      const headlineLift = -18 * progress;
      const eyebrowLift = -8 * progress;
      const footLift = -10 * progress;
      const statsLift = -16 * progress;

      if (heroEyebrow) {
        heroEyebrow.style.transform = `translate3d(0, ${eyebrowLift}px, 0)`;
        heroEyebrow.style.opacity = `${0.68 + progress * 0.32}`;
      }
      if (heroHeadline) {
        heroHeadline.style.transform = `translate3d(0, ${headlineLift}px, 0) scale(${1.018 - progress * 0.018})`;
      }
      if (heroFoot) {
        heroFoot.style.transform = `translate3d(0, ${footLift}px, 0)`;
        heroFoot.style.opacity = `${0.7 + progress * 0.3}`;
      }
      if (heroStats) {
        heroStats.style.transform = `translate3d(0, ${statsLift}px, 0)`;
        heroStats.style.opacity = `${0.65 + progress * 0.35}`;
      }

      heroStatCards.forEach((card, index) => {
        const cardLift = (1 - progress) * (18 + index * 5);
        card.style.setProperty('--hero-stat-lift', scaledPx(cardLift));
      });

      if (heroVideo) {
        heroVideo.play().catch(() => {});
      }
    }
  }

  if (caseSection && !prefersReducedMotion) {
    const rect = caseSection.getBoundingClientRect();
    const progress = clamp((window.innerHeight - rect.top) / (window.innerHeight + rect.height * 0.45), 0, 1);

    caseCards.forEach((card, index) => {
      const depth = (1 - progress) * (26 + index * 12);
      card.style.setProperty('--case-lift', scaledPx(depth));
    });
  }

  if (whySection && !prefersReducedMotion) {
    const rect = whySection.getBoundingClientRect();
    const progress = clamp((window.innerHeight - rect.top) / (window.innerHeight + rect.height * 0.25), 0, 1);
    pillars.forEach((card, index) => {
      const depth = (1 - progress) * (34 + index * 10);
      card.style.setProperty('--pillar-lift', scaledPx(depth));
    });
  }

  if (coursesSection && !prefersReducedMotion) {
    const rect = coursesSection.getBoundingClientRect();
    const progress = clamp((window.innerHeight - rect.top) / (window.innerHeight + rect.height * 0.28), 0, 1);
    courseCards.forEach((card, index) => {
      const depth = (1 - progress) * (38 + index * 8);
      card.style.setProperty('--course-lift', scaledPx(depth));
    });
  }

  if (projectsSection && !prefersReducedMotion) {
    const rect = projectsSection.getBoundingClientRect();
    const progress = clamp((window.innerHeight - rect.top) / (window.innerHeight + rect.height * 0.32), 0, 1);
    filterChips.forEach((chip, index) => {
      const shift = (1 - progress) * (10 + index * 1.5);
      chip.style.setProperty('--chip-shift', scaledPx(shift));
    });
    projectCards.forEach((card, index) => {
      const depth = (1 - progress) * (42 + index * 5);
      card.style.setProperty('--proj-lift', scaledPx(depth));
    });
  }

  if (researchSection && !prefersReducedMotion) {
    const rect = researchSection.getBoundingClientRect();
    const progress = clamp((window.innerHeight - rect.top) / (window.innerHeight + rect.height * 0.3), 0, 1);
    researchCards.forEach((card, index) => {
      const depth = (1 - progress) * (34 + index * 12);
      card.style.setProperty('--research-lift', scaledPx(depth));
    });
  }

  if (internshipSection && !prefersReducedMotion) {
    const rect = internshipSection.getBoundingClientRect();
    const progress = clamp((window.innerHeight - rect.top) / (window.innerHeight + rect.height * 0.28), 0, 1);
    internTracks.forEach((card, index) => {
      const depth = (1 - progress) * (26 + index * 4.5);
      card.style.setProperty('--intern-lift', scaledPx(depth));
    });
  }

  if (kitsSection && !prefersReducedMotion) {
    const rect = kitsSection.getBoundingClientRect();
    const progress = clamp((window.innerHeight - rect.top) / (window.innerHeight + rect.height * 0.3), 0, 1);
    kitCards.forEach((card, index) => {
      const depth = (1 - progress) * (36 + index * 10);
      card.style.setProperty('--kit-lift', scaledPx(depth));
    });
  }

  if (journeySection && !prefersReducedMotion) {
    const rect = journeySection.getBoundingClientRect();
    const progress = clamp((window.innerHeight - rect.top) / (window.innerHeight + rect.height * 0.24), 0, 1);
    journeySteps.forEach((stepEl, index) => {
      const depth = (1 - progress) * (18 + index * 4.2);
      stepEl.style.setProperty('--journey-lift', scaledPx(depth));
    });
  }

  if (testimonialSection && !prefersReducedMotion) {
    const rect = testimonialSection.getBoundingClientRect();
    const progress = clamp((window.innerHeight - rect.top) / (window.innerHeight + rect.height * 0.3), 0, 1);

    if (testimonialMain) {
      const depth = (1 - progress) * 22;
      testimonialMain.style.setProperty('--testi-big-lift', scaledPx(depth));
    }

    testimonialMiniCards.forEach((card, index) => {
      const depth = (1 - progress) * (18 + index * 5.5);
      card.style.setProperty('--testi-mini-lift', scaledPx(depth));
    });
  }

  if (alumniSection && !prefersReducedMotion) {
    const rect = alumniSection.getBoundingClientRect();
    const progress = clamp((window.innerHeight - rect.top) / (window.innerHeight + rect.height * 0.2), 0, 1);
    alumniPills.forEach((pill, index) => {
      const depth = (1 - progress) * (14 + (index % 6) * 1.8);
      pill.style.setProperty('--alumni-lift', scaledPx(depth));
    });
  }

  if (leadFormSection && !prefersReducedMotion) {
    const rect = leadFormSection.getBoundingClientRect();
    const progress = clamp((window.innerHeight - rect.top) / (window.innerHeight + rect.height * 0.3), 0, 1);

    if (leadIntro) {
      const introDepth = (1 - progress) * 20;
      leadIntro.style.setProperty('--lead-intro-lift', scaledPx(introDepth));
    }

    if (leadCard) {
      const cardDepth = (1 - progress) * 24;
      leadCard.style.setProperty('--lead-card-lift', scaledPx(cardDepth));
    }
  }

  if (contactSection && !prefersReducedMotion) {
    const rect = contactSection.getBoundingClientRect();
    const progress = clamp((window.innerHeight - rect.top) / (window.innerHeight + rect.height * 0.26), 0, 1);

    if (contactVisual) {
      const visualDepth = (1 - progress) * 20;
      contactVisual.style.setProperty('--contact-vis-lift', scaledPx(visualDepth));
    }

    contactRows.forEach((row, index) => {
      const depth = (1 - progress) * (16 + index * 3.4);
      row.style.setProperty('--contact-row-lift', scaledPx(depth));
    });
  }

  if (ctaBandSection && !prefersReducedMotion) {
    const rect = ctaBandSection.getBoundingClientRect();
    const progress = clamp((window.innerHeight - rect.top) / (window.innerHeight + rect.height * 0.15), 0, 1);

    if (ctaTitle) {
      const titleDepth = (1 - progress) * 22;
      ctaTitle.style.setProperty('--cta-title-lift', scaledPx(titleDepth));
    }

    ctaButtons.forEach((button, index) => {
      const depth = (1 - progress) * (14 + index * 4);
      button.style.setProperty('--cta-btn-lift', scaledPx(depth));
    });
  }
}

function schedulePremiumSectionMotion() {
  if (motionFrame !== null) return;
  motionFrame = requestAnimationFrame(updatePremiumSectionMotion);
}

schedulePremiumSectionMotion();
window.addEventListener('scroll', schedulePremiumSectionMotion, { passive: true });
window.addEventListener('resize', () => {
  recalcMotionProfile();
  schedulePremiumSectionMotion();
});

prefersReducedMotionQuery.addEventListener('change', () => {
  recalcMotionProfile();
  schedulePremiumSectionMotion();
});

if (hero && enablePointerFX) {
  hero.addEventListener('mousemove', e => {
    const rect = hero.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 14;
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * 10;
    hero.style.setProperty('--hero-shift-x', `${x}px`);
    hero.style.setProperty('--hero-shift-y', `${y}px`);

    heroProofItems.forEach((item, index) => {
      item.style.transform = `translate3d(${(x * (index + 1) * 0.1).toFixed(2)}px, ${(y * (index + 1) * 0.08).toFixed(2)}px, 0)`;
    });
  });

  hero.addEventListener('mouseleave', () => {
    hero.style.setProperty('--hero-shift-x', '0px');
    hero.style.setProperty('--hero-shift-y', '0px');
    heroProofItems.forEach(item => {
      item.style.transform = '';
    });
  });
}

/* ── Magnetic CTA interaction ─────────────────────────────────── */
if (enablePointerFX) {
  document.querySelectorAll('.hero-ctas .btn, #case-outcomes .btn').forEach(btn => {
    btn.addEventListener('mousemove', e => {
      const rect = btn.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width - 0.5) * 10;
      const y = ((e.clientY - rect.top) / rect.height - 0.5) * 8;
      btn.style.transform = `translate(${x}px, ${y}px)`;
    });

    btn.addEventListener('mouseleave', () => {
      btn.style.transform = '';
    });
  });

  caseCards.forEach(card => {
    card.addEventListener('mousemove', e => {
      const rect = card.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      card.style.setProperty('--case-tilt-x', scaledDeg(-y * 8));
      card.style.setProperty('--case-tilt-y', scaledDeg(x * 10));
      card.style.setProperty('--case-glow-x', `${((x + 0.5) * 100).toFixed(1)}%`);
      card.style.setProperty('--case-glow-y', `${((y + 0.5) * 100).toFixed(1)}%`);
    });

    card.addEventListener('mouseleave', () => {
      card.style.setProperty('--case-tilt-x', '0deg');
      card.style.setProperty('--case-tilt-y', '0deg');
      card.style.setProperty('--case-glow-x', '50%');
      card.style.setProperty('--case-glow-y', '50%');
    });
  });

  pillars.forEach(card => {
    card.addEventListener('mousemove', e => {
      const rect = card.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      card.style.setProperty('--pillar-tilt-x', scaledDeg(-y * 7));
      card.style.setProperty('--pillar-tilt-y', scaledDeg(x * 9));
      card.style.setProperty('--pillar-glow-x', `${((x + 0.5) * 100).toFixed(1)}%`);
      card.style.setProperty('--pillar-glow-y', `${((y + 0.5) * 100).toFixed(1)}%`);
    });

    card.addEventListener('mouseleave', () => {
      card.style.setProperty('--pillar-tilt-x', '0deg');
      card.style.setProperty('--pillar-tilt-y', '0deg');
      card.style.setProperty('--pillar-glow-x', '50%');
      card.style.setProperty('--pillar-glow-y', '50%');
    });
  });

  courseCards.forEach(card => {
    card.addEventListener('mousemove', e => {
      const rect = card.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      card.style.setProperty('--course-tilt-x', scaledDeg(-y * 6));
      card.style.setProperty('--course-tilt-y', scaledDeg(x * 8));
      card.style.setProperty('--course-glow-x', `${((x + 0.5) * 100).toFixed(1)}%`);
      card.style.setProperty('--course-glow-y', `${((y + 0.5) * 100).toFixed(1)}%`);
    });

    card.addEventListener('mouseleave', () => {
      card.style.setProperty('--course-tilt-x', '0deg');
      card.style.setProperty('--course-tilt-y', '0deg');
      card.style.setProperty('--course-glow-x', '50%');
      card.style.setProperty('--course-glow-y', '50%');
    });
  });

  projectCards.forEach(card => {
    card.addEventListener('mousemove', e => {
      const rect = card.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      card.style.setProperty('--proj-tilt-x', scaledDeg(-y * 7.5));
      card.style.setProperty('--proj-tilt-y', scaledDeg(x * 9.5));
      card.style.setProperty('--proj-glow-x', `${((x + 0.5) * 100).toFixed(1)}%`);
      card.style.setProperty('--proj-glow-y', `${((y + 0.5) * 100).toFixed(1)}%`);
      card.style.setProperty('--proj-thumb-shift-x', `${(x * 18).toFixed(2)}px`);
      card.style.setProperty('--proj-thumb-shift-y', `${(y * 14).toFixed(2)}px`);
      card.style.setProperty('--proj-thumb-scale', '1.04');
    });

    card.addEventListener('mouseleave', () => {
      card.style.setProperty('--proj-tilt-x', '0deg');
      card.style.setProperty('--proj-tilt-y', '0deg');
      card.style.setProperty('--proj-glow-x', '50%');
      card.style.setProperty('--proj-glow-y', '50%');
      card.style.setProperty('--proj-thumb-shift-x', '0px');
      card.style.setProperty('--proj-thumb-shift-y', '0px');
      card.style.setProperty('--proj-thumb-scale', '1');
    });
  });

  researchCards.forEach(card => {
    card.addEventListener('mousemove', e => {
      const rect = card.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      card.style.setProperty('--research-tilt-x', scaledDeg(-y * 6.5));
      card.style.setProperty('--research-tilt-y', scaledDeg(x * 8.5));
      card.style.setProperty('--research-glow-x', `${((x + 0.5) * 100).toFixed(1)}%`);
      card.style.setProperty('--research-glow-y', `${((y + 0.5) * 100).toFixed(1)}%`);
    });

    card.addEventListener('mouseleave', () => {
      card.style.setProperty('--research-tilt-x', '0deg');
      card.style.setProperty('--research-tilt-y', '0deg');
      card.style.setProperty('--research-glow-x', '50%');
      card.style.setProperty('--research-glow-y', '50%');
    });
  });

  internTracks.forEach(card => {
    card.addEventListener('mousemove', e => {
      const rect = card.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      card.style.setProperty('--intern-tilt-x', scaledDeg(-y * 5.5));
      card.style.setProperty('--intern-tilt-y', scaledDeg(x * 7));
      card.style.setProperty('--intern-glow-x', `${((x + 0.5) * 100).toFixed(1)}%`);
      card.style.setProperty('--intern-glow-y', `${((y + 0.5) * 100).toFixed(1)}%`);
    });

    card.addEventListener('mouseleave', () => {
      card.style.setProperty('--intern-tilt-x', '0deg');
      card.style.setProperty('--intern-tilt-y', '0deg');
      card.style.setProperty('--intern-glow-x', '50%');
      card.style.setProperty('--intern-glow-y', '50%');
    });
  });

  kitCards.forEach(card => {
    card.addEventListener('mousemove', e => {
      const rect = card.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      card.style.setProperty('--kit-tilt-x', scaledDeg(-y * 6.5));
      card.style.setProperty('--kit-tilt-y', scaledDeg(x * 8.5));
      card.style.setProperty('--kit-glow-x', `${((x + 0.5) * 100).toFixed(1)}%`);
      card.style.setProperty('--kit-glow-y', `${((y + 0.5) * 100).toFixed(1)}%`);
    });

    card.addEventListener('mouseleave', () => {
      card.style.setProperty('--kit-tilt-x', '0deg');
      card.style.setProperty('--kit-tilt-y', '0deg');
      card.style.setProperty('--kit-glow-x', '50%');
      card.style.setProperty('--kit-glow-y', '50%');
    });
  });

  journeySteps.forEach(stepEl => {
    stepEl.addEventListener('mousemove', e => {
      const rect = stepEl.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      stepEl.style.setProperty('--journey-tilt-x', scaledDeg(-y * 4.8));
      stepEl.style.setProperty('--journey-tilt-y', scaledDeg(x * 6.2));
      stepEl.style.setProperty('--journey-glow-x', `${((x + 0.5) * 100).toFixed(1)}%`);
      stepEl.style.setProperty('--journey-glow-y', `${((y + 0.5) * 100).toFixed(1)}%`);
    });

    stepEl.addEventListener('mouseleave', () => {
      stepEl.style.setProperty('--journey-tilt-x', '0deg');
      stepEl.style.setProperty('--journey-tilt-y', '0deg');
      stepEl.style.setProperty('--journey-glow-x', '50%');
      stepEl.style.setProperty('--journey-glow-y', '50%');
    });
  });

  testimonialMiniCards.forEach(card => {
    card.addEventListener('mousemove', e => {
      const rect = card.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      card.style.setProperty('--testi-mini-tilt-x', scaledDeg(-y * 5.5));
      card.style.setProperty('--testi-mini-tilt-y', scaledDeg(x * 7.2));
      card.style.setProperty('--testi-mini-glow-x', `${((x + 0.5) * 100).toFixed(1)}%`);
      card.style.setProperty('--testi-mini-glow-y', `${((y + 0.5) * 100).toFixed(1)}%`);
    });

    card.addEventListener('mouseleave', () => {
      card.style.setProperty('--testi-mini-tilt-x', '0deg');
      card.style.setProperty('--testi-mini-tilt-y', '0deg');
      card.style.setProperty('--testi-mini-glow-x', '50%');
      card.style.setProperty('--testi-mini-glow-y', '50%');
    });
  });

  contactRows.forEach(row => {
    row.addEventListener('mousemove', e => {
      const rect = row.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      row.style.setProperty('--contact-row-tilt-x', scaledDeg(-y * 4.6));
      row.style.setProperty('--contact-row-tilt-y', scaledDeg(x * 6));
      row.style.setProperty('--contact-row-glow-x', `${((x + 0.5) * 100).toFixed(1)}%`);
      row.style.setProperty('--contact-row-glow-y', `${((y + 0.5) * 100).toFixed(1)}%`);
    });

    row.addEventListener('mouseleave', () => {
      row.style.setProperty('--contact-row-tilt-x', '0deg');
      row.style.setProperty('--contact-row-tilt-y', '0deg');
      row.style.setProperty('--contact-row-glow-x', '50%');
      row.style.setProperty('--contact-row-glow-y', '50%');
    });
  });
}

document.addEventListener('visibilitychange', () => {
  if (!heroVideo) return;
  if (document.hidden) {
    heroVideo.pause();
    return;
  }

  if (!prefersReducedMotion) {
    heroVideo.play().catch(() => {});
  }
});

/* ── Learning journey step reveal ────────────────────────────── */
const journeyObs = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('in');
      journeyObs.unobserve(e.target);
    }
  });
}, { threshold: 0.2, rootMargin: '0px 0px -60px 0px' });

document.querySelectorAll('.j-step').forEach((step, i) => {
  step.style.transitionDelay = `${i * 0.1}s`;
  journeyObs.observe(step);
});

/* ── Project filter ───────────────────────────────────────────── */
const chips     = document.querySelectorAll('.chip');
const projCards = document.querySelectorAll('.proj-card');

chips.forEach(chip => {
  chip.addEventListener('click', () => {
    chips.forEach(c => { c.classList.remove('active'); c.removeAttribute('aria-pressed'); });
    chip.classList.add('active');
    chip.setAttribute('aria-pressed', 'true');

    const f = chip.dataset.filter;
    projCards.forEach(card => {
      const show = f === 'all' || card.dataset.category === f;
      card.classList.toggle('hidden', !show);
      if (show) {
        card.style.animation = 'none';
        void card.offsetHeight;
        card.style.animation = 'cardIn 0.3s ease forwards';
      }
    });
  });
});

/* ── Interest chip toggles ────────────────────────────────────── */
document.querySelectorAll('.interest-lbl').forEach(lbl => {
  const cb = lbl.querySelector('input[type=checkbox]');
  if (!cb) return;
  cb.addEventListener('change', () => lbl.classList.toggle('on', cb.checked));
});

/* ── Multi-step form ──────────────────────────────────────────── */
let step = 0;
const data = {};
const steps = document.querySelectorAll('.form-step');
const bars  = [
  document.getElementById('fpb-0'),
  document.getElementById('fpb-1'),
  document.getElementById('fpb-2'),
];
const lbl = document.getElementById('step-label');

function goTo(n) {
  steps.forEach((s, i) => s.classList.toggle('active', i === n));
  bars.forEach((b, i) => { if (b) b.classList.toggle('on', i <= n); });
  if (lbl) lbl.textContent = `Step ${n + 1} of 3`;
  step = n;
}

function collect(n) {
  const s = steps[n];
  if (!s) return;
  s.querySelectorAll('input, select').forEach(inp => {
    if (inp.type === 'checkbox') {
      if (inp.checked) {
        if (!data[inp.name]) data[inp.name] = [];
        if (!data[inp.name].includes(inp.value)) data[inp.name].push(inp.value);
      }
    } else if (inp.value.trim()) {
      data[inp.name] = inp.value.trim();
    }
  });
}

function validate(n) {
  const s = steps[n];
  if (!s) return true;
  let ok = true;
  s.querySelectorAll('input[required], select[required]').forEach(inp => {
    inp.classList.remove('error');
    if (!inp.value.trim()) { inp.classList.add('error'); ok = false; }
  });
  if (!ok) s.querySelector('.error')?.focus();
  return ok;
}

document.getElementById('btn-n0')?.addEventListener('click', () => {
  collect(0); if (validate(0)) goTo(1);
});
document.getElementById('btn-n1')?.addEventListener('click', () => {
  collect(1); goTo(2);
});
document.getElementById('btn-b1')?.addEventListener('click', () => goTo(0));
document.getElementById('btn-b2')?.addEventListener('click', () => goTo(1));

document.getElementById('btn-submit')?.addEventListener('click', async () => {
  collect(2);
  if (!validate(2)) return;

  const btn = document.getElementById('btn-submit');
  if (btn) { btn.disabled = true; btn.textContent = 'Sending…'; }

  try {
    await fetch(`${CRM_URL}/api/webhooks/website-form`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: data.name, phone: data.phone, email: data.email,
        designation: data.designation, organization: data.organization,
        interests: data.interest || [], mode: data.mode,
        source: 'website-form', timestamp: new Date().toISOString(),
      }),
    });
  } catch (err) {
    console.warn('CRM unreachable:', err.message);
  }

  const card = document.querySelector('#lead-form-box .form-card');
  const succ = document.getElementById('form-success');
  if (card) card.style.display = 'none';
  if (succ) { succ.classList.add('show'); succ.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
});

/* ── Dropdown nav ─────────────────────────────────────────────── */
document.querySelectorAll('.nav-item.has-dropdown').forEach(item => {
  const btn = item.querySelector('.nav-parent');
  const dd  = item.querySelector('.nav-dropdown');

  btn?.addEventListener('click', e => {
    e.stopPropagation();
    const open = item.classList.toggle('open');
    btn.setAttribute('aria-expanded', String(open));
    document.querySelectorAll('.nav-item.has-dropdown').forEach(other => {
      if (other !== item) {
        other.classList.remove('open');
        other.querySelector('.nav-parent')?.setAttribute('aria-expanded', 'false');
      }
    });
  });

  dd?.addEventListener('click', e => e.stopPropagation());
});

document.addEventListener('click', () => {
  document.querySelectorAll('.nav-item.has-dropdown.open').forEach(item => {
    item.classList.remove('open');
    item.querySelector('.nav-parent')?.setAttribute('aria-expanded', 'false');
  });
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.nav-item.has-dropdown.open').forEach(item => {
      item.classList.remove('open');
      item.querySelector('.nav-parent')?.setAttribute('aria-expanded', 'false');
    });
  }
});

/* ── Projects nav-filter links ────────────────────────────────── */
document.querySelectorAll('[data-filter-nav]').forEach(link => {
  link.addEventListener('click', () => {
    const cat = link.dataset.filterNav;
    const target = document.getElementById('projects');
    if (!target) return;
    const matchChip = target.querySelector(`.chip[data-filter="${cat}"]`);
    if (matchChip) matchChip.click();
  });
});

/* ── Smooth anchor scroll ─────────────────────────────────────── */
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const target = document.querySelector(a.getAttribute('href'));
    if (!target) return;
    e.preventDefault();
    window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - 70, behavior: 'smooth' });
  });
});

/* ── Active nav section ───────────────────────────────────────── */
const navLinks = document.querySelectorAll('.nav-link[href^="#"]');
const secObs = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      navLinks.forEach(l => l.classList.remove('active'));
      document.querySelector(`.nav-link[href="#${e.target.id}"]`)?.classList.add('active');
    }
  });
}, { threshold: 0.35 });
document.querySelectorAll('section[id]').forEach(s => secObs.observe(s));

/* ── Inject card animation keyframe ──────────────────────────── */
const s = document.createElement('style');
s.textContent = `
  @keyframes cardIn {
    from { opacity:0; transform:translateY(10px); }
    to   { opacity:1; transform:translateY(0); }
  }
  .form-input.error { border-color: #E53935 !important; }
`;
document.head.appendChild(s);

/* ── Scroll progress bar ─────────────────────────────────────────── */
const progressBar = document.createElement('div');
progressBar.id = 'scroll-progress';
document.body.prepend(progressBar);

function updateScrollProgress() {
  const scrolled = window.scrollY;
  const total = document.documentElement.scrollHeight - window.innerHeight;
  if (total <= 0) return;
  progressBar.style.width = `${Math.min((scrolled / total) * 100, 100).toFixed(2)}%`;
}
window.addEventListener('scroll', updateScrollProgress, { passive: true });
updateScrollProgress();

/* ── Hero entrance — clip-path reveal ───────────────────────────── */
(function heroEntrance() {
  if (prefersReducedMotion) {
    document.documentElement.classList.add('hero-entered');
    return;
  }
  requestAnimationFrame(() => {
    document.documentElement.classList.add('hero-entered');
    setTimeout(() => {
      [heroEyebrow, heroHeadline, heroFoot, heroStats].forEach(el => {
        if (!el) return;
        el.addEventListener('transitionend', function clean() {
          el.style.clipPath = '';
          el.removeEventListener('transitionend', clean);
        }, { once: true });
      });
    }, 1800);
  });
})();

/* ── About service card — scroll lift ───────────────────────────── */
const aboutSectionEl  = document.getElementById('about');
const ascCards        = Array.from(document.querySelectorAll('.about-service-card'));

ascCards.forEach((card, i) => {
  card.style.setProperty('--asc-lift', `${14 + i * 6}px`);
});

function updateAscLift() {
  if (!aboutSectionEl || prefersReducedMotion) return;
  const rect     = aboutSectionEl.getBoundingClientRect();
  const progress = clamp((window.innerHeight - rect.top) / (window.innerHeight + rect.height * 0.28), 0, 1);
  ascCards.forEach((card, i) => {
    const depth = (1 - progress) * (14 + i * 6);
    card.style.setProperty('--asc-lift', scaledPx(depth));
  });
}

/* updateAscLift runs inside the existing rAF loop — just call it there via
   the shared scroll listener; use a separate flag to avoid double-scheduling */
let ascFrame = null;
window.addEventListener('scroll', () => {
  if (ascFrame !== null) return;
  ascFrame = requestAnimationFrame(() => { ascFrame = null; updateAscLift(); });
}, { passive: true });

updateAscLift();

/* ── About service card — pointer tilt + glow ───────────────────── */
if (enablePointerFX) {
  ascCards.forEach(card => {
    card.addEventListener('mousemove', e => {
      const rect = card.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width  - 0.5;
      const y = (e.clientY - rect.top)  / rect.height - 0.5;
      card.style.setProperty('--asc-tilt-x', scaledDeg(-y * 5.5));
      card.style.setProperty('--asc-tilt-y', scaledDeg(x * 7.2));
      card.style.setProperty('--asc-glow-x', `${((x + 0.5) * 100).toFixed(1)}%`);
      card.style.setProperty('--asc-glow-y', `${((y + 0.5) * 100).toFixed(1)}%`);
    });
    card.addEventListener('mouseleave', () => {
      card.style.setProperty('--asc-tilt-x', '0deg');
      card.style.setProperty('--asc-tilt-y', '0deg');
      card.style.setProperty('--asc-glow-x', '50%');
      card.style.setProperty('--asc-glow-y', '50%');
    });
  });
}

/* ── Magnetic primary CTAs in hero ──────────────────────────────── */
if (enablePointerFX) {
  document.querySelectorAll('#hero .btn-primary, #cta-band .btn-primary').forEach(btn => {
    btn.addEventListener('mousemove', e => {
      const rect = btn.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width  - 0.5) * 11;
      const y = ((e.clientY - rect.top)  / rect.height - 0.5) * 8;
      btn.style.transform = `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px)`;
    });
    btn.addEventListener('mouseleave', () => { btn.style.transform = ''; });
    btn.addEventListener('click', () => {
      btn.style.transform = 'scale(0.96)';
      setTimeout(() => { btn.style.transform = ''; }, 140);
    });
  });
}

/* ── Counter pop — add .in class for CSS statPop animation ──────── */
(function wireCounterPop() {
  const popObs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('in');
        popObs.unobserve(e.target);
      }
    });
  }, { threshold: 0.5 });
  document.querySelectorAll('[data-counter]').forEach(el => popObs.observe(el));
})();

/* ── Stagger about bullets ───────────────────────────────────────── */
(function staggerAboutBullets() {
  const bullets = document.querySelectorAll('.about-bullet');
  const bObs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        const items = e.target.querySelectorAll('.about-bullet');
        items.forEach((item, i) => {
          item.style.transitionDelay = `${i * 60}ms`;
          item.classList.add('in');
        });
        bObs.unobserve(e.target);
      }
    });
  }, { threshold: 0.15 });
  const bList = document.querySelector('.about-bullets');
  if (bList) bObs.observe(bList);

  bullets.forEach(b => {
    b.style.opacity = '0';
    b.style.transform = 'translateX(-12px)';
    b.style.transition = 'opacity 0.55s ease, transform 0.55s cubic-bezier(0.22,1,0.36,1)';
    b.classList.add('_bullet-pending');
  });

  const bulletObs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const list = e.target.parentElement;
      if (!list) return;
      const items = Array.from(list.querySelectorAll('._bullet-pending'));
      items.forEach((item, i) => {
        setTimeout(() => {
          item.style.opacity = '1';
          item.style.transform = 'translateX(0)';
          item.classList.remove('_bullet-pending');
        }, i * 65);
      });
      bulletObs.unobserve(e.target);
    });
  }, { threshold: 0.15 });
  bullets.forEach(b => bulletObs.observe(b));
})();

/* ── Stagger intern tracks (beyond the base reveal) ─────────────── */
(function staggerInternGrid() {
  const grid = document.querySelector('.intern-grid');
  if (!grid) return;
  const obs = new IntersectionObserver(entries => {
    if (!entries[0].isIntersecting) return;
    Array.from(grid.querySelectorAll('.intern-track')).forEach((el, i) => {
      el.style.transitionDelay = `${i * 28}ms`;
    });
    obs.unobserve(grid);
  }, { threshold: 0.05 });
  obs.observe(grid);
})();

/* ── WhatsApp float pulse ────────────────────────────────────────── */
(function waFloatPulse() {
  const wa = document.querySelector('.float-wa');
  if (!wa || prefersReducedMotion) return;
  const ring = document.createElement('span');
  ring.style.cssText = `
    position:absolute;inset:-6px;border-radius:50%;
    border:2px solid rgba(37,211,102,0.42);
    animation:waPulse 2.8s ease infinite;pointer-events:none;
  `;
  const kf = document.createElement('style');
  kf.textContent = `
    @keyframes waPulse {
      0%   { transform:scale(1);   opacity:0.7; }
      70%  { transform:scale(1.28);opacity:0;   }
      100% { transform:scale(1.28);opacity:0;   }
    }
  `;
  document.head.appendChild(kf);
  wa.style.position = 'relative';
  wa.appendChild(ring);
})();

/* ── Hero floating particles ────────────────────────────────────── */
(function spawnParticles() {
  const heroEl = document.getElementById('hero');
  if (!heroEl || prefersReducedMotion) return;

  const container = document.createElement('div');
  container.className = 'hero-particles';
  heroEl.insertBefore(container, heroEl.firstChild);

  const colors = [
    'rgba(0,113,227,0.65)',
    'rgba(0,102,204,0.55)',
    'rgba(52,170,255,0.45)',
    'rgba(100,200,255,0.40)',
    'rgba(0,113,227,0.35)',
  ];

  for (let i = 0; i < 28; i++) {
    const p = document.createElement('div');
    p.className = 'hero-ptcl';
    const size = 1 + Math.random() * 2.5;
    const drift = (Math.random() - 0.5) * 80;
    p.style.cssText = `
      width:${size}px;height:${size}px;
      left:${(Math.random() * 100).toFixed(1)}%;
      background:${colors[Math.floor(Math.random() * colors.length)]};
      --ptcl-drift:${drift.toFixed(1)}px;
      animation-duration:${14 + Math.random() * 24}s;
      animation-delay:${(Math.random() * 20).toFixed(1)}s;
      filter:blur(${Math.random() > 0.6 ? '0.8px' : '0px'});
    `;
    container.appendChild(p);
  }
})();

/* ── Cursor spotlight on hero ───────────────────────────────────── */
(function heroSpotlight() {
  const heroEl = document.getElementById('hero');
  if (!heroEl) return;

  const spot = document.createElement('div');
  spot.id = 'hero-spotlight';
  heroEl.insertBefore(spot, heroEl.firstChild);

  let rafId = null;
  let tx = 50, ty = 50;

  heroEl.addEventListener('mousemove', e => {
    const r = heroEl.getBoundingClientRect();
    tx = ((e.clientX - r.left) / r.width  * 100).toFixed(1);
    ty = ((e.clientY - r.top)  / r.height * 100).toFixed(1);
    spot.style.setProperty('--sx', tx + '%');
    spot.style.setProperty('--sy', ty + '%');
    spot.style.opacity = '1';
  });

  heroEl.addEventListener('mouseleave', () => {
    spot.style.opacity = '0';
  });
})();

/* ── Section label accent line trigger ─────────────────────────── */
(function labelReveal() {
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('in');
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0.6 });
  document.querySelectorAll('.t-label-accent').forEach(el => obs.observe(el));
})();

/* ── Card entrance shimmer flash ────────────────────────────────── */
(function cardShimmer() {
  if (prefersReducedMotion) return;
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const card = e.target;
      card.style.setProperty('--shimmer-play', 'running');
      obs.unobserve(card);
    });
  }, { threshold: 0.25 });

  document.querySelectorAll('.case-card, .pillar, .course-card, .research-card, .kit-card').forEach(c => obs.observe(c));
})();

/* ── Section background micro-parallax orbs ─────────────────────── */
(function sectionOrbParallax() {
  if (prefersReducedMotion || !enablePointerFX) return;

  const darkSections = document.querySelectorAll('#why, #testimonial, #lead-form, #cta-band');
  darkSections.forEach(section => {
    document.addEventListener('mousemove', e => {
      const rect = section.getBoundingClientRect();
      if (rect.top > window.innerHeight || rect.bottom < 0) return;
      const cx = (e.clientX / window.innerWidth  - 0.5) * 12;
      const cy = (e.clientY / window.innerHeight - 0.5) * 8;
      section.style.setProperty('--orb-x', `${cx.toFixed(2)}px`);
      section.style.setProperty('--orb-y', `${cy.toFixed(2)}px`);
    }, { passive: true });
  });
})();

/* ── Hero stat hover — quick number jitter ──────────────────────── */
(function statHoverJitter() {
  if (prefersReducedMotion) return;
  document.querySelectorAll('.hero-stat').forEach(stat => {
    const num = stat.querySelector('[data-counter]');
    if (!num) return;
    let jitterFrame = null;
    stat.addEventListener('mouseenter', () => {
      const base = parseInt(num.dataset.target, 10);
      const suffix = num.dataset.suffix || '';
      let ticks = 0;
      const jitter = () => {
        if (ticks++ > 10) { num.textContent = base.toLocaleString('en-IN') + suffix; return; }
        const delta = Math.floor((Math.random() - 0.5) * 8);
        num.textContent = (base + delta).toLocaleString('en-IN') + suffix;
        jitterFrame = requestAnimationFrame(jitter);
      };
      jitterFrame = requestAnimationFrame(jitter);
    });
    stat.addEventListener('mouseleave', () => {
      if (jitterFrame) cancelAnimationFrame(jitterFrame);
      const base = parseInt(num.dataset.target, 10);
      num.textContent = base.toLocaleString('en-IN') + (num.dataset.suffix || '');
    });
  });
})();

/* ── Ticker pause / glow on hover ───────────────────────────────── */
(function tickerHover() {
  const wrap = document.querySelector('.ticker-wrap');
  const track = document.querySelector('.ticker-track');
  if (!wrap || !track) return;

  wrap.addEventListener('mouseenter', () => {
    track.style.animationPlayState = 'paused';
    wrap.style.boxShadow = '0 0 24px rgba(0,113,227,0.12), 0 2px 16px rgba(0,113,227,0.06)';
  });
  wrap.addEventListener('mouseleave', () => {
    track.style.animationPlayState = '';
    wrap.style.boxShadow = '';
  });
})();

/* ── Scroll progress bar glow ───────────────────────────────────── */
(function progressGlow() {
  const bar = document.getElementById('scroll-progress');
  if (!bar) return;
  bar.style.filter = 'drop-shadow(0 0 4px rgba(0,113,227,0.55))';
})();

console.log('%cAadhirai Innovations', 'font-size:16px;font-weight:700;color:#0071e3;font-style:italic');
console.log('%cBuilt in Trichy. Trusted across Tamil Nadu.', 'color:#5A5A65');
