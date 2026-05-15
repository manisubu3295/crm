/* ═══════════════════════════════════════════════════════════════════
   AADHIRAI INNOVATIONS — layout.js
   Path-aware shared header/footer injection for all pages.
   Works as a plain script (no module) — load before main.js / site.js.
   ═══════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ── Path resolution ───────────────────────────────────────────── */
  const inPages = /\/pages\//.test(window.location.pathname) ||
                  /[/\\]pages[/\\]/.test(window.location.href);
  const r = inPages ? '../' : '';      // back to root from pages/
  const p = inPages ? ''   : 'pages/'; // forward into pages/ from root

  const HOME  = r + 'index.html';
  const APPLY = r + 'index.html#lead-form';

  /* Resolve a page link: works from both root and pages/ */
  function pg(name) { return p + name + '.html'; }

  const currentPage = document.body.dataset.page || '';

  /* ── Micro SVG icon map ────────────────────────────────────────── */
  var IC = {
    chip:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="8" width="16" height="8" rx="1"/><line x1="8" y1="8" x2="8" y2="4"/><line x1="12" y1="8" x2="12" y2="4"/><line x1="16" y1="8" x2="16" y2="4"/><line x1="8" y1="16" x2="8" y2="20"/><line x1="12" y1="16" x2="12" y2="20"/><line x1="16" y1="16" x2="16" y2="20"/></svg>',
    orbit:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><line x1="1.05" y1="12" x2="7" y2="12"/><line x1="17.01" y1="12" x2="22.96" y2="12"/><line x1="12" y1="1.05" x2="12" y2="7"/><line x1="12" y1="17.01" x2="12" y2="22.96"/></svg>',
    display:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>',
    bolt:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>',
    document: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
    users:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>',
    pulse:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>',
    code:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>',
    shield:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
    book:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>',
    calendar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
    search:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>'
  };

  /* ── Dropdown groups ───────────────────────────────────────────── */
  var DROPDOWNS = [
    {
      label: 'Training',
      items: [
        { href: pg('training'), title: 'Embedded Systems &amp; IoT',      sub: 'Arduino, ESP32, MQTT, cloud dashboards', icon: 'chip'     },
        { href: pg('training'), title: 'AI / Machine Learning',           sub: 'Python, TensorFlow, NLP, placement track', icon: 'orbit'  },
        { href: pg('training'), title: 'VLSI &amp; FPGA Design',          sub: 'Verilog, VHDL, Xilinx Vivado',            icon: 'display' },
        { href: pg('training'), title: 'Power Systems &amp; MATLAB',      sub: 'Simulink, renewable energy, EEE',          icon: 'bolt'    },
        { href: pg('training'), title: 'Research Publication (Scopus)',   sub: 'Draft to acceptance in 18 days avg',       icon: 'document'},
        { href: pg('training'), title: 'FDP &amp; Faculty Programs',      sub: 'NAAC alignment, on-campus delivery',       icon: 'users'   }
      ]
    },
    {
      label: 'Projects',
      items: [
        { href: pg('projects'), title: 'IoT &amp; Embedded Projects', sub: 'Smart sensors, LoRa, cloud integration', icon: 'chip'  },
        { href: pg('projects'), title: 'AI / ML Projects',            sub: 'CNN, NLP, OCR, deep learning',           icon: 'orbit' },
        { href: pg('projects'), title: 'ECE / RF &amp; Antenna',      sub: '5G arrays, signal processing, VLSI',     icon: 'pulse' },
        { href: pg('projects'), title: 'EEE / Power Electronics',     sub: 'MPPT, inverters, renewable energy',      icon: 'bolt'  },
        { href: pg('projects'), title: 'CSE / Software Projects',     sub: 'Blockchain, web apps, data science',     icon: 'code'  }
      ]
    },
    {
      label: 'Research',
      items: [
        { href: pg('research'), title: 'Scopus &amp; WoS Publications', sub: '850+ accepted, avg 18 days',                   icon: 'document' },
        { href: pg('research'), title: 'Patent Writing &amp; Filing',   sub: 'India patent applications, IP strategy',        icon: 'shield'   },
        { href: pg('research'), title: 'Book Chapter Publishing',        sub: 'Springer, Elsevier, Taylor &amp; Francis',      icon: 'book'     },
        { href: pg('research'), title: 'Conference Paper Support',       sub: 'IEEE, Springer, Scopus conferences',            icon: 'calendar' },
        { href: pg('research'), title: 'UGC Care &amp; SCI Journals',   sub: 'Journal selection &amp; peer-review guidance',  icon: 'search'   }
      ]
    },
    {
      label: 'Hardware Kits',
      items: [
        { href: pg('kits'), title: 'Arduino Kits &amp; Accessories', sub: 'Uno, Mega, Nano — full component sets',        emoji: '🤖' },
        { href: pg('kits'), title: 'Raspberry Pi Kits',              sub: 'Pi 4, Pi Zero W, camera &amp; sensor bundles', emoji: '🍓' },
        { href: pg('kits'), title: 'ESP32 / NodeMCU Kits',          sub: 'Wi-Fi, BLE, LoRa, MQTT ready',                 emoji: '📡' },
        { href: pg('kits'), title: 'FPGA Development Boards',        sub: 'Xilinx, Altera — Verilog/VHDL ready',          emoji: '🔲' },
        { href: pg('kits'), title: 'Sensor &amp; Component Packs',  sub: 'Temperature, motion, pressure, displays',       emoji: '🔌' }
      ]
    }
  ];

  /* ── Top-level nav links ───────────────────────────────────────── */
  var NAV_LINKS = [
    { key: 'home',       href: HOME,           label: 'Home'       },
    { key: 'about',      href: pg('about'),     label: 'About Us'   },
    { key: 'services',   href: pg('services'),  label: 'Services'   },
    { key: 'industries', href: pg('industries'),label: 'Industries' }
  ];

  /* ── Render helpers ────────────────────────────────────────────── */
  function ddIcon(item) {
    if (item.emoji) {
      return '<div class="nav-dd-icon nav-dd-emoji">' + item.emoji + '</div>';
    }
    return '<div class="nav-dd-icon">' + (IC[item.icon] || IC.document) + '</div>';
  }

  function renderDropdowns() {
    return DROPDOWNS.map(function (group) {
      var items = group.items.map(function (item) {
        return (
          '<a href="' + item.href + '" class="nav-dd-item" role="menuitem">' +
            ddIcon(item) +
            '<div>' +
              '<div class="nav-dd-title">' + item.title + '</div>' +
              '<div class="nav-dd-sub">' + item.sub + '</div>' +
            '</div>' +
          '</a>'
        );
      }).join('');

      return (
        '<div class="nav-item has-dropdown">' +
          '<button class="nav-link nav-parent" aria-haspopup="true" aria-expanded="false">' +
            group.label +
            '<svg class="nav-arrow" viewBox="0 0 10 6" aria-hidden="true" width="10" height="6"><path d="M1 1l4 4 4-4" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
          '</button>' +
          '<div class="nav-dropdown" role="menu">' + items + '</div>' +
        '</div>'
      );
    }).join('');
  }

  function renderNavLinks() {
    var topLinks = NAV_LINKS.map(function (item) {
      var cur = item.key === currentPage ? ' aria-current="page"' : '';
      return '<a class="nav-link" href="' + item.href + '"' + cur + '>' + item.label + '</a>';
    }).join('');
    return (
      topLinks +
      renderDropdowns() +
      '<a class="nav-link" href="' + pg('internship') + '">Internship</a>' +
      '<a class="nav-link" href="' + pg('contact') + '">Contact Us</a>'
    );
  }

  function renderMobileLinks() {
    var topLinks = NAV_LINKS.map(function (item) {
      return '<a href="' + item.href + '" class="nav-link">' + item.label + '</a>';
    }).join('');

    var groups = DROPDOWNS.map(function (group) {
      var subs = group.items.map(function (item) {
        return '<a href="' + item.href + '" class="nav-link mm-sub">' + item.title + '</a>';
      }).join('');
      return '<div class="mm-group"><div class="mm-group-title">' + group.label + '</div>' + subs + '</div>';
    }).join('');

    return (
      topLinks +
      '<a href="' + pg('internship') + '" class="nav-link">Internship</a>' +
      groups +
      '<a href="' + pg('contact') + '" class="nav-link">Contact Us</a>' +
      '<a href="' + APPLY + '" class="btn btn-primary" style="margin-top:1.5rem">Apply Now</a>'
    );
  }

  function renderHeader() {
    return (
      '<nav id="navbar" aria-label="Main navigation">' +
        '<a href="' + HOME + '" class="nav-logo" aria-label="Aadhirai Innovations">' +
          '<div class="nav-logo-mark" aria-hidden="true">AI</div>' +
          'Aadhirai' +
        '</a>' +
        '<div class="nav-links">' + renderNavLinks() + '</div>' +
        '<div class="nav-right">' +
          '<button class="btn btn-ghost" data-crm-login>Login</button>' +
          '<a href="' + APPLY + '" class="btn btn-primary">Apply Now</a>' +
          '<button class="hamburger" id="hamburger" aria-expanded="false" aria-controls="mobile-menu" aria-label="Toggle menu">' +
            '<span></span><span></span><span></span>' +
          '</button>' +
        '</div>' +
      '</nav>' +
      '<div id="mobile-menu" role="dialog" aria-modal="true" aria-label="Navigation menu">' +
        renderMobileLinks() +
      '</div>'
    );
  }

  function renderFooter() {
    return (
      '<footer id="footer">' +
        '<div class="container">' +
          '<div class="footer-grid">' +
            '<div class="footer-brand">' +
              '<div class="nav-logo" style="margin-bottom:0.75rem">' +
                '<div class="nav-logo-mark" aria-hidden="true">AI</div>' +
                'Aadhirai' +
              '</div>' +
              '<p class="footer-desc">Engineering training, research publications, hardware kits and career placement for Tamil Nadu\'s students — from Trichy, since 2016.</p>' +
              '<div class="footer-social" style="margin-top:1.25rem">' +
                '<a href="#" class="soc" aria-label="YouTube"><svg viewBox="0 0 24 24"><path d="M22.54 6.42a2.78 2.78 0 00-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46A2.78 2.78 0 001.46 6.42 29 29 0 001 12a29 29 0 00.46 5.58A2.78 2.78 0 003.41 19.6C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 001.95-1.95A29 29 0 0023 12a29 29 0 00-.46-5.58z"/><polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02"/></svg></a>' +
                '<a href="#" class="soc" aria-label="LinkedIn"><svg viewBox="0 0 24 24"><path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z"/><circle cx="4" cy="4" r="2"/></svg></a>' +
                '<a href="#" class="soc" aria-label="Instagram"><svg viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="20" rx="5"/><path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg></a>' +
              '</div>' +
            '</div>' +
            '<div>' +
              '<div class="footer-col-h">Training</div>' +
              '<div class="footer-col-links">' +
                '<a href="' + pg('training') + '">Embedded Systems &amp; IoT</a>' +
                '<a href="' + pg('training') + '">AI / Machine Learning</a>' +
                '<a href="' + pg('training') + '">VLSI &amp; FPGA Design</a>' +
                '<a href="' + pg('training') + '">Power Systems &amp; MATLAB</a>' +
                '<a href="' + pg('training') + '">Research Publication</a>' +
                '<a href="' + pg('training') + '">FDP &amp; Faculty Programs</a>' +
              '</div>' +
            '</div>' +
            '<div>' +
              '<div class="footer-col-h">Services</div>' +
              '<div class="footer-col-links">' +
                '<a href="' + pg('projects')   + '">Final Year Projects</a>' +
                '<a href="' + pg('research')   + '">Scopus Publication</a>' +
                '<a href="' + pg('research')   + '">Patent Filing</a>' +
                '<a href="' + pg('research')   + '">Book Chapters</a>' +
                '<a href="' + pg('internship') + '">IPT Internship</a>' +
                '<a href="' + pg('kits')       + '">Hardware Kits</a>' +
              '</div>' +
            '</div>' +
            '<div>' +
              '<div class="footer-col-h">Company</div>' +
              '<div class="footer-col-links">' +
                '<a href="' + pg('about')   + '">About Us</a>' +
                '<a href="' + HOME + '#journey">Our Process</a>' +
                '<a href="' + HOME + '#testimonial">Student Stories</a>' +
                '<a href="' + pg('contact') + '">Contact Us</a>' +
                '<a href="tel:+919442344796">+91 94423 44796</a>' +
                '<a href="mailto:info@aadhiraiinnovations.com">Email Us</a>' +
              '</div>' +
            '</div>' +
          '</div>' +
          '<div class="footer-bottom">' +
            '<span>&copy; 2026 Aadhirai Innovations. All rights reserved.</span>' +
            '<span>Made in Trichy, for Tamil Nadu\'s engineers</span>' +
          '</div>' +
        '</div>' +
      '</footer>'
    );
  }

  /* ── Inject into page ──────────────────────────────────────────── */
  var headerSlot = document.querySelector('[data-site-header]');
  var footerSlot = document.querySelector('[data-site-footer]');

  if (headerSlot) headerSlot.outerHTML = renderHeader();
  if (footerSlot) footerSlot.outerHTML = renderFooter();

  /* ── Set mm-delay on mobile menu links ─────────────────────────── */
  var mobileMenu = document.getElementById('mobile-menu');
  if (mobileMenu) {
    mobileMenu.querySelectorAll('a').forEach(function (a, idx) {
      a.style.setProperty('--mm-delay', (40 + Math.min(idx, 30) * 30) + 'ms');
    });
  }

})();
