

/**
 * dashboard.js
 * Full CRUD, summary cards, filters, chart updates.
 * loadTransactions() is called by auth.js after sign-in is confirmed.
 */

'use strict';

const INCOME_CATEGORIES = ['Salary', 'Freelance', 'Investment', 'Gift', 'Bonus', 'Rental', 'Other'];
const EXPENSE_CATEGORIES = ['Housing', 'Food', 'Transport', 'Utilities', 'Healthcare',
    'Entertainment', 'Shopping', 'Education', 'Subscriptions',
    'Insurance', 'Travel', 'Other'];

let allTransactions = [];
let editingId = null;
let pendingDeleteId = null;
let activeType = 'income';
let _dashBound = false;

// ─── Formatters ───────────────────────────────────────────────
function fmt(n) {
    return '₱' + Math.abs(parseFloat(n) || 0)
        .toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtDate(str) {
    if (!str) return '';
    return new Date(str + 'T00:00:00')
        .toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
function today() { return new Date().toISOString().slice(0, 10); }
function escapeHtml(s) {
    return String(s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ─── Load ─────────────────────────────────────────────────────
async function loadTransactions() {
    try {
        allTransactions = await window.storageLoad();
    } catch (err) {
        console.error('[Dashboard] Load error:', err);
        allTransactions = [];
    }
    renderAll();
}

function renderAll() {
    window.allTransactions = allTransactions; // expose for budget-limits.js
    renderSummary();
    renderList();
    populateCategoryFilter();
    const months = parseInt(document.getElementById('bar-filter')?.value || '6');
    if (typeof window.updateCharts === 'function') {
        window.updateCharts(allTransactions, months);
    }
    if (typeof window.renderLimits === 'function') {
        window.renderLimits(allTransactions);
    }
}

// ─── Summary ──────────────────────────────────────────────────
function renderSummary() {
    let income = 0, expense = 0;
    allTransactions.forEach(t => {
        const a = parseFloat(t.amount) || 0;
        if (t.type === 'income') income += a;
        if (t.type === 'expense') expense += a;
    });
    const savings = income - expense;

    const el = id => document.getElementById(id);
    el('total-income') && (el('total-income').textContent = fmt(income));
    el('total-expenses') && (el('total-expenses').textContent = fmt(expense));
    el('total-savings') && (el('total-savings').textContent = (savings < 0 ? '-' : '') + fmt(savings));

    const thisMonth = new Date().toISOString().slice(0, 7);
    let mIn = 0, mEx = 0, mCount = 0;
    allTransactions.forEach(t => {
        if (t.date?.startsWith(thisMonth)) {
            mCount++;
            if (t.type === 'income') mIn += parseFloat(t.amount) || 0;
            if (t.type === 'expense') mEx += parseFloat(t.amount) || 0;
        }
    });

    el('income-change') && (el('income-change').textContent =
        mCount ? 'This month: ' + fmt(mIn) : 'No income this month');
    el('expense-change') && (el('expense-change').textContent =
        mCount ? 'This month: ' + fmt(mEx) : 'No expenses this month');
    el('savings-change') && (el('savings-change').textContent =
        savings >= 0 ? 'You are saving money' : 'Spending exceeds income');
}

// ─── List ─────────────────────────────────────────────────────
function getFiltered() {
    const typeF = document.getElementById('tx-type-filter')?.value || 'all';
    const catF = document.getElementById('tx-cat-filter')?.value || 'all';
    const monthF = document.getElementById('tx-month-filter')?.value || '';
    return allTransactions.filter(t => {
        if (typeF !== 'all' && t.type !== typeF) return false;
        if (catF !== 'all' && t.category !== catF) return false;
        if (monthF && !t.date?.startsWith(monthF)) return false;
        return true;
    });
}

function renderList() {
    const list = document.getElementById('tx-list');
    const empty = document.getElementById('tx-empty');
    if (!list) return;

    list.querySelectorAll('.tx-item').forEach(el => el.remove());

    const filtered = getFiltered();
    if (filtered.length === 0) {
        if (empty) empty.style.display = 'flex';
        return;
    }
    if (empty) empty.style.display = 'none';

    filtered.forEach(t => {
        const isIncome = t.type === 'income';
        const iconSrc = isIncome
            ? 'assets/images/icons_income.png'
            : 'assets/images/icons_expense.png';

        const row = document.createElement('div');
        row.className = 'tx-item';
        row.dataset.id = t.id;
        row.innerHTML = `
      <div class="tx-left">
        <div class="tx-type-icon ${t.type}">
          <img src="${iconSrc}" alt="${t.type}" />
        </div>
        <div class="tx-info">
          <div class="tx-desc">${escapeHtml(t.description || 'Untitled')}</div>
          <div class="tx-meta">
            <span class="tx-date">${fmtDate(t.date)}</span>
            <span class="tx-cat-badge">${escapeHtml(t.category || 'Uncategorized')}</span>
          </div>
        </div>
      </div>
      <div class="tx-right">
        <span class="tx-amount ${t.type}">${isIncome ? '+' : '-'} ${fmt(t.amount)}</span>
        <div class="tx-actions">
          <button class="tx-action-btn edit" title="Edit" aria-label="Edit">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
          <button class="tx-action-btn del" title="Delete" aria-label="Delete">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
              <path d="M10 11v6"/><path d="M14 11v6"/>
              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
            </svg>
          </button>
        </div>
      </div>`;
        row.querySelector('.edit').addEventListener('click', () => openEditModal(t));
        row.querySelector('.del').addEventListener('click', () => openDeleteModal(t.id));
        list.insertBefore(row, empty);
    });
}

function populateCategoryFilter() {
    const sel = document.getElementById('tx-cat-filter');
    if (!sel) return;
    const current = sel.value;
    const cats = [...new Set(allTransactions.map(t => t.category).filter(Boolean))].sort();
    sel.innerHTML = '<option value="all">All categories</option>';
    cats.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c; opt.textContent = c;
        if (c === current) opt.selected = true;
        sel.appendChild(opt);
    });
}

// ─── Add / Edit Modal ─────────────────────────────────────────
function openAddModal() {
    editingId = null;
    document.getElementById('tx-modal-title').textContent = 'Add Transaction';
    document.getElementById('tx-description').value = '';
    document.getElementById('tx-amount').value = '';
    document.getElementById('tx-date').value = today();
    document.getElementById('tx-notes').value = '';
    setActiveType('income');
    window.openModal('tx-modal');
}

function openEditModal(t) {
    editingId = t.id;
    document.getElementById('tx-modal-title').textContent = 'Edit Transaction';
    document.getElementById('tx-description').value = t.description || '';
    document.getElementById('tx-amount').value = t.amount || '';
    document.getElementById('tx-date').value = t.date || today();
    document.getElementById('tx-notes').value = t.notes || '';
    setActiveType(t.type || 'income');
    setTimeout(() => {
        const sel = document.getElementById('tx-category');
        if (sel) sel.value = t.category || '';
    }, 30);
    window.openModal('tx-modal');
}

function setActiveType(type) {
    activeType = type;
    document.getElementById('type-income')?.classList.toggle('active', type === 'income');
    document.getElementById('type-expense')?.classList.toggle('active', type === 'expense');
    populateCategories(type);
}

function populateCategories(type) {
    const sel = document.getElementById('tx-category');
    if (!sel) return;
    const cats = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
    sel.innerHTML = cats.map(c => `<option value="${c}">${c}</option>`).join('');
}

async function saveTransaction() {
    const description = document.getElementById('tx-description').value.trim();
    const amount = parseFloat(document.getElementById('tx-amount').value);
    const date = document.getElementById('tx-date').value;
    const category = document.getElementById('tx-category').value;
    const notes = document.getElementById('tx-notes').value.trim();

    if (!description) { window.showToast('Please enter a description.', 'error'); return; }
    if (!amount || amount <= 0) { window.showToast('Please enter a valid amount.', 'error'); return; }
    if (!date) { window.showToast('Please select a date.', 'error'); return; }

    const payload = { type: activeType, description, amount, date, category, notes };
    const saveBtn = document.getElementById('tx-save');
    if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = 'Saving...'; }

    try {
        if (editingId) {
            await window.storageUpdate(editingId, payload);
            const idx = allTransactions.findIndex(t => t.id === editingId);
            if (idx > -1) allTransactions[idx] = { ...allTransactions[idx], ...payload };
            window.showToast('Transaction updated.', 'success');
        } else {
            const saved = await window.storageAdd(payload);
            allTransactions.unshift(saved);
            window.showToast('Transaction added.', 'success');
        }
        window.closeModal('tx-modal');
        // Check budget limit for the category that was just saved
        if (typeof window.checkLimits === 'function') {
            window.checkLimits(allTransactions, category, activeType);
        }
        renderAll();
    } catch (err) {
        console.error('[Dashboard] Save error:', err);
        window.showToast('Could not save transaction. Try again.', 'error');
    } finally {
        if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = 'Save Transaction'; }
    }
}

