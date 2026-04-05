// Chart.js wrapper - dark mode aware chart defaults with retro styling
// Charts are initialized in players.js using getChartDefaults() from app.js
// This file provides utility functions for chart extensions

(function() {
    'use strict';

    // Update all chart instances when dark mode changes
    function updateChartsTheme() {
        if (typeof Chart === 'undefined') return;
        var light = typeof isLightMode === 'function' && isLightMode();
        var gridColor = light ? '#DDD' : '#222233';
        var tickColor = light ? '#666' : '#888';
        var legendColor = light ? '#000' : '#C0C0C0';

        var instances = Object.values(Chart.instances || {});
        instances.forEach(function(instance) {
            if (instance.options && instance.options.scales) {
                if (instance.options.scales.x) {
                    instance.options.scales.x.ticks.color = tickColor;
                    instance.options.scales.x.grid.color = gridColor;
                }
                if (instance.options.scales.y) {
                    instance.options.scales.y.ticks.color = tickColor;
                    instance.options.scales.y.grid.color = gridColor;
                }
            }
            if (instance.options && instance.options.plugins && instance.options.plugins.legend && instance.options.plugins.legend.labels) {
                instance.options.plugins.legend.labels.color = legendColor;
            }
            instance.update('none');
        });
    }

    // Set Chart.js global defaults for retro look
    function setRetroChartDefaults() {
        if (typeof Chart === 'undefined') return;
        // Global defaults for retro aesthetic
        Chart.defaults.font.family = '"Lucida Console", "Courier New", monospace';
        Chart.defaults.font.size = 9;
        Chart.defaults.elements.line.tension = 0; // Angular/stepped lines
        Chart.defaults.elements.line.borderWidth = 3;
        Chart.defaults.elements.point.radius = 5;
        Chart.defaults.elements.point.pointStyle = 'rectRot'; // Diamond shape
        Chart.defaults.elements.bar.borderWidth = 0;
        Chart.defaults.elements.bar.borderRadius = 0; // No rounded corners on bars
        Chart.defaults.animation.duration = 0; // No smooth animations
    }

    // Initialize retro defaults when Chart.js is available
    if (typeof Chart !== 'undefined') {
        setRetroChartDefaults();
    } else {
        // Try again after a short delay (Chart.js may load async)
        setTimeout(function() {
            if (typeof Chart !== 'undefined') setRetroChartDefaults();
        }, 500);
    }

    window.updateChartsTheme = updateChartsTheme;
    window.setRetroChartDefaults = setRetroChartDefaults;
})();
