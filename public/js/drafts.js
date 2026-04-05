(function() {
    'use strict';

    function renderDrafts() {
        var container = document.getElementById('drafts-container');
        if (!container) return;
        var html = '';
        for (var i = 0; i < DATA.drafts.length; i++) {
            var d = DATA.drafts[i];
            html += '<table class="forumline draft-year-header">';
            html += '<tr><th class="catHead" colspan="7">' + renderLeagueBadge(d.league) + ' ' + (d.year || '?') + ' ' + (d.league || '?') + ' Draft</th></tr>';
            html += '<tr><th class="thHead tCenter">#</th><th class="thHead tCenter">Rnd</th><th class="thHead tCenter">Pick</th><th class="thHead">Team</th><th class="thHead">Player</th><th class="thHead">Details</th><th class="thHead tCenter">Fictional</th></tr>';
            var picks = d.picks || [];
            for (var j = 0; j < picks.length; j++) {
                var p = picks[j];
                var team = getTeamById(p.team_id);
                var player = p.player_id ? getPlayerById(p.player_id) : null;
                html += '<tr class="' + rowClass(j) + '">';
                html += '<td class="row-num">' + (j+1) + '</td>';
                html += '<td class="tCenter"><span class="draft-pick-badge">R' + (p.round || '-') + '</span></td>';
                html += '<td class="tCenter"><span class="draft-pick-badge">P' + (p.pick || '-') + '</span></td>';
                html += '<td class="gensmall">' + (team ? renderTeamColorDot(team) + team.abbreviation : (p.team_id || '?')) + '</td>';
                html += '<td>';
                if (player) {
                    html += renderFlag(player.nationality) + renderPosBadge(player.position) + '<a href="player.html?id=' + player.id + '">' + player.name + '</a>';
                    html += ' ' + renderOvrBar(player.overall);
                } else {
                    html += (p.player_name || 'Unknown');
                }
                html += '</td>';
                html += '<td class="gensmall">';
                if (player) {
                    html += (player.archetype || '') + (player.height ? ' | ' + player.height : '');
                }
                html += '</td>';
                html += '<td class="tCenter ' + (p.is_fictional ? 'fic' : 'gensmall') + '">' + (p.is_fictional ? '<span class="fic">* YES</span>' : 'no') + '</td>';
                html += '</tr>';
            }
            if (picks.length === 0) {
                html += '<tr class="row1"><td colspan="7" class="gensmall" style="text-align:center;">No picks recorded</td></tr>';
            }
            html += '</table>';
        }
        if (!html) html = '<p class="gensmall" style="text-align:center;">No draft data available</p>';
        container.innerHTML = html;
    }

    window.renderDrafts = renderDrafts;
})();
