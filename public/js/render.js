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
    var teamColor = getTeamColor(player);
    var style = teamColor ? ' style="border-color:' + teamColor + '"' : '';
    if (player.avatar_url) {
        return '<span class="' + cls + '"' + style + '><img src="' + player.avatar_url + '" alt="' + (player.name || '') + '"></span>';
    }
    var initials = (player.name || '?').split(' ').map(function(w) { return w.charAt(0); }).join('').substring(0, 2).toUpperCase();
    return '<span class="' + cls + '"' + style + '>' + initials + '</span>';
}

// === NEW HELPERS: Small Details ===

function getTeamColor(player) {
    var team = typeof getPlayerTeam === 'function' ? getPlayerTeam(player) : null;
    if (team && team.colors && team.colors.length > 0) return team.colors[0];
    return null;
}

function renderPosBadge(position) {
    if (!position) return '';
    return '<span class="pos-badge pos-badge-' + position + '">' + position + '</span>';
}

function renderTeamLogo(team, size) {
    if (!team) return '';
    var isLarge = size === 'large';
    var cls = isLarge ? 'team-logo team-logo-lg' : 'team-logo team-logo-sm';
    if (team.logo_url) {
        var fallbackColor = team.colors && team.colors[0] ? team.colors[0] : 'var(--cat-head-bg)';
        var fallbackAbbr = (team.abbreviation || '?').substring(0, 3);
        return '<span class="' + cls + '"><img src="' + team.logo_url + '" alt="' + (team.abbreviation || team.name || '') + '" onerror="this.parentNode.style.background=\'' + fallbackColor + '\';this.parentNode.textContent=\'' + fallbackAbbr + '\';"></span>';
    }
    // Fallback: only show abbreviation placeholder for large logos (team profile header)
    // Skip the small colored cube in list views since color dot + name is already shown
    if (!isLarge) return '';
    var color = team.colors && team.colors[0] ? team.colors[0] : 'var(--cat-head-bg)';
    var abbr = (team.abbreviation || '?').substring(0, 3);
    return '<span class="' + cls + '" style="background:' + color + ';">' + abbr + '</span>';
}

function renderStatusDot(status) {
    if (!status) return '';
    var cls = 'status-dot status-dot-' + status.replace(/[^a-z_]/gi, '_').toLowerCase();
    return '<span class="' + cls + '" title="' + status + '"></span>';
}

function renderTeamColorDot(team) {
    if (!team || !team.colors || team.colors.length === 0) return '';
    return '<span class="team-color-dot" style="background:' + team.colors[0] + ';"></span>';
}

function renderOvrBar(ovr) {
    if (!ovr && ovr !== 0) return '-';
    var n = Number(ovr);
    var textCls;
    if (n >= 90) { textCls = 'ovr-elite'; }
    else if (n >= 80) { textCls = 'ovr-good'; }
    else if (n >= 70) { textCls = 'ovr-avg'; }
    else if (n >= 60) { textCls = 'ovr-below'; }
    else { textCls = 'ovr-low'; }
    return '<span class="ovr-text ' + textCls + '">' + n + '</span>';
}

function statColor(val, thresholds) {
    // thresholds: { great: 20, good: 15, avg: 10, below: 5 }
    if (val === undefined || val === null || val === '' || val === '-') return '';
    var n = Number(val);
    if (isNaN(n)) return '';
    if (thresholds.great !== undefined && n >= thresholds.great) return 'stat-great';
    if (thresholds.good !== undefined && n >= thresholds.good) return 'stat-good';
    if (thresholds.avg !== undefined && n >= thresholds.avg) return 'stat-avg';
    if (thresholds.below !== undefined && n >= thresholds.below) return 'stat-below';
    return 'stat-bad';
}

function coloredStat(val, thresholds) {
    var cls = statColor(val, thresholds);
    var display = numStr(val);
    if (cls) return '<span class="' + cls + '">' + display + '</span>';
    return display;
}

function coloredPct(val, thresholds) {
    var cls = statColor(val === undefined ? undefined : (Number(val) <= 1 ? Number(val) * 100 : Number(val)), thresholds);
    var display = pctStr(val);
    if (cls) return '<span class="' + cls + '">' + display + '</span>';
    return display;
}

