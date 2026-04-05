/**
 * budget-limits.js
 * Daily budget limit per expense category.
 * - Set a ₱ limit for each category per day
 * - Shows progress bars: green → orange → red
 * - Notifies via toast + browser notification when limit is hit
 * - Saves to Firestore (signed in) or localStorage (guest)
 */

'use strict';

const LIMITS_LS_KEY = 'ledger_budget_limits';

//const EXPENSE_CATEGORIES = [
//  'Housing', 'Food', 'Transport', 'Utilities', 'Healthcare',
// 'Entertainment', 'Shopping', 'Education', 'Subscriptions',
//  'Insurance', 'Travel', 'Other'
//];

let currentLimits = {}; // { CategoryName: amountNumber }

// ─── Storage ──────────────────────────────────────────────────
// Function to get a unique key for the current user
function getLimitKey() {
    const uid = window.ledgerCurrentUser ? window.ledgerCurrentUser.uid : 'guest';
    return `ledger_limits_${uid}`;
}

async function loadLimits() {
    // 1. Try Firestore first (High Priority)
    if (window.ledgerDb && window.ledgerCurrentUser) {
        try {
            const doc = await window.ledgerDb
                .collection('users')
                .doc(window.ledgerCurrentUser.uid)
                .collection('settings')
                .doc('budgetLimits')
                .get();
            if (doc.exists) return doc.data().limits || {};
        } catch (e) {
            console.warn('[Limits] Firestore load failed:', e.message);
        }
    }

    // 2. Fallback to User-Specific localStorage
    try {
        const key = getLimitKey();
        return JSON.parse(localStorage.getItem(key) || '{}');
    } catch { return {}; }
}

async function persistLimits(limits) {
    // Write to User-Specific localStorage immediately
    const key = getLimitKey();
    localStorage.setItem(key, JSON.stringify(limits));

    // Then Firestore if available
    if (window.ledgerDb && window.ledgerCurrentUser) {
        try {
            await window.ledgerDb
                .collection('users')
                .doc(window.ledgerCurrentUser.uid)
                .collection('settings')
                .doc('budgetLimits')
                .set({ limits });
        } catch (e) {
            console.warn('[Limits] Firestore save failed:', e.message);
        }
    }
}

// ─── Helpers ──────────────────────────────────────────────────
function fmtL(n) {
    return '₱' + Math.abs(parseFloat(n) || 0)
        .toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Returns { CategoryName: totalSpent } for TODAY only
function getTodaySpending(transactions) {
    const today = new Date().toISOString().slice(0, 10);
    const map = {};
    transactions
        .filter(t => t.type === 'expense' && t.date === today)
        .forEach(t => {
            const cat = t.category || 'Other';
            map[cat] = (map[cat] || 0) + (parseFloat(t.amount) || 0);
        });
    return map;
}

// ─── Render budget limits section ─────────────────────────────
function renderLimits(transactions) {
    const grid = document.getElementById('budget-limits-grid');
    if (!grid) return;

    const todaySpend = getTodaySpending(transactions);
    const entries = Object.entries(currentLimits).filter(([, v]) => v > 0);

    if (entries.length === 0) {
        grid.innerHTML = `
      <div class="limits-empty">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none"
             stroke="currentColor" stroke-width="1.5" opacity="0.35">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <p>No daily limits set yet.<br/>Click <strong>Edit Limits</strong> to add spending caps per category.</p>
      </div>`;
        return;
    }

    grid.innerHTML = entries.map(([cat, limit]) => {
        const spent = todaySpend[cat] || 0;
        const pct = Math.min((spent / limit) * 100, 100);
        const remaining = Math.max(limit - spent, 0);
        const isOver = spent >= limit;
        const isWarn = !isOver && pct >= 75;

        const cardClass = isOver ? 'limit-over' : isWarn ? 'limit-warn' : 'limit-ok';
        const badgeText = isOver
            ? `Over by ${fmtL(spent - limit)}`
            : `${fmtL(remaining)} left today`;
        const badgeClass = isOver ? 'badge-over' : isWarn ? 'badge-warn' : 'badge-ok';

        return `
      <div class="limit-card ${cardClass}">
        <div class="limit-card-header">
          <span class="limit-cat-name">${cat}</span>
          <span class="limit-ratio">${fmtL(spent)} <span class="limit-of">of</span> ${fmtL(limit)}</span>
        </div>
        <div class="limit-track">
          <div class="limit-fill" style="width:${pct.toFixed(1)}%"></div>
        </div>
        <div class="limit-card-footer">
          <span class="limit-badge ${badgeClass}">${badgeText}</span>
          <span class="limit-pct">${pct.toFixed(0)}%</span>
        </div>
      </div>`;
    }).join('');
}

// ─── Check limits after a transaction is saved ────────────────
function checkLimits(transactions, category, type) {
    // Only check expense transactions
    if (type !== 'expense') return;
    const limit = currentLimits[category];
    if (!limit || limit <= 0) return;

    const todaySpend = getTodaySpending(transactions);
    const spent = todaySpend[category] || 0;
    const pct = (spent / limit) * 100;

    if (spent >= limit) {
        // Over limit
        setTimeout(() => {
            if (typeof window.showToast === 'function') {
                window.showToast(
                    `Daily limit hit for ${category}: ${fmtL(spent)} / ${fmtL(limit)}`,
                    'error'
                );
            }
            sendBrowserNotif(
                `Daily limit reached — ${category}`,
                `You've spent ${fmtL(spent)} of your ${fmtL(limit)} daily budget.`
            );
        }, 400); // slight delay so "Transaction added" toast shows first
    } else if (pct >= 75) {
        // Approaching limit
        setTimeout(() => {
            if (typeof window.showToast === 'function') {
                window.showToast(
                    `${category} is at ${pct.toFixed(0)}% of your daily limit.`,
                    ''
                );
            }
        }, 400);
    }
}

// ─── Browser notification ─────────────────────────────────────
function sendBrowserNotif(title, body) {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'granted') {
        new Notification(title, { body, icon: 'assets/images/icons_expense.png' });
    } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(perm => {
            if (perm === 'granted') new Notification(title, { body });
        });
    }
}

