# Design Document: Expense Tracker

## Overview

The Expense Tracker is a single-page web application implemented entirely in HTML, CSS, and Vanilla JavaScript with no build tools or backend. It runs directly in a browser from a `file://` URL or any static host. All state is persisted in the browser's `localStorage` under four keys: `et_transactions`, `et_categories`, `et_theme`, and `et_spending_limit`.

The UI is divided into a left-hand input panel (form, category manager, spending limit) and a right-hand display panel (balance, chart, transaction list, monthly summary). A header bar hosts the theme toggle. Chart.js 4.x is loaded via CDN and used for the category pie chart.

**Key design decisions:**

- **No frameworks or build tools** — keeps the artifact a self-contained set of static files that open instantly with a double-click.
- **Module pattern via IIFE / ES module conventions** — logical separation without a bundler by splitting concerns across `js/store.js`, `js/validator.js`, `js/chart-manager.js`, `js/ui.js`, and `js/app.js`, loaded via `<script type="module">` tags.
- **Immutable-style state mutations** — each state change produces a fresh array/object that is then written atomically to `localStorage`, making the data flow easy to follow and test.
- **Event delegation** — a single `click` listener on the transaction list container handles all delete clicks, keeping the DOM-event surface small.
- **Chart in-place update** — the `Chart` instance is created once; subsequent data changes mutate `chart.data` and call `chart.update()` per the requirements.

---

## Architecture

```
index.html
├── <link> styles/main.css
├── <script src="https://cdn.jsdelivr.net/npm/chart.js"> (CDN)
└── <script type="module" src="js/app.js">

js/
├── app.js            ← bootstrap: wires event listeners, calls initial render
├── store.js          ← read/write localStorage; expose typed getters & setters
├── validator.js      ← pure validation functions, no DOM access
├── chart-manager.js  ← Chart.js wrapper: create / update / hide chart
└── ui.js             ← all DOM rendering functions (transactions, summary, balance)

styles/
└── main.css          ← variables for light/dark tokens, layout, over-limit class
```

### Data flow

```
User interaction
      │
      ▼
   app.js (event handler)
      │
      ├── validator.js  ──► show/clear inline errors
      │
      ├── store.js  ──────► localStorage read / write
      │
      ├── ui.js  ─────────► re-render list / balance / summary
      │
      └── chart-manager.js ► chart.data mutation + chart.update()
```

All rendering is triggered by explicit function calls from `app.js` after state changes — there is no reactive/observable framework.

---

## Components and Interfaces

### `store.js`

```javascript
// Returns typed state; falls back to documented defaults on missing/malformed data
getTransactions()   → Transaction[]
getCategories()     → string[]
getTheme()          → 'light' | 'dark'
getSpendingLimit()  → number | null

setTransactions(txns: Transaction[])   → void  // writes et_transactions
setCategories(cats: string[])          → void  // writes et_categories
setTheme(theme: 'light' | 'dark')     → void  // writes et_theme
setSpendingLimit(limit: number | null) → void  // writes et_spending_limit

// Convenience helpers
addTransaction(tx: Transaction)        → Transaction[]  // returns updated list
deleteTransaction(id: string)          → Transaction[]  // returns updated list
addCategory(name: string)              → string[]        // idempotent, case-sensitive
```

All setters serialise via `JSON.stringify` before writing. All getters wrap the `JSON.parse` call in a `try/catch` and return the documented default on any error.

### `validator.js`

```javascript
validateTransaction(fields: { itemName, amount, category })
  → { valid: boolean, errors: { itemName?, amount?, category? } }

validateCategory(name: string)
  → { valid: boolean, error?: string }

validateSpendingLimit(value: string)
  → { valid: boolean, error?: string, parsed?: number }
```

All functions are pure — no DOM access, no side effects.

### `chart-manager.js`

```javascript
initChart(canvasEl: HTMLCanvasElement) → Chart | null
  // Returns null and hides container if Chart is not available

updateChart(chart: Chart, categoryTotals: CategorySummary[]) → void
  // Mutates chart.data.labels, chart.data.datasets[0].data, calls chart.update()

showNoDataMessage(containerEl: HTMLElement) → void
hideNoDataMessage(containerEl: HTMLElement) → void
```

`initChart` checks `typeof Chart !== 'undefined'` before instantiation. If the CDN script failed to load, it hides `#chart-container` and renders the fallback message.

### `ui.js`

```javascript
renderTransactionList(txns: Transaction[], spendingLimit: number | null) → void
renderBalance(txns: Transaction[]) → void
renderMonthlySummary(txns: Transaction[], spendingLimit: number | null) → void
renderCategoryOptions(categories: string[]) → void
showFieldError(fieldId: string, message: string) → void
clearFieldErrors() → void
setTheme(theme: 'light' | 'dark') → void
moveFocusAfterDelete(deletedId: string, remainingTxns: Transaction[]) → void
```

### `app.js`

Entry point. Responsibilities:

