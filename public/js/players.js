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

        // Check URL query param for search
        if (!search) {
            var params = new URLSearchParams(window.location.search);
            var q = params.get('q');
            if (q && searchEl) { searchEl.value = q; search = q.toLowerCase(); }
        }

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
                if (!hasLeague && leagueFilter === 'NCAA D1' && p.career && p.career.college && p.career.college.school) {
                    hasLeague = true;
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
            var age = calculateAge(p.birthdate);
            var latestStats = getLatestSeasonStats(p);
            var teamColor = team && team.colors && team.colors[0] ? team.colors[0] : 'transparent';
            html += '<tr class="' + rowClass(i) + '" style="border-left:3px solid ' + teamColor + ';">';
            html += '<td class="row-num">' + (i+1) + '</td>';
            if (EDIT_MODE) html += '<td class="tCenter"><input type="checkbox" class="bulk-checkbox" data-id="' + p.id + '"></td>';
            html += '<td>' + renderStatusDot(p.status) + renderAvatar(p, 'small') + renderFlag(p.nationality) + '<a href="player.html?id=' + p.id + '">' + p.name + '</a>' + renderJerseyNum(p);
            if (p.is_fictional) html += ' <span class="fic" title="Fictional">*</span>';
            html += '</td>';
            html += '<td class="tCenter">' + renderPosBadge(p.position) + '</td>';
            html += '<td class="tCenter gensmall mono">' + (age || '-') + '</td>';
            html += '<td class="tCenter gensmall mono">' + (p.height || '-') + '</td>';
            html += '<td class="tCenter gensmall mono">' + (p.weight || '-') + '</td>';
            html += '<td class="gensmall">' + (team ? renderTeamColorDot(team) + '<a href="team.html?id=' + team.id + '">' + team.abbreviation + '</a>' : '-') + '</td>';
            html += '<td class="tCenter">' + renderOvrBar(p.overall) + '</td>';
            html += '<td class="tCenter gensmall">' + coloredStat(latestStats.ppg, PPG_THRESH) + '</td>';
            html += '<td class="tCenter gensmall">' + coloredStat(latestStats.apg, APG_THRESH) + '</td>';
            html += '<td class="tCenter gensmall">' + coloredStat(latestStats.rpg, RPG_THRESH) + '</td>';
            html += '<td class="tCenter gensmall">' + renderStatusDot(p.status) + (p.status || '-') + '</td>';
            if (EDIT_MODE) {
                html += '<td class="tCenter"><a href="#" onclick="openPlayerEditor(DATA.players.find(function(x){return x.id===\'' + p.id + '\'}));return false;" class="gensmall">[edit]</a> <a href="#" onclick="deletePlayer(\'' + p.id + '\');return false;" class="gensmall" style="color:var(--accent-red);">[del]</a></td>';
            }
            html += '</tr>';
        }
        var colCount = EDIT_MODE ? 15 : 13;
        if (!html) html = '<tr class="row1"><td colspan="' + colCount + '" class="gensmall" style="text-align:center;">No players found</td></tr>';
        tbody.innerHTML = html;
        // Update count
        var countEl = document.getElementById('player-count');
        if (countEl) countEl.textContent = 'Showing ' + players.length + ' of ' + DATA.players.length + ' players';
    }

    function getLatestSeasonStats(player) {
        var stats = { ppg: null, apg: null, rpg: null };
        if (player.career && player.career.pro) {
            for (var i = player.career.pro.length - 1; i >= 0; i--) {
                var pro = player.career.pro[i];
                if (pro.seasons && pro.seasons.length > 0) {
                    var last = pro.seasons[pro.seasons.length - 1];
                    stats.ppg = last.ppg;
                    stats.apg = last.apg;
                    stats.rpg = last.rpg;
                    return stats;
                }
            }
        }
        if (player.career && player.career.college && player.career.college.seasons && player.career.college.seasons.length > 0) {
            var last = player.career.college.seasons[player.career.college.seasons.length - 1];
            stats.ppg = last.ppg;
            stats.apg = last.apg;
            stats.rpg = last.rpg;
        }
        return stats;
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
            if (headerEl) headerEl.innerHTML = '<table class="forumline"><tr><td class="row1" style="padding:6px;">Player not found. <a href="players.html">Browse players</a></td></tr></table>';
            return;
        }
        var bc = document.getElementById('breadcrumb-player');
        if (bc) bc.textContent = player.name;
        document.title = 'MADCAP - ' + player.name;
        renderPlayerHeader(player);
        renderAttributesPanel(player);
        renderQuickStats(player);
        renderCareerStats(player);
        renderGameLogSection(player);
        renderPlayerCharts(player);
        renderAwardTrophyCase(player);
        renderInjuryHistory(player);
        renderTransactionLog(player);
        renderContractDetails(player);
        renderDraftInfo(player);
        renderCareerTimeline(player);
        renderLoreArticle(player);
        renderScoutingNotes(player);
        renderMediaClippings(player);
        renderMeasurements(player);
    }

    function renderPlayerHeader(player) {
        var container = document.getElementById('player-header-section');
        var team = getPlayerTeam(player);
        var age = calculateAge(player.birthdate);
        var careerHighs = getCareerHighs(player);
        var jerseyNum = '';
        if (player.jersey_history && player.jersey_history.length > 0) {
            jerseyNum = player.jersey_history[player.jersey_history.length - 1].number;
        }
        var teamColor = team && team.colors && team.colors[0] ? team.colors[0] : 'var(--cat-head-bg)';

        var html = '<table class="forumline player-header-table">';
        html += '<tr><th class="catHead" colspan="4">Player Profile';
        if (EDIT_MODE) html += ' <a href="#" onclick="openPlayerEditor(getPlayerById(\'' + player.id + '\'));return false;" class="edit-btn" style="display:inline !important;color:var(--link-color);">[edit]</a>';
        html += '</th></tr>';
        html += '<tr class="row1"><td colspan="4" style="padding:4px 6px;border-left:4px solid ' + teamColor + ';">';
        html += '<div class="player-header-content">';
        html += renderAvatar(player, 'large');
        html += '<div class="player-header-info">';
        // Name & jersey
        html += '<span class="player-name">';
        if (jerseyNum) html += '<span style="font-size:18px;color:' + teamColor + ';">#' + jerseyNum + '</span> ';
        html += player.name;
        if (player.is_fictional) html += ' <span class="fictional-badge">* FICTIONAL</span>';
        html += '</span><br>';
        // Main meta line with position badge and status dot
        html += '<span class="player-meta">';
        html += renderPosBadge(player.position) + ' ';
        html += 'HT: <b class="mono">' + (player.height || '-') + '</b> &middot; ';
        html += 'WT: <b class="mono">' + (player.weight || '-') + '</b> &middot; ';
        html += 'OVR: ' + renderOvrBar(player.overall) + ' &middot; ';
        html += 'Archetype: <b>' + (player.archetype || '-') + '</b> &middot; ';
        html += renderStatusDot(player.status) + ' Status: <b>' + (player.status || '-') + '</b>';
        if (team) html += ' &middot; Team: ' + renderTeamColorDot(team) + '<a href="team.html?id=' + team.id + '">' + team.name + '</a>';
        html += '</span><br>';
        // Second meta line - nationality & age with birth year
        html += '<span class="player-meta">';
        if (player.nationality) html += renderFlag(player.nationality, 'large');
        html += 'Nationality: ' + (player.nationality || '-');
        html += ' &middot; Age: <b>' + renderAgeWithBirth(player.birthdate) + '</b>';
        html += '</span><br>';
        // Draft info one-liner
        if (player.draft) {
            var d = player.draft;
            var dTeam = getTeamById(d.team_id);
            html += '<span class="player-meta">Draft: ' + renderLeagueBadge(d.league) + ' <span class="draft-pick-badge">R' + (d.round || '?') + ' P' + (d.pick || '?') + '</span> <b>' + (d.year || '?') + '</b> by ' + (dTeam ? dTeam.name : (d.team_id || '?')) + '</span><br>';
        }
        // Career highs
        if (careerHighs.ppg > 0) {
            html += '<span class="player-meta">Career Highs: PPG: <b class="mono">' + coloredStat(careerHighs.ppg, PPG_THRESH) + '</b> &middot; APG: <b class="mono">' + coloredStat(careerHighs.apg, APG_THRESH) + '</b> &middot; RPG: <b class="mono">' + coloredStat(careerHighs.rpg, RPG_THRESH) + '</b></span><br>';
        }
        // Contract one-liner
        if (player.contract) {
            var c = player.contract;
            html += '<span class="player-meta">Contract: <span class="contract-value">' + formatCurrency(c.annual_value) + '/yr</span>';
            if (c.type) html += ' <span class="contract-type-badge">' + c.type.replace(/_/g, ' ') + '</span>';
            if (c.years_remaining) html += ' <span class="gensmall">(' + c.years_remaining + 'yr rem)</span>';
            html += '</span><br>';
        }
        // Last updated with relative time
        html += '<span class="last-updated">Last updated: ' + new Date().toISOString().slice(0, 10) + ' (' + relativeTime(new Date().toISOString()) + ')</span>';
        html += '</div></div>';
        html += '</td></tr></table>';
        container.innerHTML = html;
    }

    function getCareerHighs(player) {
        var highs = { ppg: 0, apg: 0, rpg: 0 };
        var career = player.career || {};
        function checkSeasons(seasons) {
            for (var i = 0; i < (seasons || []).length; i++) {
                var s = seasons[i];
                if ((s.ppg || 0) > highs.ppg) highs.ppg = s.ppg;
                if ((s.apg || 0) > highs.apg) highs.apg = s.apg;
                if ((s.rpg || 0) > highs.rpg) highs.rpg = s.rpg;
            }
        }
        if (career.pro) {
            for (var i = 0; i < career.pro.length; i++) checkSeasons(career.pro[i].seasons);
        }
        if (career.college) checkSeasons(career.college.seasons);
        if (career.highschool) checkSeasons(career.highschool.seasons);
        return highs;
    }

    function renderQuickStats(player) {
        var container = document.getElementById('quick-stats-section');
        if (!container) return;
        var career = player.career || {};
        var allSeasons = [];
        if (career.pro) {
            for (var i = 0; i < career.pro.length; i++) {
                var seasons = career.pro[i].seasons || [];
                for (var j = 0; j < seasons.length; j++) allSeasons.push(seasons[j]);
            }
        }
        if (allSeasons.length === 0 && career.college && career.college.seasons) {
            allSeasons = career.college.seasons;
        }
        if (allSeasons.length === 0) { container.style.display = 'none'; return; }

        var latest = allSeasons[allSeasons.length - 1];
        var html = '<div class="data-strip">';
        html += '<span class="ds-label">Latest Season:</span> <span class="ds-value">' + (latest.year || '-') + '</span>';
        html += '<span class="ds-label">PPG:</span> <span class="ds-value">' + coloredStat(latest.ppg, PPG_THRESH) + '</span>';
        html += '<span class="ds-label">APG:</span> <span class="ds-value">' + coloredStat(latest.apg, APG_THRESH) + '</span>';
        html += '<span class="ds-label">RPG:</span> <span class="ds-value">' + coloredStat(latest.rpg, RPG_THRESH) + '</span>';
        html += '<span class="ds-label">FG%:</span> <span class="ds-value">' + coloredPct(latest.fg_pct, FG_THRESH) + '</span>';
        html += '<span class="ds-label">GP:</span> <span class="ds-value">' + (latest.gp || '-') + '</span>';
        html += '</div>';
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
                html += '<tr class="' + rowClass(rowIdx) + '"><td class="row-num">' + (rowIdx+1) + '</td><td class="gensmall mono">' + (s.year || '-') + '</td><td class="tCenter">' + renderLeagueBadge('HS') + '</td><td class="gensmall">' + (career.highschool.school || '-') + '</td>';
                html += '<td class="tCenter gensmall">-</td><td class="tCenter gensmall">-</td><td class="tCenter gensmall">-</td>';
                html += '<td class="tCenter">' + coloredStat(s.ppg, PPG_THRESH) + '</td><td class="tCenter">' + coloredStat(s.apg, APG_THRESH) + '</td><td class="tCenter">' + coloredStat(s.rpg, RPG_THRESH) + '</td>';
                html += '<td class="tCenter">' + numStr(s.spg) + '</td><td class="tCenter">' + numStr(s.bpg) + '</td>';
                html += '<td class="tCenter">' + coloredPct(s.fg_pct, FG_THRESH) + '</td><td class="tCenter">' + pctStr(s.fg3_pct) + '</td><td class="tCenter">' + pctStr(s.ft_pct) + '</td></tr>';
                rowIdx++;
            }
        }

        if (career.college && career.college.seasons) {
            for (var i = 0; i < career.college.seasons.length; i++) {
                var s = career.college.seasons[i];
                html += '<tr class="' + rowClass(rowIdx) + '"><td class="row-num">' + (rowIdx+1) + '</td><td class="gensmall mono">' + (s.year || '-') + '</td><td class="tCenter">' + renderLeagueBadge('NCAA') + '</td><td class="gensmall">' + (career.college.school || '-') + ' (' + (career.college.division || '-') + ')</td>';
                html += '<td class="tCenter mono">' + (s.gp || '-') + '</td><td class="tCenter mono">' + (s.gs || '-') + '</td><td class="tCenter mono">' + numStr(s.mpg || 0) + '</td>';
                html += '<td class="tCenter">' + coloredStat(s.ppg, PPG_THRESH) + '</td><td class="tCenter">' + coloredStat(s.apg, APG_THRESH) + '</td><td class="tCenter">' + coloredStat(s.rpg, RPG_THRESH) + '</td>';
                html += '<td class="tCenter">' + numStr(s.spg) + '</td><td class="tCenter">' + numStr(s.bpg) + '</td>';
                html += '<td class="tCenter">' + coloredPct(s.fg_pct, FG_THRESH) + '</td><td class="tCenter">' + pctStr(s.fg3_pct) + '</td><td class="tCenter">' + pctStr(s.ft_pct) + '</td></tr>';
                rowIdx++;
            }
        }

        if (career.pro) {
            for (var i = 0; i < career.pro.length; i++) {
                var pro = career.pro[i];
                var team = getTeamById(pro.team_id);
                var seasons = pro.seasons || [];
                if (seasons.length === 0) {
                    html += '<tr class="' + rowClass(rowIdx) + '"><td class="row-num">' + (rowIdx+1) + '</td><td class="gensmall">-</td><td class="tCenter">' + renderLeagueBadge(pro.league) + '</td><td class="gensmall">' + (team ? team.abbreviation : (pro.team_id || '-')) + '</td>';
                    html += '<td colspan="11" class="tCenter gensmall">No season data</td></tr>';
                    rowIdx++;
                }
                for (var j = 0; j < seasons.length; j++) {
                    var s = seasons[j];
                    html += '<tr class="' + rowClass(rowIdx) + '"><td class="row-num">' + (rowIdx+1) + '</td><td class="gensmall mono">' + (s.year || '-') + '</td><td class="tCenter">' + renderLeagueBadge(pro.league) + '</td><td class="gensmall">' + renderTeamColorDot(team) + (team ? team.abbreviation : (pro.team_id || '-')) + '</td>';
                    html += '<td class="tCenter mono">' + (s.gp || '-') + '</td><td class="tCenter mono">' + (s.gs || '-') + '</td><td class="tCenter mono">' + numStr(s.mpg || 0) + '</td>';
                    html += '<td class="tCenter">' + coloredStat(s.ppg, PPG_THRESH) + '</td><td class="tCenter">' + coloredStat(s.apg, APG_THRESH) + '</td><td class="tCenter">' + coloredStat(s.rpg, RPG_THRESH) + '</td>';
                    html += '<td class="tCenter">' + numStr(s.spg) + '</td><td class="tCenter">' + numStr(s.bpg) + '</td>';
                    html += '<td class="tCenter">' + coloredPct(s.fg_pct, FG_THRESH) + '</td><td class="tCenter">' + pctStr(s.fg3_pct) + '</td><td class="tCenter">' + pctStr(s.ft_pct) + '</td></tr>';
                    rowIdx++;
                }
            }
        }
        if (!html) html = '<tr class="row1"><td colspan="15" class="gensmall" style="text-align:center;">No career stats available</td></tr>';
        tbody.innerHTML = html;
    }

    function renderPlayerCharts(player) {
        var chartsSection = document.getElementById('charts-section');
        if (!chartsSection) return;

        var allSeasons = [];
        var seasonLabels = [];

        if (player.career && player.career.pro) {
            for (var i = 0; i < player.career.pro.length; i++) {
                var pro = player.career.pro[i];
                var seasons = pro.seasons || [];
                for (var j = 0; j < seasons.length; j++) {
                    allSeasons.push(seasons[j]);
                    seasonLabels.push(seasons[j].year || '');
                }
            }
        }

        if (allSeasons.length === 0 && player.career && player.career.college && player.career.college.seasons) {
            var college = player.career.college;
            for (var i = 0; i < college.seasons.length; i++) {
                allSeasons.push(college.seasons[i]);
                seasonLabels.push(college.seasons[i].year || '');
            }
        }

        if (allSeasons.length === 0 && player.career && player.career.highschool && player.career.highschool.seasons) {
            var hs = player.career.highschool;
            for (var i = 0; i < hs.seasons.length; i++) {
                allSeasons.push(hs.seasons[i]);
                seasonLabels.push(hs.seasons[i].year || '');
            }
        }

        if (allSeasons.length === 0) { chartsSection.style.display = 'none'; return; }
        chartsSection.style.display = '';

        // Helper: build a bar chart panel (pure HTML)
        function barPanel(title, key, colorClass, maxVal) {
            var max = maxVal || 0;
            for (var i = 0; i < allSeasons.length; i++) {
                var v = Number(allSeasons[i][key]) || 0;
                if (v > max) max = v;
            }
            if (max === 0) max = 1;
            var h = '<div class="css-chart-panel"><div class="catHead">' + title + '</div><div class="css-chart-body">';
            for (var i = 0; i < allSeasons.length; i++) {
                var v = Number(allSeasons[i][key]) || 0;
                var pct = Math.round((v / max) * 100);
                h += '<div class="css-bar-row" data-season-idx="' + i + '">';
                h += '<div class="css-bar-label">' + seasonLabels[i] + '</div>';
                h += '<div class="css-bar-track"><div class="css-bar-fill ' + colorClass + '" style="width:' + pct + '%"></div></div>';
                h += '<div class="css-bar-val">' + numStr(v) + '</div>';
                h += '</div>';
            }
            h += '</div></div>';
            return h;
        }

        // Shooting panel with grouped bars (FG%, 3P%, FT%)
        function shootPanel() {
            var h = '<div class="css-chart-panel"><div class="catHead">Shooting</div>';
            h += '<div class="css-shoot-legend">';
            h += '<span><span class="css-shoot-swatch" style="background:#6688AA"></span>FG%</span>';
            h += '<span><span class="css-shoot-swatch" style="background:#5A8A5A"></span>3P%</span>';
            h += '<span><span class="css-shoot-swatch" style="background:#8A8A5A"></span>FT%</span>';
            h += '</div><div class="css-chart-body">';
            for (var i = 0; i < allSeasons.length; i++) {
                var fg = Math.round((Number(allSeasons[i].fg_pct) || 0) * 100);
                var fg3 = Math.round((Number(allSeasons[i].fg3_pct) || 0) * 100);
                var ft = Math.round((Number(allSeasons[i].ft_pct) || 0) * 100);
                h += '<div class="css-bar-row" data-season-idx="' + i + '">';
                h += '<div class="css-bar-label">' + seasonLabels[i] + '</div>';
                h += '<div class="css-bar-track">';
                h += '<div class="css-bar-fill css-bar-fill-fg" style="width:' + fg + '%;position:absolute;top:0;height:33%"></div>';
                h += '<div class="css-bar-fill css-bar-fill-fg3" style="width:' + fg3 + '%;position:absolute;top:33%;height:34%"></div>';
                h += '<div class="css-bar-fill css-bar-fill-ft" style="width:' + ft + '%;position:absolute;top:67%;height:33%"></div>';
                h += '</div>';
                h += '<div class="css-bar-val">' + fg + '%</div>';
                h += '</div>';
            }
            h += '</div></div>';
            return h;
        }

        var html = '<div class="catHead" style="border:1px solid var(--border-color);border-bottom:0;">Stat Progression</div>';
        html += '<div class="css-charts-grid">';
        html += barPanel('PPG', 'ppg', 'css-bar-fill-ppg', 0);
        html += barPanel('APG', 'apg', 'css-bar-fill-apg', 0);
        html += barPanel('RPG', 'rpg', 'css-bar-fill-rpg', 0);
        html += shootPanel();
        html += '</div>';
        chartsSection.innerHTML = html;

        // --- Interactive: tooltip + cross-chart highlight ---
        var tooltip = document.createElement('div');
        tooltip.className = 'css-chart-tooltip';
        tooltip.style.display = 'none';
        document.body.appendChild(tooltip);

        // Build tooltip content for a season
        function tooltipHtml(idx) {
            var s = allSeasons[idx];
            var t = '<div class="tt-season">' + seasonLabels[idx] + '</div>';
            t += '<div class="tt-row"><span class="tt-label">PPG</span><span class="tt-value">' + numStr(s.ppg) + '</span></div>';
            t += '<div class="tt-row"><span class="tt-label">APG</span><span class="tt-value">' + numStr(s.apg) + '</span></div>';
            t += '<div class="tt-row"><span class="tt-label">RPG</span><span class="tt-value">' + numStr(s.rpg) + '</span></div>';
            t += '<div class="tt-row"><span class="tt-label">FG%</span><span class="tt-value">' + pctStr(s.fg_pct) + '</span></div>';
            t += '<div class="tt-row"><span class="tt-label">3P%</span><span class="tt-value">' + pctStr(s.fg3_pct) + '</span></div>';
            t += '<div class="tt-row"><span class="tt-label">FT%</span><span class="tt-value">' + pctStr(s.ft_pct) + '</span></div>';
            if (s.gp) t += '<div class="tt-row"><span class="tt-label">GP</span><span class="tt-value">' + s.gp + '</span></div>';
            if (s.mpg) t += '<div class="tt-row"><span class="tt-label">MPG</span><span class="tt-value">' + numStr(s.mpg) + '</span></div>';
            return t;
        }

        // Highlight all bars with matching season index across panels
        function highlightSeason(idx) {
            var rows = chartsSection.querySelectorAll('.css-bar-row');
            for (var i = 0; i < rows.length; i++) {
                if (rows[i].getAttribute('data-season-idx') === String(idx)) {
                    rows[i].classList.add('active');
                } else {
                    rows[i].classList.remove('active');
                }
            }
        }

        function clearHighlight() {
            var rows = chartsSection.querySelectorAll('.css-bar-row.active');
            for (var i = 0; i < rows.length; i++) rows[i].classList.remove('active');
        }

        // Event delegation on the charts section
        chartsSection.addEventListener('mouseover', function(e) {
            var row = e.target.closest('.css-bar-row');
            if (!row) { tooltip.style.display = 'none'; return; }
            var idx = parseInt(row.getAttribute('data-season-idx'), 10);
            if (isNaN(idx) || idx < 0 || idx >= allSeasons.length) return;
            tooltip.innerHTML = tooltipHtml(idx);
            tooltip.style.display = 'block';
        });

        chartsSection.addEventListener('mousemove', function(e) {
            if (tooltip.style.display === 'none') return;
            var x = e.clientX + 12;
            var y = e.clientY + 12;
            // Keep tooltip on screen
            if (x + 180 > window.innerWidth) x = e.clientX - 190;
            if (y + 120 > window.innerHeight) y = e.clientY - 130;
            tooltip.style.left = x + 'px';
            tooltip.style.top = y + 'px';
        });

        chartsSection.addEventListener('mouseout', function(e) {
            var row = e.target.closest('.css-bar-row');
            if (!row || !chartsSection.contains(e.relatedTarget)) {
                tooltip.style.display = 'none';
            }
        });

        // Click: toggle season highlight across all panels
        var activeIdx = -1;
        chartsSection.addEventListener('click', function(e) {
            var row = e.target.closest('.css-bar-row');
            if (!row) return;
            var idx = parseInt(row.getAttribute('data-season-idx'), 10);
            if (isNaN(idx)) return;
            if (activeIdx === idx) {
                clearHighlight();
                activeIdx = -1;
            } else {
                highlightSeason(idx);
                activeIdx = idx;
            }
        });
    }

    function renderDraftInfo(player) {
        var tbody = document.getElementById('draft-info-body');
        if (!tbody || !player.draft) {
            var wrap = document.getElementById('draft-info-table-wrap');
            if (wrap && !player.draft) wrap.style.display = 'none';
            return;
        }
        var d = player.draft;
        var team = getTeamById(d.team_id);
        var html = '';
        html += '<tr class="row1"><td class="gensmall" style="width:100px;">Year</td><td class="gensmall mono">' + (d.year || '-') + '</td></tr>';
        html += '<tr class="row2"><td class="gensmall">League</td><td class="gensmall">' + renderLeagueBadge(d.league) + ' ' + (d.league || '-') + '</td></tr>';
        html += '<tr class="row1"><td class="gensmall">Round</td><td class="gensmall"><span class="draft-pick-badge">R' + (d.round || '?') + '</span></td></tr>';
        html += '<tr class="row2"><td class="gensmall">Pick</td><td class="gensmall"><span class="draft-pick-badge">P' + (d.pick || '?') + '</span></td></tr>';
        html += '<tr class="row1"><td class="gensmall">Team</td><td class="gensmall">' + (team ? renderTeamColorDot(team) + team.name : (d.team_id || 'Undrafted')) + '</td></tr>';
        if (player.is_fictional) html += '<tr class="row2"><td class="gensmall">Note</td><td class="gensmall fic">Fictional draft pick *</td></tr>';
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
                    html += '<div class="post-header">' + renderUrgencyTag(event.type) + '<span class="gensmall">' + (event.date || '') + '</span>';
                    if (event.date) html += ' <span class="gensmall" style="color:var(--text-light);">' + relativeTime(event.date) + '</span>';
                    if (isRecent(event.date)) html += ' <span class="tag-new">NEW</span>';
                    html += '</div>';
                    html += '<div class="post-body"><span class="bold">' + (event.title || '') + '</span><br><span class="gensmall">' + (event.description || '') + '</span></div>';
                    html += '</div></td></tr>';
                }
            }
        }
        if (!html) {
            html = '<tr class="row1"><td class="gensmall" style="padding:6px;">No lore events recorded.</td></tr>';
        }
        container.innerHTML = html;
    }

    // === Merged Lore Article (from lore.html) ===
    function renderLoreArticle(player) {
        var container = document.getElementById('lore-article-section');
        if (!container) return;
        if (!player.is_fictional) {
            container.innerHTML = '<div class="gensmall" style="padding:6px;">Lore is only available for fictional players.</div>';
            return;
        }
        container.innerHTML = '<div class="loading-text" style="padding:6px;">Loading lore</div>';
        fetch('api/players/' + player.id + '/lore').then(function(r) { return r.json(); }).then(function(data) {
            var content = data.content || 'No lore available for this player.';
            var html = '<div class="lore-article">' + renderMarkdown(content) + '</div>';
            // Related events
            var events = DATA.events.filter(function(e) { return e.player_id === player.id; });
            if (events.length > 0) {
                html += '<table class="forumline"><tr><th class="catHead">Related Events</th></tr>';
                for (var i = 0; i < events.length; i++) {
                    var e = events[i];
                    html += '<tr class="' + rowClass(i) + '"><td><div class="timeline-post"><div class="post-header">' + renderUrgencyTag(e.type) + '<span class="gensmall">' + (e.date||'') + '</span></div>';
                    html += '<div class="post-body"><span class="bold">' + (e.title||'') + '</span><br><span class="gensmall">' + (e.description||'') + '</span></div></div></td></tr>';
                }
                html += '</table>';
            }
            container.innerHTML = html;
        }).catch(function() {
            container.innerHTML = '<div class="gensmall" style="padding:6px;">Could not load lore content.</div>';
        });
    }

    function renderScoutingNotes(player) {
        var container = document.getElementById('scouting-notes');
        if (!container) return;
        container.innerHTML = '<span class="gensmall">' + (player.notes || 'No scouting notes available.') + '</span>';
    }

    // === PLAYER PROFILE SECTIONS ===

    function renderAttributesPanel(player) {
        var container = document.getElementById('attributes-section');
        if (!container) return;
        var attrs = player.attributes;
        var badges = player.badges;
        var tendencies = player.tendencies;
        if (!attrs && !badges && !tendencies) { container.style.display = 'none'; return; }

        var html = '<table class="forumline"><tr><th class="catHead" colspan="3">Attributes / Badges / Tendencies</th></tr>';
        html += '<tr>';

        // Column 1: Attributes (compact grid)
        html += '<td class="row1" style="padding:3px;vertical-align:top;width:40%;">';
        if (attrs) {
            html += '<div class="attr-grid">';
            var attrNames = {
                inside_scoring: 'Inside', mid_range: 'Mid-Range', three_point: '3PT',
                free_throw: 'FT', ball_handling: 'Handle', passing: 'Pass',
                offensive_rebound: 'Off Reb', defensive_rebound: 'Def Reb',
                steal: 'Steal', block: 'Block', lateral_quickness: 'Lat Quik',
                speed: 'Speed', acceleration: 'Accel', strength: 'Strength',
                vertical: 'Vert', stamina: 'Stamina'
            };
            for (var key in attrNames) {
                if (attrs[key] !== undefined) {
                    html += renderAttrCell(attrNames[key], attrs[key]);
                }
            }
            html += '</div>';
        } else {
            html += '<span class="gensmall">No attribute data</span>';
        }
        html += '</td>';

        // Column 2: Badges (grouped by tier)
        html += '<td class="row2" style="padding:3px;vertical-align:top;width:35%;">';
        if (badges && badges.length > 0) {
            // Group by tier
            var tiers = { hall_of_fame: [], hof: [], gold: [], silver: [], bronze: [] };
            var other = [];
            for (var i = 0; i < badges.length; i++) {
                var tier = (badges[i].tier || 'bronze').toLowerCase().replace(/ /g, '_');
                if (tiers[tier]) tiers[tier].push(badges[i]);
                else other.push(badges[i]);
            }
            // Merge hof into hall_of_fame
            tiers.hall_of_fame = tiers.hall_of_fame.concat(tiers.hof);
            var tierOrder = ['hall_of_fame', 'gold', 'silver', 'bronze'];
            var tierLabels = { hall_of_fame: 'HOF', gold: 'GOLD', silver: 'SILVER', bronze: 'BRONZE' };
            for (var t = 0; t < tierOrder.length; t++) {
                var tierKey = tierOrder[t];
                var tierBadges = tiers[tierKey];
                if (tierBadges.length === 0) continue;
                html += '<div style="font-size:7px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;margin:2px 0 1px;">' + tierLabels[tierKey] + '</div>';
                html += '<div class="badge-grid">';
                for (var b = 0; b < tierBadges.length; b++) {
                    html += renderBadgePill(tierBadges[b]);
                }
                html += '</div>';
            }
            if (other.length > 0) {
                html += '<div class="badge-grid" style="margin-top:2px;">';
                for (var b = 0; b < other.length; b++) html += renderBadgePill(other[b]);
                html += '</div>';
            }
        } else {
            html += '<span class="gensmall">No badges</span>';
        }
        html += '</td>';

        // Column 3: Tendencies (compact)
        html += '<td class="row1" style="padding:3px;vertical-align:top;width:25%;">';
        if (tendencies) {
            html += '<div class="attr-grid">';
            var tendNames = { drive_tendency: 'Drive', spot_up_tendency: 'Spot-Up', post_up_tendency: 'Post-Up', iso_tendency: 'ISO', pick_and_roll_tendency: 'PnR' };
            for (var key in tendNames) {
                if (tendencies[key] !== undefined) {
                    html += renderAttrCell(tendNames[key], tendencies[key]);
                }
            }
            html += '</div>';
        } else {
            html += '<span class="gensmall">No tendency data</span>';
        }
        html += '</td>';

        html += '</tr></table>';
        container.innerHTML = html;
    }

    function renderAttrCell(label, value) {
        var cls = value < 60 ? 'attr-low' : (value < 80 ? 'attr-mid' : 'attr-high');
        var pct = Math.min(100, Math.max(0, value));
        return '<div class="attr-cell"><span class="attr-label">' + label + '</span><span class="attr-track"><span class="attr-fill ' + cls + '" style="width:' + pct + '%"></span></span><span class="attr-val">' + value + '</span></div>';
    }

    // === Full Game Log ===
    function renderGameLogSection(player) {
        var container = document.getElementById('gamelog-section');
        if (!container) return;
        var career = player.career || {};
        var allGames = [];

        function collectGames(seasons, level, team) {
            for (var i = 0; i < (seasons || []).length; i++) {
                var s = seasons[i];
                for (var j = 0; j < (s.games || []).length; j++) {
                    var g = s.games[j];
                    allGames.push({ date: g.date, opponent: g.opponent, pts: g.pts, ast: g.ast, reb: g.reb, stl: g.stl, blk: g.blk, fg_made: g.fg_made, fg_att: g.fg_att, fg3_made: g.fg3_made, fg3_att: g.fg3_att, ft_made: g.ft_made, ft_att: g.ft_att, mins: g.mins, result: g.result, season: s.year, level: level, team: team });
                }
            }
        }

        if (career.pro) {
            for (var i = 0; i < career.pro.length; i++) {
                var team = getTeamById(career.pro[i].team_id);
                collectGames(career.pro[i].seasons, 'PRO', team ? team.abbreviation : career.pro[i].team_id);
            }
        }
        if (career.college) collectGames(career.college.seasons, 'COL', career.college.school || '');
        if (career.highschool) collectGames(career.highschool.seasons, 'HS', career.highschool.school || '');

        if (allGames.length === 0) {
            container.innerHTML = '<table class="forumline"><tr><th class="catHead">Full Game Log</th></tr><tr class="row1"><td class="gensmall" style="padding:6px;">No game log data available.</td></tr></table>';
            return;
        }

        allGames.sort(function(a, b) { return (b.date || '').localeCompare(a.date || ''); });

        var html = '<table class="forumline"><tr><th class="catHead" colspan="14">Full Game Log <span class="gensmall" style="color:var(--link-color);">(' + allGames.length + ' total games)</span></th></tr>';
        html += '<tr><th class="thHead">#</th><th class="thHead">Date</th><th class="thHead">Opp</th><th class="thHead">Result</th><th class="thHead">Team</th><th class="thHead tCenter">MIN</th><th class="thHead tCenter">PTS</th><th class="thHead tCenter">AST</th><th class="thHead tCenter">REB</th><th class="thHead tCenter">STL</th><th class="thHead tCenter">BLK</th><th class="thHead tCenter">FG</th><th class="thHead tCenter">3P</th><th class="thHead tCenter">FT</th></tr>';
        for (var i = 0; i < allGames.length; i++) {
            var g = allGames[i];
            var resultCls = (g.result || '').charAt(0) === 'W' ? 'result-w' : ((g.result || '').charAt(0) === 'L' ? 'result-l' : '');
            html += '<tr class="' + rowClass(i) + '"><td class="row-num">' + (i+1) + '</td><td class="gensmall mono">' + (g.date || '-') + '</td><td class="gensmall">' + (g.opponent || '-') + '</td>';
            html += '<td class="gensmall ' + resultCls + '">' + (g.result || '-') + '</td>';
            html += '<td class="gensmall">' + (g.team || '-') + '</td>';
            html += '<td class="tCenter mono">' + (g.mins || '-') + '</td><td class="tCenter bold mono">' + (g.pts || 0) + '</td>';
            html += '<td class="tCenter mono">' + (g.ast || 0) + '</td><td class="tCenter mono">' + (g.reb || 0) + '</td>';
            html += '<td class="tCenter mono">' + (g.stl || 0) + '</td><td class="tCenter mono">' + (g.blk || 0) + '</td>';
            html += '<td class="tCenter gensmall mono">' + (g.fg_made || 0) + '-' + (g.fg_att || 0) + '</td>';
            html += '<td class="tCenter gensmall mono">' + (g.fg3_made || 0) + '-' + (g.fg3_att || 0) + '</td>';
            html += '<td class="tCenter gensmall mono">' + (g.ft_made || 0) + '-' + (g.ft_att || 0) + '</td></tr>';
        }
        html += '</table>';
        html += '<div class="gensmall" style="padding:2px;">' + allGames.length + ' games shown</div>';
        container.innerHTML = html;
    }

    function renderAwardTrophyCase(player) {
        var container = document.getElementById('awards-section');
        if (!container) return;
        var awards = player.awards || [];
        if (awards.length === 0) {
            container.innerHTML = '<table class="forumline"><tr><th class="catHead">Award Trophy Case</th></tr><tr class="row1"><td class="gensmall" style="padding:6px;">No awards recorded.</td></tr></table>';
            return;
        }

        var html = '<table class="forumline"><tr><th class="catHead">Award Trophy Case</th></tr>';
        html += '<tr><td class="row1" style="padding:4px;"><div class="trophy-case">';
        for (var i = 0; i < awards.length; i++) {
            var a = awards[i];
            html += '<div class="trophy-item"><div class="trophy-name">' + (a.name || a) + '</div>';
            if (a.year) html += '<div class="trophy-year">' + a.year + '</div>';
            if (a.league) html += '<div class="trophy-league">' + renderLeagueBadge(a.league) + '</div>';
            html += '</div>';
        }
        html += '</div></td></tr></table>';
        container.innerHTML = html;
    }

    function renderInjuryHistory(player) {
        var container = document.getElementById('injuries-section');
        if (!container) return;
        var injuries = player.injuries || [];
        if (injuries.length === 0) {
            container.innerHTML = '<table class="forumline"><tr><th class="catHead" colspan="6">Injury History</th></tr><tr class="row1"><td colspan="6" class="gensmall" style="padding:6px;">No injury history.</td></tr></table>';
            return;
        }

        var html = '<table class="forumline"><tr><th class="catHead" colspan="7">Injury History</th></tr>';
        html += '<tr><th class="thHead">#</th><th class="thHead">Date</th><th class="thHead">Injury</th><th class="thHead">Severity</th><th class="thHead tCenter">Games Missed</th><th class="thHead">Return</th><th class="thHead">Notes</th></tr>';
        for (var i = 0; i < injuries.length; i++) {
            var inj = injuries[i];
            html += '<tr class="' + rowClass(i) + '"><td class="row-num">' + (i+1) + '</td><td class="gensmall mono">' + (inj.date || '-') + '</td>';
            html += '<td class="gensmall">' + renderStatusDot('injured') + (inj.type || '-') + '</td>';
            html += '<td>' + renderInjuryIndicator(inj.severity) + '</td>';
            html += '<td class="tCenter mono">' + (inj.games_missed || 0) + '</td>';
            html += '<td class="gensmall mono">' + (inj.return_date || 'TBD') + '</td>';
            html += '<td class="gensmall">' + (inj.notes || '') + '</td></tr>';
        }
        html += '</table>';
        container.innerHTML = html;
    }

    function renderTransactionLog(player) {
        var container = document.getElementById('transactions-section');
        if (!container) return;
        var txns = player.transactions || [];
        if (txns.length === 0) {
            container.innerHTML = '<table class="forumline"><tr><th class="catHead" colspan="4">Transaction History</th></tr><tr class="row1"><td colspan="4" class="gensmall" style="padding:6px;">No transactions recorded.</td></tr></table>';
            return;
        }

        var html = '<table class="forumline"><tr><th class="catHead" colspan="5">Transaction History</th></tr>';
        html += '<tr><th class="thHead">#</th><th class="thHead">Date</th><th class="thHead">Type</th><th class="thHead">Team</th><th class="thHead">Details</th></tr>';
        for (var i = 0; i < txns.length; i++) {
            var t = txns[i];
            var team = t.to_team_id ? getTeamById(t.to_team_id) : null;
            html += '<tr class="' + rowClass(i) + '"><td class="row-num">' + (i+1) + '</td><td class="gensmall mono">' + (t.date || '-') + '</td>';
            html += '<td>' + renderUrgencyTag(t.type) + '</td>';
            html += '<td class="gensmall">' + (team ? renderTeamColorDot(team) + team.name : (t.to_team_id || '-')) + '</td>';
            html += '<td class="gensmall">' + (t.details || '') + '</td></tr>';
        }
        html += '</table>';
        container.innerHTML = html;
    }

    function renderContractDetails(player) {
        var container = document.getElementById('contract-section');
        if (!container) return;
        var contract = player.contract;
        if (!contract) { container.style.display = 'none'; return; }

        var html = '<table class="forumline"><tr><th class="catHead" colspan="2">Contract Details</th></tr>';
        html += '<tr class="row1"><td class="gensmall" style="width:140px;">Type</td><td class="gensmall">' + (contract.type || '-').replace(/_/g, ' ') + ' <span class="contract-type-badge">' + (contract.type || '').replace(/_/g, ' ').toUpperCase() + '</span></td></tr>';
        html += '<tr class="row2"><td class="gensmall">Total Value</td><td class="contract-value">' + formatCurrency(contract.total_value) + '</td></tr>';
        html += '<tr class="row1"><td class="gensmall">Annual Value</td><td class="contract-value">' + formatCurrency(contract.annual_value) + '/yr</td></tr>';
        html += '<tr class="row2"><td class="gensmall">Years Remaining</td><td class="gensmall mono">' + (contract.years_remaining || '-') + '</td></tr>';
        if (contract.player_option_year) html += '<tr class="row1"><td class="gensmall">Player Option</td><td class="gensmall mono">' + contract.player_option_year + '</td></tr>';
        if (contract.team_option_year) html += '<tr class="row1"><td class="gensmall">Team Option</td><td class="gensmall mono">' + contract.team_option_year + '</td></tr>';
        html += '</table>';
        container.innerHTML = html;
    }

    function renderMediaClippings(player) {
        var container = document.getElementById('media-section');
        if (!container) return;
        var media = player.media || [];
        if (media.length === 0) {
            container.innerHTML = '<table class="forumline"><tr><th class="catHead">Media Clippings</th></tr><tr class="row1"><td class="gensmall" style="padding:6px;">No media clippings.</td></tr></table>';
            return;
        }

        var html = '<table class="forumline"><tr><th class="catHead">Media Clippings</th></tr>';
        for (var i = 0; i < media.length; i++) {
            var m = media[i];
            html += '<tr class="' + rowClass(i) + '"><td style="padding:3px 6px;">';
            html += '<div class="timeline-post">';
            html += '<div class="post-header">' + renderUrgencyTag(m.type || 'news');
            html += '<span class="gensmall">' + (m.date || '') + '</span>';
            if (m.source) html += ' <span class="gensmall">- ' + m.source + '</span>';
            html += '</div>';
            html += '<div class="post-body"><span class="bold">' + (m.headline || '') + '</span><br><span class="gensmall">' + (m.content || '') + '</span></div>';
            html += '</div></td></tr>';
        }
        html += '</table>';
        container.innerHTML = html;
    }

    function renderMeasurements(player) {
        var container = document.getElementById('measurements-section');
        if (!container) return;
        var m = player.measurements;
        if (!m) {
            container.innerHTML = '<table class="forumline"><tr><th class="catHead" colspan="2">Physical Measurements</th></tr><tr class="row1"><td class="gensmall" style="padding:6px;">No measurement data.</td></tr></table>';
            return;
        }

        var html = '<table class="forumline"><tr><th class="catHead" colspan="2">Physical Measurements</th></tr>';
        html += '<tr><td class="row1" style="padding:4px;"><table class="measurements-table">';
        var fields = {
            wingspan: 'Wingspan', standing_reach: 'Standing Reach', hand_length: 'Hand Length',
            hand_width: 'Hand Width', body_fat_pct: 'Body Fat %', no_step_vertical: 'No-Step Vertical',
            max_vertical: 'Max Vertical', lane_agility: 'Lane Agility', three_quarter_sprint: '3/4 Sprint'
        };
        for (var key in fields) {
            if (m[key] !== undefined) {
                var val = m[key];
                if (key === 'body_fat_pct') val = val + '%';
                else if (key === 'no_step_vertical' || key === 'max_vertical') val = val + '"';
                else if (key === 'lane_agility' || key === 'three_quarter_sprint') val = val + 's';
                html += '<tr><td>' + fields[key] + '</td><td>' + val + '</td></tr>';
            }
        }
        html += '</table></td></tr></table>';
        container.innerHTML = html;
    }

    // Expose to global scope
    window.renderPlayerList = renderPlayerList;
    window.setupPlayerFilters = setupPlayerFilters;
    window.renderPlayerProfile = renderPlayerProfile;
})();
