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

  // ── Hero background parallax ─────────────────────────────────────────────
  const heroBg = document.querySelector('.hero-bg-parallax');
  const heroSection = document.querySelector('.hero');
  let rafPending = false;

  function updateParallax() {
    rafPending = false;
    if (!heroBg || !heroSection) return;
    const rect = heroSection.getBoundingClientRect();
    // Only animate while hero is visible
    if (rect.bottom < 0 || rect.top > window.innerHeight) return;
    const scrolled = -rect.top;           // px scrolled past hero top
    const shift = scrolled * 0.30;        // 30% speed = visible depth
    heroBg.style.transform = `translateY(${shift}px)`;
  }

  window.addEventListener('scroll', () => {
    if (nav) nav.classList.toggle('nav--scrolled', window.scrollY > 60);
    if (!rafPending) {
      rafPending = true;
      requestAnimationFrame(updateParallax);
    }
  }, { passive: true });

  updateParallax(); // run once on load

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