var PPG_THRESH = { great: 20, good: 15, avg: 10, below: 5 };
var APG_THRESH = { great: 8, good: 5, avg: 3, below: 1 };
var RPG_THRESH = { great: 10, good: 7, avg: 4, below: 2 };
var FG_THRESH = { great: 50, good: 45, avg: 40, below: 35 };

function renderJerseyNum(player) {
    var num = '';
    if (player.jersey_history && player.jersey_history.length > 0) {
        num = player.jersey_history[player.jersey_history.length - 1].number;
    } else if (player.jersey_number) {
        num = player.jersey_number;
    }
    if (!num) return '';
    return '<span class="jersey-num">#' + num + '</span>';
}

function renderLeagueBadge(league) {
    if (!league) return '';
    var l = league.toUpperCase();
    if (l === 'NBA') return '<span class="league-badge league-badge-nba">NBA</span>';
    if (l.indexOf('NCAA') !== -1 || l.indexOf('D1') !== -1) return '<span class="league-badge league-badge-ncaa">NCAA</span>';
    if (l === 'HS' || l.indexOf('HIGH') !== -1) return '<span class="league-badge league-badge-hs">HS</span>';
    return '<span class="league-badge league-badge-intl">' + league.substring(0, 4).toUpperCase() + '</span>';
}

function renderConfBadge(conf) {
    if (!conf) return '';
    var c = conf.toLowerCase();
    if (c.indexOf('east') !== -1) return '<span class="conf-badge conf-badge-east">EAST</span>';
    if (c.indexOf('west') !== -1) return '<span class="conf-badge conf-badge-west">WEST</span>';
    return '<span class="conf-badge" style="background:#444;border-color:#333;color:#FFF;">' + conf.substring(0, 4).toUpperCase() + '</span>';
}

function renderUrgencyTag(type) {
    var t = (type || '').toLowerCase();
    if (t === 'trade' || t === 'traded') return '<span class="tag-trade">TRADE</span>';
    if (t === 'signed' || t === 'signing') return '<span class="tag-signed">SIGNED</span>';
    if (t === 'drafted') return '<span class="tag-drafted">DRAFTED</span>';
    if (t === 'waived') return '<span class="tag-waived">WAIVED</span>';
    if (t === 'injury' || t === 'injured') return '<span class="tag-injury">INJURY</span>';
    if (t === 'breaking') return '<span class="tag-breaking">BREAKING</span>';
    if (t === 'final') return '<span class="tag-final">FINAL</span>';
    if (t === 'live') return '<span class="tag-live">LIVE</span>';
    if (t === 'hot') return '<span class="tag-hot">HOT</span>';
    if (t === 'rumor') return '<span class="tag-rumor">RUMOR</span>';
    if (t === 'preview') return '<span class="tag-preview">PREVIEW</span>';
    // Default: use event-type style
    return '<span class="tag-updated">' + (type || 'UPDATE').toUpperCase() + '</span>';
}

function renderAgeWithBirth(birthdate) {
    if (!birthdate) return '-';
    var age = calculateAge(birthdate);
    var year = birthdate.substring(0, 4);
    if (age) return age + ' <span class="gensmall">(b. ' + year + ')</span>';
    return '-';
}

// === RENDER FUNCTIONS ===

