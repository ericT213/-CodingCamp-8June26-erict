# Implementation Plan: Expense Tracker

## Overview

Build a single-page Expense Tracker using HTML, CSS, and Vanilla JavaScript. Files are split into `index.html`, `styles/main.css`, and five JS modules (`store.js`, `validator.js`, `chart-manager.js`, `ui.js`, `app.js`). All state is persisted in `localStorage`. Chart.js 4.x is loaded via CDN.

## Tasks

- [x] 1. Scaffold project structure and base HTML
  - Create `index.html` with semantic layout: header (theme toggle), left panel (form, category manager, spending limit), right panel (balance, chart container, transaction list, monthly summary)
  - Add CDN `<script>` tag for Chart.js 4.x with `onerror` handler that sets `window.chartJsLoadError = true`
  - Add `<script type="module" src="js/app.js">` and `<link rel="stylesheet" href="styles/main.css">`
  - Add `id` attributes for all interactive elements and containers referenced by JS modules
  - Associate every form field and interactive element with a `<label>` or `aria-label`
  - _Requirements: 1.1, 10.1, 10.2, 10.4, 11.1_

- [x] 2. Implement the Store module
  - [x] 2.1 Create `js/store.js` with all getters and setters
    - Implement `getTransactions`, `getCategories`, `getTheme`, `getSpendingLimit` — each with `try/catch` and documented defaults
    - Implement `setTransactions`, `setCategories`, `setTheme`, `setSpendingLimit` — each wrapping `JSON.stringify` + `localStorage.setItem` in a `try/catch` for `QuotaExceededError`
    - Implement convenience helpers: `addTransaction`, `deleteTransaction`, `addCategory`
    - Validate theme values (`'light'` / `'dark'` only) and spending limit (`positive finite number or null`) during reads
    - _Requirements: 9.1, 9.2, 9.3, 9.4_


- [x] 3. Implement the Validator module
  - [x] 3.1 Create `js/validator.js` with all three pure validation functions
    - `validateTransaction`: check `itemName` (non-empty after trim, ≤ 100 chars), `amount` (positive finite number, > 0, ≤ 1,000,000), `category` (non-empty)
    - `validateCategory`: check name is non-empty after trimming, ≤ 50 chars
    - `validateSpendingLimit`: check value is a positive finite number > 0, return `parsed` as a float
    - _Requirements: 1.2, 1.3, 5.1, 5.5, 7.1, 7.3_
- [x] 4. Implement the UI module
  - [x] 4.1 Create `js/ui.js` with all rendering functions
    - `renderTransactionList(txns, spendingLimit)`: render each row with item name, amount (2 d.p.), category, date, delete button; apply `over-limit` class where monthly total exceeds limit; show placeholder when empty
    - `renderBalance(txns)`: compute and display sum of amounts rounded to 2 d.p.; display "0.00" when empty
    - `renderMonthlySummary(txns, spendingLimit)`: group by YYYY-MM descending, show total + per-category breakdown with percentages; apply `over-limit` class; show placeholder when empty
    - `renderCategoryOptions(categories)`: populate the Category `<select>` in the transaction form
    - `showFieldError(fieldId, message)` and `clearFieldErrors()`: display/clear inline error messages adjacent to fields
    - `setTheme(theme)`: add/remove `dark` class on `document.body`
    - `moveFocusAfterDelete(deletedId, remainingTxns)`: move focus to next delete button or list container
    - _Requirements: 2.1, 2.2, 2.5, 2.6, 3.1, 3.3, 6.1, 6.2, 6.3, 6.4, 6.5, 8.2, 11.4_


- [x] 5. Checkpoint — Ensure core data modules work
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Implement the Chart Manager module
  - [x] 6.1 Create `js/chart-manager.js`
    - `initChart(canvasEl)`: guard `typeof Chart !== 'undefined'` and `window.chartJsLoadError`; if Chart.js unavailable, hide `#chart-container` and show fallback message; otherwise instantiate a `new Chart` of type `'doughnut'` or `'pie'`
    - `updateChart(chart, categoryTotals)`: mutate `chart.data.labels` and `chart.data.datasets[0].data` then call `chart.update()`; call `showNoDataMessage` / `hideNoDataMessage` based on whether `categoryTotals` is empty
    - `showNoDataMessage(containerEl)` and `hideNoDataMessage(containerEl)`
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 10.2, 10.5_

- [x] 7. Wire everything together in the App entry point
  - [x] 7.1 Create `js/app.js` and register all event listeners on `DOMContentLoaded`
    - Restore state from `store.js`, apply saved theme, init chart, render all UI sections
    - **Transaction form submit**: run `validateTransaction` → show errors or create transaction via `addTransaction`, reset form, re-render list/balance/chart/summary
    - **Delete button (delegated click on list container)**: call `deleteTransaction`, re-render list/balance/chart/summary, call `moveFocusAfterDelete`
    - **Sort change**: re-render transaction list with selected sort order
    - **Add Category submit**: run `validateCategory` → show error or call `addCategory`, re-render category dropdown
    - **Spending Limit set**: run `validateSpendingLimit` → show error or call `setSpendingLimit`, re-render list and summary to update `over-limit` flags
    - **Clear Limit button**: call `setSpendingLimit(null)`, re-render list and summary
    - **Theme toggle**: toggle between `'light'` and `'dark'`, call `store.setTheme`, call `ui.setTheme`, update button label/aria-label
    - **`localStorage` QuotaExceededError**: display non-blocking toast/banner "Could not save data"
    - _Requirements: 1.4, 1.5, 2.3, 2.4, 5.2, 5.3, 7.2, 7.4, 8.1, 8.2, 8.3, 8.4, 9.1, 9.2, 11.2_

  

- [x] 8. Implement styles
  - [x] 8.1 Create `styles/main.css` with full styling for both themes
    - Define CSS custom properties (variables) for light and dark colour tokens on `:root` and `body.dark`
    - Style the two-column layout (left panel / right panel), header, form, list rows, chart container, monthly summary, balance display
    - Implement `.over-limit` class (e.g., red border or background tint) applied to list rows and summary entries
    - Ensure minimum contrast ratio of 4.5:1 for normal text and 3:1 for large text in both themes
    - _Requirements: 2.5, 6.4, 8.2, 11.3_

- [x] 9. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property tests use [fast-check](https://fast-check.dev/) and should include comments in the format `// Feature: expense-tracker, Property {N}: {property_text}`
- Unit tests for `store.js` and `validator.js` should cover boundary values (empty strings, whitespace-only, max-length ±1, amount = 0, negative, 1,000,001, NaN, Infinity)
- Integration smoke tests (manual): add transaction → refresh → data persists; block Chart.js CDN → fallback shows; clear localStorage → defaults applied

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["2.1", "3.1"] },
    { "id": 1, "tasks": ["2.2", "2.3", "3.2", "4.1"] },
    { "id": 2, "tasks": ["4.2", "4.3", "4.4", "4.5", "6.1"] },
    { "id": 3, "tasks": ["7.1", "8.1"] },
    { "id": 4, "tasks": ["7.2", "7.3", "7.4", "7.5"] }
  ]
}
```
