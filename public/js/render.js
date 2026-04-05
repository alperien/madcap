function rowClass(i) { return i % 2 === 0 ? 'row1' : 'row2'; }

function numStr(val) {
    if (val === undefined || val === null || val === '') return '-';
    var n = Number(val);
    if (isNaN(n)) return '-';
    return n % 1 === 0 ? String(n) : n.toFixed(1);
}

function pctStr(val) {
    if (val === undefined || val === null || val === '') return '-';
    var n = Number(val);
    if (isNaN(n)) return '-';
    if (n <= 1) return (n * 100).toFixed(1) + '%';
    return n.toFixed(1) + '%';
}

var FLAG_MAP = {
    'USA': '\uD83C\uDDFA\uD83C\uDDF8', 'Canada': '\uD83C\uDDE8\uD83C\uDDE6',
    'France': '\uD83C\uDDEB\uD83C\uDDF7', 'Spain': '\uD83C\uDDEA\uD83C\uDDF8',
    'Australia': '\uD83C\uDDE6\uD83C\uDDFA', 'Germany': '\uD83C\uDDE9\uD83C\uDDEA',
    'Nigeria': '\uD83C\uDDF3\uD83C\uDDEC', 'Cameroon': '\uD83C\uDDE8\uD83C\uDDF2',
    'Serbia': '\uD83C\uDDF7\uD83C\uDDF8', 'Greece': '\uD83C\uDDEC\uD83C\uDDF7',
    'Slovenia': '\uD83C\uDDF8\uD83C\uDDEE', 'Japan': '\uD83C\uDDEF\uD83C\uDDF5',
    'Brazil': '\uD83C\uDDE7\uD83C\uDDF7', 'UK': '\uD83C\uDDEC\uD83C\uDDE7'
};

function renderFlag(nationality, size) {
    if (!nationality) return '';
    var flag = FLAG_MAP[nationality] || '';
    if (!flag) return '';
    var cls = size === 'large' ? 'player-flag' : 'list-flag';
    return '<span class="' + cls + '">' + flag + '</span>';
}

function renderAvatar(player, size) {
    var isLarge = size === 'large';
    var cls = isLarge ? 'player-avatar' : 'list-avatar';
    if (player.avatar_url) {
        return '<span class="' + cls + '"><img src="' + player.avatar_url + '" alt="' + (player.name || '') + '"></span>';
    }
    var initials = (player.name || '?').split(' ').map(function(w) { return w.charAt(0); }).join('').substring(0, 2).toUpperCase();
    return '<span class="' + cls + '">' + initials + '</span>';
}

function renderLeagueHub() {
    var tbody = document.getElementById('league-hub-body');
    if (!tbody) return;
    var html = '';
    for (var i = 0; i < DATA.leagues.length; i++) {
        var l = DATA.leagues[i];
        html += '<tr class="' + rowClass(i) + '"><td class="row-num">' + (i+1) + '</td><td><a href="leagues.html">' + (l.name || 'Unknown') + '</a></td><td class="gensmall">' + (l.level || '-') + '</td><td class="tCenter gensmall">' + (l.current_season || '-') + '</td><td class="tCenter">' + (l.teams ? l.teams.length : 0) + '</td></tr>';
    }
    tbody.innerHTML = html;
}

