(function() {
    'use strict';

    var sortField = 'name';
    var sortAsc = true;

    function renderPlayerList() {
        var tbody = document.getElementById('player-tbody');
        if (!tbody) return;
        var searchEl = document.getElementById('search-input');
        var leagueEl = document.getElementById('filter-league');
        var posEl = document.getElementById('filter-pos');
        var statusEl = document.getElementById('filter-status');
        var ficEl = document.getElementById('filter-fictional');
        var search = searchEl ? (searchEl.value || '').toLowerCase() : '';
        var leagueFilter = leagueEl ? leagueEl.value : '';
        var posFilter = posEl ? posEl.value : '';
        var statusFilter = statusEl ? statusEl.value : '';
        var ficOnly = ficEl ? ficEl.checked : false;

        var players = DATA.players.filter(function(p) {
            if (search && p.name.toLowerCase().indexOf(search) === -1) return false;
            if (posFilter && p.position !== posFilter) return false;
            if (statusFilter && p.status !== statusFilter) return false;
            if (ficOnly && !p.is_fictional) return false;
            if (leagueFilter) {
                var hasLeague = false;
                if (p.career && p.career.pro) {
                    for (var i = 0; i < p.career.pro.length; i++) {
                        if (p.career.pro[i].league === leagueFilter) { hasLeague = true; break; }
                    }
                }
                if (!hasLeague) return false;
            }
            return true;
        });

        players.sort(function(a, b) {
            var va = a[sortField] || '';
            var vb = b[sortField] || '';
            if (typeof va === 'number' && typeof vb === 'number') {
                return sortAsc ? va - vb : vb - va;
            }
            va = String(va).toLowerCase();
            vb = String(vb).toLowerCase();
            if (va < vb) return sortAsc ? -1 : 1;
            if (va > vb) return sortAsc ? 1 : -1;
            return 0;
        });

        var html = '';
        for (var i = 0; i < players.length; i++) {
            var p = players[i];
            var team = getPlayerTeam(p);
            html += '<tr class="' + rowClass(i) + '">';
            html += '<td><a href="player.html?id=' + p.id + '">' + p.name + '</a></td>';
            html += '<td class="tCenter">' + (p.position || '-') + '</td>';
            html += '<td class="tCenter gensmall">' + (p.height || '-') + '</td>';
            html += '<td class="tCenter gensmall">' + (p.weight || '-') + '</td>';
            html += '<td class="gensmall">' + (team ? '<a href="team.html?id=' + team.id + '">' + team.abbreviation + '</a>' : '-') + '</td>';
            html += '<td class="tCenter bold">' + (p.overall || '-') + '</td>';
            html += '<td class="gensmall">' + (p.archetype || '-') + '</td>';
            html += '<td class="tCenter gensmall">' + (p.status || '-') + '</td>';
            html += '<td class="tCenter">' + (p.is_fictional ? '<span class="fic">YES</span>' : '<span class="gensmall">no</span>') + '</td>';
            if (EDIT_MODE) {
                html += '<td class="tCenter"><a href="#" onclick="editPlayerInline(DATA.players.find(function(x){return x.id===\'' + p.id + '\'}));return false;" class="gensmall">[edit]</a> <a href="#" onclick="deletePlayer(\'' + p.id + '\');return false;" class="gensmall" style="color:#CC0000;">[del]</a></td>';
            }
            html += '</tr>';
        }
        if (!html) html = '<tr class="row1"><td colspan="' + (EDIT_MODE ? 10 : 9) + '" class="gensmall" style="color:#666;text-align:center;">No players found</td></tr>';
        tbody.innerHTML = html;
    }

    function setupPlayerFilters() {
        var searchEl = document.getElementById('search-input');
        var leagueEl = document.getElementById('filter-league');
        var posEl = document.getElementById('filter-pos');
        var statusEl = document.getElementById('filter-status');
        var ficEl = document.getElementById('filter-fictional');
        if (searchEl) searchEl.addEventListener('input', renderPlayerList);
        if (leagueEl) leagueEl.addEventListener('change', renderPlayerList);
        if (posEl) posEl.addEventListener('change', renderPlayerList);
        if (statusEl) statusEl.addEventListener('change', renderPlayerList);
        if (ficEl) ficEl.addEventListener('change', renderPlayerList);

        var headers = document.querySelectorAll('.forumline th a[data-sort]');
        for (var i = 0; i < headers.length; i++) {
            headers[i].addEventListener('click', function(e) {
                e.preventDefault();
                var field = this.getAttribute('data-sort');
                if (sortField === field) {
                    sortAsc = !sortAsc;
                } else {
                    sortField = field;
                    sortAsc = true;
                }
                renderPlayerList();
            });
        }
    }

    function renderPlayerProfile(id) {
        var player = getPlayerById(id);
        var headerEl = document.getElementById('player-header-section');
        if (!player) {
            if (headerEl) headerEl.innerHTML = '<table class="forumline"><tr><td class="row1" style="padding:8px;">Player not found. <a href="players.html">Browse players</a></td></tr></table>';
            return;
        }
        var bc = document.getElementById('breadcrumb-player');
        if (bc) bc.textContent = player.name;
        renderPlayerHeader(player);
        renderCareerStats(player);
        renderPlayerCharts(player);
        renderDraftInfo(player);
        renderCareerTimeline(player);
        renderScoutingNotes(player);
    }

    function renderPlayerHeader(player) {
        var container = document.getElementById('player-header-section');
        var team = getPlayerTeam(player);
        var html = '<table class="forumline player-header-table">';
        html += '<tr><th class="catHead" colspan="4">Player Profile</th></tr>';
        html += '<tr class="row1"><td colspan="4" style="padding:6px 8px;">';
        html += '<span class="player-name">' + player.name;
        if (player.is_fictional) html += ' <span class="fictional-badge">FICTIONAL</span>';
        html += '</span><br>';
        html += '<span class="player-meta">';
        html += 'POS: <b>' + (player.position || '-') + '</b> &middot; ';
        html += 'HT: <b>' + (player.height || '-') + '</b> &middot; ';
        html += 'WT: <b>' + (player.weight || '-') + '</b> &middot; ';
        html += 'OVR: <b>' + (player.overall || '-') + '</b> &middot; ';
        html += 'Archetype: <b>' + (player.archetype || '-') + '</b> &middot; ';
        html += 'Status: <b>' + (player.status || '-') + '</b>';
        if (team) html += ' &middot; Team: <a href="team.html?id=' + team.id + '">' + team.name + '</a>';
        html += '<br>Nationality: ' + (player.nationality || '-') + ' &middot; DOB: ' + (player.birthdate || '-');
        html += '</span>';
        html += '</td></tr></table>';
        container.innerHTML = html;
    }

    function renderCareerStats(player) {
        var tbody = document.getElementById('career-stats-body');
        if (!tbody) return;
        var html = '';
        var career = player.career;
        var rowIdx = 0;

        if (career.highschool && career.highschool.seasons) {
            for (var i = 0; i < career.highschool.seasons.length; i++) {
                var s = career.highschool.seasons[i];
                html += '<tr class="' + rowClass(rowIdx++) + '"><td class="gensmall">' + (s.year || '-') + '</td><td class="tCenter gensmall">HS</td><td class="gensmall">' + (career.highschool.school || '-') + '</td>';
                html += '<td class="tCenter gensmall">-</td><td class="tCenter gensmall">-</td><td class="tCenter gensmall">-</td>';
                html += '<td class="tCenter">' + numStr(s.ppg) + '</td><td class="tCenter">' + numStr(s.apg) + '</td><td class="tCenter">' + numStr(s.rpg) + '</td>';
                html += '<td class="tCenter">' + numStr(s.spg) + '</td><td class="tCenter">' + numStr(s.bpg) + '</td>';
                html += '<td class="tCenter">' + pctStr(s.fg_pct) + '</td><td class="tCenter">' + pctStr(s.fg3_pct) + '</td><td class="tCenter">' + pctStr(s.ft_pct) + '</td></tr>';
            }
        }

        if (career.college && career.college.seasons) {
            for (var i = 0; i < career.college.seasons.length; i++) {
                var s = career.college.seasons[i];
                html += '<tr class="' + rowClass(rowIdx++) + '"><td class="gensmall">' + (s.year || '-') + '</td><td class="tCenter gensmall">COL</td><td class="gensmall">' + (career.college.school || '-') + ' (' + (career.college.division || '-') + ')</td>';
                html += '<td class="tCenter">' + (s.gp || '-') + '</td><td class="tCenter">' + (s.gs || '-') + '</td><td class="tCenter">' + numStr(s.mpg || 0) + '</td>';
                html += '<td class="tCenter">' + numStr(s.ppg) + '</td><td class="tCenter">' + numStr(s.apg) + '</td><td class="tCenter">' + numStr(s.rpg) + '</td>';
                html += '<td class="tCenter">' + numStr(s.spg) + '</td><td class="tCenter">' + numStr(s.bpg) + '</td>';
                html += '<td class="tCenter">' + pctStr(s.fg_pct) + '</td><td class="tCenter">' + pctStr(s.fg3_pct) + '</td><td class="tCenter">' + pctStr(s.ft_pct) + '</td></tr>';
            }
        }

        if (career.pro) {
            for (var i = 0; i < career.pro.length; i++) {
                var pro = career.pro[i];
                var team = getTeamById(pro.team_id);
                var seasons = pro.seasons || [];
                if (seasons.length === 0) {
                    html += '<tr class="' + rowClass(rowIdx++) + '"><td class="gensmall">-</td><td class="tCenter gensmall">' + (pro.league || '-') + '</td><td class="gensmall">' + (team ? team.abbreviation : (pro.team_id || '-')) + '</td>';
                    html += '<td colspan="11" class="tCenter gensmall" style="color:#666;">No season data</td></tr>';
                }
                for (var j = 0; j < seasons.length; j++) {
                    var s = seasons[j];
                    html += '<tr class="' + rowClass(rowIdx++) + '"><td class="gensmall">' + (s.year || '-') + '</td><td class="tCenter gensmall">' + (pro.league || '-') + '</td><td class="gensmall">' + (team ? team.abbreviation : (pro.team_id || '-')) + '</td>';
                    html += '<td class="tCenter">' + (s.gp || '-') + '</td><td class="tCenter">' + (s.gs || '-') + '</td><td class="tCenter">' + numStr(s.mpg || 0) + '</td>';
                    html += '<td class="tCenter">' + numStr(s.ppg) + '</td><td class="tCenter">' + numStr(s.apg) + '</td><td class="tCenter">' + numStr(s.rpg) + '</td>';
                    html += '<td class="tCenter">' + numStr(s.spg) + '</td><td class="tCenter">' + numStr(s.bpg) + '</td>';
                    html += '<td class="tCenter">' + pctStr(s.fg_pct) + '</td><td class="tCenter">' + pctStr(s.fg3_pct) + '</td><td class="tCenter">' + pctStr(s.ft_pct) + '</td></tr>';
                }
            }
        }
        if (!html) html = '<tr class="row1"><td colspan="14" class="gensmall" style="color:#666;text-align:center;">No career stats available</td></tr>';
        tbody.innerHTML = html;
    }

    function renderPlayerCharts(player) {
        var proSeasons = [];
        if (player.career && player.career.pro) {
            for (var i = 0; i < player.career.pro.length; i++) {
                var pro = player.career.pro[i];
                var seasons = pro.seasons || [];
                for (var j = 0; j < seasons.length; j++) {
                    proSeasons.push(seasons[j]);
                }
            }
        }
        if (proSeasons.length === 0) return;

        var labels = proSeasons.map(function(s) { return s.year || ''; });

        if (typeof Chart === 'undefined') return;

        var chartDefaults = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { ticks: { color: '#666', font: { family: 'Verdana, sans-serif', size: 9 } }, grid: { color: '#DDD' } },
                y: { ticks: { color: '#666', font: { family: 'Verdana, sans-serif', size: 9 } }, grid: { color: '#DDD' } }
            }
        };

        var ppgCanvas = document.getElementById('ppg-chart');
        if (ppgCanvas) {
            new Chart(ppgCanvas, {
                type: 'line',
                data: { labels: labels, datasets: [{ label: 'PPG', data: proSeasons.map(function(s) { return s.ppg || 0; }), borderColor: '#0066CC', backgroundColor: 'rgba(0,102,204,0.1)', fill: true, tension: 0.3, pointRadius: 3 }] },
                options: chartDefaults
            });
        }

        var apgCanvas = document.getElementById('apg-chart');
        if (apgCanvas) {
            new Chart(apgCanvas, {
                type: 'line',
                data: { labels: labels, datasets: [{ label: 'APG', data: proSeasons.map(function(s) { return s.apg || 0; }), borderColor: '#006600', backgroundColor: 'rgba(0,102,0,0.1)', fill: true, tension: 0.3, pointRadius: 3 }] },
                options: chartDefaults
            });
        }

        var rpgCanvas = document.getElementById('rpg-chart');
        if (rpgCanvas) {
            new Chart(rpgCanvas, {
                type: 'line',
                data: { labels: labels, datasets: [{ label: 'RPG', data: proSeasons.map(function(s) { return s.rpg || 0; }), borderColor: '#CC6600', backgroundColor: 'rgba(204,102,0,0.1)', fill: true, tension: 0.3, pointRadius: 3 }] },
                options: chartDefaults
            });
        }

        var shootingCanvas = document.getElementById('shooting-chart');
        if (shootingCanvas) {
            new Chart(shootingCanvas, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [
                        { label: 'FG%', data: proSeasons.map(function(s) { return (s.fg_pct || 0) * 100; }), backgroundColor: '#0066CC' },
                        { label: '3P%', data: proSeasons.map(function(s) { return (s.fg3_pct || 0) * 100; }), backgroundColor: '#006600' },
                        { label: 'FT%', data: proSeasons.map(function(s) { return (s.ft_pct || 0) * 100; }), backgroundColor: '#CC6600' }
                    ]
                },
                options: Object.assign({}, chartDefaults, { plugins: { legend: { display: true, labels: { color: '#000', font: { family: 'Verdana, sans-serif', size: 9 } } } } })
            });
        }
    }

    function renderDraftInfo(player) {
        var tbody = document.getElementById('draft-info-body');
        if (!tbody || !player.draft) return;
        var d = player.draft;
        var team = getTeamById(d.team_id);
        var html = '';
        html += '<tr class="row1"><td class="gensmall" style="width:100px;">Year</td><td class="gensmall">' + (d.year || '-') + '</td></tr>';
        html += '<tr class="row2"><td class="gensmall">League</td><td class="gensmall">' + (d.league || '-') + '</td></tr>';
        html += '<tr class="row1"><td class="gensmall">Round</td><td class="gensmall">' + (d.round || '-') + '</td></tr>';
        html += '<tr class="row2"><td class="gensmall">Pick</td><td class="gensmall">' + (d.pick || '-') + '</td></tr>';
        html += '<tr class="row1"><td class="gensmall">Team</td><td class="gensmall">' + (team ? team.name : (d.team_id || 'Undrafted')) + '</td></tr>';
        if (player.is_fictional) html += '<tr class="row2"><td class="gensmall">Note</td><td class="gensmall fic">Fictional draft pick</td></tr>';
        tbody.innerHTML = html;
    }

    function renderCareerTimeline(player) {
        var container = document.getElementById('career-timeline');
        if (!container) return;
        var html = '';
        if (player.lore_events && player.lore_events.length > 0) {
            for (var i = 0; i < player.lore_events.length; i++) {
                var event = null;
                for (var j = 0; j < DATA.events.length; j++) {
                    if (DATA.events[j].id === player.lore_events[i]) { event = DATA.events[j]; break; }
                }
                if (event) {
                    html += '<tr class="' + rowClass(i) + '"><td>';
                    html += '<div class="timeline-post">';
                    html += '<div class="post-header"><span class="event-type">' + (event.type || '') + '</span><span class="gensmall">' + (event.date || '') + '</span></div>';
                    html += '<div class="post-body"><span class="bold">' + (event.title || '') + '</span><br><span class="gensmall">' + (event.description || '') + '</span></div>';
                    html += '</div></td></tr>';
                }
            }
        }
        if (!html) {
            html = '<tr class="row1"><td class="gensmall" style="padding:8px;color:#666;">No lore events recorded.</td></tr>';
        }
        container.innerHTML = html;
    }

    function renderScoutingNotes(player) {
        var container = document.getElementById('scouting-notes');
        if (!container) return;
        container.innerHTML = '<span class="gensmall">' + (player.notes || 'No scouting notes available.') + '</span>';
    }

    // Expose to global scope
    window.renderPlayerList = renderPlayerList;
    window.setupPlayerFilters = setupPlayerFilters;
    window.renderPlayerProfile = renderPlayerProfile;
})();
