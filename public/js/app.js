(function() {
    'use strict';

    var DATA = { players: [], teams: [], leagues: [], games: [], drafts: [], events: [], transactions: [], injuries: [], awards: {}, mock_drafts: [], seasons: [] };
    var EDIT_MODE = false;

    window.DATA = DATA;

    // === NAV LINKS (single source of truth) ===
    var NAV_LINKS = [
        { href: 'index.html', label: 'MADCAP' },
        { href: 'players.html', label: 'Players' },
        { href: 'teams.html', label: 'Teams' },
        { href: 'leagues.html', label: 'Leagues' },
        { href: 'drafts.html', label: 'Drafts' },
        { href: 'schedule.html', label: 'Schedule' },
        { href: 'injuries.html', label: 'Injuries' },
        { href: 'transactions.html', label: 'Transactions' },
        { href: 'awards.html', label: 'Awards' },
        { href: 'compare.html', label: 'Compare' },
        { href: 'mockdraft.html', label: 'Mock Draft' }
    ];

    // === RENDER NAV BAR (Torrent Tracker Style) ===
    function renderNav() {
        var navEl = document.getElementById('main-nav');
        if (!navEl) return;
        var html = '<div class="nav-links"><ul>';
        for (var i = 0; i < NAV_LINKS.length; i++) {
            if (i > 0) html += '<li><span class="pipe-sep">|</span></li>';
            html += '<li><a href="' + NAV_LINKS[i].href + '">' + NAV_LINKS[i].label + '</a></li>';
        }
        html += '</ul></div>';
        // Right side: tracker stats + search
        html += '<div class="nav-stats" id="nav-stats">';
        html += '<span>Players: <b>--</b></span> | ';
        html += '<span>Teams: <b>--</b></span> | ';
        html += '<span>Games: <b>--</b></span>';
        html += '<span class="nav-search"><input type="text" id="nav-search-input" placeholder="Search..." onkeydown="if(event.key===\'Enter\')navSearch()"></span>';
        html += '</div>';
        navEl.innerHTML = html;
    }

    // Nav search handler
    function navSearch() {
        var q = document.getElementById('nav-search-input');
        if (q && q.value.trim()) {
            window.location.href = 'players.html?q=' + encodeURIComponent(q.value.trim());
        }
    }
    window.navSearch = navSearch;

    // Update nav stats after data loads
    function updateNavStats() {
        var el = document.getElementById('nav-stats');
        if (!el) return;
        var players = DATA.players.length;
        var teams = DATA.teams.length;
        var games = DATA.games.length;
        var fic = DATA.players.filter(function(p) { return p.is_fictional; }).length;
        var html = '<span>Players: <b>' + players + '</b></span> | ';
        html += '<span>Teams: <b>' + teams + '</b></span> | ';
        html += '<span>Games: <b>' + games + '</b></span> | ';
        html += '<span>Fictional: <b>' + fic + '</b></span>';
        html += '<span class="nav-search"><input type="text" id="nav-search-input" placeholder="Search..." onkeydown="if(event.key===\'Enter\')navSearch()"></span>';
        el.innerHTML = html;
    }
    window.updateNavStats = updateNavStats;

    // === RENDER TOP BAR ===
    function renderTopBar() {
        var topBar = document.getElementById('top-bar');
        if (!topBar) return;
        var html = '';
        // Dark mode toggle
        html += '<button type="button" class="theme-toggle" id="theme-toggle-btn" onclick="toggleDarkMode()" title="Toggle Dark/Light Mode">';
        html += '<span id="theme-icon">' + (isLightMode() ? 'DARK' : 'LIGHT') + '</span>';
        html += '</button>';
        html += '<span class="middot">&middot;</span>';
        // Edit mode toggle
        html += '<button type="button" class="edit-toggle-switch" id="edit-toggle-btn" onclick="toggleEditMode()" title="Toggle Edit Mode">';
        html += '<span id="edit-icon">EDIT</span>';
        html += '</button>';
        html += '<span class="middot">&middot;</span>';
        html += '<span class="gensmall last-updated" id="last-updated-text">Data is simulated</span>';
        topBar.innerHTML = html;
    }

    // === RENDER FOOTER (clean, minimal) ===
    function renderFooter() {
        var footerEl = document.getElementById('page-footer');
        if (!footerEl) return;
        var now = new Date();
        var timestamp = now.toISOString().slice(0, 19).replace('T', ' ') + ' UTC';
        var loadTime = ((performance.now()) / 1000).toFixed(3);

        var html = '<div style="border-top: 1px solid var(--border-color); margin-top: 6px; padding: 4px 0;">';

        // Meta info
        html += '<div class="footer-meta" style="text-align:center;">';
        html += 'MADCAP &middot; Page generated in ' + loadTime + 's';
        html += ' &middot; Last update: ' + timestamp;
        html += '</div>';

        // Disclaimer
        html += '<div style="text-align:center;font-size:7px;color:var(--text-light);margin-top:3px;">';
        html += 'Fictional sports database. All data is simulated. Not affiliated with the NBA, NCAA, or any professional sports organization.';
        html += '</div>';

        html += '</div>';
        footerEl.innerHTML = html;
    }
    window.renderFooter = renderFooter;

    // === DARK MODE (dark is default, light is alt) ===
    function isLightMode() {
        return localStorage.getItem('madcap-light-mode') === '1';
    }
    window.isLightMode = isLightMode;

    // Keep backward compat
    function isDarkMode() {
        return !isLightMode();
    }
    window.isDarkMode = isDarkMode;

    function applyDarkMode() {
        if (isLightMode()) {
            document.documentElement.classList.add('light');
        } else {
            document.documentElement.classList.remove('light');
        }
        var icon = document.getElementById('theme-icon');
        if (icon) icon.textContent = isLightMode() ? 'DARK' : 'LIGHT';
    }

    function toggleDarkMode() {
        localStorage.setItem('madcap-light-mode', isLightMode() ? '0' : '1');
        applyDarkMode();
        if (typeof updateChartsTheme === 'function') updateChartsTheme();
    }
    window.toggleDarkMode = toggleDarkMode;

    // Apply dark mode immediately to prevent flash (dark is default)
    if (isLightMode()) {
        document.documentElement.classList.add('light');
    }

    // === DATA LOADING ===
    function loadJSON(url) {
        return fetch(url).then(function(r) {
            if (!r.ok) throw new Error('HTTP ' + r.status + ' fetching ' + url);
            return r.json();
        });
    }

    function loadAllData() {
        return Promise.all([
            loadJSON('api/players').then(function(d) { DATA.players = d; }),
            loadJSON('api/teams').then(function(d) { DATA.teams = d; }),
            loadJSON('api/leagues').then(function(d) { DATA.leagues = d; }),
            loadJSON('api/games').then(function(d) { DATA.games = d; }),
            loadJSON('api/drafts').then(function(d) { DATA.drafts = d; }),
            loadJSON('api/events').then(function(d) { DATA.events = d; }),
            loadJSON('api/transactions').then(function(d) { DATA.transactions = d; }),
            loadJSON('api/injuries').then(function(d) { DATA.injuries = d; }),
            loadJSON('api/awards').then(function(d) { DATA.awards = d; }),
            loadJSON('api/mock-drafts').then(function(d) { DATA.mock_drafts = d; }),
            loadJSON('api/seasons').then(function(d) { DATA.seasons = d; })
        ]).then(function() {
            updateNavStats();
            initGlobalTooltips();
        });
    }

    // === Global hover tooltips for player/team/league links ===
    function initGlobalTooltips() {
        var tip = document.createElement('div');
        tip.className = 'css-chart-tooltip';
        tip.style.display = 'none';
        document.body.appendChild(tip);

        function showTip(html, e) {
            tip.innerHTML = html;
            tip.style.display = 'block';
            positionTip(e);
        }
        function positionTip(e) {
            var x = e.clientX + 12;
            var y = e.clientY + 12;
            if (x + 200 > window.innerWidth) x = e.clientX - 210;
            if (y + 150 > window.innerHeight) y = e.clientY - 160;
            tip.style.left = x + 'px';
            tip.style.top = y + 'px';
        }
        function hideTip() { tip.style.display = 'none'; }

        function getIdFromHref(href, page) {
            if (!href) return null;
            var idx = href.indexOf(page + '?id=');
            if (idx === -1) return null;
            var rest = href.substring(idx + page.length + 4);
            return rest.split('&')[0] || null;
        }

        function playerTipHtml(p) {
            if (!p) return null;
            var team = typeof getPlayerTeam === 'function' ? getPlayerTeam(p) : null;
            var age = typeof calculateAge === 'function' ? calculateAge(p.birthdate) : '-';
            var stats = getPlayerLatestStats(p);
            var h = '<div class="tt-season">' + p.name + '</div>';
            h += '<div class="tt-row"><span class="tt-label">Position</span><span class="tt-value">' + (p.position||'-') + '</span></div>';
            h += '<div class="tt-row"><span class="tt-label">Overall</span><span class="tt-value">' + (p.overall||'-') + '</span></div>';
            if (p.archetype) h += '<div class="tt-row"><span class="tt-label">Archetype</span><span class="tt-value">' + p.archetype + '</span></div>';
            h += '<div class="tt-row"><span class="tt-label">Age</span><span class="tt-value">' + (age||'-') + '</span></div>';
            h += '<div class="tt-row"><span class="tt-label">Height</span><span class="tt-value">' + (p.height||'-') + '</span></div>';
            if (team) h += '<div class="tt-row"><span class="tt-label">Team</span><span class="tt-value">' + team.abbreviation + '</span></div>';
            if (stats.ppg != null) h += '<div class="tt-row"><span class="tt-label">PPG</span><span class="tt-value">' + numStr(stats.ppg) + '</span></div>';
            if (stats.apg != null) h += '<div class="tt-row"><span class="tt-label">APG</span><span class="tt-value">' + numStr(stats.apg) + '</span></div>';
            if (stats.rpg != null) h += '<div class="tt-row"><span class="tt-label">RPG</span><span class="tt-value">' + numStr(stats.rpg) + '</span></div>';
            return h;
        }

        function teamTipHtml(t) {
            if (!t) return null;
            var h = '<div class="tt-season">' + t.name + '</div>';
            h += '<div class="tt-row"><span class="tt-label">Abbrev</span><span class="tt-value">' + (t.abbreviation||'-') + '</span></div>';
            if (t.city) h += '<div class="tt-row"><span class="tt-label">City</span><span class="tt-value">' + t.city + '</span></div>';
            if (t.conference) h += '<div class="tt-row"><span class="tt-label">Conference</span><span class="tt-value">' + t.conference + '</span></div>';
            if (t.division) h += '<div class="tt-row"><span class="tt-label">Division</span><span class="tt-value">' + t.division + '</span></div>';
            if (t.record) h += '<div class="tt-row"><span class="tt-label">Record</span><span class="tt-value">' + t.record + '</span></div>';
            return h;
        }

        function leagueTipHtml(el) {
            var text = el.textContent.trim();
            var league = null;
            for (var i = 0; i < DATA.leagues.length; i++) {
                if (DATA.leagues[i].level && DATA.leagues[i].level.toUpperCase().indexOf(text) !== -1) { league = DATA.leagues[i]; break; }
                if (DATA.leagues[i].name && DATA.leagues[i].name.toUpperCase().indexOf(text) !== -1) { league = DATA.leagues[i]; break; }
            }
            if (!league) return '<div class="tt-season">' + text + '</div>';
            var h = '<div class="tt-season">' + league.name + '</div>';
            if (league.level) h += '<div class="tt-row"><span class="tt-label">Level</span><span class="tt-value">' + league.level + '</span></div>';
            if (league.current_season) h += '<div class="tt-row"><span class="tt-label">Season</span><span class="tt-value">' + league.current_season + '</span></div>';
            if (league.teams) h += '<div class="tt-row"><span class="tt-label">Teams</span><span class="tt-value">' + league.teams.length + '</span></div>';
            return h;
        }

        // Helper to get latest stats from a player (works from global DATA)
        function getPlayerLatestStats(player) {
            var stats = { ppg: null, apg: null, rpg: null };
            if (player.career && player.career.pro) {
                for (var i = player.career.pro.length - 1; i >= 0; i--) {
                    var pro = player.career.pro[i];
                    if (pro.seasons && pro.seasons.length > 0) {
                        var last = pro.seasons[pro.seasons.length - 1];
                        return { ppg: last.ppg, apg: last.apg, rpg: last.rpg };
                    }
                }
            }
            if (player.career && player.career.college && player.career.college.seasons && player.career.college.seasons.length > 0) {
                var last = player.career.college.seasons[player.career.college.seasons.length - 1];
                return { ppg: last.ppg, apg: last.apg, rpg: last.rpg };
            }
            return stats;
        }

        document.body.addEventListener('mouseover', function(e) {
            var el = e.target.closest('a[href*="player.html?id="]');
            if (el) {
                var id = getIdFromHref(el.getAttribute('href'), 'player.html');
                var p = id ? getPlayerById(id) : null;
                var html = playerTipHtml(p);
                if (html) { showTip(html, e); return; }
            }
            el = e.target.closest('a[href*="team.html?id="]');
            if (el) {
                var id = getIdFromHref(el.getAttribute('href'), 'team.html');
                var t = id ? getTeamById(id) : null;
                var html = teamTipHtml(t);
                if (html) { showTip(html, e); return; }
            }
            el = e.target.closest('.league-badge');
            if (el) {
                var html = leagueTipHtml(el);
                if (html) { showTip(html, e); return; }
            }
            hideTip();
        });

        document.body.addEventListener('mousemove', function(e) {
            if (tip.style.display !== 'none') positionTip(e);
        });

        document.body.addEventListener('mouseout', function(e) {
            if (e.target.closest('a[href*="player.html"], a[href*="team.html"], .league-badge')) {
                var related = e.relatedTarget;
                if (!related || (!related.closest('a[href*="player.html"]') && !related.closest('a[href*="team.html"]') && !related.closest('.league-badge'))) {
                    hideTip();
                }
            }
        });
    }
    window.initGlobalTooltips = initGlobalTooltips;

    // --- Simple Markdown renderer ---
    function renderMarkdown(md) {
        if (!md) return '';
        var html = md
            .replace(/^### (.+)$/gm, '<h3>$1</h3>')
            .replace(/^## (.+)$/gm, '<h2>$1</h2>')
            .replace(/^# (.+)$/gm, '<h1>$1</h1>')
            .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
            .replace(/\*(.+?)\*/g, '<i>$1</i>')
            .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
            .replace(/^- (.+)$/gm, '<li>$1</li>')
            .replace(/\n\n/g, '</p><p>')
            .replace(/\n/g, '<br>');
        return '<p>' + html + '</p>';
    }
    window.renderMarkdown = renderMarkdown;

    // --- Currency formatter ---
    function formatCurrency(val) {
        if (!val) return '-';
        var n = Number(val);
        if (isNaN(n)) return '-';
        if (n >= 1000000) return '$' + (n / 1000000).toFixed(1) + 'M';
        if (n >= 1000) return '$' + (n / 1000).toFixed(0) + 'K';
        return '$' + n;
    }
    window.formatCurrency = formatCurrency;

    function getTeamById(id) {
        for (var i = 0; i < DATA.teams.length; i++) {
            if (DATA.teams[i].id === id) return DATA.teams[i];
        }
        return null;
    }

    function getPlayerById(id) {
        for (var i = 0; i < DATA.players.length; i++) {
            if (DATA.players[i].id === id) return DATA.players[i];
        }
        return null;
    }

    function getPlayerTeam(player) {
        if (player.career && player.career.pro && player.career.pro.length > 0) {
            var last = player.career.pro[player.career.pro.length - 1];
            if (last.team_id) return getTeamById(last.team_id);
        }
        if (player.career && player.career.college && player.career.college.school) {
            var collegeName = player.career.college.school.toLowerCase().replace(/\s+/g, '_');
            for (var i = 0; i < DATA.teams.length; i++) {
                if (DATA.teams[i].id.indexOf(collegeName) !== -1 || DATA.teams[i].name.toLowerCase().indexOf(player.career.college.school.toLowerCase()) !== -1) {
                    return DATA.teams[i];
                }
            }
        }
        return null;
    }

    function getPlayerCurrentTeamId(player) {
        if (player.career && player.career.pro && player.career.pro.length > 0) {
            return player.career.pro[player.career.pro.length - 1].team_id;
        }
        if (player.career && player.career.college && player.career.college.school) {
            var collegeName = player.career.college.school.toLowerCase().replace(/\s+/g, '_');
            for (var i = 0; i < DATA.teams.length; i++) {
                if (DATA.teams[i].id.indexOf(collegeName) !== -1 || DATA.teams[i].name.toLowerCase().indexOf(player.career.college.school.toLowerCase()) !== -1) {
                    return DATA.teams[i].id;
                }
            }
        }
        return null;
    }

    // --- Check if item is recently updated (within 7 days) ---
    function isRecent(dateStr) {
        if (!dateStr) return false;
        var d = new Date(dateStr);
        var now = new Date();
        var diff = now - d;
        return diff < 7 * 24 * 60 * 60 * 1000;
    }
    window.isRecent = isRecent;

    // --- Calculate age from birthdate ---
    function calculateAge(birthdate) {
        if (!birthdate) return null;
        var bd = new Date(birthdate);
        var now = new Date();
        var age = now.getFullYear() - bd.getFullYear();
        var m = now.getMonth() - bd.getMonth();
        if (m < 0 || (m === 0 && now.getDate() < bd.getDate())) age--;
        return age;
    }
    window.calculateAge = calculateAge;

    // --- Relative time ---
    function relativeTime(dateStr) {
        if (!dateStr) return '';
        var d = new Date(dateStr);
        var now = new Date();
        var diff = now - d;
        var mins = Math.floor(diff / 60000);
        if (mins < 60) return mins + 'm ago';
        var hours = Math.floor(mins / 60);
        if (hours < 24) return hours + 'h ago';
        var days = Math.floor(hours / 24);
        if (days < 30) return days + 'd ago';
        return Math.floor(days / 30) + 'mo ago';
    }
    window.relativeTime = relativeTime;

    // --- Modal System ---
    function openModal(title, html, width) {
        closeModal();
        var overlay = document.createElement('div');
        overlay.id = 'modal-overlay';
        overlay.className = 'modal-overlay';
        overlay.onclick = function(e) { if (e.target === overlay) closeModal(); };

        var modal = document.createElement('div');
        modal.className = 'modal-dialog';
        if (width) modal.style.maxWidth = width;

        var header = '<div class="modal-header"><h3>' + title + '</h3><button class="modal-close" onclick="closeModal()">&times;</button></div>';
        modal.innerHTML = header + '<div class="modal-body">' + html + '</div>';

        overlay.appendChild(modal);
        document.body.appendChild(overlay);
        document.body.style.overflow = 'hidden';
        return modal;
    }

    function closeModal() {
        var existing = document.getElementById('modal-overlay');
        if (existing) existing.remove();
        document.body.style.overflow = '';
    }
    window.openModal = openModal;
    window.closeModal = closeModal;

    // --- Player Modal Editor ---
    function openPlayerEditor(player) {
        var isEdit = !!player;
        var isFic = isEdit ? player.is_fictional : true;
        var p = player || {};

        var html = '<form id="player-form" onsubmit="return false;">';
        html += '<input type="hidden" id="pf-is-fic" value="' + (isFic ? '1' : '0') + '">';
        html += '<div class="form-row"><label>Name</label><input type="text" id="pf-name" value="' + esc(p.name || '') + '" required></div>';
        html += '<div class="form-row"><label>Position</label><select id="pf-pos">';
        ['PG','SG','SF','PF','C'].forEach(function(pos) {
            html += '<option value="' + pos + '"' + (p.position === pos ? ' selected' : '') + '>' + pos + '</option>';
        });
        html += '</select></div>';
        html += '<div class="form-row"><label>Height</label><input type="text" id="pf-height" value="' + esc(p.height || '') + '" placeholder="6\'2&quot;"></div>';
        html += '<div class="form-row"><label>Weight</label><input type="number" id="pf-weight" value="' + (p.weight || '') + '"></div>';
        html += '<div class="form-row"><label>Overall</label><input type="number" id="pf-ovr" value="' + (p.overall || 70) + '" min="1" max="99"></div>';
        html += '<div class="form-row"><label>Archetype</label><input type="text" id="pf-arch" value="' + esc(p.archetype || '') + '" placeholder="All-Around"></div>';
        html += '<div class="form-row"><label>Status</label><select id="pf-status">';
        ['active','free_agent','injured','retired','redshirt'].forEach(function(s) {
            html += '<option value="' + s + '"' + (p.status === s ? ' selected' : '') + '>' + s + '</option>';
        });
        html += '</select></div>';
        html += '<div class="form-row"><label>Nationality</label><input type="text" id="pf-nat" value="' + esc(p.nationality || '') + '"></div>';

        if (isFic) {
            html += '<div class="form-row"><label>Avatar URL</label><input type="text" id="pf-avatar" value="' + esc(p.avatar_url || '') + '"></div>';
            html += '<div class="form-row"><label>Notes</label><textarea id="pf-notes" rows="3">' + esc(p.notes || '') + '</textarea></div>';
        } else {
            html += '<div class="form-row"><label>Team ID</label><input type="text" id="pf-team" value="' + esc(p.team_id || '') + '"></div>';
            html += '<div class="form-row"><label>Bio</label><textarea id="pf-bio" rows="3">' + esc(p.bio || '') + '</textarea></div>';
        }

        html += '<div class="form-row"><label><input type="checkbox" id="pf-fic-check"' + (isFic ? ' checked' : '') + ' onclick="document.getElementById(\'pf-is-fic\').value=this.checked?\'1\':\'0\'"> Fictional Player (full career tracking)</label></div>';

        html += '<div class="form-actions"><button type="button" class="btn-primary" onclick="savePlayerForm(' + (isEdit ? "'" + p.id + "'" : 'null') + ')">Save</button> <button type="button" class="btn-secondary" onclick="closeModal()">Cancel</button></div>';
        html += '</form>';

        openModal((isEdit ? 'Edit' : 'Add') + ' Player', html, '500px');
    }

    function savePlayerForm(editId) {
        var isFic = document.getElementById('pf-is-fic').value === '1';
        var body = {
            name: document.getElementById('pf-name').value.trim(),
            position: document.getElementById('pf-pos').value,
            height: document.getElementById('pf-height').value,
            weight: parseInt(document.getElementById('pf-weight').value) || 0,
            overall: parseInt(document.getElementById('pf-ovr').value) || 70,
            archetype: document.getElementById('pf-arch').value,
            status: document.getElementById('pf-status').value,
            nationality: document.getElementById('pf-nat').value,
            is_fictional: isFic
        };

        if (isFic) {
            body.avatar_url = document.getElementById('pf-avatar').value;
            body.notes = document.getElementById('pf-notes').value;
        } else {
            body.team_id = document.getElementById('pf-team').value;
            body.bio = document.getElementById('pf-bio').value;
        }

        if (!body.name) { showToast('Name is required', 'error'); return; }

        var url = editId ? 'api/players/' + editId : 'api/players';
        var method = editId ? 'PUT' : 'POST';
        saveAndRefresh(url, method, body, 'Player saved');
    }
    window.savePlayerForm = savePlayerForm;

    // --- Team Modal Editor ---
    function openTeamEditor(team) {
        var isEdit = !!team;
        var t = team || {};
        var staff = t.staff || {};

        var html = '<form id="team-form" onsubmit="return false;">';
        html += '<div class="form-row"><label>Name</label><input type="text" id="tf-name" value="' + esc(t.name || '') + '" required></div>';
        html += '<div class="form-row"><label>Abbreviation</label><input type="text" id="tf-abbr" value="' + esc(t.abbreviation || '') + '" maxlength="6"></div>';
        html += '<div class="form-row"><label>League</label><input type="text" id="tf-league" value="' + esc(t.league || '') + '"></div>';
        html += '<div class="form-row"><label>Conference</label><input type="text" id="tf-conf" value="' + esc(t.conference || '') + '"></div>';
        html += '<div class="form-row"><label>Division</label><input type="text" id="tf-div" value="' + esc(t.division || '') + '"></div>';
        html += '<div class="form-row"><label>City</label><input type="text" id="tf-city" value="' + esc(t.city || '') + '"></div>';
        html += '<div class="form-row"><label>Arena</label><input type="text" id="tf-arena" value="' + esc(t.arena || '') + '"></div>';
        html += '<div class="form-row"><label>Head Coach</label><input type="text" id="tf-coach" value="' + esc(staff.head_coach || '') + '"></div>';
        html += '<div class="form-row"><label>GM</label><input type="text" id="tf-gm" value="' + esc(staff.gm || '') + '"></div>';
        html += '<div class="form-actions"><button type="button" class="btn-primary" onclick="saveTeamForm(' + (isEdit ? "'" + t.id + "'" : 'null') + ')">Save</button> <button type="button" class="btn-secondary" onclick="closeModal()">Cancel</button></div>';
        html += '</form>';

        openModal((isEdit ? 'Edit' : 'Add') + ' Team', html, '450px');
    }

    function saveTeamForm(editId) {
        var body = {
            name: document.getElementById('tf-name').value.trim(),
            abbreviation: document.getElementById('tf-abbr').value,
            league: document.getElementById('tf-league').value,
            conference: document.getElementById('tf-conf').value,
            division: document.getElementById('tf-div').value,
            city: document.getElementById('tf-city').value,
            arena: document.getElementById('tf-arena').value,
            head_coach: document.getElementById('tf-coach').value,
            gm: document.getElementById('tf-gm').value
        };

        if (!body.name) { showToast('Name is required', 'error'); return; }

        var url = editId ? 'api/teams/' + editId : 'api/teams';
        var method = editId ? 'PUT' : 'POST';
        saveAndRefresh(url, method, body, 'Team saved');
    }
    window.saveTeamForm = saveTeamForm;

    function deletePlayer(id) {
        confirmAndDelete('player', 'api/players/' + id);
    }

    function deleteTeam(id) {
        confirmAndDelete('team', 'api/teams/' + id);
    }

    // --- Exposed globals ---
    window.openPlayerEditor = openPlayerEditor;
    window.openTeamEditor = openTeamEditor;
    window.deletePlayer = deletePlayer;
    window.deleteTeam = deleteTeam;
    window.getTeamById = getTeamById;
    window.getPlayerById = getPlayerById;
    window.getPlayerTeam = getPlayerTeam;
    window.loadAllData = loadAllData;

    function esc(s) { return String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
    window.esc = esc;

    function toggleEditMode() {
        EDIT_MODE = !EDIT_MODE;
        var btn = document.getElementById('edit-toggle-btn');
        if (btn) {
            btn.className = 'edit-toggle-switch' + (EDIT_MODE ? ' active' : '');
            var icon = document.getElementById('edit-icon');
            if (icon) icon.textContent = EDIT_MODE ? 'EXIT EDIT' : 'EDIT';
        }
        // Show/hide edit mode banner
        var banner = document.getElementById('edit-mode-banner');
        if (banner) banner.className = 'edit-mode-banner' + (EDIT_MODE ? ' visible' : '');
        // Toggle body class for CSS edit highlighting
        if (EDIT_MODE) {
            document.body.classList.add('edit-mode');
        } else {
            document.body.classList.remove('edit-mode');
        }
        // Show/hide edit column headers
        var editHeaders = document.querySelectorAll('#edit-col-header');
        for (var i = 0; i < editHeaders.length; i++) editHeaders[i].style.display = EDIT_MODE ? '' : 'none';
        var addBtns = document.querySelectorAll('#add-player-btn, #add-team-btn, .add-btn');
        for (var i = 0; i < addBtns.length; i++) addBtns[i].style.display = EDIT_MODE ? '' : 'none';
        // Show/hide bulk bars
        var bulkBars = document.querySelectorAll('.bulk-bar');
        for (var i = 0; i < bulkBars.length; i++) bulkBars[i].className = 'bulk-bar' + (EDIT_MODE ? ' visible' : '');
        refreshCurrentPage();
    }
    window.toggleEditMode = toggleEditMode;

    function refreshCurrentPage() {
        var path = window.location.pathname;
        if (path.indexOf('players.html') !== -1 && typeof renderPlayerList === 'function') renderPlayerList();
        else if (path.indexOf('player.html') !== -1) {
            var params = new URLSearchParams(window.location.search);
            var id = params.get('id');
            if (id && typeof renderPlayerProfile === 'function') renderPlayerProfile(id);
        }
        else if (path.indexOf('teams.html') !== -1 && typeof renderTeamList === 'function') renderTeamList();
        else if (path.indexOf('team.html') !== -1) {
            var params = new URLSearchParams(window.location.search);
            var id = params.get('id');
            if (id && typeof renderTeamPage === 'function') renderTeamPage(id);
        }
        else if (path.indexOf('drafts.html') !== -1 && typeof renderDrafts === 'function') renderDrafts();
        else if (path.indexOf('leagues.html') !== -1 && typeof renderStandings === 'function') renderStandings();
        else if (path.indexOf('schedule.html') !== -1 && typeof renderSchedule === 'function') renderSchedule();
        else if (path.indexOf('injuries.html') !== -1 && typeof renderInjuryReport === 'function') renderInjuryReport();
        else if (path.indexOf('transactions.html') !== -1 && typeof renderTransactionFeed === 'function') renderTransactionFeed();
        else if (path.indexOf('awards.html') !== -1 && typeof renderAwards === 'function') renderAwards();
        else if (path.indexOf('mockdraft.html') !== -1 && typeof renderMockDraft === 'function') renderMockDraft();
        else if (path.indexOf('index.html') !== -1 || path === '/') {
            if (typeof renderLeagueHub === 'function') renderLeagueHub();
            if (typeof renderFictionalList === 'function') renderFictionalList();
        }
    }
    window.refreshCurrentPage = refreshCurrentPage;

    Object.defineProperty(window, 'EDIT_MODE', { get: function() { return EDIT_MODE; } });

    // === Chart.js dark mode integration ===
    function getChartDefaults() {
        var light = isLightMode();
        return {
            responsive: false,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { ticks: { color: light ? '#666' : '#808080', font: { family: '"Lucida Console", monospace', size: 7 } }, grid: { color: light ? '#CCC' : '#2A2A2A' } },
                y: { ticks: { color: light ? '#666' : '#808080', font: { family: '"Lucida Console", monospace', size: 7 } }, grid: { color: light ? '#CCC' : '#2A2A2A' } }
            }
        };
    }
    window.getChartDefaults = getChartDefaults;

    // === Player Tab Navigation ===
    function setupPlayerTabs() {
        var tabBar = document.getElementById('player-tab-bar');
        if (!tabBar) return;
        var tabs = tabBar.querySelectorAll('a[data-tab]');
        for (var i = 0; i < tabs.length; i++) {
            tabs[i].addEventListener('click', function(e) {
                e.preventDefault();
                var target = this.getAttribute('data-tab');
                // Deactivate all
                var allTabs = tabBar.querySelectorAll('a[data-tab]');
                for (var j = 0; j < allTabs.length; j++) allTabs[j].classList.remove('active');
                var allContent = document.querySelectorAll('.player-tab-content');
                for (var j = 0; j < allContent.length; j++) allContent[j].classList.remove('active');
                // Activate selected
                this.classList.add('active');
                var el = document.getElementById('tab-' + target);
                if (el) el.classList.add('active');
                // Update URL hash
                window.location.hash = target;
            });
        }
        // Activate from hash
        var hash = window.location.hash.replace('#', '');
        if (hash) {
            var tab = tabBar.querySelector('a[data-tab="' + hash + '"]');
            if (tab) { tab.click(); return; }
        }
        // Default to first tab
        if (tabs.length > 0) tabs[0].click();
    }
    window.setupPlayerTabs = setupPlayerTabs;

    // === SHARED EDITOR INFRASTRUCTURE ===

    // --- Toast Notification System ---
    function showToast(message, type) {
        type = type || 'success';
        var container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            container.className = 'toast-container';
            document.body.appendChild(container);
        }
        var toast = document.createElement('div');
        toast.className = 'toast toast-' + type;
        toast.textContent = message;
        container.appendChild(toast);
        setTimeout(function() { toast.classList.add('toast-visible'); }, 10);
        setTimeout(function() {
            toast.classList.remove('toast-visible');
            setTimeout(function() { toast.remove(); }, 300);
        }, 3000);
    }
    window.showToast = showToast;

    // --- API Helper with auto-auth ---
    var _authHeader = 'Basic ' + btoa('admin:madcap');
    function apiCall(url, method, body) {
        var opts = {
            method: method || 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': _authHeader
            }
        };
        if (body && method !== 'GET') opts.body = JSON.stringify(body);
        return fetch(url, opts).then(function(r) {
            if (r.status === 401) {
                showToast('Authentication failed', 'error');
                throw new Error('Unauthorized');
            }
            if (!r.ok) return r.json().then(function(e) { throw new Error(e.error || 'Request failed'); });
            return r.json();
        });
    }
    window.apiCall = apiCall;

    // --- Form Building Helpers ---
    function formRow(label, inputHtml) {
        return '<div class="form-row"><label>' + label + '</label>' + inputHtml + '</div>';
    }
    window.formRow = formRow;

    function formInput(id, value, opts) {
        opts = opts || {};
        var type = opts.type || 'text';
        var placeholder = opts.placeholder || '';
        var extra = opts.required ? ' required' : '';
        if (opts.min !== undefined) extra += ' min="' + opts.min + '"';
        if (opts.max !== undefined) extra += ' max="' + opts.max + '"';
        if (opts.step !== undefined) extra += ' step="' + opts.step + '"';
        if (opts.maxlength) extra += ' maxlength="' + opts.maxlength + '"';
        return '<input type="' + type + '" id="' + id + '" value="' + esc(String(value != null ? value : '')) + '" placeholder="' + esc(placeholder) + '"' + extra + '>';
    }
    window.formInput = formInput;

    function formSelect(id, options, selected) {
        var html = '<select id="' + id + '">';
        for (var i = 0; i < options.length; i++) {
            var opt = options[i];
            var val = typeof opt === 'object' ? opt.value : opt;
            var label = typeof opt === 'object' ? opt.label : opt;
            html += '<option value="' + esc(String(val)) + '"' + (String(val) === String(selected) ? ' selected' : '') + '>' + esc(String(label)) + '</option>';
        }
        html += '</select>';
        return html;
    }
    window.formSelect = formSelect;

    function formTextarea(id, value, rows) {
        return '<textarea id="' + id + '" rows="' + (rows || 4) + '">' + esc(value || '') + '</textarea>';
    }
    window.formTextarea = formTextarea;

    function formNumber(id, value, min, max, step) {
        var extra = '';
        if (min !== undefined) extra += ' min="' + min + '"';
        if (max !== undefined) extra += ' max="' + max + '"';
        if (step !== undefined) extra += ' step="' + step + '"';
        return '<input type="number" id="' + id + '" value="' + (value != null ? value : '') + '"' + extra + '>';
    }
    window.formNumber = formNumber;

    function formSlider(id, value, min, max, labelText) {
        min = min || 0;
        max = max || 99;
        value = value || 0;
        return '<div class="slider-row"><span class="slider-label">' + esc(labelText || id) + '</span>' +
            '<input type="range" id="' + id + '" min="' + min + '" max="' + max + '" value="' + value + '" ' +
            'oninput="document.getElementById(\'' + id + '-val\').textContent=this.value">' +
            '<span class="slider-value" id="' + id + '-val">' + value + '</span></div>';
    }
    window.formSlider = formSlider;

    // --- Image Upload Widget ---
    function imageUploadWidget(id, currentUrl, category) {
        var previewStyle = currentUrl ? '' : 'display:none;';
        var previewSrc = currentUrl || '';
        var html = '<div class="image-upload-widget" id="' + id + '-widget">';
        html += '<div class="image-preview" id="' + id + '-preview" style="' + previewStyle + '">';
        if (previewSrc) html += '<img src="' + esc(previewSrc) + '" alt="preview">';
        html += '</div>';
        html += '<input type="hidden" id="' + id + '" value="' + esc(currentUrl || '') + '">';
        html += '<div class="image-upload-controls">';
        html += '<input type="file" id="' + id + '-file" accept="image/*" style="font-size:8px;max-width:180px;" onchange="handleImageUpload(\'' + id + '\',\'' + esc(category || '') + '\')">';
        html += '<span class="gensmall" id="' + id + '-status"></span>';
        html += '</div>';
        html += '<div class="image-url-row" style="margin-top:3px;">';
        html += '<input type="text" id="' + id + '-url" value="' + esc(currentUrl || '') + '" placeholder="Or paste image URL" style="font-size:8px;flex:1;" onchange="setImageFromUrl(\'' + id + '\')">';
        html += '</div>';
        html += '</div>';
        return html;
    }
    window.imageUploadWidget = imageUploadWidget;

    function handleImageUpload(id, category) {
        var fileInput = document.getElementById(id + '-file');
        var statusEl = document.getElementById(id + '-status');
        if (!fileInput || !fileInput.files || !fileInput.files[0]) return;

        var file = fileInput.files[0];
        if (file.size > 2 * 1024 * 1024) {
            showToast('Image too large. Max 2MB.', 'error');
            return;
        }

        statusEl.textContent = 'Uploading...';
        var formData = new FormData();
        formData.append('file', file);
        if (category) formData.append('category', category);

        fetch('api/upload', {
            method: 'POST',
            body: formData
        }).then(function(r) {
            if (!r.ok) return r.json().then(function(e) { throw new Error(e.error || 'Upload failed'); });
            return r.json();
        }).then(function(data) {
            document.getElementById(id).value = data.url;
            document.getElementById(id + '-url').value = data.url;
            var preview = document.getElementById(id + '-preview');
            preview.innerHTML = '<img src="' + data.url + '" alt="preview">';
            preview.style.display = '';
            statusEl.textContent = 'Uploaded';
            showToast('Image uploaded', 'success');
        }).catch(function(err) {
            statusEl.textContent = 'Failed';
            showToast('Upload error: ' + err.message, 'error');
        });
    }
    window.handleImageUpload = handleImageUpload;

    function setImageFromUrl(id) {
        var url = document.getElementById(id + '-url').value.trim();
        document.getElementById(id).value = url;
        var preview = document.getElementById(id + '-preview');
        if (url) {
            preview.innerHTML = '<img src="' + url + '" alt="preview">';
            preview.style.display = '';
        } else {
            preview.style.display = 'none';
        }
    }
    window.setImageFromUrl = setImageFromUrl;

    // --- Team Picker Dropdown ---
    function teamSelectOptions(selectedId) {
        var opts = [{ value: '', label: '-- None --' }];
        for (var i = 0; i < DATA.teams.length; i++) {
            var t = DATA.teams[i];
            opts.push({ value: t.id, label: t.abbreviation + ' - ' + t.name });
        }
        return formSelect('tf-team-pick', opts, selectedId || '');
    }
    window.teamSelectOptions = teamSelectOptions;

    function teamSelectOptionsWithId(id, selectedId) {
        var opts = [{ value: '', label: '-- None --' }];
        for (var i = 0; i < DATA.teams.length; i++) {
            var t = DATA.teams[i];
            opts.push({ value: t.id, label: t.abbreviation + ' - ' + t.name });
        }
        return formSelect(id, opts, selectedId || '');
    }
    window.teamSelectOptionsWithId = teamSelectOptionsWithId;

    // --- Player Picker Dropdown ---
    function playerSelectOptions(id, selectedId) {
        var opts = [{ value: '', label: '-- None --' }];
        for (var i = 0; i < DATA.players.length; i++) {
            var p = DATA.players[i];
            opts.push({ value: p.id, label: p.name + ' (' + (p.position || '?') + ')' });
        }
        return formSelect(id, opts, selectedId || '');
    }
    window.playerSelectOptions = playerSelectOptions;

    // --- Editable Section Header ---
    function editSectionHeader(title, editOnclick, colspan) {
        var html = '<tr><th class="catHead" colspan="' + (colspan || 2) + '">' + title;
        if (EDIT_MODE && editOnclick) {
            html += ' <a href="#" onclick="' + editOnclick + ';return false;" class="edit-btn" style="display:inline !important;color:var(--link-color);">[edit]</a>';
        }
        html += '</th></tr>';
        return html;
    }
    window.editSectionHeader = editSectionHeader;

    // --- Add Row Button ---
    function addRowButton(label, onclick, colspan) {
        if (!EDIT_MODE) return '';
        return '<tr class="row1"><td colspan="' + (colspan || 2) + '" class="tCenter">' +
            '<a href="#" onclick="' + onclick + ';return false;" class="add-btn" style="display:inline;">[+ ' + label + ']</a>' +
            '</td></tr>';
    }
    window.addRowButton = addRowButton;

    // --- Edit/Delete Action Cell ---
    function editDeleteCell(editOnclick, deleteOnclick) {
        if (!EDIT_MODE) return '';
        return '<td class="tCenter gensmall" style="white-space:nowrap;">' +
            '<a href="#" onclick="' + editOnclick + ';return false;" class="gensmall">[edit]</a> ' +
            '<a href="#" onclick="' + deleteOnclick + ';return false;" class="gensmall" style="color:var(--accent-red);">[del]</a>' +
            '</td>';
    }
    window.editDeleteCell = editDeleteCell;

    // --- Custom Confirm Dialog ---
    function showConfirm(message, onConfirm) {
        var html = '<div style="padding:8px 4px;text-align:center;">';
        html += '<div style="font-size:11px;margin-bottom:12px;color:var(--text-color);">' + message + '</div>';
        html += '<div class="form-actions" style="text-align:center;border:none;margin:0;padding:0;">';
        html += '<button type="button" class="btn-danger" id="confirm-yes-btn" style="margin-right:8px;">Delete</button>';
        html += '<button type="button" class="btn-secondary" onclick="closeModal()">Cancel</button>';
        html += '</div></div>';
        var modal = openModal('Confirm', html, '320px');
        var yesBtn = document.getElementById('confirm-yes-btn');
        if (yesBtn) {
            yesBtn.onclick = function() {
                closeModal();
                if (onConfirm) onConfirm();
            };
        }
    }
    window.showConfirm = showConfirm;

    // --- Confirm Delete Helper ---
    function confirmAndDelete(entityName, url, callback) {
        showConfirm('Delete this ' + entityName + '? This cannot be undone.', function() {
            apiCall(url, 'DELETE').then(function() {
                showToast(entityName + ' deleted', 'success');
                if (callback) callback();
                else loadAllData().then(refreshCurrentPage);
            }).catch(function(err) {
                showToast('Error: ' + err.message, 'error');
            });
        });
    }
    window.confirmAndDelete = confirmAndDelete;

    // --- Save and Refresh Helper ---
    function saveAndRefresh(url, method, body, successMsg) {
        return apiCall(url, method, body).then(function() {
            closeModal();
            showToast(successMsg || 'Saved', 'success');
            return loadAllData().then(refreshCurrentPage);
        }).catch(function(err) {
            showToast('Error: ' + err.message, 'error');
        });
    }
    window.saveAndRefresh = saveAndRefresh;

    // --- Keyboard shortcuts ---
    document.addEventListener('keydown', function(e) {
        // Escape to close modal
        if (e.key === 'Escape') closeModal();
        // Ctrl+S to save active form
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            var modal = document.getElementById('modal-overlay');
            if (modal) {
                e.preventDefault();
                var saveBtn = modal.querySelector('.btn-primary');
                if (saveBtn) saveBtn.click();
            }
        }
    });

    // === Initialize common elements on DOMContentLoaded ===
    document.addEventListener('DOMContentLoaded', function() {
        renderNav();
        renderTopBar();
        applyDarkMode();
        // Add edit mode banner
        var banner = document.createElement('div');
        banner.id = 'edit-mode-banner';
        banner.className = 'edit-mode-banner';
        banner.textContent = '--- EDIT MODE ACTIVE --- Click fields to modify --- EDIT MODE ACTIVE ---';
        var container = document.getElementById('body-container');
        if (container) container.insertBefore(banner, container.firstChild.nextSibling);
    });
})();