function renderLatestScores() {
    var tbody = document.getElementById('scores-body');
    if (!tbody) return;
    var html = '';
    var games = DATA.games.filter(function(g) { return g.status === 'final'; }).slice(0, 8);
    for (var i = 0; i < games.length; i++) {
        var g = games[i];
        var home = getTeamById(g.home_team_id);
        var away = getTeamById(g.away_team_id);
        var isNew = isRecent(g.date);
        html += '<tr class="' + rowClass(i) + '"><td class="row-num">' + (i+1) + '</td><td class="gensmall">' + (g.date || '-') + (isNew ? ' <span class="blink-new">NEW</span>' : '') + '</td>';
        html += '<td>' + (away ? away.abbreviation : (g.away_team_id || '?')) + '</td>';
        html += '<td class="tCenter bold">' + (g.away_score || 0) + '</td>';
        html += '<td>' + (home ? home.abbreviation : (g.home_team_id || '?')) + '</td>';
        html += '<td class="tCenter bold">' + (g.home_score || 0) + '</td>';
        html += '<td class="tCenter gensmall">' + g.status + '</td></tr>';
    }
    if (!html) html = '<tr class="row1"><td colspan="7" class="gensmall" style="text-align:center;">No games played yet</td></tr>';
    tbody.innerHTML = html;
}

function renderRecentEvents() {
    var container = document.getElementById('recent-events');
    if (!container) return;
    var html = '';
    var events = DATA.events.slice(0, 5);
    for (var i = 0; i < events.length; i++) {
        var e = events[i];
        var p = getPlayerById(e.player_id);
        html += '<tr class="' + rowClass(i) + '"><td>';
        html += '<div class="timeline-post">';
        html += '<div class="post-header"><span class="event-type">' + (e.type || '') + '</span><span class="gensmall">' + (e.date || '') + '</span>';
        if (p) html += ' <span class="gensmall">by <a href="player.html?id=' + p.id + '">' + p.name + '</a></span>';
        if (isRecent(e.date)) html += ' <span class="blink-new">NEW</span>';
        html += '</div>';
        var desc = e.description || '';
        html += '<div class="post-body"><span class="bold">' + (e.title || '') + '</span><br><span class="gensmall">' + desc.substring(0, 200) + (desc.length > 200 ? '...' : '') + '</span></div>';
        html += '</div></td></tr>';
    }
    if (!html) html = '<tr class="row1"><td class="gensmall" style="text-align:center;">No recent events</td></tr>';
    container.innerHTML = html;
}

function renderStatLeaders() {
    var tbody = document.getElementById('stat-leaders-body');
    if (!tbody) return;
    var nbaPlayers = DATA.players.filter(function(p) {
        return p.career && p.career.pro && p.career.pro.some(function(pro) { return pro.league === 'NBA'; });
    });
    var categories = [
        { key: 'ppg', label: 'PPG' },
        { key: 'apg', label: 'APG' },
        { key: 'rpg', label: 'RPG' },
        { key: 'spg', label: 'SPG' },
        { key: 'bpg', label: 'BPG' }
    ];
    var html = '';
    for (var c = 0; c < categories.length; c++) {
        var cat = categories[c];
        var leader = null;
        var leaderVal = -1;
        for (var i = 0; i < nbaPlayers.length; i++) {
            var p = nbaPlayers[i];
            var pro = p.career.pro[p.career.pro.length - 1];
            var seasons = pro.seasons;
            if (seasons && seasons.length > 0) {
                var last = seasons[seasons.length - 1];
                var val = last[cat.key] || 0;
                if (val > leaderVal) {
                    leaderVal = val;
                    leader = p;
                }
            }
        }
        if (leader) {
            var team = getPlayerTeam(leader);
            html += '<tr class="' + rowClass(c) + '"><td class="row-num">' + (c+1) + '</td><td class="gensmall">' + cat.label + '</td>';
            html += '<td><a href="player.html?id=' + leader.id + '">' + leader.name + '</a> <span class="gensmall">(' + (team ? team.abbreviation : '-') + ')</span></td>';
            html += '<td class="tCenter bold">' + numStr(leaderVal) + '</td></tr>';
        }
    }
    if (!html) html = '<tr class="row1"><td colspan="4" class="gensmall" style="text-align:center;">No stat data available</td></tr>';
    tbody.innerHTML = html;
}

