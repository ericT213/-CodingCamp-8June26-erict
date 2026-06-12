/**
 * js/store.js
 * LocalStorage persistence layer for Expense Tracker.
 *
 * Keys:
 *   et_transactions  — Transaction[]   (default: [])
 *   et_categories    — string[]        (default: ['Food','Transport','Fun'])
 *   et_theme         — 'light'|'dark'  (default: 'light')
 *   et_spending_limit — number|null    (default: null)
 *
 * Requirements: 9.1, 9.2, 9.3, 9.4
 */

// ─── Storage keys ────────────────────────────────────────────────────────────

const KEYS = {
  TRANSACTIONS:   'et_transactions',
  CATEGORIES:     'et_categories',
  THEME:          'et_theme',
  SPENDING_LIMIT: 'et_spending_limit',
};

// ─── Defaults ────────────────────────────────────────────────────────────────

const DEFAULTS = {
  transactions:   [],
  categories:     ['Food', 'Transport', 'Fun'],
  theme:          'light',
  spendingLimit:  null,
};

// ─── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Safely read and JSON-parse a localStorage value.
 * Returns `fallback` if the key is absent or the value is malformed JSON.
 *
 * @param {string} key
 * @param {*} fallback
 * @returns {*}
 */
function _read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

/**
 * Safely JSON-stringify and write a value to localStorage.
 * Throws the original error (e.g. QuotaExceededError) so callers can surface it.
 *
 * @param {string} key
 * @param {*} value
 */
function _write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    // Re-throw so app.js can catch QuotaExceededError and show a toast.
    throw err;
  }
}

// ─── Getters ─────────────────────────────────────────────────────────────────

/**
 * Read transactions from localStorage.
 * Falls back to [] on missing key or malformed JSON.
 *
 * @returns {Array<Object>} Transaction[]
 */
export function getTransactions() {
  const value = _read(KEYS.TRANSACTIONS, DEFAULTS.transactions);
  // Ensure we always return an array.
  return Array.isArray(value) ? value : DEFAULTS.transactions;
}

/**
 * Read categories from localStorage.
 * Falls back to ['Food','Transport','Fun'] on missing key, malformed JSON,
 * or if the stored value is not an array.
 *
 * @returns {string[]}
 */
export function getCategories() {
  const value = _read(KEYS.CATEGORIES, DEFAULTS.categories);
  return Array.isArray(value) ? value : DEFAULTS.categories;
}

/**
 * Read theme from localStorage.
 * Validates that the stored value is exactly 'light' or 'dark';
 * falls back to 'light' otherwise. (Req 9.4)
 *
 * @returns {'light'|'dark'}
 */
export function getTheme() {
  const value = _read(KEYS.THEME, DEFAULTS.theme);
  return value === 'light' || value === 'dark' ? value : DEFAULTS.theme;
}

/**
 * Read spending limit from localStorage.
 * Validates that the stored value is a positive, finite number;
 * falls back to null otherwise. (Req 9.4)
 *
 * @returns {number|null}
 */
export function getSpendingLimit() {
  const value = _read(KEYS.SPENDING_LIMIT, DEFAULTS.spendingLimit);
  if (value === null) return null;
  if (typeof value === 'number' && isFinite(value) && value > 0) return value;
  return DEFAULTS.spendingLimit;
}

// ─── Setters ─────────────────────────────────────────────────────────────────

/**
 * Persist transactions to localStorage.
 * Throws QuotaExceededError if localStorage is full.
 *
 * @param {Array<Object>} txns - Transaction[]
 */
export function setTransactions(txns) {
  _write(KEYS.TRANSACTIONS, txns);
}

/**
 * Persist categories to localStorage.
 * Throws QuotaExceededError if localStorage is full.
 *
 * @param {string[]} cats
 */
export function setCategories(cats) {
  _write(KEYS.CATEGORIES, cats);
}

/**
 * Persist theme to localStorage.
 * Throws QuotaExceededError if localStorage is full.
 *
 * @param {'light'|'dark'} theme
 */
export function setTheme(theme) {
  _write(KEYS.THEME, theme);
}

/**
 * Persist spending limit to localStorage.
 * Passing null removes the conceptual limit (stored as JSON null).
 * Throws QuotaExceededError if localStorage is full.
 *
 * @param {number|null} limit
 */
export function setSpendingLimit(limit) {
  _write(KEYS.SPENDING_LIMIT, limit);
}

// ─── Convenience helpers ─────────────────────────────────────────────────────

/**
 * Append a transaction to the stored list and persist.
 * Throws QuotaExceededError if localStorage is full.
 *
 * @param {Object} tx - Transaction object
 * @returns {Array<Object>} Updated Transaction[]
 */
export function addTransaction(tx) {
  const current = getTransactions();
  const updated = [...current, tx];
  setTransactions(updated);
  return updated;
}

/**
 * Remove the transaction with the given id from the stored list and persist.
 * If no transaction with that id exists, the list is unchanged.
 * Throws QuotaExceededError if localStorage is full.
 *
 * @param {string} id
 * @returns {Array<Object>} Updated Transaction[]
 */
export function deleteTransaction(id) {
  const current = getTransactions();
  const updated = current.filter((tx) => tx.id !== id);
  setTransactions(updated);
  return updated;
}

/**
 * Add a category name to the stored list (idempotent, case-sensitive).
 * If the trimmed name already exists, the list is returned unchanged.
 * Throws QuotaExceededError if localStorage is full.
 *
 * @param {string} name
 * @returns {string[]} Updated categories list
 */
export function addCategory(name) {
  const trimmed = name.trim();
  const current = getCategories();
  // Idempotent: do nothing if the exact (case-sensitive) name already exists.
  if (current.includes(trimmed)) return current;
  const updated = [...current, trimmed];
  setCategories(updated);
  return updated;
}