// ─── Edit limits modal ────────────────────────────────────────
function openLimitsModal() {
    const body = document.getElementById('limits-modal-body');
    if (!body) return;

    body.innerHTML = EXPENSE_CATEGORIES.map(cat => `
    <div class="limit-input-row">
      <label class="limit-input-label" for="lim-${cat}">${cat}</label>
      <div class="limit-input-wrap">
        <span class="limit-currency">₱</span>
        <input
          type="number"
          id="lim-${cat}"
          class="form-input limit-inp"
          data-cat="${cat}"
          placeholder="No limit"
          min="0"
          step="1"
          value="${currentLimits[cat] > 0 ? currentLimits[cat] : ''}"
        />
      </div>
    </div>`).join('');

    window.openModal('limits-modal');
}

async function saveLimitsModal() {
    const inputs = document.querySelectorAll('.limit-inp');
    const newLimits = {};
    inputs.forEach(inp => {
        const v = parseFloat(inp.value);
        if (v > 0) newLimits[inp.dataset.cat] = v;
    });

    const btn = document.getElementById('limits-save-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'Saving...'; }

    currentLimits = newLimits;
    await persistLimits(newLimits);

    if (btn) { btn.disabled = false; btn.textContent = 'Save Limits'; }
    window.closeModal('limits-modal');
    window.showToast('Daily budget limits saved.', 'success');

    if (Array.isArray(window.allTransactions)) {
        renderLimits(window.allTransactions);
    }
}

// ─── Init ─────────────────────────────────────────────────────
async function initBudgetLimits() {
    // 1. Load the limits immediately
    currentLimits = await loadLimits();

    // 2. Select the buttons
    const openBtn = document.getElementById('open-limits-modal');
    const saveBtn = document.getElementById('limits-save-btn');
    const cancelBtn = document.getElementById('limits-cancel-btn');
    const cancelBtn2 = document.getElementById('limits-cancel-btn-2');

    // 3. Attach Listeners with null checks
    if (openBtn) {
        openBtn.onclick = (e) => {
            e.preventDefault();
            openLimitsModal();
        };
    }

    if (saveBtn) {
        saveBtn.onclick = (e) => {
            e.preventDefault();
            saveLimitsModal();
        };
    }

    // Generic Close Function if window.closeModal is missing
    const closeLimits = () => {
        if (typeof window.closeModal === 'function') {
            window.closeModal('limits-modal');
        } else {
            document.getElementById('limits-modal').style.display = 'none';
            document.getElementById('limits-modal').classList.remove('active');
        }
    };

    if (cancelBtn) cancelBtn.onclick = closeLimits;
    if (cancelBtn2) cancelBtn2.onclick = closeLimits;

    // 4. Expose for dashboard.js
    window.renderLimits = renderLimits;
    window.checkLimits = checkLimits;

    // 5. Initial Render if data exists
    if (window.allTransactions) {
        renderLimits(window.allTransactions);
    }
}

// Global helper in case auth.js/main.js modal logic is different
window.openModal = window.openModal || function (id) {
    const m = document.getElementById(id);
    if (m) {
        m.style.display = 'flex'; // or whatever your CSS uses to show modals
        m.classList.add('active');
    }
};

window.closeModal = window.closeModal || function (id) {
    const m = document.getElementById(id);
    if (m) {
        m.style.display = 'none';
        m.classList.remove('active');
    }
};

document.addEventListener('DOMContentLoaded', initBudgetLimits);