// ─── Delete ───────────────────────────────────────────────────
function openDeleteModal(id) {
    pendingDeleteId = id;
    window.openModal('delete-modal');
}

async function confirmDelete() {
    if (!pendingDeleteId) return;
    const btn = document.getElementById('delete-confirm');
    if (btn) { btn.disabled = true; btn.textContent = 'Deleting...'; }
    try {
        await window.storageDelete(pendingDeleteId);
        allTransactions = allTransactions.filter(t => t.id !== pendingDeleteId);
        pendingDeleteId = null;
        window.closeModal('delete-modal');
        renderAll();
        window.showToast('Transaction deleted.', 'success');
    } catch (err) {
        console.error('[Dashboard] Delete error:', err);
        window.showToast('Could not delete transaction.', 'error');
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = 'Delete'; }
    }
}

// ─── Bind events (once only) ──────────────────────────────────
function bindDashboard() {
    if (_dashBound) return;
    if (!document.getElementById('tx-list')) return;
    _dashBound = true;

    document.getElementById('open-add-modal')?.addEventListener('click', openAddModal);
    document.getElementById('type-income')?.addEventListener('click', () => setActiveType('income'));
    document.getElementById('type-expense')?.addEventListener('click', () => setActiveType('expense'));
    document.getElementById('tx-save')?.addEventListener('click', saveTransaction);
    document.getElementById('tx-cancel')?.addEventListener('click', () => window.closeModal('tx-modal'));
    document.getElementById('tx-modal-close')?.addEventListener('click', () => window.closeModal('tx-modal'));
    document.getElementById('tx-modal')?.addEventListener('click', function (e) {
        if (e.target === this) window.closeModal('tx-modal');
    });
    document.getElementById('delete-confirm')?.addEventListener('click', confirmDelete);
    document.getElementById('delete-cancel')?.addEventListener('click', () => window.closeModal('delete-modal'));
    document.getElementById('delete-modal')?.addEventListener('click', function (e) {
        if (e.target === this) window.closeModal('delete-modal');
    });
    ['tx-type-filter', 'tx-cat-filter', 'tx-month-filter'].forEach(id => {
        document.getElementById(id)?.addEventListener('change', renderList);
    });
    document.getElementById('bar-filter')?.addEventListener('change', e => {
        window.updateCharts(allTransactions, parseInt(e.target.value));
    });
}

// ─── Init ─────────────────────────────────────────────────────
function initDashboard() {
    if (!document.getElementById('tx-list')) return;
    // Expose for auth.js and budget-limits.js
    window.loadTransactions = loadTransactions;
    window.renderAll = renderAll;
    populateCategories('income');
    bindDashboard();
    // Do NOT call loadTransactions() here — auth.js calls it after auth resolves
}

document.addEventListener('DOMContentLoaded', initDashboard);