/**
 * js/app.js
 * Application entry point — wires all modules together and registers
 * every event listener once the DOM is ready.
 *
 * Requirements: 1.4, 1.5, 2.3, 2.4, 5.2, 5.3, 7.2, 7.4, 8.1–8.4, 9.1–9.2, 11.2
 */

import * as store         from './store.js';
import * as ui            from './ui.js';
import { initChart, updateChart } from './chart-manager.js';
import {
  validateTransaction,
  validateCategory,
  validateSpendingLimit,
} from './validator.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Build the category-totals array consumed by chartManager.updateChart().
 *
 * @param {Array<Object>} txns - Transaction[]
 * @returns {Array<{category: string, total: number, percentage: number}>}
 */
function buildCategoryTotals(txns) {
  const map = new Map();
  for (const tx of txns) {
    map.set(tx.category, (map.get(tx.category) || 0) + tx.amount);
  }
  const grandTotal = Array.from(map.values()).reduce((s, v) => s + v, 0);
  return Array.from(map.entries()).map(([category, total]) => ({
    category,
    total: Math.round(total * 100) / 100,
    percentage:
      grandTotal > 0 ? Math.round((total / grandTotal) * 10000) / 100 : 0,
  }));
}

/**
 * Return a new sorted copy of txns — never mutates the original array.
 * Supported sort values: 'date-desc' | 'amount-asc' | 'category-az'
 *
 * @param {Array<Object>} txns
 * @param {string}        sortValue
 * @returns {Array<Object>}
 */
function sortTransactions(txns, sortValue) {
  const copy = [...txns];
  switch (sortValue) {
    case 'amount-asc':
      copy.sort((a, b) => a.amount - b.amount);
      break;
    case 'category-az':
      copy.sort((a, b) => a.category.localeCompare(b.category));
      break;
    case 'date-desc':
    default:
      // Most-recent first; use id as a stable tiebreaker (ids embed timestamp).
      copy.sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
      break;
  }
  return copy;
}

/**
 * Show the #toast notification briefly (3 s), then re-hide it.
 * Idempotent — clears any pending hide timer before starting a new one.
 */
let _toastTimer = null;
function showToast() {
  const toast = document.getElementById('toast');
  if (!toast) return;
  if (_toastTimer !== null) {
    clearTimeout(_toastTimer);
    _toastTimer = null;
  }
  toast.removeAttribute('hidden');
  _toastTimer = setTimeout(() => {
    toast.setAttribute('hidden', '');
    _toastTimer = null;
  }, 3000);
}

/**
 * Wrap any store write in try/catch; show the toast on QuotaExceededError.
 *
 * @param {Function} fn - The store mutation to attempt
 */
function withStorageErrorHandling(fn) {
  try {
    fn();
  } catch (err) {
    if (
      err instanceof DOMException &&
      (err.name === 'QuotaExceededError' ||
        err.name === 'NS_ERROR_DOM_QUOTA_REACHED')
    ) {
      showToast();
    } else {
      // Re-throw unexpected errors so they surface in the console.
      throw err;
    }
  }
}

