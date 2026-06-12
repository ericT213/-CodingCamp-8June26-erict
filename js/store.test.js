/**
 * js/store.test.js
 * Unit + property-based tests for store.js
 *
 * Run via: test/store-test.html (opens in a browser, no build tools required)
 * Uses fast-check loaded from CDN for property-based tests.
 *
 * Requirements validated: 9.1, 9.2, 9.3, 9.4
 */

import {
  getTransactions,
  getCategories,
  getTheme,
  getSpendingLimit,
  setTransactions,
  setCategories,
  setTheme,
  setSpendingLimit,
  addTransaction,
  deleteTransaction,
  addCategory,
} from './store.js';

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Clear all store keys from localStorage before each test group */
function clearStore() {
  localStorage.removeItem('et_transactions');
  localStorage.removeItem('et_categories');
  localStorage.removeItem('et_theme');
  localStorage.removeItem('et_spending_limit');
}

/** Build a minimal valid transaction */
function makeTx(overrides = {}) {
  return {
    id:       overrides.id       ?? 'tx-' + Math.random().toString(36).slice(2),
    itemName: overrides.itemName ?? 'Coffee',
    amount:   overrides.amount   ?? 4.50,
    category: overrides.category ?? 'Food',
    date:     overrides.date     ?? '2024-01-15',
  };
}

// ─── Unit tests: Getters — defaults on empty store ────────────────────────────

clearStore();
assertEqual('getTransactions() default is []', getTransactions(), []);
assertEqual('getCategories() default is [Food, Transport, Fun]', getCategories(), ['Food', 'Transport', 'Fun']);
assertEqual('getTheme() default is "light"', getTheme(), 'light');
assertEqual('getSpendingLimit() default is null', getSpendingLimit(), null);

// ─── Unit tests: Getters — malformed JSON ─────────────────────────────────────

localStorage.setItem('et_transactions',   'NOT_JSON');
localStorage.setItem('et_categories',     '{bad json]');
localStorage.setItem('et_theme',          'NOT_JSON');
localStorage.setItem('et_spending_limit', 'garbage');

assertEqual('getTransactions() on malformed JSON → []',              getTransactions(), []);
assertEqual('getCategories() on malformed JSON → default',           getCategories(),   ['Food', 'Transport', 'Fun']);
assertEqual('getTheme() on malformed JSON → "light"',                getTheme(),        'light');
assertEqual('getSpendingLimit() on malformed JSON → null',           getSpendingLimit(), null);

// ─── Unit tests: Getters — invalid types (valid JSON, wrong type) ─────────────

localStorage.setItem('et_transactions',   '"a string"');
localStorage.setItem('et_categories',     '42');
localStorage.setItem('et_theme',          '"invalid-theme"');
localStorage.setItem('et_spending_limit', '-5');

assertEqual('getTransactions() with non-array JSON → []',            getTransactions(), []);
assertEqual('getCategories() with non-array JSON → default',         getCategories(),   ['Food', 'Transport', 'Fun']);
assertEqual('getTheme() with invalid theme string → "light"',        getTheme(),        'light');
assertEqual('getSpendingLimit() with negative number → null',        getSpendingLimit(), null);

// Edge cases for spending limit
localStorage.setItem('et_spending_limit', '0');
assertEqual('getSpendingLimit() with 0 → null',                      getSpendingLimit(), null);

localStorage.setItem('et_spending_limit', 'null');
assertEqual('getSpendingLimit() with JSON null → null',              getSpendingLimit(), null);

// ─── Unit tests: Getters — valid stored values ────────────────────────────────

clearStore();
const txFixture = [makeTx({ id: 'a1', itemName: 'Lunch', amount: 12.50, category: 'Food', date: '2024-03-01' })];
const catFixture = ['Food', 'Transport', 'Fun', 'Gym'];

localStorage.setItem('et_transactions',   JSON.stringify(txFixture));
localStorage.setItem('et_categories',     JSON.stringify(catFixture));
localStorage.setItem('et_theme',          JSON.stringify('dark'));
localStorage.setItem('et_spending_limit', JSON.stringify(500));

assertEqual('getTransactions() restores stored array',      getTransactions(), txFixture);
assertEqual('getCategories() restores stored array',        getCategories(),   catFixture);
assertEqual('getTheme() restores "dark"',                   getTheme(),        'dark');
assertEqual('getSpendingLimit() restores positive number',  getSpendingLimit(), 500);

// ─── Unit tests: Setters ──────────────────────────────────────────────────────

clearStore();