function renderUpcomingGames() {
    var tbody = document.getElementById('upcoming-body');
    if (!tbody) return;
    var html = '';
    var games = DATA.games.filter(function(g) { return g.status === 'scheduled'; });
    for (var i = 0; i < games.length; i++) {
        var g = games[i];
        var home = getTeamById(g.home_team_id);
        var away = getTeamById(g.away_team_id);
        html += '<tr class="' + rowClass(i) + '"><td class="row-num">' + (i+1) + '</td><td class="gensmall">' + (g.date || '-') + '</td><td class="gensmall">' + (g.league || '-') + '</td>';
        html += '<td>' + (away ? away.abbreviation : (g.away_team_id || '?')) + '</td>';
        html += '<td class="tCenter gensmall">@</td>';
        html += '<td>' + (home ? home.abbreviation : (g.home_team_id || '?')) + '</td>';
        html += '<td class="gensmall">' + (g.venue || '') + '</td></tr>';
    }
    if (!html) html = '<tr class="row1"><td colspan="7" class="gensmall" style="text-align:center;">No upcoming games</td></tr>';
    tbody.innerHTML = html;
}

function renderFictionalList() {
    var ul = document.getElementById('fictional-list');
    if (!ul) return;
    var html = '';
    var fictional = DATA.players.filter(function(p) { return p.is_fictional; });
    for (var i = 0; i < fictional.length; i++) {
        var p = fictional[i];
        html += '<li>' + renderAvatar(p, 'small') + '<a href="player.html?id=' + p.id + '">' + p.name + '</a> <span class="fic">[FIC]</span></li>';
    }
    if (!html) html = '<li class="gensmall">No fictional players</li>';
    ul.innerHTML = html;
}

function renderSidebarLeagues() {
    var ul = document.getElementById('sidebar-leagues-list');
    if (!ul) return;
    var html = '';
    for (var i = 0; i < DATA.leagues.length; i++) {
        var l = DATA.leagues[i];
        html += '<li><a href="leagues.html">' + (l.abbreviation || l.name) + '</a> (' + (l.level || '?') + ')</li>';
    }
    ul.innerHTML = html;
}

function renderSidebarStats() {
    var el = document.getElementById('sidebar-stats');
    if (!el) return;
    var total = DATA.players.length;
    var fic = DATA.players.filter(function(p) { return p.is_fictional; }).length;
    var real = total - fic;
    var teams = DATA.teams.length;
    var games = DATA.games.length;
    var finishedGames = DATA.games.filter(function(g) { return g.status === 'final'; }).length;
    var injuries = DATA.injuries.filter(function(i) { return i.status !== 'resolved'; }).length;
    el.innerHTML = 'Players: <b>' + total + '</b> (' + fic + ' fic, ' + real + ' real)<br>Teams: <b>' + teams + '</b><br>Games: <b>' + games + '</b> (' + finishedGames + ' played)<br>Active Injuries: <b>' + injuries + '</b><br>Transactions: <b>' + DATA.transactions.length + '</b>';
}

