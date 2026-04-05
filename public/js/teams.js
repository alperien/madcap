(function() {
    'use strict';

    function renderTeamList() {
        var tbody = document.getElementById('team-tbody');
        if (!tbody) return;
        var leagueEl = document.getElementById('filter-league');
        var leagueFilter = leagueEl ? leagueEl.value : '';
        var teams = DATA.teams;
        if (leagueFilter) teams = teams.filter(function(t) { return t.league === leagueFilter; });

        var html = '';
        for (var i = 0; i < teams.length; i++) {
            var t = teams[i];
            var cs = t.current_season || {};
            var teamColor = t.colors && t.colors[0] ? t.colors[0] : 'transparent';
            html += '<tr class="' + rowClass(i) + '" style="border-left:3px solid ' + teamColor + ';">';
            html += '<td class="row-num">' + (i+1) + '</td>';
            html += '<td>' + renderTeamLogo(t, 'small') + ' <a href="team.html?id=' + t.id + '">' + (t.name || 'Unknown') + '</a></td>';
            html += '<td class="tCenter gensmall mono">' + (t.abbreviation || '-') + '</td>';
            html += '<td class="gensmall">' + renderLeagueBadge(t.league) + '</td>';
            html += '<td class="gensmall">' + renderConfBadge(t.conference) + '</td>';
            html += '<td class="gensmall">' + (t.division || '-') + '</td>';
            html += '<td class="tCenter mono">' + (cs.wins || 0) + '-' + (cs.losses || 0) + '</td>';
            html += '<td class="tCenter mono">' + pctStr(cs.win_pct) + '</td>';
            html += '<td class="tCenter mono">' + (cs.conference_rank || '-') + '</td>';
            if (EDIT_MODE) {
                html += '<td class="tCenter"><a href="#" onclick="openTeamBioEditor(DATA.teams.find(function(x){return x.id===\'' + t.id + '\'}));return false;" class="gensmall">[edit]</a> <a href="#" onclick="deleteTeam(\'' + t.id + '\');return false;" class="gensmall" style="color:var(--accent-red);">[del]</a></td>';
            }
            html += '</tr>';
        }
        if (!html) html = '<tr class="row1"><td colspan="' + (EDIT_MODE ? 10 : 9) + '" class="gensmall" style="text-align:center;">No teams found</td></tr>';
        tbody.innerHTML = html;
    }

    function renderTeamPage(id) {
        var team = getTeamById(id);
        var headerEl = document.getElementById('team-header-section');
        if (!team) {
            if (headerEl) headerEl.innerHTML = '<table class="forumline"><tr><td class="row1" style="padding:6px;">Team not found. <a href="teams.html">Browse teams</a></td></tr></table>';
            return;
        }
        var bc = document.getElementById('breadcrumb-team');
        if (bc) bc.textContent = team.name;
        document.title = 'MADCAP - ' + team.name;
        renderTeamHeader(team);
        renderTeamStats(team);
        renderRoster(team);
        renderDepthChart(team);
        renderTeamGames(team);
    }

    function renderTeamHeader(team) {
        var container = document.getElementById('team-header-section');
        var cs = team.current_season || {};
        var teamColor = team.colors && team.colors[0] ? team.colors[0] : 'var(--cat-head-bg)';
        var teamColor2 = team.colors && team.colors[1] ? team.colors[1] : teamColor;
        var html = '<table class="forumline">';
        html += '<tr><th class="catHead" style="background:' + teamColor + ';border-color:' + teamColor2 + ';" colspan="4">Team Profile';
        if (EDIT_MODE) {
            html += ' <a href="#" onclick="openTeamBioEditor(getTeamById(\'' + team.id + '\'));return false;" class="edit-btn" style="display:inline !important;color:var(--link-color);">[edit]</a>';
            html += ' <a href="#" onclick="openTeamSeasonEditor(getTeamById(\'' + team.id + '\'));return false;" class="edit-btn" style="display:inline !important;color:var(--link-color);">[season]</a>';
        }
        html += '</th></tr>';
        html += '<tr class="row1"><td colspan="4" style="padding:4px 6px;border-left:4px solid ' + teamColor + ';">';
        html += '<div style="display:flex;align-items:center;gap:8px;">';
        html += renderTeamLogo(team, 'large');
        html += '<div>';
        html += '<span class="team-name">' + (team.name || 'Unknown') + ' (' + (team.abbreviation || '?') + ')</span><br>';
        html += '<span class="gensmall">';
        html += 'League: ' + renderLeagueBadge(team.league) + ' <b>' + (team.league || '-') + '</b> &middot; ';
        html += 'Conference: ' + renderConfBadge(team.conference) + ' <b>' + (team.conference || '-') + '</b> &middot; ';
        html += 'Division: <b>' + (team.division || '-') + '</b> &middot; ';
        html += 'Arena: <b>' + (team.arena || '-') + '</b> &middot; ';
        html += 'Founded: <b class="mono">' + (team.founded || '-') + '</b>';
        if (team.staff) {
            html += '<br>Coach: <b>' + (team.staff.head_coach || '-') + '</b> &middot; ';
            html += 'GM: <b>' + (team.staff.gm || '-') + '</b>';
        }
        html += '<br><span class="team-record">' + (cs.wins || 0) + '-' + (cs.losses || 0) + ' (' + pctStr(cs.win_pct) + ') | Conf Rank: #' + (cs.conference_rank || '-') + ' | Div Rank: #' + (cs.division_rank || '-') + '</span>';
        html += '</span></div></div></td></tr></table>';
        container.innerHTML = html;
    }

    function renderTeamStats(team) {
        var container = document.getElementById('team-stats-section');
        if (!container) return;
        var rosterIds = team.roster || [];
        var totalPPG = 0, totalAPG = 0, totalRPG = 0, count = 0;
        for (var i = 0; i < rosterIds.length; i++) {
            var p = getPlayerById(rosterIds[i]);
            if (p && p.career && p.career.pro) {
                for (var j = p.career.pro.length - 1; j >= 0; j--) {
                    var pro = p.career.pro[j];
                    if (pro.seasons && pro.seasons.length > 0) {
                        var last = pro.seasons[pro.seasons.length - 1];
                        totalPPG += last.ppg || 0;
                        totalAPG += last.apg || 0;
                        totalRPG += last.rpg || 0;
                        count++;
                        break;
                    }
                }
            }
        }
        if (count === 0) { container.style.display = 'none'; return; }
        var html = '<div class="data-strip">';
        html += '<span class="ds-label">Roster:</span> <span class="ds-value">' + rosterIds.length + ' players</span>';
        html += '<span class="ds-label">Team PPG:</span> <span class="ds-value">' + coloredStat(totalPPG, { great: 100, good: 80, avg: 60, below: 40 }) + '</span>';
        html += '<span class="ds-label">Team APG:</span> <span class="ds-value">' + totalAPG.toFixed(1) + '</span>';
        html += '<span class="ds-label">Team RPG:</span> <span class="ds-value">' + totalRPG.toFixed(1) + '</span>';
        html += '</div>';
        container.innerHTML = html;
    }

    function renderRoster(team) {
        var tbody = document.getElementById('roster-body');
        if (!tbody) return;
        var html = '';
        var rosterIds = team.roster || [];
        var count = 0;
        for (var i = 0; i < rosterIds.length; i++) {
            var p = getPlayerById(rosterIds[i]);
            if (p) {
                count++;
                html += '<tr class="' + rowClass(count - 1) + '">';
                html += '<td class="tCenter gensmall mono">' + (p.jersey_number || count) + '</td>';
                html += '<td>' + renderStatusDot(p.status) + renderAvatar(p, 'small') + renderFlag(p.nationality) + '<a href="player.html?id=' + p.id + '">' + p.name + '</a>' + renderJerseyNum(p) + '</td>';
                html += '<td class="tCenter">' + renderPosBadge(p.position) + '</td>';
                html += '<td class="tCenter gensmall mono">' + (p.height || '-') + '</td>';
                html += '<td class="tCenter gensmall mono">' + (p.weight || '-') + '</td>';
                html += '<td class="tCenter">' + renderOvrBar(p.overall) + '</td>';
                html += '<td class="gensmall">' + (p.archetype || '-') + '</td>';
                html += '<td class="tCenter gensmall">' + renderStatusDot(p.status) + (p.status || '-') + '</td>';
                html += '</tr>';
            }
        }
        if (!html) html = '<tr class="row1"><td colspan="8" class="gensmall" style="text-align:center;">No roster data available</td></tr>';
        tbody.innerHTML = html;
        // Add roster edit link to header
        var rosterHeader = document.getElementById('roster-header');
        if (rosterHeader) {
            var rh = 'Roster';
            if (EDIT_MODE) rh += ' <a href="#" onclick="openRosterEditor(getTeamById(\'' + team.id + '\'));return false;" class="edit-btn" style="display:inline !important;color:var(--link-color);">[edit roster]</a>';
            rosterHeader.innerHTML = rh;
        }
    }

    function renderDepthChart(team) {
        var tbody = document.getElementById('depth-chart-body');
        if (!tbody) return;
        var dc = team.depth_chart;
        if (!dc) { tbody.innerHTML = '<tr class="row1"><td colspan="5" class="gensmall" style="text-align:center;">No depth chart data</td></tr>'; return; }

        var positions = ['PG', 'SG', 'SF', 'PF', 'C'];
        var maxDepth = 0;
        for (var i = 0; i < positions.length; i++) {
            if (dc[positions[i]] && dc[positions[i]].length > maxDepth) {
                maxDepth = dc[positions[i]].length;
            }
        }

        var html = '';
        for (var d = 0; d < Math.max(maxDepth, 1); d++) {
            html += '<tr class="' + rowClass(d) + '">';
            for (var i = 0; i < positions.length; i++) {
                var pos = positions[i];
                var players = dc[pos] || [];
                if (d < players.length) {
                    var p = getPlayerById(players[d]);
                    if (p) {
                        html += '<td class="tCenter">' + renderPosBadge(pos) + '<a href="player.html?id=' + p.id + '">' + p.name + '</a> ' + renderOvrBar(p.overall) + '</td>';
                    } else {
                        html += '<td class="tCenter">' + players[d] + '</td>';
                    }
                } else {
                    html += '<td class="tCenter gensmall">-</td>';
                }
            }
            html += '</tr>';
        }
        tbody.innerHTML = html;
        // Add depth chart edit link to header
        var dcHeader = document.getElementById('depth-chart-header');
        if (dcHeader) {
            var dh = 'Depth Chart';
            if (EDIT_MODE) dh += ' <a href="#" onclick="openDepthChartEditor(getTeamById(\'' + team.id + '\'));return false;" class="edit-btn" style="display:inline !important;color:var(--link-color);">[edit]</a>';
            dcHeader.innerHTML = dh;
        }
    }

    function renderTeamGames(team) {
        var tbody = document.getElementById('team-games-body');
        if (!tbody) return;
        var html = '';
        var games = DATA.games.filter(function(g) {
            return g.home_team_id === team.id || g.away_team_id === team.id;
        }).slice(0, 15);

        for (var i = 0; i < games.length; i++) {
            var g = games[i];
            var isHome = g.home_team_id === team.id;
            var oppId = isHome ? g.away_team_id : g.home_team_id;
            var opp = getTeamById(oppId);
            var result = '';
            var score = '';
            var resultClass = '';
            var statusTag = '';
            if (g.status === 'final') {
                var teamScore = isHome ? (g.home_score || 0) : (g.away_score || 0);
                var oppScore = isHome ? (g.away_score || 0) : (g.home_score || 0);
                result = teamScore > oppScore ? 'W' : 'L';
                resultClass = teamScore > oppScore ? 'result-w' : 'result-l';
                score = teamScore + '-' + oppScore;
                statusTag = '<span class="tag-final">FINAL</span>';
            } else {
                result = g.status;
                score = '--';
                resultClass = 'result-scheduled';
                statusTag = '<span class="tag-preview">SCHED</span>';
            }
            html += '<tr class="' + rowClass(i) + '"><td class="row-num">' + (i+1) + '</td><td class="gensmall mono">' + (g.date || '-') + '</td>';
            html += '<td class="gensmall">' + (isHome ? 'vs' : '@') + ' ' + renderTeamColorDot(opp) + '<a href="team.html?id=' + oppId + '">' + (opp ? opp.name : oppId) + '</a></td>';
            html += '<td class="tCenter bold ' + resultClass + '">' + result + '</td>';
            html += '<td class="tCenter mono">' + score + '</td></tr>';
        }
        if (!html) html = '<tr class="row1"><td colspan="5" class="gensmall" style="text-align:center;">No game data</td></tr>';
        tbody.innerHTML = html;
    }

    window.renderTeamList = renderTeamList;
    window.renderTeamPage = renderTeamPage;
})();
