/* ═══════════════════════════════════════════════════════════════════
   MARCELLOTECH — site.js
   Shared interactivity: nav events, scroll reveal, magnetic buttons.
   Runs AFTER layout.js (which injects the nav HTML).
   ═══════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ── CRM login ─────────────────────────────────────────────────── */
  var CRM_URL   = window.location.port === '8080' ? 'http://localhost:5173' : '';
  var CRM_LOGIN = CRM_URL + '/login';

  document.querySelectorAll('[data-crm-login]').forEach(function (el) {
    el.addEventListener('click', function () {
      window.location.href = CRM_LOGIN;
    });
  });

  /* ── Navbar scroll shrink ──────────────────────────────────────── */
  var navbar = document.getElementById('navbar');
  if (navbar) {
    window.addEventListener('scroll', function () {
      navbar.classList.toggle('scrolled', window.scrollY > 24);
    }, { passive: true });
  }

  /* ── Hamburger / mobile menu ───────────────────────────────────── */
  var hamburger  = document.getElementById('hamburger');
  var mobileMenu = document.getElementById('mobile-menu');

  if (hamburger) {
    hamburger.addEventListener('click', function () {
      var open = hamburger.classList.toggle('open');
      if (mobileMenu) mobileMenu.classList.toggle('open', open);
      hamburger.setAttribute('aria-expanded', String(open));
      document.body.style.overflow = open ? 'hidden' : '';
    });
  }

  if (mobileMenu) {
    mobileMenu.querySelectorAll('a, button').forEach(function (el) {
      el.addEventListener('click', function () {
        if (hamburger) hamburger.classList.remove('open');
        mobileMenu.classList.remove('open');
        if (hamburger) hamburger.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      });
    });
  }

  /* ── Dropdown menus ────────────────────────────────────────────── */
  document.querySelectorAll('.nav-item.has-dropdown').forEach(function (item) {
    var btn      = item.querySelector('.nav-parent');
    var dropdown = item.querySelector('.nav-dropdown');

    if (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var open = item.classList.toggle('open');
        btn.setAttribute('aria-expanded', String(open));

        document.querySelectorAll('.nav-item.has-dropdown').forEach(function (other) {
          if (other === item) return;
          other.classList.remove('open');
          var ob = other.querySelector('.nav-parent');
          if (ob) ob.setAttribute('aria-expanded', 'false');
        });
      });
    }

    if (dropdown) {
      dropdown.addEventListener('click', function (e) {
        e.stopPropagation();
      });
    }
  });

  document.addEventListener('click', function () {
    document.querySelectorAll('.nav-item.has-dropdown.open').forEach(function (item) {
      item.classList.remove('open');
      var btn = item.querySelector('.nav-parent');
      if (btn) btn.setAttribute('aria-expanded', 'false');
    });
  });

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    document.querySelectorAll('.nav-item.has-dropdown.open').forEach(function (item) {
      item.classList.remove('open');
      var btn = item.querySelector('.nav-parent');
      if (btn) btn.setAttribute('aria-expanded', 'false');
    });
  });

  /* ── Scroll reveal ─────────────────────────────────────────────── */
  var revealIO = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('in');
      revealIO.unobserve(entry.target);
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

  document.querySelectorAll('.reveal').forEach(function (el) {
    revealIO.observe(el);
  });

  /* ── Magnetic buttons ──────────────────────────────────────────── */
  document.querySelectorAll('.btn').forEach(function (btn) {
    btn.addEventListener('mousemove', function (e) {
      var rect = btn.getBoundingClientRect();
      var x = e.clientX - rect.left - rect.width  / 2;
      var y = e.clientY - rect.top  - rect.height / 2;
      var tx = Math.max(Math.min(x * 0.08, 6), -6);
      var ty = Math.max(Math.min(y * 0.12, 5), -5);
      btn.style.transform = 'translate(' + tx + 'px, ' + ty + 'px)';
      btn.classList.add('is-magnetic');
    });

    btn.addEventListener('mouseleave', function () {
      btn.style.transform = 'translate(0, 0)';
      btn.classList.remove('is-magnetic');
    });
  });

})();
