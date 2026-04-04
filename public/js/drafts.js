(function() {
    'use strict';

    function renderDrafts() {
        var container = document.getElementById('drafts-container');
        if (!container) return;
        var html = '';
        for (var i = 0; i < DATA.drafts.length; i++) {
            var d = DATA.drafts[i];
            html += '<table class="forumline draft-year-header">';
            html += '<tr><th class="catHead" colspan="5">' + (d.year || '?') + ' ' + (d.league || '?') + ' Draft</th></tr>';
            html += '<tr><th class="thHead tCenter">Rnd</th><th class="thHead tCenter">Pick</th><th class="thHead">Team</th><th class="thHead">Player</th><th class="thHead tCenter">Fictional</th></tr>';
            var picks = d.picks || [];
            for (var j = 0; j < picks.length; j++) {
                var p = picks[j];
                var team = getTeamById(p.team_id);
                var player = p.player_id ? getPlayerById(p.player_id) : null;
                html += '<tr class="' + rowClass(j) + '">';
                html += '<td class="tCenter">' + (p.round || '-') + '</td>';
                html += '<td class="tCenter">' + (p.pick || '-') + '</td>';
                html += '<td class="gensmall">' + (team ? team.abbreviation : (p.team_id || '?')) + '</td>';
                html += '<td>' + (player ? '<a href="player.html?id=' + player.id + '">' + player.name + '</a>' : (p.player_name || 'Unknown')) + '</td>';
                html += '<td class="tCenter ' + (p.is_fictional ? 'fic' : 'gensmall') + '">' + (p.is_fictional ? 'YES' : 'no') + '</td>';
                html += '</tr>';
            }
            if (picks.length === 0) {
                html += '<tr class="row1"><td colspan="5" class="gensmall" style="color:#666;text-align:center;">No picks recorded</td></tr>';
            }
            html += '</table>';
        }
        if (!html) html = '<p class="gensmall" style="text-align:center;">No draft data available</p>';
        container.innerHTML = html;
    }

    window.renderDrafts = renderDrafts;
})();
