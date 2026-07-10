/*!
 * script.js — shared site script
 * Works with any site built from the leads-non-hotel template.
 */
document.addEventListener('DOMContentLoaded', () => {

  // ── Scroll-triggered reveal ───────────────────────────────────────────────
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });

  document.querySelectorAll('.reveal, .animate-on-scroll').forEach(el => observer.observe(el));

  // ── Sticky nav shrink on scroll ───────────────────────────────────────────
  const nav = document.getElementById('nav') || document.getElementById('header');
  if (nav) {
    window.addEventListener('scroll', () => {
      nav.classList.toggle('nav--scrolled', window.scrollY > 60);
    }, { passive: true });
  }

  // ── Contact / booking form ────────────────────────────────────────────────
  const form    = document.getElementById('contactForm');
  const modal   = document.getElementById('modal') || document.getElementById('bookingModal');
  const closeBtns = document.querySelectorAll('.close-modal');

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (modal) modal.classList.add('active');
      form.reset();
    });
  }

  closeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      if (modal) modal.classList.remove('active');
    });
  });

  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.remove('active');
    });
  }

});
