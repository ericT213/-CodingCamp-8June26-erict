# Requirements Document

## Introduction

This document defines the requirements for a client-side Expense Tracker web application built with HTML, CSS, and Vanilla JavaScript. The application enables users to record expenses, categorise spending, visualise distributions via a pie chart, set monthly spending limits, and switch between light and dark themes. All state persists in the browser's LocalStorage — no backend, build tools, or server is required.

---

## Glossary

| Term | Definition |
|------|-----------|
| **Application** | The single-page Expense Tracker web application |
| **Transaction** | A single expense record with a unique ID, item name, amount, category, and date |
| **Category** | A label grouping Transactions (e.g., Food, Transport, Fun, or a user-defined name) |
| **Balance** | The sum of all Transaction amounts across all categories and dates |
| **Spending_Limit** | A user-configurable positive-number threshold applied per calendar month |
| **Monthly_Summary** | An aggregated view grouping Transactions by calendar month (YYYY-MM format) |
| **LocalStorage** | The browser-native synchronous key-value store used for client-side persistence |
| **Form** | The Transaction input form containing the Item_Name, Amount, and Category fields |
| **Chart** | The Chart.js-rendered pie chart showing spending distribution by category |
| **Theme** | The active colour scheme — either `light` or `dark` |
| **Over_Limit** | The visual state applied when a month's total spend exceeds the Spending_Limit |
| **Validator** | The client-side logic that checks Form field values before a Transaction is created |
| **Store** | The LocalStorage persistence layer responsible for reading and writing application state |

---

## Requirements

### Requirement 1: Transaction Input Form

**User Story:** As a user, I want to enter expense details through a form, so that I can record new transactions quickly.

#### Acceptance Criteria

1. THE Application SHALL render a Form containing an Item_Name text field, an Amount numeric field, and a Category dropdown.
2. WHEN the user submits the Form, THE Validator SHALL verify that: Item_Name is non-empty and not whitespace-only and is at most 100 characters; Amount is a positive finite number greater than 0 and at most 1,000,000; and Category is non-empty.
3. IF the Validator detects one or more invalid fields, THEN THE Application SHALL display one descriptive inline error message adjacent to each failing field and SHALL NOT create a Transaction.
4. WHEN the Validator confirms all fields are valid, THE Application SHALL create a Transaction with a unique ID (UUID or timestamp-based), the submitted Item_Name (trimmed of leading/trailing whitespace), Amount (rounded to 2 decimal places), Category, and the current date in YYYY-MM-DD format.
5. WHEN a Transaction is successfully created, THE Form SHALL reset all fields to their default empty/initial state, including clearing any displayed error messages.

---

### Requirement 2: Transaction List

**User Story:** As a user, I want to view all my recorded transactions in a list, so that I can review and manage my spending history.

#### Acceptance Criteria

1. THE Application SHALL display all Transactions in a scrollable list sorted by date descending by default.
2. THE Application SHALL render each list row showing the Transaction's item name, amount formatted to 2 decimal places, category, date in YYYY-MM-DD format, and a delete button.
3. WHEN the user clicks a Transaction's delete button, THE Application SHALL remove that Transaction from the Store, persist the updated Transactions list to LocalStorage, update the list display, Balance, and Chart without a page reload.
4. WHEN the user selects a sort option, THE Application SHALL re-render the list sorted by: amount ascending, category name lexicographically (A–Z), or date descending.
5. WHILE a Spending_Limit is configured, THE Application SHALL apply the CSS class `over-limit` to every list row whose Transaction belongs to a month whose total amount exceeds the Spending_Limit.
6. WHEN there are no Transactions, THE Application SHALL display a non-empty placeholder message (e.g., "No transactions yet") in place of the list.

---

### Requirement 3: Total Balance Display

**User Story:** As a user, I want to see my total balance at a glance, so that I know how much I have spent in total.

#### Acceptance Criteria

1. THE Application SHALL display the Balance — the sum of all Transaction amounts rounded to 2 decimal places — in a dedicated balance element located above the Transaction list.
2. WHEN a Transaction is added or deleted, THE Application SHALL recalculate and re-render the Balance without a page reload.
3. WHEN there are no Transactions, THE Application SHALL display the Balance as "0.00".