function renderStandings() {
    var container = document.getElementById('standings-container');
    if (!container) return;
    var html = '';
    for (var i = 0; i < DATA.leagues.length; i++) {
        var l = DATA.leagues[i];
        if (l.standings && Object.keys(l.standings).length > 0) {
            html += '<table class="forumline"><tr><th class="catHead" colspan="8">' + (l.name || 'Unknown') + ' - ' + (l.current_season || '') + '</th></tr>';
            var confData = l.standings;
            if (l.current_season && l.standings[l.current_season]) {
                confData = l.standings[l.current_season];
            } else {
                var keys = Object.keys(l.standings);
                if (keys.length > 0 && /^\d{4}/.test(keys[0])) {
                    confData = l.standings[keys[0]];
                }
            }
            for (var conf in confData) {
                if (!confData.hasOwnProperty(conf)) continue;
                html += '<tr><th class="subCatHead" colspan="8">' + conf + ' Conference</th></tr>';
                html += '<tr><th class="thHead">#</th><th class="thHead">Team</th><th class="thHead tCenter">W</th><th class="thHead tCenter">L</th><th class="thHead tCenter">Win%</th><th class="thHead tCenter">Conf W</th><th class="thHead tCenter">Conf L</th><th class="thHead tCenter">Rank</th></tr>';
                var teams = confData[conf];
                for (var j = 0; j < teams.length; j++) {
                    var t = teams[j];
                    var team = getTeamById(t.team_id);
                    html += '<tr class="' + rowClass(j) + '"><td class="row-num">' + (j+1) + '</td><td><a href="team.html?id=' + t.team_id + '">' + (team ? team.name : t.team_id) + '</a></td>';
                    html += '<td class="tCenter">' + (t.wins || 0) + '</td><td class="tCenter">' + (t.losses || 0) + '</td>';
                    html += '<td class="tCenter">' + pctStr(t.win_pct) + '</td>';
                    html += '<td class="tCenter">' + (t.conf_wins !== undefined ? t.conf_wins : '-') + '</td><td class="tCenter">' + (t.conf_losses !== undefined ? t.conf_losses : '-') + '</td>';
                    html += '<td class="tCenter">' + (t.conf_rank || '-') + '</td></tr>';
                }
            }
            html += '</table>';
        }
    }
    if (!html) html = '<p class="gensmall" style="text-align:center;">No standings data available</p>';
    container.innerHTML = html;
}

// === NEW RENDER HELPERS ===

function renderAttributeBar(label, value) {
    var cls = value < 60 ? 'attr-low' : (value < 80 ? 'attr-mid' : 'attr-high');
    var pct = Math.min(100, Math.max(0, value));
    return '<div class="attribute-bar"><span class="attr-label">' + label + '</span><span class="attr-track"><span class="attr-fill ' + cls + '" style="width:' + pct + '%"></span></span><span class="attr-val">' + value + '</span></div>';
}

function renderBadgePill(badge) {
    var tier = (badge.tier || 'bronze').replace(/ /g, '_');
    return '<span class="badge-tag badge-' + tier + '">' + (badge.name || '?') + '</span>';
}

function renderInjuryIndicator(severity) {
    return '<span class="injury-status injury-' + (severity || 'minor') + '">' + (severity || 'minor').toUpperCase() + '</span>';
}

function renderTxnType(type) {
    return '<span class="txn-type txn-' + (type || 'signed') + '">' + (type || '?').toUpperCase() + '</span>';
}

function renderTicker() {
    var el = document.getElementById('ticker-bar');
    if (!el) return;
    var items = [];
    var txns = (DATA.transactions || []).slice(-3);
    for (var i = txns.length - 1; i >= 0; i--) {
        var t = txns[i];
        items.push('<span class="ticker-item">' + renderTxnType(t.type) + ' ' + (t.player_id || '').replace(/_/g, ' ') + ' - ' + (t.details || '').substring(0, 50) + '</span>');
    }
    var injuries = (DATA.injuries || []).filter(function(i) { return i.status === 'day-to-day' || i.status === 'active'; });
    for (var i = 0; i < injuries.length; i++) {
        var inj = injuries[i];
        items.push('<span class="ticker-item" style="color:#FF8888;">' + (inj.player_id || '').replace(/_/g, ' ') + ' - ' + (inj.type || '') + ' (' + (inj.status || '') + ')</span>');
    }
    var games = (DATA.games || []).filter(function(g) { return g.status === 'final'; }).slice(-3);
    for (var i = games.length - 1; i >= 0; i--) {
        var g = games[i];
        var home = getTeamById(g.home_team_id);
        var away = getTeamById(g.away_team_id);
        items.push('<span class="ticker-item"><a href="game.html?id=' + g.id + '">' + (away ? away.abbreviation : (g.away_team_name || '?')) + ' ' + (g.away_score || 0) + ' - ' + (home ? home.abbreviation : (g.home_team_name || '?')) + ' ' + (g.home_score || 0) + ' FINAL</a></span>');
    }
    if (items.length === 0) items.push('<span class="ticker-item">Welcome to MADCAP - Modular Athlete Database & Career Analysis Platform</span>');
    // Use marquee-style scrolling ticker
    el.innerHTML = '<span class="ticker-label">TICKER</span><span class="ticker-content">' + items.join('<span class="ticker-sep">|</span>') + '</span>';
}

