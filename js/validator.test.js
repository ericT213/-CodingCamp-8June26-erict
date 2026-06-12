/**
 * js/validator.test.js
 * Unit + property-based tests for validator.js
 *
 * Run via: test/validator-test.html (opens in a browser, no build tools required)
 * Uses fast-check loaded from CDN for property-based tests.
 *
 * Requirements validated: 1.2, 1.3, 5.1, 5.5, 7.1, 7.3
 */

import {
  validateTransaction,
  validateCategory,
  validateSpendingLimit,
} from './validator.js';

// ─── Minimal test harness ──────────────────────────────────────────────────────

let passed = 0;
let failed = 0;
const results = [];

function assert(label, condition, detail = '') {
  if (condition) {
    passed++;
    results.push({ ok: true, label });
  } else {
    failed++;
    results.push({ ok: false, label, detail });
    console.error(`FAIL: ${label}${detail ? ' — ' + detail : ''}`);
  }
}

function assertEqual(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  assert(label, ok, `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

// ─── validateTransaction — valid inputs ───────────────────────────────────────

{
  const r = validateTransaction({ itemName: 'Coffee', amount: 4.50, category: 'Food' });
  assert('validateTransaction: valid fields → valid:true',  r.valid === true);
  assert('validateTransaction: valid fields → no errors',   Object.keys(r.errors).length === 0);
}

{
  const r = validateTransaction({ itemName: '  Coffee  ', amount: 1, category: 'Food' });
  assert('validateTransaction: whitespace-padded name is trimmed and valid', r.valid === true);
}

{
  const r = validateTransaction({ itemName: 'A'.repeat(100), amount: 1, category: 'X' });
  assert('validateTransaction: itemName exactly 100 chars → valid', r.valid === true);
}

{
  const r = validateTransaction({ itemName: 'X', amount: 1_000_000, category: 'X' });
  assert('validateTransaction: amount exactly 1,000,000 → valid', r.valid === true);
}

{
  const r = validateTransaction({ itemName: 'X', amount: 0.01, category: 'X' });
  assert('validateTransaction: minimum positive amount → valid', r.valid === true);
}

// ─── validateTransaction — itemName errors ────────────────────────────────────

{
  const r = validateTransaction({ itemName: '', amount: 10, category: 'Food' });
  assert('validateTransaction: empty itemName → valid:false', r.valid === false);
  assert('validateTransaction: empty itemName → error present', r.errors.itemName !== undefined);
}

{
  const r = validateTransaction({ itemName: '   ', amount: 10, category: 'Food' });
  assert('validateTransaction: whitespace-only itemName → valid:false', r.valid === false);
  assert('validateTransaction: whitespace-only itemName → error present', r.errors.itemName !== undefined);
}

{
  const r = validateTransaction({ itemName: 'A'.repeat(101), amount: 10, category: 'Food' });
  assert('validateTransaction: itemName 101 chars → valid:false', r.valid === false);
  assert('validateTransaction: itemName 101 chars → error present', r.errors.itemName !== undefined);
}

// ─── validateTransaction — amount errors ──────────────────────────────────────

{
  const r = validateTransaction({ itemName: 'X', amount: 0, category: 'Food' });
  assert('validateTransaction: amount 0 → valid:false', r.valid === false);
  assert('validateTransaction: amount 0 → error present', r.errors.amount !== undefined);
}

{
  const r = validateTransaction({ itemName: 'X', amount: -1, category: 'Food' });
  assert('validateTransaction: negative amount → valid:false', r.valid === false);
  assert('validateTransaction: negative amount → error present', r.errors.amount !== undefined);
}

{
  const r = validateTransaction({ itemName: 'X', amount: 1_000_001, category: 'Food' });
  assert('validateTransaction: amount 1,000,001 → valid:false', r.valid === false);
  assert('validateTransaction: amount 1,000,001 → error present', r.errors.amount !== undefined);
}

{
  const r = validateTransaction({ itemName: 'X', amount: NaN, category: 'Food' });
  assert('validateTransaction: NaN amount → valid:false', r.valid === false);
  assert('validateTransaction: NaN amount → error present', r.errors.amount !== undefined);
}

{
  const r = validateTransaction({ itemName: 'X', amount: Infinity, category: 'Food' });
  assert('validateTransaction: Infinity amount → valid:false', r.valid === false);
  assert('validateTransaction: Infinity amount → error present', r.errors.amount !== undefined);
}

{
  const r = validateTransaction({ itemName: 'X', amount: -Infinity, category: 'Food' });
  assert('validateTransaction: -Infinity amount → valid:false', r.valid === false);
  assert('validateTransaction: -Infinity amount → error present', r.errors.amount !== undefined);
}

// ─── validateTransaction — string amounts (form inputs come as strings) ───────

{
  const r = validateTransaction({ itemName: 'X', amount: '15.50', category: 'Food' });
  assert('validateTransaction: string "15.50" amount → valid', r.valid === true);
}

{
  const r = validateTransaction({ itemName: 'X', amount: 'abc', category: 'Food' });
  assert('validateTransaction: string "abc" amount → valid:false', r.valid === false);
}

// ─── validateTransaction — category errors ────────────────────────────────────

{
  const r = validateTransaction({ itemName: 'X', amount: 10, category: '' });
  assert('validateTransaction: empty category → valid:false', r.valid === false);
  assert('validateTransaction: empty category → error present', r.errors.category !== undefined);
}

{
  const r = validateTransaction({ itemName: 'X', amount: 10, category: '   ' });
  assert('validateTransaction: whitespace-only category → valid:false', r.valid === false);
  assert('validateTransaction: whitespace-only category → error present', r.errors.category !== undefined);
}

// ─── validateTransaction — multiple errors at once ────────────────────────────

{
  const r = validateTransaction({ itemName: '', amount: 0, category: '' });
  assert('validateTransaction: all invalid → valid:false', r.valid === false);
  assert('validateTransaction: all invalid → itemName error', r.errors.itemName !== undefined);
  assert('validateTransaction: all invalid → amount error',   r.errors.amount   !== undefined);
  assert('validateTransaction: all invalid → category error', r.errors.category !== undefined);
}

// ─── validateCategory — valid inputs ─────────────────────────────────────────

{
  const r = validateCategory('Food');
  assert('validateCategory: "Food" → valid', r.valid === true);
  assert('validateCategory: "Food" → no error', r.error === undefined);
}

{
  const r = validateCategory('  Health  ');
  assert('validateCategory: padded "  Health  " → valid', r.valid === true);
}

{
  const r = validateCategory('A'.repeat(50));
  assert('validateCategory: exactly 50 chars → valid', r.valid === true);
}

// ─── validateCategory — invalid inputs ───────────────────────────────────────

{
  const r = validateCategory('');
  assert('validateCategory: empty string → valid:false', r.valid === false);
  assert('validateCategory: empty string → error present', typeof r.error === 'string');
}

{
  const r = validateCategory('   ');
  assert('validateCategory: whitespace-only → valid:false', r.valid === false);
  assert('validateCategory: whitespace-only → error present', typeof r.error === 'string');
}

{
  const r = validateCategory('A'.repeat(51));
  assert('validateCategory: 51 chars → valid:false', r.valid === false);
  assert('validateCategory: 51 chars → error present', typeof r.error === 'string');
}

// ─── validateSpendingLimit — valid inputs ─────────────────────────────────────

{
  const r = validateSpendingLimit('500');
  assert('validateSpendingLimit: "500" → valid', r.valid === true);
  assert('validateSpendingLimit: "500" → parsed is 500', r.parsed === 500);
}

{
  const r = validateSpendingLimit('1000000');
  assert('validateSpendingLimit: "1000000" → valid', r.valid === true);
  assert('validateSpendingLimit: "1000000" → parsed is 1000000', r.parsed === 1_000_000);
}

{
  const r = validateSpendingLimit(250.75);
  assert('validateSpendingLimit: numeric 250.75 → valid', r.valid === true);
  assert('validateSpendingLimit: numeric 250.75 → parsed is 250.75', r.parsed === 250.75);
}

{
  const r = validateSpendingLimit('0.01');
  assert('validateSpendingLimit: "0.01" (smallest positive) → valid', r.valid === true);
  assert('validateSpendingLimit: "0.01" → parsed is 0.01', r.parsed === 0.01);
}

// ─── validateSpendingLimit — invalid inputs ───────────────────────────────────

{
  const r = validateSpendingLimit('');
  assert('validateSpendingLimit: empty string → valid:false', r.valid === false);
  assert('validateSpendingLimit: empty string → error present', typeof r.error === 'string');
}

{
  const r = validateSpendingLimit('   ');
  assert('validateSpendingLimit: whitespace-only → valid:false', r.valid === false);
}

{
  const r = validateSpendingLimit('0');
  assert('validateSpendingLimit: "0" → valid:false', r.valid === false);
  assert('validateSpendingLimit: "0" → error present', typeof r.error === 'string');
}

{
  const r = validateSpendingLimit('-5');
  assert('validateSpendingLimit: "-5" → valid:false', r.valid === false);
  assert('validateSpendingLimit: "-5" → error present', typeof r.error === 'string');
}

{
  const r = validateSpendingLimit('abc');
  assert('validateSpendingLimit: "abc" → valid:false', r.valid === false);
  assert('validateSpendingLimit: "abc" → error present', typeof r.error === 'string');
}

{
  const r = validateSpendingLimit(NaN);
  assert('validateSpendingLimit: NaN → valid:false', r.valid === false);
}

{
  const r = validateSpendingLimit(Infinity);
  assert('validateSpendingLimit: Infinity → valid:false', r.valid === false);
}

{
  const r = validateSpendingLimit(0);
  assert('validateSpendingLimit: numeric 0 → valid:false', r.valid === false);
}

{
  const r = validateSpendingLimit(-1);
  assert('validateSpendingLimit: numeric -1 → valid:false', r.valid === false);
}

// ─── validateSpendingLimit — no parsed on invalid ─────────────────────────────

{
  const r = validateSpendingLimit('abc');
  assert('validateSpendingLimit: invalid → no parsed field', r.parsed === undefined);
}

// ─── Property-based tests (fast-check) ───────────────────────────────────────

function runPropertyTests() {
  if (typeof fc === 'undefined') {
    results.push({ ok: false, label: 'fast-check not available — skipping property tests', detail: 'load via CDN' });
    failed++;
    return;
  }

  // ── Property 1: Validator rejects all invalid transaction inputs ───────────
  // Feature: expense-tracker, Property 1: Validator rejects all invalid transaction inputs

  // 1a — whitespace-only itemName
  try {
    fc.assert(fc.property(
      fc.stringOf(fc.constantFrom(' ', '\t', '\n')).filter((s) => s.length > 0),
      (whitespace) => {
        const r = validateTransaction({ itemName: whitespace, amount: 10, category: 'Food' });
        return r.valid === false && r.errors.itemName !== undefined;
      }
    ), { numRuns: 100 });
    assert('Property 1a: Validator rejects whitespace-only itemName', true);
  } catch (e) {
    assert('Property 1a: Validator rejects whitespace-only itemName', false, e.message);
  }

  // 1b — itemName exceeding 100 chars
  try {
    fc.assert(fc.property(
      fc.string({ minLength: 101, maxLength: 300 }).filter((s) => s.trim().length > 100),
      (longName) => {
        const r = validateTransaction({ itemName: longName, amount: 10, category: 'Food' });
        return r.valid === false && r.errors.itemName !== undefined;
      }
    ), { numRuns: 100 });
    assert('Property 1b: Validator rejects itemName > 100 chars', true);
  } catch (e) {
    assert('Property 1b: Validator rejects itemName > 100 chars', false, e.message);
  }

  // 1c — zero or negative amounts
  try {
    fc.assert(fc.property(
      fc.oneof(fc.constant(0), fc.double({ max: -Number.MIN_VALUE, noNaN: true })),
      (badAmount) => {
        const r = validateTransaction({ itemName: 'Item', amount: badAmount, category: 'Food' });
        return r.valid === false && r.errors.amount !== undefined;
      }
    ), { numRuns: 100 });
    assert('Property 1c: Validator rejects zero/negative amounts', true);
  } catch (e) {
    assert('Property 1c: Validator rejects zero/negative amounts', false, e.message);
  }

  // 1d — amount over 1,000,000
  try {
    fc.assert(fc.property(
      fc.double({ min: 1_000_001, max: 1e15, noNaN: true }),
      (overMax) => {
        const r = validateTransaction({ itemName: 'Item', amount: overMax, category: 'Food' });
        return r.valid === false && r.errors.amount !== undefined;
      }
    ), { numRuns: 100 });
    assert('Property 1d: Validator rejects amount > 1,000,000', true);
  } catch (e) {
    assert('Property 1d: Validator rejects amount > 1,000,000', false, e.message);
  }

  // 1e — non-finite amounts (NaN, ±Infinity)
  try {
    fc.assert(fc.property(
      fc.oneof(fc.constant(NaN), fc.constant(Infinity), fc.constant(-Infinity)),
      (badAmount) => {
        const r = validateTransaction({ itemName: 'Item', amount: badAmount, category: 'Food' });
        return r.valid === false && r.errors.amount !== undefined;
      }
    ), { numRuns: 30 });
    assert('Property 1e: Validator rejects NaN/Infinity amounts', true);
  } catch (e) {
    assert('Property 1e: Validator rejects NaN/Infinity amounts', false, e.message);
  }

  // 1f — empty category
  try {
    fc.assert(fc.property(
      fc.stringOf(fc.constantFrom(' ', '\t', '\n')),
      (emptyish) => {
        const r = validateTransaction({ itemName: 'Item', amount: 10, category: emptyish });
        return r.valid === false && r.errors.category !== undefined;
      }
    ), { numRuns: 100 });
    assert('Property 1f: Validator rejects empty/whitespace-only category', true);
  } catch (e) {
    assert('Property 1f: Validator rejects empty/whitespace-only category', false, e.message);
  }

  // ── Property: Valid transaction inputs always produce valid:true ───────────
  // Feature: expense-tracker, Property 2: Valid transaction creation round-trip (validator side)
  try {
    fc.assert(fc.property(
      fc.record({
        itemName: fc.string({ minLength: 1, maxLength: 100 }).filter((s) => s.trim().length > 0),
        amount:   fc.double({ min: 0.01, max: 1_000_000, noNaN: true }),
        category: fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0),
      }),
      ({ itemName, amount, category }) => {
        const r = validateTransaction({ itemName, amount, category });
        return r.valid === true && Object.keys(r.errors).length === 0;
      }
    ), { numRuns: 100 });
    assert('Property 2: Valid transaction fields always pass validation', true);
  } catch (e) {
    assert('Property 2: Valid transaction fields always pass validation', false, e.message);
  }

  // ── Property: validateCategory rejects empty/whitespace ───────────────────
  // Feature: expense-tracker, Property 1 (category): validateCategory rejects invalid names
  try {
    fc.assert(fc.property(
      fc.stringOf(fc.constantFrom(' ', '\t', '\n')),
      (ws) => {
        const r = validateCategory(ws);
        return r.valid === false && typeof r.error === 'string';
      }
    ), { numRuns: 100 });
    assert('Property: validateCategory rejects whitespace-only names', true);
  } catch (e) {
    assert('Property: validateCategory rejects whitespace-only names', false, e.message);
  }

  // ── Property: validateCategory accepts valid names ─────────────────────────
  try {
    fc.assert(fc.property(
      fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0),
      (name) => {
        const r = validateCategory(name);
        return r.valid === true && r.error === undefined;
      }
    ), { numRuns: 100 });
    assert('Property: validateCategory accepts valid names (1–50 trimmed chars)', true);
  } catch (e) {
    assert('Property: validateCategory accepts valid names (1–50 trimmed chars)', false, e.message);
  }

  // ── Property: validateSpendingLimit rejects non-positive / non-finite ──────
  // Feature: expense-tracker, Property 1 (spending limit): validateSpendingLimit rejects invalid values
  try {
    fc.assert(fc.property(
      fc.oneof(
        fc.constant(0),
        fc.double({ max: -Number.MIN_VALUE, noNaN: true }),
        fc.constant(NaN),
        fc.constant(Infinity),
        fc.constant(-Infinity)
      ),
      (bad) => {
        const r = validateSpendingLimit(bad);
        return r.valid === false && typeof r.error === 'string' && r.parsed === undefined;
      }
    ), { numRuns: 100 });
    assert('Property: validateSpendingLimit rejects non-positive/non-finite numbers', true);
  } catch (e) {
    assert('Property: validateSpendingLimit rejects non-positive/non-finite numbers', false, e.message);
  }

  // ── Property: validateSpendingLimit accepts positive finite numbers ────────
  try {
    fc.assert(fc.property(
      fc.double({ min: 0.01, max: 1e12, noNaN: true }),
      (good) => {
        const r = validateSpendingLimit(good);
        return r.valid === true && r.parsed === good && r.error === undefined;
      }
    ), { numRuns: 100 });
    assert('Property: validateSpendingLimit accepts positive finite numbers', true);
  } catch (e) {
    assert('Property: validateSpendingLimit accepts positive finite numbers', false, e.message);
  }

  // ── Property: validateSpendingLimit parses valid numeric strings ──────────
  try {
    fc.assert(fc.property(
      fc.double({ min: 0.01, max: 1e12, noNaN: true }),
      (good) => {
        const asStr = String(good);
        const r = validateSpendingLimit(asStr);
        return r.valid === true && r.parsed === parseFloat(asStr);
      }
    ), { numRuns: 100 });
    assert('Property: validateSpendingLimit parses valid numeric strings correctly', true);
  } catch (e) {
    assert('Property: validateSpendingLimit parses valid numeric strings correctly', false, e.message);
  }
}

runPropertyTests();

// ─── Summary ──────────────────────────────────────────────────────────────────

export { results, passed, failed };