---

### Requirement 4: Category Pie Chart

**User Story:** As a user, I want to see a visual breakdown of spending by category, so that I can identify where my money goes.

#### Acceptance Criteria

1. THE Application SHALL render a Chart using Chart.js loaded via CDN, showing each category as a slice whose arc angle is proportional to that category's percentage of the total Transaction amount (calculated as `CategorySummary.percentage`, rounded to 1 decimal place).
2. WHEN the Transaction list changes, THE Application SHALL update the Chart's data in-place (via `chart.data` mutation and `chart.update()`) without destroying and recreating the canvas element.
3. WHEN there are no Transactions, THE Application SHALL render the Chart with no data slices and SHALL display a descriptive message (e.g., "No data to display") inside the chart container.
4. IF the Chart.js CDN script fails to load, THEN THE Application SHALL hide the chart container and display a fallback message (e.g., "Chart unavailable") in its place, while all non-chart features remain fully functional.

---

### Requirement 5: Custom Categories

**User Story:** As a user, I want to add my own expense categories, so that I can organise spending to fit my personal needs.

#### Acceptance Criteria

1. THE Application SHALL provide a dedicated text input (max 50 characters) and an "Add Category" button that allow the user to add a custom category name.
2. WHEN the user submits a category name that is non-empty after trimming whitespace, THE Application SHALL append the new category to the Category dropdown without requiring a page reload.
3. WHEN the user adds a category name that already exists in the dropdown (case-sensitive match after trimming whitespace), THE Application SHALL make no change to the dropdown (idempotent operation).
4. THE Store SHALL persist all categories (default and custom) to LocalStorage under the key `et_categories` after every category addition, and SHALL restore them from LocalStorage on page load.
5. IF the user submits an empty or whitespace-only category name, THEN THE Application SHALL display an inline error message and SHALL NOT add a category.

---

### Requirement 6: Monthly Summary View

**User Story:** As a user, I want to see a summary of my spending grouped by month, so that I can track my budget over time.

#### Acceptance Criteria

1. THE Application SHALL provide a Monthly_Summary view listing every distinct calendar month (YYYY-MM) for which at least one Transaction exists.
2. THE Application SHALL display each Monthly_Summary entry showing: the month label (YYYY-MM), total spend for that month formatted to 2 decimal places, and a per-category breakdown showing category name, total spend (2 decimal places), and percentage of the month's total (1 decimal place).
3. THE Application SHALL render Monthly_Summary entries with the most recent month first (descending by YYYY-MM string comparison).
4. WHILE a Spending_Limit is configured, IF a Monthly_Summary entry's total spend exceeds the Spending_Limit, THEN THE Application SHALL apply the `over-limit` CSS class to that entry's container element.
5. WHEN there are no Transactions, THE Application SHALL render the Monthly_Summary view with no entries and SHALL display a placeholder message (e.g., "No monthly data yet").

---

### Requirement 7: Spending Limit

**User Story:** As a user, I want to configure a monthly spending limit, so that I can be alerted when I exceed my budget.

#### Acceptance Criteria

1. THE Application SHALL provide a numeric input and a "Set Limit" button that allow the user to set the Spending_Limit to a positive finite number greater than 0.
2. WHEN the user activates the "Set Limit" button with a valid value, THE Application SHALL update the Spending_Limit and immediately re-evaluate and update Over_Limit flags on all Transaction list rows and Monthly_Summary entries.
3. IF the user activates the "Set Limit" button with a value that is not a positive finite number (e.g., zero, negative, NaN, empty), THEN THE Application SHALL display an inline error message and SHALL NOT update the Spending_Limit.
4. THE Application SHALL provide a "Clear Limit" control; WHEN the user activates it, THE Application SHALL set the Spending_Limit to null and remove all Over_Limit flags from the Transaction list and Monthly_Summary.
5. WHEN the Spending_Limit is null, THE Application SHALL display no Over_Limit flags on any Transaction list row or Monthly_Summary entry.
6. THE Store SHALL persist the Spending_Limit in LocalStorage under the key `et_spending_limit` after every change (set or clear).