function renderTransactionsWidget() {
    var el = document.getElementById('transactions-widget');
    if (!el) return;
    var txns = (DATA.transactions || []).slice(-8).reverse();
    var html = '';
    for (var i = 0; i < txns.length; i++) {
        var t = txns[i];
        var isNew = isRecent(t.date);
        html += '<li>' + renderTxnType(t.type) + ' <a href="player.html?id=' + t.player_id + '">' + (t.player_id || '').replace(/_/g, ' ') + '</a>';
        if (isNew) html += ' <span class="blink-new">NEW</span>';
        html += ' <span class="gensmall">(' + (t.date || '') + ')</span></li>';
    }
    if (!html) html = '<li class="gensmall">No transactions</li>';
    el.innerHTML = html;
}

function renderInjuryWidget() {
    var el = document.getElementById('injury-widget');
    if (!el) return;
    var active = (DATA.injuries || []).filter(function(i) { return i.status !== 'resolved'; });
    var html = '';
    for (var i = 0; i < active.length; i++) {
        var inj = active[i];
        html += '<li>' + renderInjuryIndicator(inj.severity) + ' <a href="player.html?id=' + inj.player_id + '">' + (inj.player_id || '').replace(/_/g, ' ') + '</a> - ' + (inj.type || '') + '</li>';
    }
    if (!html) html = '<li class="gensmall" style="color:#006600;">All healthy</li>';
    el.innerHTML = html;
}

// === NEW: Mini Standings Widget ===
function renderMiniStandings() {
    var el = document.getElementById('mini-standings-widget');
    if (!el) return;
    var html = '';
    for (var i = 0; i < DATA.leagues.length; i++) {
        var l = DATA.leagues[i];
        if (!l.standings || Object.keys(l.standings).length === 0) continue;
        var confData = l.standings;
        if (l.current_season && l.standings[l.current_season]) confData = l.standings[l.current_season];
        else {
            var keys = Object.keys(l.standings);
            if (keys.length > 0 && /^\d{4}/.test(keys[0])) confData = l.standings[keys[0]];
        }
        html += '<table class="mini-table"><tr><th colspan="3">' + (l.abbreviation || l.name) + '</th></tr>';
        html += '<tr><th>Team</th><th>W-L</th><th>%</th></tr>';
        var count = 0;
        for (var conf in confData) {
            if (!confData.hasOwnProperty(conf)) continue;
            var teams = confData[conf];
            for (var j = 0; j < Math.min(teams.length, 3); j++) {
                var t = teams[j];
                var team = getTeamById(t.team_id);
                html += '<tr><td><a href="team.html?id=' + t.team_id + '">' + (team ? team.abbreviation : t.team_id) + '</a></td>';
                html += '<td class="tCenter">' + (t.wins||0) + '-' + (t.losses||0) + '</td>';
                html += '<td class="tCenter">' + pctStr(t.win_pct) + '</td></tr>';
                count++;
            }
        }
        html += '</table>';
        if (count === 0) html = '';
    }
    if (!html) html = '<span class="gensmall">No standings data</span>';
    el.innerHTML = html;
}

