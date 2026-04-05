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
            html += '<tr class="' + rowClass(i) + '">';
            html += '<td><a href="team.html?id=' + t.id + '">' + (t.name || 'Unknown') + '</a></td>';
            html += '<td class="tCenter gensmall">' + (t.abbreviation || '-') + '</td>';
            html += '<td class="gensmall">' + (t.league || '-') + '</td>';
            html += '<td class="gensmall">' + (t.conference || '-') + '</td>';
            html += '<td class="gensmall">' + (t.division || '-') + '</td>';
            html += '<td class="tCenter">' + (cs.wins || 0) + '-' + (cs.losses || 0) + '</td>';
            html += '<td class="tCenter">' + pctStr(cs.win_pct) + '</td>';
            html += '<td class="tCenter">' + (cs.conference_rank || '-') + '</td>';
            if (EDIT_MODE) {
                html += '<td class="tCenter"><a href="#" onclick="openTeamEditor(DATA.teams.find(function(x){return x.id===\'' + t.id + '\'}));return false;" class="gensmall">[edit]</a> <a href="#" onclick="deleteTeam(\'' + t.id + '\');return false;" class="gensmall" style="color:#CC0000;">[del]</a></td>';
            }
            html += '</tr>';
        }
        if (!html) html = '<tr class="row1"><td colspan="' + (EDIT_MODE ? 9 : 8) + '" class="gensmall" style="color:#666;text-align:center;">No teams found</td></tr>';
        tbody.innerHTML = html;
    }

    function renderTeamPage(id) {
        var team = getTeamById(id);
        var headerEl = document.getElementById('team-header-section');
        if (!team) {
            if (headerEl) headerEl.innerHTML = '<table class="forumline"><tr><td class="row1" style="padding:8px;">Team not found. <a href="teams.html">Browse teams</a></td></tr></table>';
            return;
        }
        var bc = document.getElementById('breadcrumb-team');
        if (bc) bc.textContent = team.name;
        renderTeamHeader(team);
        renderRoster(team);
        renderDepthChart(team);
        renderTeamGames(team);
    }

    function renderTeamHeader(team) {
        var container = document.getElementById('team-header-section');
        var cs = team.current_season || {};
        var html = '<table class="forumline">';
        html += '<tr><th class="catHead" colspan="4">Team Profile</th></tr>';
        html += '<tr class="row1"><td colspan="4" style="padding:6px 8px;">';
        html += '<span class="team-name">' + (team.name || 'Unknown') + ' (' + (team.abbreviation || '?') + ')</span><br>';
        html += '<span class="gensmall">';
        html += 'League: <b>' + (team.league || '-') + '</b> &middot; ';
        html += 'Conference: <b>' + (team.conference || '-') + '</b> &middot; ';
        html += 'Division: <b>' + (team.division || '-') + '</b> &middot; ';
        html += 'Arena: <b>' + (team.arena || '-') + '</b> &middot; ';
        html += 'Founded: <b>' + (team.founded || '-') + '</b>';
        if (team.staff) {
            html += '<br>Coach: <b>' + (team.staff.head_coach || '-') + '</b> &middot; ';
            html += 'GM: <b>' + (team.staff.gm || '-') + '</b>';
        }
        html += '<br><span class="team-record">' + (cs.wins || 0) + '-' + (cs.losses || 0) + ' (' + pctStr(cs.win_pct) + ') | Conf Rank: #' + (cs.conference_rank || '-') + ' | Div Rank: #' + (cs.division_rank || '-') + '</span>';
        html += '</span></td></tr></table>';
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
                html += '<td class="tCenter gensmall">' + (p.jersey_number || count) + '</td>';
                html += '<td>' + renderAvatar(p, 'small') + '<a href="player.html?id=' + p.id + '">' + p.name + '</a></td>';
                html += '<td class="tCenter">' + (p.position || '-') + '</td>';
                html += '<td class="tCenter gensmall">' + (p.height || '-') + '</td>';
                html += '<td class="tCenter gensmall">' + (p.weight || '-') + '</td>';
                html += '<td class="tCenter bold">' + (p.overall || '-') + '</td>';
                html += '<td class="gensmall">' + (p.archetype || '-') + '</td>';
                html += '<td class="tCenter gensmall">' + (p.status || '-') + '</td>';
                html += '</tr>';
            }
        }
        if (!html) html = '<tr class="row1"><td colspan="8" class="gensmall" style="color:#666;text-align:center;">No roster data available</td></tr>';
        tbody.innerHTML = html;
    }

    function renderDepthChart(team) {
        var tbody = document.getElementById('depth-chart-body');
        if (!tbody) return;
        var dc = team.depth_chart;
        if (!dc) { tbody.innerHTML = '<tr class="row1"><td colspan="5" class="gensmall" style="color:#666;text-align:center;">No depth chart data</td></tr>'; return; }

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
                    html += '<td class="tCenter">' + (p ? '<a href="player.html?id=' + p.id + '">' + p.name + '</a>' : players[d]) + '</td>';
                } else {
                    html += '<td class="tCenter gensmall">-</td>';
                }
            }
            html += '</tr>';
        }
        tbody.innerHTML = html;
    }

    function renderTeamGames(team) {
        var tbody = document.getElementById('team-games-body');
        if (!tbody) return;
        var html = '';
        var games = DATA.games.filter(function(g) {
            return g.home_team_id === team.id || g.away_team_id === team.id;
        }).slice(0, 10);

        for (var i = 0; i < games.length; i++) {
            var g = games[i];
            var isHome = g.home_team_id === team.id;
            var oppId = isHome ? g.away_team_id : g.home_team_id;
            var opp = getTeamById(oppId);
            var result = '';
            var score = '';
            var resultClass = '';
            if (g.status === 'final') {
                var teamScore = isHome ? (g.home_score || 0) : (g.away_score || 0);
                var oppScore = isHome ? (g.away_score || 0) : (g.home_score || 0);
                result = teamScore > oppScore ? 'W' : 'L';
                resultClass = teamScore > oppScore ? 'result-w' : 'result-l';
                score = teamScore + '-' + oppScore;
            } else {
                result = g.status;
                score = '--';
                resultClass = 'result-scheduled';
            }
            html += '<tr class="' + rowClass(i) + '"><td class="gensmall">' + (g.date || '-') + '</td>';
            html += '<td class="gensmall">' + (isHome ? 'vs' : '@') + ' <a href="team.html?id=' + oppId + '">' + (opp ? opp.name : oppId) + '</a></td>';
            html += '<td class="tCenter bold ' + resultClass + '">' + result + '</td>';
            html += '<td class="tCenter">' + score + '</td></tr>';
        }
        if (!html) html = '<tr class="row1"><td colspan="4" class="gensmall" style="color:#666;text-align:center;">No game data</td></tr>';
        tbody.innerHTML = html;
    }

    window.renderTeamList = renderTeamList;
    window.renderTeamPage = renderTeamPage;
})();
