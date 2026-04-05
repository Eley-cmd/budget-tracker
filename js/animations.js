/**
 * animations.js
 * - Bidirectional: animates IN on scroll down, OUT on scroll up
 * - Fixes feature cards disappearing (each card observed individually)
 * - Only loaded on index.html, about.html, contact.html — NOT dashboard
 */

'use strict';

// ─── Inject CSS ───────────────────────────────────────────────
const ANIM_CSS = `
  /* All animated elements start visible in HTML.
     JS adds [data-anim] which applies the hidden state.
     This way non-JS users always see content. */

  [data-anim]              { opacity: 0; transition: opacity 0.6s ease, transform 0.6s ease; }
  [data-anim="fade-up"]    { transform: translateY(32px); }
  [data-anim="fade-down"]  { transform: translateY(-24px); }
  [data-anim="fade-left"]  { transform: translateX(-40px); }
  [data-anim="fade-right"] { transform: translateX(40px); }
  [data-anim="scale-up"]   { transform: scale(0.93); }
  [data-anim="fade-in"]    { transform: none; }

  /* Visible state — added/removed by IntersectionObserver */
  [data-anim].in-view {
    opacity: 1 !important;
    transform: none !important;
  }

  /* Hero plays on load, staggered */
  .hero-inner .hero-badge,
  .hero-inner .hero-title,
  .hero-inner .hero-desc,
  .hero-inner .hero-cta,
  .hero-inner .hero-stats,
  .hero-image-wrap {
    opacity: 0;
    transform: translateY(22px);
    transition: opacity 0.55s ease, transform 0.55s ease;
  }
  .hero-inner .hero-badge     { transition-delay: 0.05s; }
  .hero-inner .hero-title     { transition-delay: 0.15s; }
  .hero-inner .hero-desc      { transition-delay: 0.25s; }
  .hero-inner .hero-cta       { transition-delay: 0.35s; }
  .hero-inner .hero-stats     { transition-delay: 0.45s; }
  .hero-image-wrap            { transition-delay: 0.20s; transition-duration: 0.7s; }

  .hero-float-card {
    opacity: 0;
    transition: opacity 0.5s ease, transform 6s ease-in-out infinite !important;
  }

  body.hero-ready .hero-inner .hero-badge,
  body.hero-ready .hero-inner .hero-title,
  body.hero-ready .hero-inner .hero-desc,
  body.hero-ready .hero-inner .hero-cta,
  body.hero-ready .hero-inner .hero-stats,
  body.hero-ready .hero-image-wrap {
    opacity: 1;
    transform: none;
  }
  body.hero-ready .card-income  { opacity: 1; transition-delay: 0.65s !important; }
  body.hero-ready .card-expense { opacity: 1; transition-delay: 0.80s !important; }

  @media (prefers-reduced-motion: reduce) {
    [data-anim], [data-anim].in-view,
    .hero-inner .hero-badge, .hero-inner .hero-title,
    .hero-inner .hero-desc,  .hero-inner .hero-cta,
    .hero-inner .hero-stats, .hero-image-wrap,
    .hero-float-card {
      opacity: 1 !important;
      transform: none !important;
      transition: none !important;
    }
  }
`;

function injectStyles() {
    const s = document.createElement('style');
    s.textContent = ANIM_CSS;
    document.head.appendChild(s);
}

// ─── Hero entrance on page load ───────────────────────────────
function playHero() {
    if (!document.querySelector('.hero-inner')) return;
    requestAnimationFrame(() =>
        setTimeout(() => document.body.classList.add('hero-ready'), 60)
    );
}

// ─── Mark elements with data-anim + optional delay ───────────
function mark(el, anim, delayMs) {
    el.setAttribute('data-anim', anim);
    if (delayMs) el.style.transitionDelay = delayMs + 'ms';
}

function annotate() {
    // Section headers
    document.querySelectorAll('.section-header').forEach(el => mark(el, 'fade-up'));

    // Feature cards — each card individually with stagger delay
    document.querySelectorAll('.feature-card').forEach((el, i) => {
        mark(el, 'fade-up', i * 80);
    });

    // Preview — left/right
    document.querySelectorAll('.preview-text').forEach(el => mark(el, 'fade-left'));
    document.querySelectorAll('.preview-img-wrap').forEach(el => mark(el, 'fade-right'));

    // CTA card
    document.querySelectorAll('.cta-card').forEach(el => mark(el, 'scale-up'));

    // Footer
    document.querySelectorAll('.footer-brand').forEach(el => mark(el, 'fade-up'));
    document.querySelectorAll('.footer-col').forEach((el, i) => mark(el, 'fade-up', i * 60));

    // About page headings / paragraphs (direct children of container)
    document.querySelectorAll('section > .container > *').forEach((el, i) => {
        if (!el.hasAttribute('data-anim')) mark(el, 'fade-up', i * 70);
    });

    // Contact form children
    document.querySelectorAll('.contact-form > *').forEach((el, i) => {
        mark(el, 'fade-up', i * 70);
    });
}

// ─── Single IntersectionObserver (bidirectional) ──────────────
function observe() {
    const io = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            const el = entry.target;
            if (entry.isIntersecting) {
                el.classList.add('in-view');
            } else {
                // Remove in-view so re-scrolling up resets the animation
                el.classList.remove('in-view');
            }
        });
    }, {
        threshold: 0.10,
        rootMargin: '0px 0px -32px 0px'
    });

    document.querySelectorAll('[data-anim]').forEach(el => io.observe(el));
}

// ─── Init ─────────────────────────────────────────────────────
function initAnimations() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    injectStyles();
    annotate();     // mark elements AFTER injecting CSS
    observe();      // start watching
    playHero();     // hero plays immediately on load
}

document.addEventListener('DOMContentLoaded', initAnimations);
