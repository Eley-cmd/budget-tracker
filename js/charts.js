/**
 * charts.js
 * Chart.js bar (monthly overview) and donut (expense breakdown).
 * Currency: ₱ (Philippine Peso)
 */

'use strict';

let barChartInstance = null;
let donutChartInstance = null;

const CATEGORY_COLORS = [
    '#2A6EF5', '#1A7A4A', '#E07B00', '#7C3AED',
    '#C0392B', '#0891B2', '#DB2777', '#65A30D',
    '#D97706', '#6366F1', '#0D9488', '#B45309',
    '#95b8ffff', '#97f7c7ff', '#fdd6a7ff', '#b995f6ff',
    '#d59892ff', '#a4d7e4ff', '#cd89a7ff', '#869a69ff',
    '#e5c7a5ff', '#abace1ff', '#a0e1dbff', '#d8b79eff'
];

function getMonthLabels(count) {
    const now = new Date();
    return Array.from({ length: count }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - (count - 1 - i), 1);
        return d.toLocaleString('default', { month: 'short', year: '2-digit' });
    });
}

function getYearMonth(dateStr) {
    const d = new Date(dateStr);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function getMonthKey(monthsAgo) {
    const d = new Date();
    d.setMonth(d.getMonth() - monthsAgo);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// ─── Bar Chart ────────────────────────────────────────────────
function renderBarChart(transactions, months = 6) {
    const ctx = document.getElementById('barChart');
    if (!ctx) return;

    const labels = getMonthLabels(months);
    const incomeData = new Array(months).fill(0);
    const expenseData = new Array(months).fill(0);

    for (let i = 0; i < months; i++) {
        const key = getMonthKey(months - 1 - i);
        transactions.forEach(t => {
            if (getYearMonth(t.date) === key) {
                const amt = parseFloat(t.amount) || 0;
                if (t.type === 'income') incomeData[i] += amt;
                if (t.type === 'expense') expenseData[i] += amt;
            }
        });
    }

    const chartData = {
        labels,
        datasets: [
            {
                label: 'Income',
                data: incomeData,
                backgroundColor: 'rgba(26,122,74,0.85)',
                borderRadius: 6,
                borderSkipped: false,
            },
            {
                label: 'Expenses',
                data: expenseData,
                backgroundColor: 'rgba(192,57,43,0.75)',
                borderRadius: 6,
                borderSkipped: false,
            }
        ]
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top', align: 'end',
                labels: {
                    boxWidth: 10, boxHeight: 10,
                    borderRadius: 5, useBorderRadius: true,
                    font: { family: 'Sora', size: 12 },
                    color: '#6B6860'
                }
            },
            tooltip: {
                callbacks: {
                    label: c => ` ${c.dataset.label}: ₱${c.parsed.y.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`
                }
            }
        },
        scales: {
            x: {
                grid: { display: false },
                ticks: { font: { family: 'Sora', size: 11 }, color: '#9E9B94' },
                border: { display: false }
            },
            y: {
                beginAtZero: true,
                grid: { color: '#E4E2DD' },
                ticks: {
                    font: { family: 'DM Mono', size: 11 },
                    color: '#9E9B94',
                    callback: v => '₱' + v.toLocaleString()
                },
                border: { display: false, dash: [4, 4] }
            }
        }
    };

    if (barChartInstance) {
        barChartInstance.data = chartData;
        barChartInstance.options = options;
        barChartInstance.update();
    } else {
        barChartInstance = new Chart(ctx, { type: 'bar', data: chartData, options });
    }
}

// ─── Donut Chart ──────────────────────────────────────────────
function renderDonutChart(transactions) {
    const ctx = document.getElementById('donutChart');
    const legend = document.getElementById('donut-legend');
    if (!ctx) return;

    const catMap = {};
    transactions.filter(t => t.type === 'expense').forEach(t => {
        const cat = t.category || 'Uncategorized';
        catMap[cat] = (catMap[cat] || 0) + (parseFloat(t.amount) || 0);
    });

    const labels = Object.keys(catMap);
    const values = Object.values(catMap);
    const total = values.reduce((a, b) => a + b, 0);
    const colors = labels.map((_, i) => CATEGORY_COLORS[i % CATEGORY_COLORS.length]);

    if (labels.length === 0) {
        if (donutChartInstance) { donutChartInstance.destroy(); donutChartInstance = null; }
        // Clear canvas safely
        try { ctx.getContext('2d').clearRect(0, 0, ctx.width, ctx.height); } catch { }
        if (legend) legend.innerHTML = '<p style="font-size:13px;color:var(--text-muted);text-align:center;padding:8px 0;">No expenses yet.</p>';
        return;
    }

    const chartData = {
        labels,
        datasets: [{
            data: values,
            backgroundColor: colors,
            borderWidth: 2,
            borderColor: '#FFFFFF',
            hoverOffset: 6
        }]
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '68%',
        plugins: {
            legend: { display: false },
            tooltip: {
                callbacks: {
                    label: c => ` ${c.label}: ₱${c.parsed.toFixed(2)} (${((c.parsed / total) * 100).toFixed(1)}%)`
                }
            }
        }
    };

    if (donutChartInstance) {
        donutChartInstance.data = chartData;
        donutChartInstance.options = options;
        donutChartInstance.update();
    } else {
        donutChartInstance = new Chart(ctx, { type: 'doughnut', data: chartData, options });
    }

    if (legend) {
        const maxItems = window.innerWidth < 350 ? 4 : 6; // 4 items lang kung maliit ang screen
        legend.innerHTML = labels.slice(0, maxItems).map((label, i) => `
        <div class="legend-item">
        <div class="legend-dot-label">
          <span class="legend-dot" style="background:${colors[i]}"></span>
          <span>${label}</span>
        </div>
        <span class="legend-value">₱${values[i].toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
      </div>`).join('');
    }
}

// Public: update both charts
function updateCharts(transactions, months) {
    renderBarChart(transactions, months || 6);
    renderDonutChart(transactions);
}

window.updateCharts = updateCharts;