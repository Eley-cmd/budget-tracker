/**
 * auth.js
 * - Caches auth state in localStorage → zero flash on page load
 * - Signed-in nav: only avatar + sign out (no Home/About/Contact links)
 * - After any sign-in: redirect to dashboard
 * - After sign-out: redirect to index
 * - Dashboard gate: blocks unauthenticated users
 */

/**
 * auth.js - FINAL OPTIMIZED
 * COMBINED FEATURES: Profile Image Recovery, Auth Gate Fix, and Click Protection
 */

'use strict';

const CACHE_KEY = 'ledger_user_cache';

// ─── AUTH CACHE ───────────────────────────────────────────────
function saveUserCache(user) {
    if (user) {
        localStorage.setItem(CACHE_KEY, JSON.stringify({
            uid: user.uid,
            displayName: user.displayName || '',
            email: user.email || '',
            photoURL: user.photoURL || ''
        }));
    } else {
        localStorage.removeItem(CACHE_KEY);
    }
}

function loadUserCache() {
    try { return JSON.parse(localStorage.getItem(CACHE_KEY) || 'null'); }
    catch { return null; }
}

function isDashboardPage() {
    const p = window.location.pathname;
    return p.endsWith('dashboard.html') || p.endsWith('/dashboard');
}

// ─── UI HELPERS ───────────────────────────────────────────────
function openModal(id) { document.getElementById(id)?.classList.add('open'); }
function closeModal(id) { document.getElementById(id)?.classList.remove('open'); }

function showToast(message, type = '') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.className = 'toast show' + (type ? ' toast-' + type : '');
    clearTimeout(toast._tid);
    toast._tid = setTimeout(() => { toast.className = 'toast'; }, 3500);
}

