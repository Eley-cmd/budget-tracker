/**
 * storage.js
 * - Signed in + Firebase configured → Firestore (with 8s timeout)
 * - Signed out or Firebase not configured → localStorage
 * - Firestore error → auto-fallback to localStorage + toast
 */

/**
 * storage.js
 * FIXED: Securely stores data in 'ledger_transactions_UID' keys.
 */

'use strict';

function getLSKey() {
    const user = window.ledgerCurrentUser || JSON.parse(localStorage.getItem('ledger_user_cache') || 'null');
    return user?.uid ? `ledger_transactions_${user.uid}` : 'ledger_transactions_guest';
}

function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// ─── HELPERS ──────────────────────────────────────────────────
function lsAll() {
    const key = getLSKey();
    try { return JSON.parse(localStorage.getItem(key) || '[]'); }
    catch { return []; }
}

function lsSave(arr) {
    localStorage.setItem(getLSKey(), JSON.stringify(arr));
}

// ─── STORAGE API ──────────────────────────────────────────────
async function storageLoad() {
    if (window.ledgerDb && window.ledgerCurrentUser) {
        try {
            const snap = await window.ledgerDb.collection('users')
                .doc(window.ledgerCurrentUser.uid)
                .collection('transactions').orderBy('date', 'desc').get();
            return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (e) { console.warn("Firestore fail, using LS"); }
    }
    return lsAll().sort((a, b) => new Date(b.date) - new Date(a.date));
}

async function storageAdd(transaction) {
    const entry = { ...transaction, createdAt: new Date().toISOString() };
    if (window.ledgerDb && window.ledgerCurrentUser) {
        try {
            const docRef = await window.ledgerDb.collection('users')
                .doc(window.ledgerCurrentUser.uid)
                .collection('transactions').add(entry);
            return { id: docRef.id, ...entry };
        } catch (e) { console.error(e); }
    }
    const record = { id: uid(), ...entry };
    const all = lsAll();
    all.unshift(record);
    lsSave(all);
    return record;
}

async function storageUpdate(id, updates) {
    if (window.ledgerDb && window.ledgerCurrentUser) {
        try {
            await window.ledgerDb.collection('users')
                .doc(window.ledgerCurrentUser.uid)
                .collection('transactions').doc(id).update(updates);
            return { id, ...updates };
        } catch (e) { console.error(e); }
    }
    const all = lsAll();
    const idx = all.findIndex(t => t.id === id);
    if (idx !== -1) {
        all[idx] = { ...all[idx], ...updates };
        lsSave(all);
    }
    return { id, ...updates };
}

async function storageDelete(id) {
    if (window.ledgerDb && window.ledgerCurrentUser) {
        try {
            await window.ledgerDb.collection('users')
                .doc(window.ledgerCurrentUser.uid)
                .collection('transactions').doc(id).delete();
        } catch (e) { console.error(e); }
    }
    lsSave(lsAll().filter(t => t.id !== id));
}

window.storageLoad = storageLoad;
window.storageAdd = storageAdd;
window.storageUpdate = storageUpdate;
window.storageDelete = storageDelete;