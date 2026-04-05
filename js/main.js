/**
 * main.js
 * Shared UI behaviors: navbar scroll effect, mobile menu toggle.
 */

'use strict';

document.addEventListener('DOMContentLoaded', () => {

    // ─── Navbar scroll shadow ────────────────────────────────
    const navbar = document.getElementById('navbar');
    if (navbar) {
        const onScroll = () => navbar.classList.toggle('scrolled', window.scrollY > 10);
        window.addEventListener('scroll', onScroll, { passive: true });
        onScroll();
    }

    // ─── Mobile menu toggle ───────────────────────────────────
    const toggle = document.getElementById('nav-toggle');
    const mobileMenu = document.getElementById('mobile-menu');

    if (toggle && mobileMenu) {
        toggle.addEventListener('click', () => {
            mobileMenu.classList.toggle('open');
        });

        // Close on outside click
        document.addEventListener('click', e => {
            if (!toggle.contains(e.target) && !mobileMenu.contains(e.target)) {
                mobileMenu.classList.remove('open');
            }
        });
    }

    // ─── Smooth scroll for anchor links ──────────────────────
    document.querySelectorAll('a[href^="#"]').forEach(link => {
        link.addEventListener('click', e => {
            const target = document.querySelector(link.getAttribute('href'));
            if (target) {
                e.preventDefault();
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });

    // ─── Lazy-load image fallback labels ─────────────────────
    // Show the img-fallback-label when an image fails to load
    document.querySelectorAll('.hero-img-frame img, .preview-img-frame img').forEach(img => {
        img.addEventListener('error', () => {
            img.parentElement?.classList.add('img-broken');
            const label = img.parentElement?.querySelector('.img-fallback-label');
            if (label) label.style.display = 'flex';
            img.style.display = 'none';
        });
    });

});