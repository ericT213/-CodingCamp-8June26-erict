/**
 * js/ui.js
 * All DOM rendering functions for Expense Tracker.
 *
 * No external dependencies — pure Vanilla JS DOM manipulation only.
 *
 * Exported functions:
 *   renderTransactionList(txns, spendingLimit)
 *   renderBalance(txns)
 *   renderMonthlySummary(txns, spendingLimit)
 *   renderCategoryOptions(categories)
 *   showFieldError(fieldId, message)
 *   clearFieldErrors()
 *   setTheme(theme)
 *   moveFocusAfterDelete(deletedId, remainingTxns)
 *
 * Requirements: 2.1, 2.2, 2.5, 2.6, 3.1, 3.3, 6.1, 6.2, 6.3, 6.4, 6.5, 8.2, 11.4
 */

// ─── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Build a map of YYYY-MM → total amount for all provided transactions.
 * Used by both renderTransactionList and renderMonthlySummary to determine
 * which months are over the spending limit.
 *
 * @param {Array<Object>} txns - Transaction[]
 * @returns {Map<string, number>} month → total
 */
function _buildMonthlyTotals(txns) {
  const totals = new Map();
  for (const tx of txns) {
    const month = tx.date.slice(0, 7); // "YYYY-MM"
    totals.set(month, (totals.get(month) || 0) + tx.amount);
  }
  return totals;
}

/**
 * Determine whether a given monthly total exceeds the spending limit.
 *
 * @param {number} total
 * @param {number|null} spendingLimit
 * @returns {boolean}
 */
function _isOverLimit(total, spendingLimit) {
  return typeof spendingLimit === 'number' && spendingLimit > 0 && total > spendingLimit;
}

// ─── renderTransactionList ────────────────────────────────────────────────────

/**
 * Render the transaction list into #transaction-list.
 *
 * Each row is a <li> showing: item name, amount (2 d.p.), category, date, and a
 * delete button. Rows belonging to a month whose total exceeds spendingLimit get
 * the `over-limit` CSS class. Shows a placeholder when txns is empty.
 *
 * The function renders txns in the order provided — sorting is the caller's
 * responsibility (app.js).
 *
 * @param {Array<Object>} txns         - Transaction[] in display order
 * @param {number|null}   spendingLimit - Monthly spending limit or null
 * @returns {void}
 */
export function renderTransactionList(txns, spendingLimit) {
  const list = document.getElementById('transaction-list');
  if (!list) return;

  list.innerHTML = '';

  // Req 2.6 — placeholder when empty
  if (!txns || txns.length === 0) {
    const placeholder = document.createElement('li');
    placeholder.className = 'placeholder-message';
    placeholder.textContent = 'No transactions yet';
    list.appendChild(placeholder);
    return;
  }

  // Build per-month totals for over-limit evaluation (Req 2.5)
  const monthlyTotals = _buildMonthlyTotals(txns);

  for (const tx of txns) {
    const month = tx.date.slice(0, 7);
    const monthTotal = monthlyTotals.get(month) || 0;
    const overLimit = _isOverLimit(monthTotal, spendingLimit);

    const li = document.createElement('li');
    li.className = 'transaction-item' + (overLimit ? ' over-limit' : '');
    li.dataset.id = tx.id;

    // Item name
    const nameSpan = document.createElement('span');
    nameSpan.className = 'tx-name';
    nameSpan.textContent = tx.itemName;

    // Amount
    const amountSpan = document.createElement('span');
    amountSpan.className = 'tx-amount';
    amountSpan.textContent = `$${Number(tx.amount).toFixed(2)}`;

    // Category
    const categorySpan = document.createElement('span');
    categorySpan.className = 'tx-category';
    categorySpan.textContent = tx.category;

    // Date
    const dateSpan = document.createElement('span');
    dateSpan.className = 'tx-date';
    dateSpan.textContent = tx.date;

    // Delete button (Req 2.3, 11.4)
    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'btn btn-danger';
    deleteBtn.dataset.id = tx.id;
    deleteBtn.setAttribute('aria-label', `Delete ${tx.itemName}`);
    deleteBtn.textContent = 'Delete';

    li.appendChild(nameSpan);
    li.appendChild(amountSpan);
    li.appendChild(categorySpan);
    li.appendChild(dateSpan);
    li.appendChild(deleteBtn);

    list.appendChild(li);
  }
}