const tx1 = makeTx({ id: 'id-1', itemName: 'Bus', amount: 2.00, category: 'Transport', date: '2024-06-01' });
const tx2 = makeTx({ id: 'id-2', itemName: 'Pizza', amount: 15.00, category: 'Food', date: '2024-06-02' });

setTransactions([tx1, tx2]);
assertEqual('setTransactions persists and getTransactions restores', getTransactions(), [tx1, tx2]);

setCategories(['Alpha', 'Beta']);
assertEqual('setCategories persists and getCategories restores', getCategories(), ['Alpha', 'Beta']);

setTheme('dark');
assertEqual('setTheme("dark") persists', getTheme(), 'dark');

setTheme('light');
assertEqual('setTheme("light") persists', getTheme(), 'light');

setSpendingLimit(250.75);
assertEqual('setSpendingLimit(250.75) persists', getSpendingLimit(), 250.75);

setSpendingLimit(null);
assertEqual('setSpendingLimit(null) persists as null', getSpendingLimit(), null);

// ─── Unit tests: addTransaction ───────────────────────────────────────────────

clearStore();
const txA = makeTx({ id: 'a', itemName: 'Tea', amount: 1.50, category: 'Food', date: '2024-01-01' });
const txB = makeTx({ id: 'b', itemName: 'Train', amount: 5.00, category: 'Transport', date: '2024-01-02' });

let list = addTransaction(txA);
assertEqual('addTransaction returns [txA]', list, [txA]);
assertEqual('addTransaction persists txA', getTransactions(), [txA]);

list = addTransaction(txB);
assertEqual('addTransaction returns [txA, txB]', list, [txA, txB]);
assertEqual('addTransaction persists [txA, txB]', getTransactions(), [txA, txB]);

// ─── Unit tests: deleteTransaction ───────────────────────────────────────────

clearStore();
setTransactions([txA, txB]);

list = deleteTransaction('a');
assertEqual('deleteTransaction removes txA, returns [txB]', list, [txB]);
assertEqual('deleteTransaction persists [txB]', getTransactions(), [txB]);

list = deleteTransaction('nonexistent-id');
assertEqual('deleteTransaction with unknown id returns unchanged list', list, [txB]);

list = deleteTransaction('b');
assertEqual('deleteTransaction removes last item, returns []', list, []);
assertEqual('deleteTransaction persists [] after removing last', getTransactions(), []);

// ─── Unit tests: addCategory ──────────────────────────────────────────────────

clearStore();
setCategories(['Food', 'Transport', 'Fun']);

let cats = addCategory('Gym');
assertEqual('addCategory adds new name', cats, ['Food', 'Transport', 'Fun', 'Gym']);

cats = addCategory('Gym');  // idempotent
assertEqual('addCategory is idempotent for existing name', cats, ['Food', 'Transport', 'Fun', 'Gym']);

cats = addCategory('gym');  // case-sensitive — 'gym' ≠ 'Gym'
assertEqual('addCategory is case-sensitive (gym ≠ Gym)', cats, ['Food', 'Transport', 'Fun', 'Gym', 'gym']);

cats = addCategory('  Health  ');  // trimmed
assertEqual('addCategory trims whitespace', cats, ['Food', 'Transport', 'Fun', 'Gym', 'gym', 'Health']);

cats = addCategory('Health');  // trimmed duplicate
assertEqual('addCategory idempotent after trim', cats, ['Food', 'Transport', 'Fun', 'Gym', 'gym', 'Health']);

// ─── Property-based tests (fast-check) ───────────────────────────────────────

// fc is expected to be available globally when loaded via CDN in test/store-test.html