function renderLeagueHub() {
    var tbody = document.getElementById('league-hub-body');
    if (!tbody) return;
    var html = '';
    for (var i = 0; i < DATA.leagues.length; i++) {
        var l = DATA.leagues[i];
        html += '<tr class="' + rowClass(i) + '"><td class="row-num">' + (i+1) + '</td><td>' + renderLeagueBadge(l.level) + '<a href="leagues.html">' + (l.name || 'Unknown') + '</a></td><td class="gensmall">' + (l.level || '-') + '</td><td class="tCenter gensmall mono">' + (l.current_season || '-') + '</td><td class="tCenter mono">' + (l.teams ? l.teams.length : 0) + '</td></tr>';
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
        var homeWon = (g.home_score || 0) > (g.away_score || 0);
        html += '<tr class="' + rowClass(i) + '"><td class="row-num">' + (i+1) + '</td><td class="gensmall mono">' + (g.date || '-') + (isNew ? ' <span class="tag-new">NEW</span>' : '') + '</td>';
        html += '<td>' + renderTeamColorDot(away) + (away ? away.abbreviation : (g.away_team_id || '?')) + '</td>';
        html += '<td class="tCenter bold mono ' + (!homeWon ? 'result-w' : '') + '">' + (g.away_score || 0) + '</td>';
        html += '<td>' + renderTeamColorDot(home) + (home ? home.abbreviation : (g.home_team_id || '?')) + '</td>';
        html += '<td class="tCenter bold mono ' + (homeWon ? 'result-w' : '') + '">' + (g.home_score || 0) + '</td>';
        html += '<td class="tCenter"><span class="tag-final">FINAL</span></td></tr>';
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
        html += '<div class="post-header">' + renderUrgencyTag(e.type) + '<span class="gensmall">' + (e.date || '') + '</span>';
        if (e.date) html += ' <span class="gensmall" style="color:var(--text-light);">' + relativeTime(e.date) + '</span>';
        if (p) html += ' <span class="gensmall">by ' + renderFlag(p.nationality) + '<a href="player.html?id=' + p.id + '">' + p.name + '</a></span>';
        if (isRecent(e.date)) html += ' <span class="tag-new">NEW</span>';
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
        { key: 'ppg', label: 'PPG', thresh: PPG_THRESH },
        { key: 'apg', label: 'APG', thresh: APG_THRESH },
        { key: 'rpg', label: 'RPG', thresh: RPG_THRESH },
        { key: 'spg', label: 'SPG', thresh: { great: 2, good: 1.5, avg: 1, below: 0.5 } },
        { key: 'bpg', label: 'BPG', thresh: { great: 2, good: 1.5, avg: 1, below: 0.5 } }
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
            html += '<tr class="' + rowClass(c) + '"><td class="row-num">' + (c+1) + '</td><td class="gensmall bold">' + cat.label + '</td>';
            html += '<td>' + renderFlag(leader.nationality) + renderPosBadge(leader.position) + '<a href="player.html?id=' + leader.id + '">' + leader.name + '</a>' + renderJerseyNum(leader) + ' <span class="gensmall">(' + renderTeamColorDot(team) + (team ? team.abbreviation : '-') + ')</span></td>';
            html += '<td class="tCenter bold mono">' + coloredStat(leaderVal, cat.thresh) + '</td></tr>';
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
        html += '<tr class="' + rowClass(i) + '"><td class="row-num">' + (i+1) + '</td><td class="gensmall mono">' + (g.date || '-') + '</td><td class="gensmall">' + renderLeagueBadge(g.league) + '</td>';
        html += '<td>' + renderTeamColorDot(away) + (away ? away.abbreviation : (g.away_team_id || '?')) + '</td>';
        html += '<td class="tCenter gensmall">@</td>';
        html += '<td>' + renderTeamColorDot(home) + (home ? home.abbreviation : (g.home_team_id || '?')) + '</td>';
        html += '<td class="gensmall"><span class="tag-preview">PREVIEW</span> ' + (g.venue || '') + '</td></tr>';
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
        html += '<li>' + renderStatusDot(p.status) + renderAvatar(p, 'small') + renderFlag(p.nationality) + renderPosBadge(p.position) + '<a href="player.html?id=' + p.id + '">' + p.name + '</a>' + renderJerseyNum(p) + ' ' + renderOvrBar(p.overall) + ' <span class="fic">*</span></li>';
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
        html += '<li>' + renderLeagueBadge(l.level) + ' <a href="leagues.html">' + (l.abbreviation || l.name) + '</a> <span class="gensmall">(' + (l.level || '?') + ')</span></li>';
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
    el.innerHTML = '<span class="mono">DB Stats:</span><br>Players: <b class="mono">' + total + '</b> <span class="gensmall">(' + fic + ' fic, ' + real + ' real)</span><br>Teams: <b class="mono">' + teams + '</b><br>Games: <b class="mono">' + games + '</b> <span class="gensmall">(' + finishedGames + ' played)</span><br>Active Injuries: <b class="mono" style="color:var(--accent-red);">' + injuries + '</b><br>Transactions: <b class="mono">' + DATA.transactions.length + '</b>';
}

function renderStandings() {
    var container = document.getElementById('standings-container');
    if (!container) return;
    var html = '';
    for (var i = 0; i < DATA.leagues.length; i++) {
        var l = DATA.leagues[i];
        if (l.standings && Object.keys(l.standings).length > 0) {
            html += '<table class="forumline"><tr><th class="catHead" colspan="9">' + renderLeagueBadge(l.level) + ' ' + (l.name || 'Unknown') + ' - ' + (l.current_season || '') + '</th></tr>';
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
                html += '<tr><th class="subCatHead" colspan="9">' + renderConfBadge(conf) + ' ' + conf + ' Conference</th></tr>';
                html += '<tr><th class="thHead">#</th><th class="thHead">Team</th><th class="thHead tCenter">W</th><th class="thHead tCenter">L</th><th class="thHead tCenter">Win%</th><th class="thHead tCenter">Conf W</th><th class="thHead tCenter">Conf L</th><th class="thHead tCenter">Rank</th><th class="thHead tCenter">Win Bar</th></tr>';
                var teams = confData[conf];
                for (var j = 0; j < teams.length; j++) {
                    var t = teams[j];
                    var team = getTeamById(t.team_id);
                    var winPct = t.win_pct || 0;
                    if (winPct <= 1) winPct = winPct * 100;
                    var barW = Math.min(100, Math.max(0, winPct));
                    var barColor = barW >= 60 ? 'var(--accent-green)' : (barW >= 50 ? 'var(--accent-yellow)' : 'var(--accent-red)');
                    html += '<tr class="' + rowClass(j) + '" style="border-left:3px solid ' + (team && team.colors && team.colors[0] ? team.colors[0] : 'transparent') + ';">';
                    html += '<td class="row-num">' + (j+1) + '</td><td>' + renderTeamColorDot(team) + '<a href="team.html?id=' + t.team_id + '">' + (team ? team.name : t.team_id) + '</a></td>';
                    html += '<td class="tCenter mono result-w">' + (t.wins || 0) + '</td><td class="tCenter mono result-l">' + (t.losses || 0) + '</td>';
                    html += '<td class="tCenter mono">' + pctStr(t.win_pct) + '</td>';
                    html += '<td class="tCenter mono">' + (t.conf_wins !== undefined ? t.conf_wins : '-') + '</td><td class="tCenter mono">' + (t.conf_losses !== undefined ? t.conf_losses : '-') + '</td>';
                    html += '<td class="tCenter mono">' + (t.conf_rank || '-') + '</td>';
                    html += '<td><span class="ovr-bar" style="width:60px;"><span class="ovr-bar-fill" style="width:' + barW + '%;background:' + barColor + ';"></span></span></td>';
                    html += '</tr>';
                }
            }
            html += '</table>';
        }
    }
    if (!html) html = '<p class="gensmall" style="text-align:center;">No standings data available</p>';
    container.innerHTML = html;
}