// === NEW: Today's Games Widget ===
function renderTodaysGames() {
    var el = document.getElementById('todays-games-widget');
    if (!el) return;
    var today = new Date().toISOString().slice(0, 10);
    var todayGames = DATA.games.filter(function(g) { return g.date === today; });
    if (todayGames.length === 0) { el.innerHTML = '<span class="gensmall">No games today</span>'; return; }
    var html = '<table class="mini-table"><tr><th>Away</th><th>@</th><th>Home</th><th>Status</th></tr>';
    for (var i = 0; i < todayGames.length; i++) {
        var g = todayGames[i];
        var home = getTeamById(g.home_team_id);
        var away = getTeamById(g.away_team_id);
        html += '<tr><td>' + (away ? away.abbreviation : '?') + '</td><td class="tCenter">@</td><td>' + (home ? home.abbreviation : '?') + '</td>';
        html += '<td class="tCenter">' + (g.status === 'final' ? (g.away_score + '-' + g.home_score) : g.time || g.status) + '</td></tr>';
    }
    html += '</table>';
    el.innerHTML = html;
}

// === NEW: Birthday Widget ===
function renderBirthdayWidget() {
    var el = document.getElementById('birthday-widget');
    if (!el) return;
    var today = new Date();
    var mm = String(today.getMonth() + 1).padStart(2, '0');
    var dd = String(today.getDate()).padStart(2, '0');
    var todayStr = mm + '-' + dd;
    var bdays = DATA.players.filter(function(p) {
        if (!p.birthdate) return false;
        return p.birthdate.slice(5) === todayStr;
    });
    if (bdays.length === 0) { el.innerHTML = '<span class="gensmall">No birthdays today</span>'; return; }
    var html = '';
    for (var i = 0; i < bdays.length; i++) {
        var p = bdays[i];
        var age = calculateAge(p.birthdate);
        html += '<a href="player.html?id=' + p.id + '">' + p.name + '</a>';
        if (age) html += ' <span class="gensmall">(turns ' + age + ')</span>';
        html += '<br>';
    }
    el.innerHTML = html;
}

function renderSchedule() {
    var tbody = document.getElementById('schedule-body');
    if (!tbody) return;
    var leagueFilterEl = document.getElementById('filter-league');
    var statusFilterEl = document.getElementById('filter-status');
    var leagueFilter = leagueFilterEl ? leagueFilterEl.value : '';
    var statusFilter = statusFilterEl ? statusFilterEl.value : '';
    var games = DATA.games;
    if (leagueFilter) games = games.filter(function(g) { return g.league === leagueFilter; });
    if (statusFilter) games = games.filter(function(g) { return g.status === statusFilter; });
    var html = '';
    for (var i = 0; i < games.length; i++) {
        var g = games[i];
        var home = getTeamById(g.home_team_id);
        var away = getTeamById(g.away_team_id);
        html += '<tr class="' + rowClass(i) + '"><td class="row-num">' + (i+1) + '</td><td class="gensmall">' + (g.date || '-') + '</td><td class="gensmall">' + (g.time || '-') + '</td><td class="gensmall">' + (g.league || '-') + '</td>';
        html += '<td>' + (away ? away.abbreviation : (g.away_team_id || '?')) + '</td>';
        html += '<td class="tCenter gensmall">@</td>';
        html += '<td>' + (home ? home.abbreviation : (g.home_team_id || '?')) + '</td>';
        if (g.status === 'final') {
            html += '<td class="tCenter bold">' + (g.away_score || 0) + ' - ' + (g.home_score || 0) + '</td>';
        } else {
            html += '<td class="tCenter gensmall">--</td>';
        }
        html += '<td class="tCenter gensmall">' + g.status + '</td><td class="gensmall">' + (g.venue || '') + '</td></tr>';
    }
    if (!html) html = '<tr class="row1"><td colspan="10" class="gensmall" style="text-align:center;">No games found</td></tr>';
    tbody.innerHTML = html;
    // Show count
    var countEl = document.getElementById('schedule-count');
    if (countEl) countEl.textContent = 'Showing ' + games.length + ' of ' + DATA.games.length + ' games';
}
