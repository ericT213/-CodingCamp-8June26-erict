/**
 * js/validator.js
 * Pure validation functions for Expense Tracker.
 *
 * No DOM access, no side effects — all functions are pure.
 *
 * Requirements: 1.2, 1.3, 5.1, 5.5, 7.1, 7.3
 */

// ─── Constants ────────────────────────────────────────────────────────────────

const ITEM_NAME_MAX   = 100;
const AMOUNT_MAX      = 1_000_000;
const CATEGORY_MAX    = 50;

// ─── validateTransaction ──────────────────────────────────────────────────────

/**
 * Validate a transaction form submission.
 *
 * Rules (Req 1.2):
 *   itemName  — non-empty after trim, ≤ 100 characters
 *   amount    — positive finite number > 0, ≤ 1,000,000
 *   category  — non-empty
 *
 * @param {{ itemName: string, amount: *, category: string }} fields
 * @returns {{ valid: boolean, errors: { itemName?: string, amount?: string, category?: string } }}
 */
export function validateTransaction(fields) {
  const errors = {};

  // ── itemName ──────────────────────────────────────────────────────────────
  const rawName = typeof fields.itemName === 'string' ? fields.itemName : '';
  const trimmedName = rawName.trim();

  if (trimmedName.length === 0) {
    errors.itemName = 'Item name is required.';
  } else if (trimmedName.length > ITEM_NAME_MAX) {
    errors.itemName = `Item name must be at most ${ITEM_NAME_MAX} characters.`;
  }

  // ── amount ────────────────────────────────────────────────────────────────
  const amount = typeof fields.amount === 'number'
    ? fields.amount
    : parseFloat(fields.amount);

  if (!isFinite(amount) || isNaN(amount)) {
    errors.amount = 'Amount must be a valid number.';
  } else if (amount <= 0) {
    errors.amount = 'Amount must be greater than 0.';
  } else if (amount > AMOUNT_MAX) {
    errors.amount = `Amount must be at most ${AMOUNT_MAX.toLocaleString()}.`;
  }

  // ── category ──────────────────────────────────────────────────────────────
  const rawCat = typeof fields.category === 'string' ? fields.category : '';

  if (rawCat.trim().length === 0) {
    errors.category = 'Category is required.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

// ─── validateCategory ─────────────────────────────────────────────────────────

/**
 * Validate a new category name.
 *
 * Rules (Req 5.1, 5.5):
 *   name — non-empty after trimming, ≤ 50 characters
 *
 * @param {string} name
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateCategory(name) {
  const raw = typeof name === 'string' ? name : '';
  const trimmed = raw.trim();

  if (trimmed.length === 0) {
    return { valid: false, error: 'Category name is required.' };
  }

  if (trimmed.length > CATEGORY_MAX) {
    return { valid: false, error: `Category name must be at most ${CATEGORY_MAX} characters.` };
  }

  return { valid: true };
}

// ─── validateSpendingLimit ────────────────────────────────────────────────────

/**
 * Validate and parse a spending limit input value.
 *
 * Rules (Req 7.1, 7.3):
 *   value — parses to a positive finite number > 0
 *   Accepts both numeric values and strings that parseFloat can convert.
 *
 * @param {string|number} value
 * @returns {{ valid: boolean, error?: string, parsed?: number }}
 */
export function validateSpendingLimit(value) {
  // Treat empty / whitespace-only strings as invalid.
  if (typeof value === 'string' && value.trim().length === 0) {
    return { valid: false, error: 'Spending limit is required.' };
  }

  const parsed = typeof value === 'number' ? value : parseFloat(value);

  if (isNaN(parsed) || !isFinite(parsed)) {
    return { valid: false, error: 'Spending limit must be a valid number.' };
  }

  if (parsed <= 0) {
    return { valid: false, error: 'Spending limit must be greater than 0.' };
  }

  return { valid: true, parsed };
}