// === RENDER HELPERS ===

function renderAttributeBar(label, value) {
    var cls = value < 60 ? 'attr-low' : (value < 80 ? 'attr-mid' : 'attr-high');
    var pct = Math.min(100, Math.max(0, value));
    return '<div class="attribute-bar"><span class="attr-label">' + label + '</span><span class="attr-track"><span class="attr-fill ' + cls + '" style="width:' + pct + '%"></span></span><span class="attr-val">' + value + '</span></div>';
}

function renderBadgePill(badge) {
    var tier = (badge.tier || 'bronze').replace(/ /g, '_');
    var tierLabel = tier.replace(/_/g, ' ').replace(/\b\w/g, function(c) { return c.toUpperCase(); });
    return '<span class="badge-tag badge-' + tier + '" data-badge-name="' + (badge.name || '?') + '" data-badge-tier="' + tierLabel + '"><span class="badge-tier-icon"></span>' + (badge.name || '?') + '</span>';
}

function renderInjuryIndicator(severity) {
    return '<span class="injury-status injury-' + (severity || 'minor') + '">' + (severity || 'minor').toUpperCase() + '</span>';
}

function renderTxnType(type) {
    return '<span class="txn-type txn-' + (type || 'signed') + '">' + (type || '?').toUpperCase() + '</span>';
}