// ─── renderBalance ────────────────────────────────────────────────────────────

/**
 * Compute and display the total balance in #balance.
 *
 * Balance = sum of all transaction amounts, rounded to 2 d.p.
 * Displays "$0.00" when txns is empty (Req 3.3).
 *
 * @param {Array<Object>} txns - Transaction[]
 * @returns {void}
 */
export function renderBalance(txns) {
  const balanceEl = document.getElementById('balance');
  if (!balanceEl) return;

  // Req 3.1, 3.3 — sum amounts, round to 2 d.p., always show 2 decimal places
  const sum = txns && txns.length > 0
    ? txns.reduce((acc, tx) => acc + tx.amount, 0)
    : 0;

  const rounded = Math.round(sum * 100) / 100;
  balanceEl.textContent = `$${rounded.toFixed(2)}`;
}

// ─── renderMonthlySummary ─────────────────────────────────────────────────────

/**
 * Render the monthly summary into #monthly-summary.
 *
 * Groups transactions by YYYY-MM (descending order), shows total and a
 * per-category breakdown with percentages. Applies `over-limit` class to
 * months that exceed spendingLimit. Shows placeholder when txns is empty.
 *
 * @param {Array<Object>} txns         - Transaction[]
 * @param {number|null}   spendingLimit - Monthly spending limit or null
 * @returns {void}
 */
export function renderMonthlySummary(txns, spendingLimit) {
  const container = document.getElementById('monthly-summary');
  if (!container) return;

  // Clear everything below the <h2> (keep the heading)
  const heading = container.querySelector('h2');
  container.innerHTML = '';
  if (heading) container.appendChild(heading);

  // Req 6.5 — placeholder when empty
  if (!txns || txns.length === 0) {
    const placeholder = document.createElement('p');
    placeholder.className = 'placeholder-message';
    placeholder.textContent = 'No monthly data yet';
    container.appendChild(placeholder);
    return;
  }

  // Group transactions by YYYY-MM
  /** @type {Map<string, Array<Object>>} */
  const monthMap = new Map();
  for (const tx of txns) {
    const month = tx.date.slice(0, 7);
    if (!monthMap.has(month)) {
      monthMap.set(month, []);
    }
    monthMap.get(month).push(tx);
  }

  // Sort months descending (Req 6.3)
  const sortedMonths = Array.from(monthMap.keys()).sort((a, b) => b.localeCompare(a));

  for (const month of sortedMonths) {
    const monthTxns = monthMap.get(month);

    // Compute monthly total
    const monthTotal = monthTxns.reduce((acc, tx) => acc + tx.amount, 0);
    const monthTotalRounded = Math.round(monthTotal * 100) / 100;

    const overLimit = _isOverLimit(monthTotalRounded, spendingLimit);

    // Month entry container (Req 6.4)
    const monthDiv = document.createElement('div');
    monthDiv.className = 'month-entry' + (overLimit ? ' over-limit' : '');
    monthDiv.dataset.month = month;

    // Month header: label + total
    const monthHeader = document.createElement('div');
    monthHeader.className = 'month-header';

    const monthLabel = document.createElement('span');
    monthLabel.className = 'month-label';
    monthLabel.textContent = month;

    const monthTotalSpan = document.createElement('span');
    monthTotalSpan.className = 'month-total';
    monthTotalSpan.textContent = `$${monthTotalRounded.toFixed(2)}`;

    monthHeader.appendChild(monthLabel);
    monthHeader.appendChild(monthTotalSpan);
    monthDiv.appendChild(monthHeader);

    // Per-category breakdown (Req 6.2)
    /** @type {Map<string, number>} */
    const categoryMap = new Map();
    for (const tx of monthTxns) {
      categoryMap.set(tx.category, (categoryMap.get(tx.category) || 0) + tx.amount);
    }

    const breakdownList = document.createElement('ul');
    breakdownList.className = 'month-breakdown';

    for (const [category, catTotal] of categoryMap) {
      const catTotalRounded = Math.round(catTotal * 100) / 100;
      // percentage = (categoryTotal / monthTotal) * 100, rounded to 1 d.p.
      const percentage = monthTotalRounded > 0
        ? (catTotalRounded / monthTotalRounded) * 100
        : 0;

      const catItem = document.createElement('li');
      catItem.className = 'month-category-item';

      const catName = document.createElement('span');
      catName.className = 'cat-name';
      catName.textContent = category;

      const catAmount = document.createElement('span');
      catAmount.className = 'cat-amount';
      catAmount.textContent = `$${catTotalRounded.toFixed(2)}`;

      const catPercent = document.createElement('span');
      catPercent.className = 'cat-percent';
      catPercent.textContent = `${percentage.toFixed(1)}%`;

      catItem.appendChild(catName);
      catItem.appendChild(catAmount);
      catItem.appendChild(catPercent);
      breakdownList.appendChild(catItem);
    }

    monthDiv.appendChild(breakdownList);
    container.appendChild(monthDiv);
  }
}

