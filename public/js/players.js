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
                // Also check college for NCAA filters
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
            html += '<tr class="' + rowClass(i) + '">';
            html += '<td>' + renderAvatar(p, 'small') + '<a href="player.html?id=' + p.id + '">' + p.name + '</a></td>';
            html += '<td class="tCenter">' + (p.position || '-') + '</td>';
            html += '<td class="tCenter gensmall">' + (p.height || '-') + '</td>';
            html += '<td class="tCenter gensmall">' + (p.weight || '-') + '</td>';
            html += '<td class="gensmall">' + (team ? '<a href="team.html?id=' + team.id + '">' + team.abbreviation + '</a>' : '-') + '</td>';
            html += '<td class="tCenter bold">' + (p.overall || '-') + '</td>';
            html += '<td class="gensmall">' + (p.archetype || '-') + '</td>';
            html += '<td class="tCenter gensmall">' + (p.status || '-') + '</td>';
            html += '<td class="tCenter">' + renderFlag(p.nationality, 'small') + (p.is_fictional ? '<span class="fic">YES</span>' : '<span class="gensmall">no</span>') + '</td>';
            if (EDIT_MODE) {
                html += '<td class="tCenter"><a href="#" onclick="openPlayerEditor(DATA.players.find(function(x){return x.id===\'' + p.id + '\'}));return false;" class="gensmall">[edit]</a> <a href="#" onclick="deletePlayer(\'' + p.id + '\');return false;" class="gensmall" style="color:#CC0000;">[del]</a></td>';
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
        renderAttributesPanel(player);
        renderCareerStats(player);
        renderGameLogSection(player);
        renderPlayerCharts(player);
        renderAwardTrophyCase(player);
        renderInjuryHistory(player);
        renderTransactionLog(player);
        renderContractDetails(player);
        renderDraftInfo(player);
        renderCareerTimeline(player);
        renderScoutingNotes(player);
        renderMediaClippings(player);
        renderMeasurements(player);
    }

    function renderPlayerHeader(player) {
        var container = document.getElementById('player-header-section');
        var team = getPlayerTeam(player);
        var html = '<table class="forumline player-header-table">';
        html += '<tr><th class="catHead" colspan="4">Player Profile</th></tr>';
        html += '<tr class="row1"><td colspan="4" style="padding:6px 8px;">';
        html += '<div class="player-header-content">';
        html += renderAvatar(player, 'large');
        html += '<div class="player-header-info">';
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
        html += '<br>';
        if (player.nationality) html += renderFlag(player.nationality, 'large');
        html += 'Nationality: ' + (player.nationality || '-') + ' &middot; DOB: ' + (player.birthdate || '-');
        if (player.jersey_history && player.jersey_history.length > 0) {
            var jh = player.jersey_history[player.jersey_history.length - 1];
            html += ' &middot; Jersey: <b>#' + jh.number + '</b>';
        }
        html += '</span><br>';
        html += '<span class="quick-links gensmall">';
        html += '<a href="gamelog.html?id=' + player.id + '">Game Log</a> <span class="sep">|</span> ';
        html += '<a href="compare.html?ids=' + player.id + ',">Compare</a> <span class="sep">|</span> ';
        html += '<a href="lore.html?id=' + player.id + '">Lore</a>';
        html += '</span>';
        html += '</div></div>';
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
        var allSeasons = [];
        var seasonLabels = [];
        var levelLabels = [];

        // Collect pro seasons first
        if (player.career && player.career.pro) {
            for (var i = 0; i < player.career.pro.length; i++) {
                var pro = player.career.pro[i];
                var seasons = pro.seasons || [];
                for (var j = 0; j < seasons.length; j++) {
                    allSeasons.push(seasons[j]);
                    seasonLabels.push(seasons[j].year || '');
                    levelLabels.push(pro.league || 'PRO');
                }
            }
        }

        // If no pro seasons, fall back to college seasons
        if (allSeasons.length === 0 && player.career && player.career.college && player.career.college.seasons) {
            var college = player.career.college;
            for (var i = 0; i < college.seasons.length; i++) {
                var s = college.seasons[i];
                allSeasons.push(s);
                seasonLabels.push(s.year || '');
                levelLabels.push('COL');
            }
        }

        // If still no data, also try high school
        if (allSeasons.length === 0 && player.career && player.career.highschool && player.career.highschool.seasons) {
            var hs = player.career.highschool;
            for (var i = 0; i < hs.seasons.length; i++) {
                var s = hs.seasons[i];
                allSeasons.push(s);
                seasonLabels.push(s.year || '');
                levelLabels.push('HS');
            }
        }

        if (allSeasons.length === 0) return;

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
                data: { labels: seasonLabels, datasets: [{ label: 'PPG', data: allSeasons.map(function(s) { return s.ppg || 0; }), borderColor: '#0066CC', backgroundColor: 'rgba(0,102,204,0.1)', fill: true, tension: 0.3, pointRadius: 3 }] },
                options: chartDefaults
            });
        }

        var apgCanvas = document.getElementById('apg-chart');
        if (apgCanvas) {
            new Chart(apgCanvas, {
                type: 'line',
                data: { labels: seasonLabels, datasets: [{ label: 'APG', data: allSeasons.map(function(s) { return s.apg || 0; }), borderColor: '#006600', backgroundColor: 'rgba(0,102,0,0.1)', fill: true, tension: 0.3, pointRadius: 3 }] },
                options: chartDefaults
            });
        }

        var rpgCanvas = document.getElementById('rpg-chart');
        if (rpgCanvas) {
            new Chart(rpgCanvas, {
                type: 'line',
                data: { labels: seasonLabels, datasets: [{ label: 'RPG', data: allSeasons.map(function(s) { return s.rpg || 0; }), borderColor: '#CC6600', backgroundColor: 'rgba(204,102,0,0.1)', fill: true, tension: 0.3, pointRadius: 3 }] },
                options: chartDefaults
            });
        }

        var shootingCanvas = document.getElementById('shooting-chart');
        if (shootingCanvas) {
            new Chart(shootingCanvas, {
                type: 'bar',
                data: {
                    labels: seasonLabels,
                    datasets: [
                        { label: 'FG%', data: allSeasons.map(function(s) { return (s.fg_pct || 0) * 100; }), backgroundColor: '#0066CC' },
                        { label: '3P%', data: allSeasons.map(function(s) { return (s.fg3_pct || 0) * 100; }), backgroundColor: '#006600' },
                        { label: 'FT%', data: allSeasons.map(function(s) { return (s.ft_pct || 0) * 100; }), backgroundColor: '#CC6600' }
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

    // === NEW PLAYER PROFILE SECTIONS ===

    function renderAttributesPanel(player) {
        var container = document.getElementById('attributes-section');
        if (!container) return;
        var attrs = player.attributes;
        var badges = player.badges;
        if (!attrs && !badges) { container.style.display = 'none'; return; }

        var html = '<table class="forumline"><tr><th class="catHead" colspan="2">2K Attributes & Badges</th></tr>';
        html += '<tr><td class="row1" style="padding:6px;vertical-align:top;width:55%;">';
        if (attrs) {
            var attrNames = {
                inside_scoring: 'Inside Scoring', mid_range: 'Mid-Range', three_point: 'Three-Point',
                free_throw: 'Free Throw', ball_handling: 'Ball Handling', passing: 'Passing',
                offensive_rebound: 'Off. Rebound', defensive_rebound: 'Def. Rebound',
                steal: 'Steal', block: 'Block', lateral_quickness: 'Lat. Quickness',
                speed: 'Speed', acceleration: 'Acceleration', strength: 'Strength',
                vertical: 'Vertical', stamina: 'Stamina'
            };
            for (var key in attrNames) {
                if (attrs[key] !== undefined) {
                    html += renderAttributeBar(attrNames[key], attrs[key]);
                }
            }
        }
        html += '</td><td class="row2" style="padding:6px;vertical-align:top;">';
        if (badges && badges.length > 0) {
            html += '<div style="font-size:10px;font-weight:bold;margin-bottom:4px;">Badges:</div>';
            for (var i = 0; i < badges.length; i++) {
                html += renderBadgePill(badges[i]);
            }
        }
        if (player.tendencies) {
            html += '<div style="font-size:10px;font-weight:bold;margin-top:8px;margin-bottom:4px;">Tendencies:</div>';
            var tendNames = { drive_tendency: 'Drive', spot_up_tendency: 'Spot-Up', post_up_tendency: 'Post-Up', iso_tendency: 'Isolation', pick_and_roll_tendency: 'Pick & Roll' };
            for (var key in tendNames) {
                if (player.tendencies[key] !== undefined) {
                    html += renderAttributeBar(tendNames[key], player.tendencies[key]);
                }
            }
        }
        html += '</td></tr></table>';
        container.innerHTML = html;
    }

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

        if (allGames.length === 0) { container.style.display = 'none'; return; }

        allGames.sort(function(a, b) { return (b.date || '').localeCompare(a.date || ''); });
        var shown = allGames.slice(0, 10);

        var html = '<table class="forumline"><tr><th class="catHead" colspan="15">Recent Game Log <span class="gensmall" style="color:#FFD700;">(' + allGames.length + ' total games)</span> <a href="gamelog.html?id=' + player.id + '" style="color:#FFF;font-size:10px;">[Full Log]</a></th></tr>';
        html += '<tr><th class="thHead">Date</th><th class="thHead">Opp</th><th class="thHead">Result</th><th class="thHead tCenter">MIN</th><th class="thHead tCenter">PTS</th><th class="thHead tCenter">AST</th><th class="thHead tCenter">REB</th><th class="thHead tCenter">STL</th><th class="thHead tCenter">BLK</th><th class="thHead tCenter">FG</th><th class="thHead tCenter">3P</th><th class="thHead tCenter">FT</th></tr>';
        for (var i = 0; i < shown.length; i++) {
            var g = shown[i];
            var resultCls = (g.result || '').charAt(0) === 'W' ? 'result-w' : ((g.result || '').charAt(0) === 'L' ? 'result-l' : '');
            html += '<tr class="' + rowClass(i) + '"><td class="gensmall">' + (g.date || '-') + '</td><td class="gensmall">' + (g.opponent || '-') + '</td>';
            html += '<td class="gensmall ' + resultCls + '">' + (g.result || '-') + '</td>';
            html += '<td class="tCenter">' + (g.mins || '-') + '</td><td class="tCenter bold">' + (g.pts || 0) + '</td>';
            html += '<td class="tCenter">' + (g.ast || 0) + '</td><td class="tCenter">' + (g.reb || 0) + '</td>';
            html += '<td class="tCenter">' + (g.stl || 0) + '</td><td class="tCenter">' + (g.blk || 0) + '</td>';
            html += '<td class="tCenter gensmall">' + (g.fg_made || 0) + '-' + (g.fg_att || 0) + '</td>';
            html += '<td class="tCenter gensmall">' + (g.fg3_made || 0) + '-' + (g.fg3_att || 0) + '</td>';
            html += '<td class="tCenter gensmall">' + (g.ft_made || 0) + '-' + (g.ft_att || 0) + '</td></tr>';
        }
        html += '</table>';
        container.innerHTML = html;
    }

    function renderAwardTrophyCase(player) {
        var container = document.getElementById('awards-section');
        if (!container) return;
        var awards = player.awards || [];
        if (awards.length === 0) { container.style.display = 'none'; return; }

        var html = '<table class="forumline"><tr><th class="catHead">Award Trophy Case</th></tr>';
        html += '<tr><td class="row1" style="padding:6px;"><div class="trophy-case">';
        for (var i = 0; i < awards.length; i++) {
            var a = awards[i];
            html += '<div class="trophy-item"><div class="trophy-name">' + (a.name || a) + '</div>';
            if (a.year) html += '<div class="trophy-year">' + a.year + '</div>';
            if (a.league) html += '<div class="trophy-league">' + a.league + '</div>';
            html += '</div>';
        }
        html += '</div></td></tr></table>';
        container.innerHTML = html;
    }

    function renderInjuryHistory(player) {
        var container = document.getElementById('injuries-section');
        if (!container) return;
        var injuries = player.injuries || [];
        if (injuries.length === 0) { container.style.display = 'none'; return; }

        var html = '<table class="forumline"><tr><th class="catHead" colspan="6">Injury History</th></tr>';
        html += '<tr><th class="thHead">Date</th><th class="thHead">Injury</th><th class="thHead">Severity</th><th class="thHead tCenter">Games Missed</th><th class="thHead">Return</th><th class="thHead">Notes</th></tr>';
        for (var i = 0; i < injuries.length; i++) {
            var inj = injuries[i];
            html += '<tr class="' + rowClass(i) + '"><td class="gensmall">' + (inj.date || '-') + '</td>';
            html += '<td class="gensmall">' + (inj.type || '-') + '</td>';
            html += '<td>' + renderInjuryIndicator(inj.severity) + '</td>';
            html += '<td class="tCenter">' + (inj.games_missed || 0) + '</td>';
            html += '<td class="gensmall">' + (inj.return_date || 'TBD') + '</td>';
            html += '<td class="gensmall">' + (inj.notes || '') + '</td></tr>';
        }
        html += '</table>';
        container.innerHTML = html;
    }

    function renderTransactionLog(player) {
        var container = document.getElementById('transactions-section');
        if (!container) return;
        var txns = player.transactions || [];
        if (txns.length === 0) { container.style.display = 'none'; return; }

        var html = '<table class="forumline"><tr><th class="catHead" colspan="4">Transaction History</th></tr>';
        html += '<tr><th class="thHead">Date</th><th class="thHead">Type</th><th class="thHead">Team</th><th class="thHead">Details</th></tr>';
        for (var i = 0; i < txns.length; i++) {
            var t = txns[i];
            var team = t.to_team_id ? getTeamById(t.to_team_id) : null;
            html += '<tr class="' + rowClass(i) + '"><td class="gensmall">' + (t.date || '-') + '</td>';
            html += '<td>' + renderTxnType(t.type) + '</td>';
            html += '<td class="gensmall">' + (team ? team.name : (t.to_team_id || '-')) + '</td>';
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
        html += '<tr class="row1"><td class="gensmall" style="width:140px;">Type</td><td class="gensmall">' + (contract.type || '-').replace(/_/g, ' ') + '</td></tr>';
        html += '<tr class="row2"><td class="gensmall">Total Value</td><td class="contract-value">' + formatCurrency(contract.total_value) + '</td></tr>';
        html += '<tr class="row1"><td class="gensmall">Annual Value</td><td class="contract-value">' + formatCurrency(contract.annual_value) + '</td></tr>';
        html += '<tr class="row2"><td class="gensmall">Years Remaining</td><td class="gensmall">' + (contract.years_remaining || '-') + '</td></tr>';
        if (contract.player_option_year) html += '<tr class="row1"><td class="gensmall">Player Option</td><td class="gensmall">' + contract.player_option_year + '</td></tr>';
        if (contract.team_option_year) html += '<tr class="row1"><td class="gensmall">Team Option</td><td class="gensmall">' + contract.team_option_year + '</td></tr>';
        html += '</table>';
        container.innerHTML = html;
    }

    function renderMediaClippings(player) {
        var container = document.getElementById('media-section');
        if (!container) return;
        var media = player.media || [];
        if (media.length === 0) { container.style.display = 'none'; return; }

        var html = '<table class="forumline"><tr><th class="catHead">Media Clippings</th></tr>';
        for (var i = 0; i < media.length; i++) {
            var m = media[i];
            html += '<tr class="' + rowClass(i) + '"><td style="padding:4px 8px;">';
            html += '<div class="timeline-post">';
            html += '<div class="post-header"><span class="event-type">' + (m.type || 'news').toUpperCase() + '</span>';
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
        if (!m) { container.style.display = 'none'; return; }

        var html = '<table class="forumline"><tr><th class="catHead" colspan="2">Physical Measurements</th></tr>';
        html += '<tr><td class="row1" style="padding:6px;"><table class="measurements-table">';
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