// === TICKER BAR (ESPN Bottom Line) ===
function renderTicker() {
    var el = document.getElementById('ticker-bar');
    if (!el) return;
    var items = [];

    // Transactions with urgency tags
    var txns = (DATA.transactions || []).slice(-3);
    for (var i = txns.length - 1; i >= 0; i--) {
        var t = txns[i];
        var playerName = (t.player_id || '').replace(/_/g, ' ');
        var tagType = t.type || 'signed';
        items.push('<span class="ticker-item">' + renderUrgencyTag(tagType) + ' ' + playerName + ' - ' + (t.details || '').substring(0, 50) + '</span>');
    }

    // Injuries
    var injuries = (DATA.injuries || []).filter(function(i) { return i.status === 'day-to-day' || i.status === 'active'; });
    for (var i = 0; i < injuries.length; i++) {
        var inj = injuries[i];
        items.push('<span class="ticker-item"><span class="tag-injury">INJURY</span> ' + (inj.player_id || '').replace(/_/g, ' ') + ' - ' + (inj.type || '') + ' (' + (inj.status || '') + ')</span>');
    }

    // Game scores
    var games = (DATA.games || []).filter(function(g) { return g.status === 'final'; }).slice(-3);
    for (var i = games.length - 1; i >= 0; i--) {
        var g = games[i];
        var home = getTeamById(g.home_team_id);
        var away = getTeamById(g.away_team_id);
        var awayAbbr = away ? away.abbreviation : (g.away_team_name || '?');
        var homeAbbr = home ? home.abbreviation : (g.home_team_name || '?');
        items.push('<span class="ticker-item"><span class="tag-final">FINAL</span> <a href="game.html?id=' + g.id + '"><b>' + awayAbbr + ' ' + (g.away_score || 0) + '</b> - <b>' + homeAbbr + ' ' + (g.home_score || 0) + '</b></a></span>');
    }

    if (items.length === 0) items.push('<span class="ticker-item">Welcome to MADCAP - Modular Athlete Database & Career Analysis Platform</span>');
    el.innerHTML = '<span class="ticker-label">BREAKING</span><span class="ticker-content">' + items.join('<span class="ticker-sep">|</span>') + '</span>';
}

function renderTransactionsWidget() {
    var el = document.getElementById('transactions-widget');
    if (!el) return;
    var txns = (DATA.transactions || []).slice(-8).reverse();
    var html = '';
    for (var i = 0; i < txns.length; i++) {
        var t = txns[i];
        var isNew = isRecent(t.date);
        html += '<li>' + renderUrgencyTag(t.type) + ' <a href="player.html?id=' + t.player_id + '">' + (t.player_id || '').replace(/_/g, ' ') + '</a>';
        if (isNew) html += ' <span class="tag-new">NEW</span>';
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
        html += '<li>' + renderStatusDot(inj.status === 'day-to-day' ? 'day-to-day' : 'injured') + renderInjuryIndicator(inj.severity) + ' <a href="player.html?id=' + inj.player_id + '">' + (inj.player_id || '').replace(/_/g, ' ') + '</a> - ' + (inj.type || '') + '</li>';
    }
    if (!html) html = '<li class="gensmall" style="color:var(--accent-green);">All healthy</li>';
    el.innerHTML = html;
}

// === Mini Standings Widget ===
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
        html += '<table class="mini-table"><tr><th colspan="3">' + renderLeagueBadge(l.level) + ' ' + (l.abbreviation || l.name) + '</th></tr>';
        html += '<tr><th>Team</th><th>W-L</th><th>%</th></tr>';
        var count = 0;
        for (var conf in confData) {
            if (!confData.hasOwnProperty(conf)) continue;
            var teams = confData[conf];
            for (var j = 0; j < Math.min(teams.length, 3); j++) {
                var t = teams[j];
                var team = getTeamById(t.team_id);
                html += '<tr><td>' + renderTeamColorDot(team) + '<a href="team.html?id=' + t.team_id + '">' + (team ? team.abbreviation : t.team_id) + '</a></td>';
                html += '<td class="tCenter mono">' + (t.wins||0) + '-' + (t.losses||0) + '</td>';
                html += '<td class="tCenter mono">' + pctStr(t.win_pct) + '</td></tr>';
                count++;
            }
        }
        html += '</table>';
        if (count === 0) html = '';
    }
    if (!html) html = '<span class="gensmall">No standings data</span>';
    el.innerHTML = html;
}

