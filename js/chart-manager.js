/**
 * js/chart-manager.js
 * Chart.js wrapper: create / update / hide the category doughnut chart.
 *
 * Exported API
 * ─────────────────────────────────────────────────────────────────────────
 *   initChart(canvasEl)                  → Chart | null
 *   updateChart(chart, categoryTotals)   → void
 *   showNoDataMessage(containerEl)       → void
 *   hideNoDataMessage(containerEl)       → void
 */

// ─── Colour palette ─────────────────────────────────────────────────────────
// 12 visually distinct colours that cycle if there are more categories.
const SLICE_COLORS = [
  '#4E79A7', // blue
  '#F28E2B', // orange
  '#E15759', // red
  '#76B7B2', // teal
  '#59A14F', // green
  '#EDC948', // yellow
  '#B07AA1', // purple
  '#FF9DA7', // pink
  '#9C755F', // brown
  '#BAB0AC', // grey
  '#D37295', // rose
  '#A0CBE8', // light blue
];

/**
 * Return the colour for a given slice index, cycling through the palette.
 * @param {number} index
 * @returns {string}
 */
function sliceColor(index) {
  return SLICE_COLORS[index % SLICE_COLORS.length];
}

// ─── Default chart configuration ────────────────────────────────────────────

/**
 * Build the Chart.js config object for the initial (empty) chart.
 * @returns {object}
 */
function buildChartConfig() {
  return {
    type: 'doughnut',
    data: {
      labels: [],
      datasets: [
        {
          data: [],
          backgroundColor: [],
          borderWidth: 2,
          borderColor: '#ffffff',
          hoverOffset: 6,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            padding: 16,
            font: { size: 13 },
          },
        },
        tooltip: {
          callbacks: {
            /**
             * Show "Category: $total (percentage%)" in the tooltip.
             * @param {object} context
             * @returns {string}
             */
            label(context) {
              const label = context.label || '';
              const value = context.parsed ?? 0;
              const total = context.chart.data.datasets[0].data.reduce(
                (sum, v) => sum + v,
                0
              );
              const pct =
                total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
              return ` ${label}: $${value.toFixed(2)} (${pct}%)`;
            },
          },
        },
      },
    },
  };
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Initialise the Chart.js instance.
 *
 * Guards:
 *   • `typeof Chart !== 'undefined'`  — library loaded successfully
 *   • `!window.chartJsLoadError`       — CDN onerror flag not set
 *
 * If Chart.js is unavailable, hides #chart-container and shows a
 * fallback message inside it. Returns null in that case.
 *
 * @param {HTMLCanvasElement} canvasEl
 * @returns {Chart|null}
 */
function initChart(canvasEl) {
  const containerEl = document.getElementById('chart-container');

  // Guard: Chart.js CDN load failure
  if (typeof Chart === 'undefined' || window.chartJsLoadError) {
    if (containerEl) {
      containerEl.style.display = 'none';

      // Show a fallback message — reuse #chart-no-data if present,
      // otherwise create a paragraph and append it.
      let fallback = containerEl.querySelector('#chart-no-data');
      if (!fallback) {
        fallback = document.createElement('p');
        fallback.id = 'chart-no-data';
        containerEl.appendChild(fallback);
      }
      fallback.textContent = 'Chart unavailable';
      fallback.style.display = 'block';
    }
    return null;
  }

  // Chart.js is available — create the instance.
  const chart = new Chart(canvasEl, buildChartConfig());

  // Hide the "no data" message by default; it will be shown by
  // updateChart when the data array is empty.
  if (containerEl) {
    hideNoDataMessage(containerEl);
  }

  return chart;
}

/**
 * Update an existing Chart instance with new category totals.
 *
 * Mutates chart.data in-place (Req 4.2) — never destroys/recreates the canvas.
 *
 * @param {Chart} chart
 * @param {Array<{category: string, total: number, percentage: number}>} categoryTotals
 */
function updateChart(chart, categoryTotals) {
  const containerEl = document.getElementById('chart-container');

  if (!categoryTotals || categoryTotals.length === 0) {
    // Clear chart data so no slices are rendered (Req 4.3).
    chart.data.labels = [];
    chart.data.datasets[0].data = [];
    chart.data.datasets[0].backgroundColor = [];
    chart.update();

    if (containerEl) showNoDataMessage(containerEl);
    return;
  }

  // Populate labels, amounts, and colours in-place.
  chart.data.labels = categoryTotals.map((ct) => ct.category);
  chart.data.datasets[0].data = categoryTotals.map((ct) => ct.total);
  chart.data.datasets[0].backgroundColor = categoryTotals.map((_, i) =>
    sliceColor(i)
  );

  chart.update();

  if (containerEl) hideNoDataMessage(containerEl);
}

/**
 * Show the #chart-no-data element inside containerEl.
 *
 * @param {HTMLElement} containerEl
 */
function showNoDataMessage(containerEl) {
  const noDataEl = containerEl.querySelector('#chart-no-data');
  if (noDataEl) {
    noDataEl.style.display = 'block';
  }
}

/**
 * Hide the #chart-no-data element inside containerEl.
 *
 * @param {HTMLElement} containerEl
 */
function hideNoDataMessage(containerEl) {
  const noDataEl = containerEl.querySelector('#chart-no-data');
  if (noDataEl) {
    noDataEl.style.display = 'none';
  }
}

// ─── Exports ─────────────────────────────────────────────────────────────────
export { initChart, updateChart, showNoDataMessage, hideNoDataMessage };