1. On `DOMContentLoaded`: restore state from `store.js`, apply theme, init chart, render all UI sections.
2. Register event listeners for: form submit, delete clicks (delegated), sort change, add-category submit, spending-limit set/clear, theme toggle.
3. Coordinate validator → store → ui/chart-manager pipeline after each mutation.

---

## Data Models

### Transaction

```javascript
{
  id: string,          // UUID v4 or `Date.now().toString(36) + Math.random().toString(36).slice(2)`
  itemName: string,    // trimmed, 1–100 chars
  amount: number,      // positive, rounded to 2 d.p.  (max 1_000_000)
  category: string,    // non-empty
  date: string         // "YYYY-MM-DD"
}
```

### CategorySummary (computed, not stored)

```javascript
{
  category: string,
  total: number,        // sum of amounts, rounded to 2 d.p.
  percentage: number    // (total / grandTotal) * 100, rounded to 1 d.p.
}
```

### MonthlySummary (computed, not stored)

```javascript
{
  month: string,                    // "YYYY-MM"
  total: number,                    // rounded to 2 d.p.
  overLimit: boolean,
  breakdown: CategorySummary[]      // per-category within the month
}
```

### AppState (in-memory, mirrors localStorage)

```javascript
{
  transactions:  Transaction[],
  categories:    string[],
  theme:         'light' | 'dark',
  spendingLimit: number | null
}
```

### localStorage keys

| Key | Type stored | Default |
|-----|-------------|---------|
| `et_transactions` | `Transaction[]` JSON | `[]` |
| `et_categories` | `string[]` JSON | `['Food','Transport','Fun']` |
| `et_theme` | `'light' \| 'dark'` JSON string | `'light'` |
| `et_spending_limit` | `number` JSON or absent | `null` |

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Validator rejects all invalid transaction inputs

*For any* combination of invalid transaction field values — including an `itemName` that is empty or whitespace-only or exceeds 100 characters, an `amount` that is 0, negative, greater than 1,000,000, NaN, or Infinity, or an empty `category` — `validateTransaction` SHALL return `valid: false` with an error entry for each failing field.

**Validates: Requirements 1.2**

---

### Property 2: Valid transaction creation round-trip

*For any* valid transaction fields (non-empty trimmed `itemName` ≤ 100 chars, `amount` in (0, 1,000,000], non-empty `category`), creating a transaction via `addTransaction` and then reading back from `getTransactions` SHALL include a transaction whose `itemName` equals the trimmed input, `amount` equals the input rounded to 2 decimal places, and `category` and `date` are preserved unchanged.

**Validates: Requirements 1.4, 9.1, 9.2**

---

### Property 3: Delete transaction removes exactly one entry

*For any* non-empty list of transactions and any valid transaction ID present in the list, calling `deleteTransaction(id)` SHALL return a list of length `originalLength - 1` that contains no transaction with that ID, and all other transactions remain unchanged.

**Validates: Requirements 2.3, 9.1**

---

### Property 4: Transaction list sort order is correct for all sort modes

*For any* list of transactions, sorting by "date descending" SHALL produce a list where each entry's date is ≥ the next entry's date; sorting by "amount ascending" SHALL produce a list where each entry's amount is ≤ the next entry's amount; sorting by "category A–Z" SHALL produce a list where each entry's category is lexicographically ≤ the next entry's category.

**Validates: Requirements 2.1, 2.4**

---

### Property 5: Balance equals sum of all transaction amounts

*For any* list of transactions (including the empty list), the computed balance SHALL equal the sum of all `amount` fields rounded to 2 decimal places, and SHALL equal "0.00" when the list is empty.

**Validates: Requirements 3.1, 3.3**

---

### Property 6: Category addition is idempotent (case-sensitive)

*For any* categories list and any name already present in that list (exact match after trimming), calling `addCategory` with that name SHALL leave the list unchanged in length and contents.

**Validates: Requirements 5.3**

---

### Property 7: Store round-trip preserves all data types

*For any* valid `AppState` (transactions, categories, theme, spendingLimit), writing it to `localStorage` via the store setters and then reading it back via the store getters SHALL produce a value deep-equal to the original, with correct types (`number` for amounts, `null` for absent spending limit, `'light' | 'dark'` for theme).

**Validates: Requirements 9.1, 9.2**

---

### Property 8: Store falls back to defaults on malformed or missing data

*For any* string that is not valid JSON, or that is valid JSON of the wrong type, writing it directly into any `localStorage` key and then calling the corresponding store getter SHALL return the documented default value (`[]`, `['Food','Transport','Fun']`, `'light'`, or `null`) without throwing an exception.

**Validates: Requirements 9.3, 9.4**

---

### Property 9: Over-limit flag is consistent with spending limit across all views

*For any* list of transactions and any positive spending limit, both the transaction list rows and the monthly summary entries SHALL have `over-limit` applied if and only if the sum of that calendar month's transaction amounts strictly exceeds the spending limit. When the spending limit is `null`, no `over-limit` flag SHALL appear anywhere.

**Validates: Requirements 2.5, 6.4, 7.2, 7.5**

---

### Property 10: Monthly summary months and totals are correct