---

### Requirement 8: Dark / Light Theme Toggle

**User Story:** As a user, I want to switch between light and dark colour themes, so that I can use the application comfortably in different lighting conditions.

#### Acceptance Criteria

1. THE Application SHALL provide a toggle button (labelled or aria-labelled with the target theme, e.g., "Switch to dark mode") that switches the active Theme between `light` and `dark`.
2. WHEN the user activates the toggle, THE Application SHALL add the CSS class `dark` to `document.body` if switching to dark theme, or remove it if switching to light theme, with the visual change observable immediately without a page reload.
3. THE Store SHALL persist the active Theme in LocalStorage under the key `et_theme` after every toggle.
4. WHEN the Application loads, THE Store SHALL read `et_theme` from LocalStorage and apply the saved Theme; IF `et_theme` is absent or not one of `'light'` or `'dark'`, THEN THE Application SHALL default to `'light'`.

---

### Requirement 9: Data Persistence

**User Story:** As a user, I want my data to be saved automatically, so that my transactions and settings are preserved between browser sessions.

#### Acceptance Criteria

1. WHEN a Transaction is added or deleted, a Category is added, the Theme is toggled, or the Spending_Limit is set or cleared, THE Store SHALL write the updated state to LocalStorage under the corresponding key (`et_transactions`, `et_categories`, `et_theme`, `et_spending_limit`) before the next user interaction.
2. WHEN the Application loads, THE Store SHALL read state from LocalStorage and restore Transactions, Categories, Theme, and Spending_Limit to the values saved in the previous session.
3. IF a LocalStorage key is missing or contains malformed JSON, THEN THE Store SHALL fall back to the following defaults: Transactions `[]`, Categories `['Food', 'Transport', 'Fun']`, Theme `'light'`, Spending_Limit `null`.
4. IF LocalStorage contains a Theme value that is not `'light'` or `'dark'`, THEN THE Store SHALL fall back to `'light'`. IF LocalStorage contains a Spending_Limit value that is not a positive finite number, THEN THE Store SHALL fall back to `null`.

---

### Requirement 10: Technology Constraints

**User Story:** As a developer, I want the application to use only HTML, CSS, and Vanilla JavaScript, so that it requires no build tools, backend, or installation steps.

#### Acceptance Criteria

1. THE Application SHALL be implemented using only HTML, CSS, and Vanilla JavaScript with no frameworks, bundlers, or build tools.
2. THE Application SHALL load Chart.js exclusively via a CDN `<script>` tag in `index.html` with no npm installation required.
3. THE Application SHALL correctly perform Transaction creation, deletion, persistence, category filtering, spending-limit evaluation, monthly summary computation, and theme switching in the latest stable release (available at time of testing) of Chrome, Firefox, Edge, and Safari.
4. THE Application SHALL operate without a server and SHALL be openable directly as a local file via the `file://` protocol or from any static file host.
5. IF the Chart.js CDN script fails to load (e.g., network unavailable), THEN THE Application SHALL display a fallback message in the chart container and all non-chart features SHALL remain fully functional.

---

### Requirement 11: Accessibility and Performance

**User Story:** As a user, I want the application to be accessible and responsive, so that I can use it efficiently with keyboard or assistive technology.

#### Acceptance Criteria

1. THE Application SHALL associate every interactive element — including the transaction Form fields, sort dropdown, category input, spending limit input, theme toggle button, and delete buttons — with a `<label>` element or an `aria-label` attribute that describes the element's purpose.
2. WHEN the user performs an interaction — adding a Transaction, deleting a Transaction, sorting the list, or toggling the Theme — THE Application SHALL update the relevant UI elements within 100 milliseconds of the event.
3. THE Application SHALL maintain a minimum contrast ratio of 4.5:1 for normal text and 3:1 for large text (as defined by WCAG 2.1) in both light and dark Themes.
4. WHEN the user deletes a Transaction using the keyboard, THE Application SHALL move focus to the next Transaction's delete button, or to the transaction list container if no Transactions remain.

---
