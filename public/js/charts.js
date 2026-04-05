// Chart.js wrapper - manages chart lifecycle, theming, and retro styling
// Must be loaded AFTER Chart.js CDN and app.js, BEFORE players.js

(function() {
    'use strict';

    // Track active chart instances for cleanup
    var chartInstances = {};

    // Destroy a chart by canvas ID, if it exists
    function destroyChart(canvasId) {
        if (chartInstances[canvasId]) {
            chartInstances[canvasId].destroy();
            delete chartInstances[canvasId];
        }
    }

    // Destroy all tracked chart instances
    function destroyAllCharts() {
        var ids = Object.keys(chartInstances);
        for (var i = 0; i < ids.length; i++) {
            destroyChart(ids[i]);
        }
    }

    // Create a chart on a canvas element, destroying any previous instance.
    // Uses responsive:false with explicit pixel dimensions measured from the
    // wrapper container. This avoids all ResizeObserver/responsive-mode issues
    // that cause Chart.js to render at 0x0 in complex layouts.
    function createChart(canvasId, config) {
        destroyChart(canvasId);
        var wrapId = canvasId + '-wrap';
        var wrap = document.getElementById(wrapId);
        if (!wrap) {
            var existing = document.getElementById(canvasId);
            if (!existing) return null;
            wrap = existing.parentNode;
        }
        // Measure the wrapper's actual rendered dimensions
        var rect = wrap.getBoundingClientRect();
        var w = Math.floor(rect.width) || 200;
        var h = Math.floor(rect.height) || 120;
        // Clear all children (removes old canvas + any Chart.js wrapper divs)
        wrap.innerHTML = '';
        var newCanvas = document.createElement('canvas');
        newCanvas.id = canvasId;
        newCanvas.width = w;
        newCanvas.height = h;
        newCanvas.style.display = 'block';
        newCanvas.style.width = w + 'px';
        newCanvas.style.height = h + 'px';
        wrap.appendChild(newCanvas);
        // Force responsive:false so Chart.js uses our explicit dimensions
        config.options = config.options || {};
        config.options.responsive = false;
        config.options.maintainAspectRatio = false;
        var instance = new Chart(newCanvas, config);
        chartInstances[canvasId] = instance;
        return instance;
    }

    // Build themed options for a stat line chart (PPG, APG, RPG)
    function buildLineChartConfig(label, data, labels, color, bgColor) {
        var light = typeof isLightMode === 'function' && isLightMode();
        return {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: label,
                    data: data,
                    borderColor: color,
                    backgroundColor: bgColor,
                    fill: true,
                    tension: 0,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    pointStyle: 'rectRot',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: false,
                animation: { duration: 0 },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: light ? '#FFF' : '#1C1C1C',
                        titleColor: light ? '#000' : '#C0C0C0',
                        bodyColor: light ? '#333' : '#AAA',
                        borderColor: light ? '#CCC' : '#444',
                        borderWidth: 1,
                        titleFont: { family: '"Lucida Console", "Courier New", monospace', size: 9 },
                        bodyFont: { family: '"Lucida Console", "Courier New", monospace', size: 9 }
                    }
                },
                scales: {
                    x: {
                        ticks: { color: light ? '#666' : '#808080', font: { family: '"Lucida Console", monospace', size: 7 } },
                        grid: { color: light ? '#DDD' : '#222233' }
                    },
                    y: {
                        beginAtZero: true,
                        ticks: { color: light ? '#666' : '#808080', font: { family: '"Lucida Console", monospace', size: 7 } },
                        grid: { color: light ? '#DDD' : '#222233' }
                    }
                }
            }
        };
    }

    // Build themed options for the shooting bar chart
    function buildShootingChartConfig(data, labels) {
        var light = typeof isLightMode === 'function' && isLightMode();
        return {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    { label: 'FG%', data: data.fg, backgroundColor: '#6688AA', borderWidth: 0, borderRadius: 0 },
                    { label: '3P%', data: data.fg3, backgroundColor: '#5A8A5A', borderWidth: 0, borderRadius: 0 },
                    { label: 'FT%', data: data.ft, backgroundColor: '#8A8A5A', borderWidth: 0, borderRadius: 0 }
                ]
            },
            options: {
                responsive: false,
                animation: { duration: 0 },
                plugins: {
                    legend: {
                        display: true,
                        labels: {
                            color: light ? '#000' : '#C0C0C0',
                            font: { family: '"Lucida Console", monospace', size: 8 },
                            boxWidth: 8,
                            padding: 4
                        }
                    },
                    tooltip: {
                        backgroundColor: light ? '#FFF' : '#1C1C1C',
                        titleColor: light ? '#000' : '#C0C0C0',
                        bodyColor: light ? '#333' : '#AAA',
                        borderColor: light ? '#CCC' : '#444',
                        borderWidth: 1,
                        callbacks: {
                            label: function(ctx) {
                                return ctx.dataset.label + ': ' + (ctx.parsed.y != null ? ctx.parsed.y.toFixed(1) + '%' : '-');
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        ticks: { color: light ? '#666' : '#808080', font: { family: '"Lucida Console", monospace', size: 7 } },
                        grid: { color: light ? '#DDD' : '#222233' }
                    },
                    y: {
                        beginAtZero: true,
                        max: 100,
                        ticks: { color: light ? '#666' : '#808080', font: { family: '"Lucida Console", monospace', size: 7 } },
                        grid: { color: light ? '#DDD' : '#222233' }
                    }
                }
            }
        };
    }

    // Update all tracked chart instances when dark mode changes
    function updateChartsTheme() {
        if (typeof Chart === 'undefined') return;
        // Simplest approach: rebuild all charts by re-rendering the player profile
        // But for a lighter touch, update colors on existing instances
        var light = typeof isLightMode === 'function' && isLightMode();
        var gridColor = light ? '#DDD' : '#222233';
        var tickColor = light ? '#666' : '#808080';
        var legendColor = light ? '#000' : '#C0C0C0';

        var ids = Object.keys(chartInstances);
        for (var i = 0; i < ids.length; i++) {
            var instance = chartInstances[ids[i]];
            if (!instance || !instance.options) continue;
            if (instance.options.scales) {
                if (instance.options.scales.x) {
                    instance.options.scales.x.ticks.color = tickColor;
                    instance.options.scales.x.grid.color = gridColor;
                }
                if (instance.options.scales.y) {
                    instance.options.scales.y.ticks.color = tickColor;
                    instance.options.scales.y.grid.color = gridColor;
                }
            }
            if (instance.options.plugins && instance.options.plugins.legend && instance.options.plugins.legend.labels) {
                instance.options.plugins.legend.labels.color = legendColor;
            }
            instance.update('none');
        }
    }

    // Set Chart.js global defaults for retro look
    function setRetroChartDefaults() {
        if (typeof Chart === 'undefined') return;
        Chart.defaults.font.family = '"Lucida Console", "Courier New", monospace';
        Chart.defaults.font.size = 9;
        Chart.defaults.elements.line.tension = 0;
        Chart.defaults.elements.line.borderWidth = 2;
        Chart.defaults.elements.point.radius = 4;
        Chart.defaults.elements.point.pointStyle = 'rectRot';
        Chart.defaults.elements.bar.borderWidth = 0;
        Chart.defaults.elements.bar.borderRadius = 0;
        Chart.defaults.animation.duration = 0;
    }

    // Initialize retro defaults when Chart.js is available
    if (typeof Chart !== 'undefined') {
        setRetroChartDefaults();
    } else {
        setTimeout(function() {
            if (typeof Chart !== 'undefined') setRetroChartDefaults();
        }, 500);
    }

    // Expose public API
    window.chartInstances = chartInstances;
    window.createChart = createChart;
    window.destroyChart = destroyChart;
    window.destroyAllCharts = destroyAllCharts;
    window.buildLineChartConfig = buildLineChartConfig;
    window.buildShootingChartConfig = buildShootingChartConfig;
    window.updateChartsTheme = updateChartsTheme;
    window.setRetroChartDefaults = setRetroChartDefaults;
})();