*For any* list of transactions, the set of months in the `MonthlySummary` SHALL exactly match the set of distinct YYYY-MM prefixes of all transaction dates; each month's `total` SHALL equal the sum of `amount` fields of all transactions in that month rounded to 2 decimal places; and the entries SHALL appear in descending YYYY-MM order.

**Validates: Requirements 6.1, 6.2, 6.3**

---

### Property 11: Category percentages sum to 100

*For any* non-empty list of transactions, the `percentage` values across all `CategorySummary` entries SHALL sum to 100.0 (allowing ±0.2 floating-point tolerance from per-slice rounding to 1 decimal place).

**Validates: Requirements 4.1**

---

## Error Handling

| Scenario | Handling |
|----------|----------|
| Form submitted with invalid fields | Inline error messages per field; transaction not created; form not reset |
| Empty / whitespace category name submitted | Inline error in category section; category not added |
| Invalid spending limit submitted | Inline error adjacent to spending limit input; limit not updated |
| `localStorage` key missing | Getter returns documented default; no error thrown |
| `localStorage` value is malformed JSON | `try/catch` in getter; documented default returned |
| `localStorage` full (`QuotaExceededError`) | `try/catch` around `setItem`; display a non-blocking toast/banner "Could not save data" |
| Chart.js CDN fails to load | `typeof Chart` guard in `initChart`; `#chart-container` hidden; fallback message shown; all other features work normally |
| `onerror` on Chart.js `<script>` tag | `window.chartJsLoadError = true`; checked by `initChart` to show fallback without waiting for runtime `typeof` check |

---

## Testing Strategy

### Unit tests (example-based)

Use a lightweight test harness (e.g., a custom `assert` helper or [uvu](https://github.com/lukeed/uvu)) runnable via Node.js without a browser.

Focus areas:

- `validator.js` — each field boundary: empty string, whitespace-only, max-length boundary ±1, amount = 0, negative amount, amount = 1,000,001, NaN, Infinity.
- `store.js` — round-trip for each key; malformed JSON fallback for each key; `QuotaExceededError` path.
- Category summary and monthly summary computation helpers — specific examples with known expected totals and percentages.

### Property-based tests

Use **[fast-check](https://fast-check.dev/)** (loaded via CDN in a test HTML page, or via Node.js `require`). Run a minimum of **100 iterations per property**.

Each test must include a comment referencing its design property:

```javascript
// Feature: expense-tracker, Property 1: Validator rejects whitespace-only item names
fc.assert(fc.property(
  fc.stringOf(fc.constantFrom(' ', '\t', '\n')).filter(s => s.length > 0),
  (whitespace) => {
    const result = validateTransaction({ itemName: whitespace, amount: '10', category: 'Food' });
    return result.valid === false && result.errors.itemName !== undefined;
  }
), { numRuns: 100 });
```

Tag format: `// Feature: expense-tracker, Property {N}: {property_text}`

Properties to cover:

| Property | fast-check generators |
|---|---|
| 1 – Validator rejects all invalid transaction inputs | `fc.oneof(fc.stringOf(fc.constantFrom(' ','\t','\n')), fc.constant(''), fc.double({max:0}), fc.constant(0), fc.double({min:1_000_001}), fc.constant(NaN), fc.constant(Infinity))` |
| 2 – Transaction creation round-trip | `fc.record({ itemName: fc.string({minLength:1,maxLength:100}).filter(s=>s.trim().length>0), amount: fc.double({min:0.01,max:1_000_000,noNaN:true}), category: fc.string({minLength:1}) })` |
| 3 – Delete removes exactly one | `fc.array(transactionArb, {minLength:1})` + pick random id |
| 4 – Sort order correct for all modes | `fc.array(transactionArb)` × 3 sort modes |
| 5 – Balance equals sum | `fc.array(transactionArb)` (including empty) |
| 6 – Category add idempotence | `fc.array(fc.string({minLength:1,maxLength:50}),{minLength:1})` + re-add existing |
| 7 – Store round-trip | `fc.record(appStateArb)` |
| 8 – Store malformed fallback | `fc.string()` per key |
| 9 – Over-limit flag consistency | `fc.array(transactionArb,{minLength:1})` + `fc.double({min:0.01,noNaN:true})` |
| 10 – Monthly summary months and totals | `fc.array(transactionArb)` |
| 11 – Percentages sum to 100 | `fc.array(transactionArb,{minLength:1})` |

### Integration / smoke tests

- Open `index.html` in a real browser (Chrome + Firefox) and verify:
  - Adding a transaction updates balance, list, chart, and monthly summary.
  - Refreshing the page restores all data.
  - Toggling theme persists after reload.
  - Blocking Chart.js CDN (DevTools → Network block) shows the fallback message.
  - `localStorage` cleared → defaults applied on reload.

### Accessibility checks

- Run axe DevTools or Lighthouse accessibility audit in Chrome.
- Manually verify keyboard-only navigation: Tab through all interactive elements, delete a transaction with Enter/Space, confirm focus moves to the next delete button.
- Verify contrast ratios with the DevTools colour-picker in both light and dark themes.