function runPropertyTests() {
  if (typeof fc === 'undefined') {
    results.push({ ok: false, label: 'fast-check not available — skipping property tests', detail: 'load via CDN' });
    failed++;
    return;
  }

  // Arbitraries
  const validDateArb = fc.date({ min: new Date('2000-01-01'), max: new Date('2099-12-31') }).map(
    (d) => d.toISOString().slice(0, 10)
  );

  const transactionArb = fc.record({
    id:       fc.hexaString({ minLength: 4, maxLength: 12 }),
    itemName: fc.string({ minLength: 1, maxLength: 100 }).filter((s) => s.trim().length > 0),
    amount:   fc.double({ min: 0.01, max: 1_000_000, noNaN: true }).map((n) => Math.round(n * 100) / 100),
    category: fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0),
    date:     validDateArb,
  });

  // ── Property 7: Store round-trip preserves all data types ─────────────────
  // Feature: expense-tracker, Property 7: Store round-trip preserves all data types
  try {
    fc.assert(fc.property(
      fc.array(transactionArb),
      fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 1, maxLength: 20 }),
      fc.constantFrom('light', 'dark'),
      fc.oneof(fc.constant(null), fc.double({ min: 0.01, max: 1_000_000, noNaN: true })),
      (txns, cats, theme, limit) => {
        clearStore();
        setTransactions(txns);
        setCategories(cats);
        setTheme(theme);
        setSpendingLimit(limit);

        const rtTxns  = getTransactions();
        const rtCats  = getCategories();
        const rtTheme = getTheme();
        const rtLimit = getSpendingLimit();

        return (
          JSON.stringify(rtTxns)  === JSON.stringify(txns)  &&
          JSON.stringify(rtCats)  === JSON.stringify(cats)  &&
          rtTheme  === theme &&
          rtLimit  === limit
        );
      }
    ), { numRuns: 100 });
    assert('Property 7: Store round-trip preserves all data types', true);
  } catch (e) {
    assert('Property 7: Store round-trip preserves all data types', false, e.message);
  }

  // ── Property 8: Store falls back to defaults on malformed or missing data ──
  // Feature: expense-tracker, Property 8: Store falls back to defaults on malformed/missing data
  try {
    fc.assert(fc.property(
      fc.string(),
      (garbage) => {
        localStorage.setItem('et_transactions',   garbage);
        localStorage.setItem('et_categories',     garbage);
        localStorage.setItem('et_theme',          garbage);
        localStorage.setItem('et_spending_limit', garbage);

        let ok = true;
        try {
          const txns  = getTransactions();
          const cats  = getCategories();
          const theme = getTheme();
          const limit = getSpendingLimit();

          ok = (
            Array.isArray(txns)  && txns.length === 0 &&
            Array.isArray(cats)  && JSON.stringify(cats) === JSON.stringify(['Food', 'Transport', 'Fun']) &&
            theme === 'light' &&
            limit === null
          );
        } catch {
          ok = false; // getters must not throw
        }
        return ok;
      }
    ), { numRuns: 100 });
    assert('Property 8: Store falls back to defaults on malformed data', true);
  } catch (e) {
    assert('Property 8: Store falls back to defaults on malformed data', false, e.message);
  }

  // ── Property 3: deleteTransaction removes exactly one entry ───────────────
  // Feature: expense-tracker, Property 3: Delete removes exactly one entry
  try {
    fc.assert(fc.property(
      fc.array(transactionArb, { minLength: 1, maxLength: 20 }),
      fc.integer({ min: 0, max: 19 }),
      (txns, indexHint) => {
        // Ensure unique IDs within the generated array
        const uniqueTxns = txns.map((tx, i) => ({ ...tx, id: `uid-${i}` }));
        const idx = indexHint % uniqueTxns.length;
        const targetId = uniqueTxns[idx].id;

        clearStore();
        setTransactions(uniqueTxns);
        const updated = deleteTransaction(targetId);

        return (
          updated.length === uniqueTxns.length - 1 &&
          !updated.some((t) => t.id === targetId) &&
          updated.every((t) => uniqueTxns.some((u) => JSON.stringify(u) === JSON.stringify(t)))
        );
      }
    ), { numRuns: 100 });
    assert('Property 3: deleteTransaction removes exactly one entry', true);
  } catch (e) {
    assert('Property 3: deleteTransaction removes exactly one entry', false, e.message);
  }

  // ── Property 6: addCategory is idempotent (case-sensitive) ────────────────
  // Feature: expense-tracker, Property 6: Category addition is idempotent (case-sensitive)
  try {
    fc.assert(fc.property(
      fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 1, maxLength: 20 }),
      fc.integer({ min: 0, max: 19 }),
      (names, indexHint) => {
        const idx = indexHint % names.length;
        const existing = names[idx].trim();
        if (existing.length === 0) return true; // skip empty-after-trim names

        clearStore();
        setCategories(names.map((n) => n.trim()).filter((n) => n.length > 0));

        const before = getCategories();
        // Only test idempotence if the name actually exists after trimming
        if (!before.includes(existing)) return true;

        const after = addCategory(existing);
        return after.length === before.length && JSON.stringify(after) === JSON.stringify(before);
      }
    ), { numRuns: 100 });
    assert('Property 6: addCategory is idempotent for existing names', true);
  } catch (e) {
    assert('Property 6: addCategory is idempotent for existing names', false, e.message);
  }
}

runPropertyTests();

// ─── Summary ──────────────────────────────────────────────────────────────────

clearStore(); // clean up after tests

export { results, passed, failed };