// ─── renderCategoryOptions ────────────────────────────────────────────────────

/**
 * Populate the Category <select> (id="category") with the given categories,
 * keeping the first "-- Select a category --" placeholder option intact.
 *
 * @param {string[]} categories - List of category names
 * @returns {void}
 */
export function renderCategoryOptions(categories) {
  const select = document.getElementById('category');
  if (!select) return;

  // Keep only the first placeholder option
  const placeholder = select.options[0];
  select.innerHTML = '';
  if (placeholder) {
    select.appendChild(placeholder);
  }

  for (const cat of categories) {
    const option = document.createElement('option');
    option.value = cat;
    option.textContent = cat;
    select.appendChild(option);
  }
}

// ─── showFieldError ───────────────────────────────────────────────────────────

/**
 * Display an inline error message in the error span for the given field.
 *
 * The error span is identified by id="error-{fieldId}".
 * Example: showFieldError('item-name', 'Item name is required.')
 *          targets #error-item-name.
 *
 * @param {string} fieldId  - The field's HTML id (without the "error-" prefix)
 * @param {string} message  - The error message to display
 * @returns {void}
 */
export function showFieldError(fieldId, message) {
  const errorEl = document.getElementById(`error-${fieldId}`);
  if (!errorEl) return;
  errorEl.textContent = message;
}

// ─── clearFieldErrors ─────────────────────────────────────────────────────────

/**
 * Clear ALL inline error messages by setting textContent to '' on every
 * element with class `field-error`.
 *
 * @returns {void}
 */
export function clearFieldErrors() {
  const errorEls = document.querySelectorAll('.field-error');
  for (const el of errorEls) {
    el.textContent = '';
  }
}

// ─── setTheme ────────────────────────────────────────────────────────────────

/**
 * Apply the given theme by adding or removing the `dark` class on document.body.
 *
 * @param {'light'|'dark'} theme - The theme to apply
 * @returns {void}
 */
export function setTheme(theme) {
  if (theme === 'dark') {
    document.body.classList.add('dark');
  } else {
    document.body.classList.remove('dark');
  }
}

// ─── moveFocusAfterDelete ─────────────────────────────────────────────────────

/**
 * Move keyboard focus after a transaction has been deleted and the list re-rendered.
 *
 * After the DOM update, finds the first `.btn-danger` (delete button) in
 * #transaction-list and focuses it. Falls back to focusing #transaction-list
 * itself if no delete buttons remain (Req 11.4).
 *
 * @param {string}        deletedId      - The id of the deleted transaction (unused post-render, kept for API symmetry)
 * @param {Array<Object>} remainingTxns  - The transactions remaining after deletion
 * @returns {void}
 */
export function moveFocusAfterDelete(deletedId, remainingTxns) {
  const list = document.getElementById('transaction-list');
  if (!list) return;

  const nextDeleteBtn = list.querySelector('.btn-danger');
  if (nextDeleteBtn) {
    nextDeleteBtn.focus();
  } else {
    // No transactions remain — focus the list container itself
    list.focus();
  }
}
