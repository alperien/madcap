// Chart.js wrapper - dark mode aware chart defaults
// Charts are initialized in players.js using getChartDefaults() from app.js
// This file provides utility functions for chart extensions

(function() {
    'use strict';

    // Update all chart instances when dark mode changes
    function updateChartsTheme() {
        if (typeof Chart === 'undefined') return;
        var dark = document.documentElement.classList.contains('dark');
        var gridColor = dark ? '#333355' : '#DDD';
        var tickColor = dark ? '#A0A0A0' : '#666';

        Chart.helpers.each(Chart.instances, function(instance) {
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
                instance.options.plugins.legend.labels.color = dark ? '#E0E0E0' : '#000';
            }
            instance.update('none');
        });
    }

    window.updateChartsTheme = updateChartsTheme;
})();