function escHtml(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function escAttr(s) { return String(s).replace(/"/g, '&quot;'); }

function showAuthGate() {
    const gate = document.getElementById('auth-gate');
    const content = document.getElementById('dash-content');
    if (gate) gate.style.display = 'flex';
    if (content) content.style.display = 'none';
}

function hideAuthGate() {
    const gate = document.getElementById('auth-gate');
    const content = document.getElementById('dash-content');
    if (gate) gate.style.display = 'none';
    if (content) content.style.display = 'block';
}

// ─── CLICK PROTECTION (FORCE BINDING) ────────────────────────
function bindAuthEvents() {
    // These IDs cover both the Navbar buttons and the Dashboard "Auth Gate" button
    const authButtons = [
        'btn-login', 'btn-signup',
        'mobile-login', 'mobile-signup',
        'gate-google-btn', 'cta-google-btn'
    ];

    authButtons.forEach(id => {
        const btn = document.getElementById(id);
        if (btn) {
            // Overwrite any broken listeners from main.js/dashboard.js
            btn.onclick = (e) => {
                e.preventDefault();
                openModal('auth-modal');
            };
        }
    });

    // Modal specific buttons
    document.getElementById('modal-close')?.addEventListener('click', () => closeModal('auth-modal'));
    const googleBtn = document.getElementById('google-signin-btn');
    if (googleBtn) googleBtn.onclick = signInWithGoogle;
}

// ─── NAV RENDER (RESTORED IMAGE LOGIC) ───────────────────────
function renderNavAuth(user) {
    const navAuth = document.getElementById('nav-auth');
    const navLinks = document.querySelector('.nav-links');
    const mobileMenu = document.getElementById('mobile-menu');
    const mobileAuth = document.getElementById('mobile-auth-section');

    if (user) {
        const photoHtml = user.photoURL
            ? `<img src="${escAttr(user.photoURL)}" class="nav-avatar" referrerpolicy="no-referrer" />`
            : `<div class="nav-avatar-placeholder">${escHtml((user.displayName || 'U')[0].toUpperCase())}</div>`;

        const nameHtml = `<span class="nav-user-name">${escHtml(user.displayName || user.email || 'User')}</span>`;
        const signoutBtn = `<button class="btn-signout" id="nav-signout-btn">Sign out</button>`;

        // Desktop
        if (navLinks) navLinks.style.display = 'none';
        if (navAuth) {
            navAuth.innerHTML = `<div class="nav-user">${photoHtml} ${nameHtml} ${signoutBtn}</div>`;
            document.getElementById('nav-signout-btn')?.addEventListener('click', signOut);
        }

        // Mobile
        if (mobileMenu) {
            mobileMenu.querySelectorAll('.mobile-link, .mobile-divider').forEach(el => el.style.display = 'none');
        }
        if (mobileAuth) {
            mobileAuth.innerHTML = `
                <div class="mobile-user-info">${photoHtml} <span class="mobile-user-name">${escHtml(user.displayName || user.email || 'User')}</span></div>
                <button class="btn-signout w-full" id="mobile-signout-btn">Sign out</button>`;
            document.getElementById('mobile-signout-btn')?.addEventListener('click', signOut);
        }

        const sub = document.getElementById('dash-subtitle');
        if (sub) sub.textContent = `Welcome back, ${(user.displayName || '').split(' ')[0] || 'there'}.`;

    } else {
        // Just reset navigation to default state
        if (navLinks) navLinks.style.display = '';
        bindAuthEvents(); // Re-bind clicks for sign-in buttons
    }
}

// ─── GOOGLE SIGN IN ───────────────────────────────────────────
async function signInWithGoogle() {
    const auth = window.ledgerAuth;
    if (!auth) return;
    try {
        const provider = new firebase.auth.GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        const result = await auth.signInWithPopup(provider);

        saveUserCache(result.user);
        window.ledgerCurrentUser = result.user;

        closeModal('auth-modal');
        showToast('Success! Welcome back.', 'success');

        if (typeof window.resetFirestoreFailure === 'function') window.resetFirestoreFailure();

        setTimeout(() => { window.location.href = 'dashboard.html'; }, 600);
    } catch (err) {
        console.error('[Auth]', err);
        if (err.code === 'auth/popup-blocked') {
            showToast('Popup blocked — please allow popups.', 'error');
        }
    }
}

// ─── SIGN OUT ─────────────────────────────────────────────────

async function signOut() {
    const auth = window.ledgerAuth;
    if (!auth) return;

    try {
        // Clear transactions
        if (typeof window.renderAll === 'function') {
            window.allTransactions = [];
            window.renderAll();
        }

        // --- ADD THIS LINE ---
        // Clears the budget progress bars immediately
        if (typeof window.renderLimits === 'function') {
            window.renderLimits([]);
        }
        // ---------------------

        await auth.signOut();
        saveUserCache(null);
        window.ledgerCurrentUser = null;

        // Reset the currentLimits variable in the other script
        if (window.reloadLimits) {
            // This forces the script to re-check storage (which will now be empty/guest)
            window.reloadLimits();
        }

        showToast('Signed out.');
        setTimeout(() => { window.location.href = 'index.html'; }, 500);
    } catch (err) {
        console.error('[Auth] Sign-out error:', err);
    }
}

// Double code

async function signOut() {
    const auth = window.ledgerAuth;
    if (!auth) return;
    try {
        if (typeof window.renderAll === 'function') {
            if (window.allTransactions) window.allTransactions = [];
            window.renderAll();
        }

        await auth.signOut();
        saveUserCache(null);
        window.ledgerCurrentUser = null;
        showToast('Signed out.');
        setTimeout(() => { window.location.href = 'index.html'; }, 500);
    } catch (err) {
        console.error('[Auth] Sign-out error:', err);
    }
}

function safeLoadTransactions(tries = 0) {
    if (typeof window.loadTransactions === 'function') {
        window.loadTransactions();
    } else if (tries < 30) {
        setTimeout(() => safeLoadTransactions(tries + 1), 100);
    }
}

// ─── INIT ─────────────────────────────────────────────────────
function initAuth() {
    // 1. Setup listeners
    bindAuthEvents();

    // 2. Load from Cache (Immediate UI update)
    const cached = loadUserCache();
    if (cached) {
        window.ledgerCurrentUser = cached;
        renderNavAuth(cached);
        if (isDashboardPage()) hideAuthGate();
    }

    // 3. Firebase State Listener
    const auth = window.ledgerAuth;
    if (!auth) return;

    auth.onAuthStateChanged(user => {
        saveUserCache(user || null);
        window.ledgerCurrentUser = user || null;

        if (user || !isDashboardPage()) {
            renderNavAuth(user || null);
        }

        if (isDashboardPage()) {
            if (user) {
                hideAuthGate();
                safeLoadTransactions();
            } else if (!cached) {
                showAuthGate();
            }
        }
    });
}

document.addEventListener('DOMContentLoaded', initAuth);

// Expose globals
window.showToast = showToast;
window.openModal = openModal;
window.closeModal = closeModal;