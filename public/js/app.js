(function() {
    'use strict';

    var DATA = { players: [], teams: [], leagues: [], games: [], drafts: [], events: [] };
    var EDIT_MODE = false;

    window.DATA = DATA;

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
            loadJSON('api/events').then(function(d) { DATA.events = d; })
        ]);
    }

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

        if (!body.name) { alert('Name is required'); return; }

        var url = editId ? 'api/players/' + editId : 'api/players';
        var method = editId ? 'PUT' : 'POST';

        fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        }).then(function(r) {
            if (!r.ok) return r.json().then(function(e) { throw new Error(e.error || 'Request failed'); });
            return r.json();
        }).then(function() {
            closeModal();
            loadAllData().then(refreshCurrentPage);
        }).catch(function(err) {
            alert('Error: ' + err.message);
        });
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

        if (!body.name) { alert('Name is required'); return; }

        var url = editId ? 'api/teams/' + editId : 'api/teams';
        var method = editId ? 'PUT' : 'POST';

        fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        }).then(function(r) {
            if (!r.ok) return r.json().then(function(e) { throw new Error(e.error || 'Request failed'); });
            return r.json();
        }).then(function() {
            closeModal();
            loadAllData().then(refreshCurrentPage);
        }).catch(function(err) {
            alert('Error: ' + err.message);
        });
    }
    window.saveTeamForm = saveTeamForm;

    function deletePlayer(id) {
        if (!confirm('Delete this player?')) return;
        fetch('api/players/' + id, { method: 'DELETE' }).then(function(r) {
            if (!r.ok) throw new Error('Delete failed');
            loadAllData().then(refreshCurrentPage);
        }).catch(function(err) { alert('Error: ' + err.message); });
    }

    function deleteTeam(id) {
        if (!confirm('Delete this team?')) return;
        fetch('api/teams/' + id, { method: 'DELETE' }).then(function(r) {
            if (!r.ok) throw new Error('Delete failed');
            loadAllData().then(refreshCurrentPage);
        }).catch(function(err) { alert('Error: ' + err.message); });
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

    function toggleEditMode() {
        EDIT_MODE = !EDIT_MODE;
        var btn = document.getElementById('edit-toggle-btn');
        if (btn) {
            btn.textContent = EDIT_MODE ? 'Exit Edit' : 'Edit';
            btn.style.color = EDIT_MODE ? '#CC0000' : '#0066CC';
        }
        var editHeaders = document.querySelectorAll('#edit-col-header');
        for (var i = 0; i < editHeaders.length; i++) editHeaders[i].style.display = EDIT_MODE ? '' : 'none';
        var addBtns = document.querySelectorAll('#add-player-btn, #add-team-btn');
        for (var i = 0; i < addBtns.length; i++) addBtns[i].style.display = EDIT_MODE ? '' : 'none';
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
        else if (path.indexOf('index.html') !== -1 || path === '/') {
            if (typeof renderLeagueHub === 'function') renderLeagueHub();
            if (typeof renderFictionalList === 'function') renderFictionalList();
        }
    }
    window.refreshCurrentPage = refreshCurrentPage;

    Object.defineProperty(window, 'EDIT_MODE', { get: function() { return EDIT_MODE; } });
})();