// ─── DOMContentLoaded ─────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  // ── 1. Read initial state from store ──────────────────────────────────────
  let currentTheme   = store.getTheme();           // 'light' | 'dark'
  const categories   = store.getCategories();       // string[]
  let spendingLimit  = store.getSpendingLimit();    // number | null

  // ── 2. Apply saved theme (Req 8.3 — restore on load) ─────────────────────
  ui.setTheme(currentTheme);

  // Sync theme-toggle button label to the restored theme.
  const themeToggleBtn = document.getElementById('theme-toggle');
  if (themeToggleBtn) {
    themeToggleBtn.textContent =
      currentTheme === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode';
    themeToggleBtn.setAttribute(
      'aria-label',
      currentTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'
    );
  }

  // ── 3. Populate category dropdown ─────────────────────────────────────────
  ui.renderCategoryOptions(categories);

  // ── 4. Init chart ──────────────────────────────────────────────────────────
  const canvasEl = document.getElementById('expense-chart');
  let chart = canvasEl ? initChart(canvasEl) : null;

  // ── 5. Initial full render ─────────────────────────────────────────────────
  const sortSelect = document.getElementById('sort-select');

  /**
   * Helper: read txns from store, sort them for display, and re-render
   * the list, balance, chart, and monthly summary in one call.
   */
  function renderAll() {
    const txns        = store.getTransactions();
    spendingLimit     = store.getSpendingLimit();
    const sortValue   = sortSelect ? sortSelect.value : 'date-desc';
    const sortedTxns  = sortTransactions(txns, sortValue);

    ui.renderTransactionList(sortedTxns, spendingLimit);
    ui.renderBalance(txns);
    if (chart) updateChart(chart, buildCategoryTotals(txns));
    ui.renderMonthlySummary(txns, spendingLimit);
  }

  renderAll();

  // ─────────────────────────────────────────────────────────────────────────
  // Event listeners
  // ─────────────────────────────────────────────────────────────────────────

  // ── Transaction form submit (Req 1.4, 1.5) ────────────────────────────────
  const transactionForm = document.getElementById('transaction-form');
  if (transactionForm) {
    transactionForm.addEventListener('submit', (e) => {
      e.preventDefault();
      ui.clearFieldErrors();

      const itemNameInput = document.getElementById('item-name');
      const amountInput   = document.getElementById('amount');
      const categoryInput = document.getElementById('category');

      const rawItemName = itemNameInput ? itemNameInput.value : '';
      const rawAmount   = amountInput   ? amountInput.value   : '';
      const rawCategory = categoryInput ? categoryInput.value : '';

      const fields = {
        itemName: rawItemName,
        amount:   parseFloat(rawAmount),
        category: rawCategory,
      };

      const result = validateTransaction(fields);

      if (!result.valid) {
        // Surface per-field errors (Req 1.2 / 1.3).
        if (result.errors.itemName)  ui.showFieldError('item-name', result.errors.itemName);
        if (result.errors.amount)    ui.showFieldError('amount',    result.errors.amount);
        if (result.errors.category)  ui.showFieldError('category',  result.errors.category);
        return;
      }

      // Build the transaction object (Req 1.4).
      const tx = {
        id:       Date.now().toString(36) + Math.random().toString(36).slice(2),
        itemName: rawItemName.trim(),
        amount:   Math.round(parseFloat(rawAmount) * 100) / 100,
        category: rawCategory,
        date:     new Date().toISOString().slice(0, 10), // YYYY-MM-DD
      };

      withStorageErrorHandling(() => store.addTransaction(tx));

      // Req 1.5 — reset form and clear errors after success.
      transactionForm.reset();
      ui.clearFieldErrors();

      renderAll();
    });
  }

  // ── Delete — delegated click on #transaction-list (Req 2.3) ───────────────
  const transactionList = document.getElementById('transaction-list');
  if (transactionList) {
    transactionList.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-id]');
      if (!btn) return;

      const id = btn.dataset.id;
      withStorageErrorHandling(() => store.deleteTransaction(id));

      renderAll();

      // Restore keyboard focus sensibly after the list re-renders (Req 11.4).
      const updatedTxns = store.getTransactions();
      ui.moveFocusAfterDelete(id, updatedTxns);
    });
  }

  // ── Sort select change (Req 2.4) ──────────────────────────────────────────
  if (sortSelect) {
    sortSelect.addEventListener('change', () => {
      const txns       = store.getTransactions();
      const sortedTxns = sortTransactions(txns, sortSelect.value);
      // Sort only affects display order — does NOT write to store.
      ui.renderTransactionList(sortedTxns, spendingLimit);
    });
  }

  // ── Add Category form submit (Req 5.2, 5.3) ───────────────────────────────
  const categoryForm = document.getElementById('category-form');
  if (categoryForm) {
    categoryForm.addEventListener('submit', (e) => {
      e.preventDefault();
      ui.clearFieldErrors();

      const newCategoryInput = document.getElementById('new-category');
      const name = newCategoryInput ? newCategoryInput.value : '';

      const result = validateCategory(name);
      if (!result.valid) {
        ui.showFieldError('new-category', result.error);
        return;
      }

      withStorageErrorHandling(() => store.addCategory(name));

      categoryForm.reset();
      ui.renderCategoryOptions(store.getCategories());
    });
  }

  // ── Spending Limit form submit (Req 7.2) ──────────────────────────────────
  const limitForm = document.getElementById('limit-form');
  if (limitForm) {
    limitForm.addEventListener('submit', (e) => {
      e.preventDefault();
      ui.clearFieldErrors();

      const limitInput = document.getElementById('spending-limit-input');
      const value = limitInput ? limitInput.value : '';

      const result = validateSpendingLimit(value);
      if (!result.valid) {
        ui.showFieldError('spending-limit', result.error);
        return;
      }

      withStorageErrorHandling(() => store.setSpendingLimit(result.parsed));
      renderAll();
    });
  }

  // ── Clear Limit button (Req 7.4) ──────────────────────────────────────────
  const clearLimitBtn = document.getElementById('clear-limit-btn');
  if (clearLimitBtn) {
    clearLimitBtn.addEventListener('click', () => {
      withStorageErrorHandling(() => store.setSpendingLimit(null));
      renderAll();
    });
  }

  // ── Theme toggle (Req 8.1, 8.2, 8.4) ─────────────────────────────────────
  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      const newTheme = currentTheme === 'light' ? 'dark' : 'light';
      currentTheme = newTheme;

      withStorageErrorHandling(() => store.setTheme(newTheme));
      ui.setTheme(newTheme);

      themeToggleBtn.textContent =
        newTheme === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode';
      themeToggleBtn.setAttribute(
        'aria-label',
        newTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'
      );
    });
  }
});