// === Today's Games Widget ===
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
        var statusTag = g.status === 'final' ? '<span class="tag-final">FINAL</span>' : (g.status === 'live' ? '<span class="tag-live">LIVE</span>' : '<span class="gensmall">' + (g.time || g.status) + '</span>');
        html += '<tr><td>' + renderTeamColorDot(away) + (away ? away.abbreviation : '?') + '</td><td class="tCenter">@</td><td>' + renderTeamColorDot(home) + (home ? home.abbreviation : '?') + '</td>';
        html += '<td class="tCenter">' + (g.status === 'final' ? (g.away_score + '-' + g.home_score) : statusTag) + '</td></tr>';
    }
    html += '</table>';
    el.innerHTML = html;
}

// === Birthday Widget ===
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
        html += renderFlag(p.nationality) + '<a href="player.html?id=' + p.id + '">' + p.name + '</a>';
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
        var statusTag = g.status === 'final' ? '<span class="tag-final">FINAL</span>' : (g.status === 'scheduled' ? '<span class="tag-preview">SCHED</span>' : '<span class="tag-live">LIVE</span>');
        html += '<tr class="' + rowClass(i) + '"><td class="row-num">' + (i+1) + '</td><td class="gensmall mono">' + (g.date || '-') + '</td><td class="gensmall mono">' + (g.time || '-') + '</td><td class="gensmall">' + renderLeagueBadge(g.league) + '</td>';
        html += '<td>' + renderTeamColorDot(away) + (away ? away.abbreviation : (g.away_team_id || '?')) + '</td>';
        html += '<td class="tCenter gensmall">@</td>';
        html += '<td>' + renderTeamColorDot(home) + (home ? home.abbreviation : (g.home_team_id || '?')) + '</td>';
        if (g.status === 'final') {
            var homeWon = (g.home_score || 0) > (g.away_score || 0);
            html += '<td class="tCenter bold mono"><span class="' + (!homeWon ? 'result-w' : 'result-l') + '">' + (g.away_score || 0) + '</span> - <span class="' + (homeWon ? 'result-w' : 'result-l') + '">' + (g.home_score || 0) + '</span></td>';
        } else {
            html += '<td class="tCenter gensmall">--</td>';
        }
        html += '<td class="tCenter">' + statusTag + '</td><td class="gensmall">' + (g.venue || '') + '</td></tr>';
    }
    if (!html) html = '<tr class="row1"><td colspan="10" class="gensmall" style="text-align:center;">No games found</td></tr>';
    tbody.innerHTML = html;
    // Show count
    var countEl = document.getElementById('schedule-count');
    if (countEl) countEl.textContent = 'Showing ' + games.length + ' of ' + DATA.games.length + ' games';
}

// === Shared tooltip utility ===
// Creates a single tooltip element and attaches hover handlers to a container.
// selector: CSS selector for hoverable elements within container
// contentFn: function(el) that returns tooltip HTML string
function attachTooltip(container, selector, contentFn) {
    if (!container) return;
    var tip = document.createElement('div');
    tip.className = 'css-chart-tooltip';
    tip.style.display = 'none';
    document.body.appendChild(tip);

    container.addEventListener('mouseover', function(e) {
        var el = e.target.closest(selector);
        if (!el || !container.contains(el)) { tip.style.display = 'none'; return; }
        var html = contentFn(el);
        if (!html) { tip.style.display = 'none'; return; }
        tip.innerHTML = html;
        tip.style.display = 'block';
    });
    container.addEventListener('mousemove', function(e) {
        if (tip.style.display === 'none') return;
        var x = e.clientX + 12;
        var y = e.clientY + 12;
        if (x + 180 > window.innerWidth) x = e.clientX - 190;
        if (y + 120 > window.innerHeight) y = e.clientY - 130;
        tip.style.left = x + 'px';
        tip.style.top = y + 'px';
    });
    container.addEventListener('mouseout', function(e) {
        if (!e.relatedTarget || !container.contains(e.relatedTarget)) {
            tip.style.display = 'none';
        }
    });
    return tip;
}
