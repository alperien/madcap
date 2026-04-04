(function() {
    'use strict';

    // Encapsulated state (#43, #44)
    var DATA = { players: [], teams: [], leagues: [], games: [], drafts: [], events: [] };
    var EDIT_MODE = false;

    // Expose to global scope for inline handlers
    window.DATA = DATA;

    function loadJSON(url) {
        return fetch(url).then(function(r) {
            if (!r.ok) {
                throw new Error('HTTP ' + r.status + ' fetching ' + url);
            }
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
        return null;
    }

    function getPlayerCurrentTeamId(player) {
        if (player.career && player.career.pro && player.career.pro.length > 0) {
            return player.career.pro[player.career.pro.length - 1].team_id;
        }
        return null;
    }

    function pctStr(v) {
        if (v === null || v === undefined) return '-';
        return (v * 100).toFixed(1);
    }

    function numStr(v) {
        if (v === null || v === undefined) return '-';
        return v.toFixed(1);
    }

    function toggleEditMode() {
        EDIT_MODE = !EDIT_MODE;
        var btn = document.getElementById('edit-toggle-btn');
        if (btn) {
            btn.textContent = EDIT_MODE ? 'Exit Edit' : 'Edit';
            btn.style.color = EDIT_MODE ? '#CC0000' : '#0066CC';
        }
        var badge = document.getElementById('edit-badge');
        if (badge) badge.style.display = EDIT_MODE ? 'inline' : 'none';

        // Show/hide edit columns
        var editHeaders = document.querySelectorAll('#edit-col-header');
        for (var i = 0; i < editHeaders.length; i++) {
            editHeaders[i].style.display = EDIT_MODE ? '' : 'none';
        }

        // Show/hide add buttons
        var addBtns = document.querySelectorAll('#add-player-btn, #add-team-btn');
        for (var i = 0; i < addBtns.length; i++) {
            addBtns[i].style.display = EDIT_MODE ? '' : 'none';
        }

        refreshCurrentPage();
    }

    function refreshCurrentPage() {
        var path = window.location.pathname;
        if (path.indexOf('players.html') !== -1) {
            if (typeof renderPlayerList === 'function') renderPlayerList();
        } else if (path.indexOf('player.html') !== -1) {
            var params = new URLSearchParams(window.location.search);
            var id = params.get('id');
            if (id && typeof renderPlayerProfile === 'function') renderPlayerProfile(id);
        } else if (path.indexOf('teams.html') !== -1) {
            if (typeof renderTeamList === 'function') renderTeamList();
        } else if (path.indexOf('team.html') !== -1) {
            var params = new URLSearchParams(window.location.search);
            var id = params.get('id');
            if (id && typeof renderTeamPage === 'function') renderTeamPage(id);
        } else if (path.indexOf('drafts.html') !== -1) {
            if (typeof renderDrafts === 'function') renderDrafts();
        } else if (path.indexOf('leagues.html') !== -1) {
            if (typeof renderStandings === 'function') renderStandings();
        } else if (path.indexOf('schedule.html') !== -1) {
            if (typeof renderSchedule === 'function') renderSchedule();
        } else if (path.indexOf('index.html') !== -1 || path === '/') {
            if (typeof renderLeagueHub === 'function') renderLeagueHub();
            if (typeof renderFictionalList === 'function') renderFictionalList();
        }
    }

    function apiPut(url, data) {
        return fetch(url, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        }).then(function(r) {
            if (!r.ok) throw new Error('PUT failed: ' + r.status);
            return r.json();
        });
    }

    function apiPost(url, data) {
        return fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        }).then(function(r) {
            if (!r.ok) throw new Error('POST failed: ' + r.status);
            return r.json();
        });
    }

    function apiDelete(url) {
        return fetch(url, { method: 'DELETE' }).then(function(r) {
            if (!r.ok) throw new Error('DELETE failed: ' + r.status);
            return r.json();
        });
    }

    function editPlayerInline(player) {
        var name = prompt('Name:', player.name);
        if (name === null) return;
        var pos = prompt('Position (PG/SG/SF/PF/C):', player.position);
        if (pos === null) return;
        var ovr = prompt('Overall:', player.overall);
        if (ovr === null) return;
        var arch = prompt('Archetype:', player.archetype);
        if (arch === null) return;
        var status = prompt('Status (active/free_agent/injured/retired):', player.status);
        if (status === null) return;
        var fic = confirm('Is fictional?');
        var notes = prompt('Scouting notes:', player.notes || '');
        if (notes === null) return;
        apiPut('api/players/' + player.id, {
            name: name, position: pos, overall: parseInt(ovr),
            archetype: arch, status: status, is_fictional: fic, notes: notes
        }).then(function() {
            loadAllData().then(refreshCurrentPage);
        }).catch(function(err) {
            alert('Failed to update player: ' + err.message);
        });
    }

    function addPlayer() {
        var name = prompt('Player name:');
        if (!name) return;
        var pos = prompt('Position (PG/SG/SF/PF/C):', 'PG');
        var ovr = prompt('Overall:', '70');
        var arch = prompt('Archetype:', 'All-Around');
        var fic = confirm('Is fictional?');
        apiPost('api/players', {
            name: name, position: pos, overall: parseInt(ovr),
            archetype: arch, is_fictional: fic
        }).then(function() {
            loadAllData().then(refreshCurrentPage);
        }).catch(function(err) {
            alert('Failed to create player: ' + err.message);
        });
    }

    function deletePlayer(id) {
        if (!confirm('Delete this player?')) return;
        apiDelete('api/players/' + id).then(function() {
            loadAllData().then(refreshCurrentPage);
        }).catch(function(err) {
            alert('Failed to delete player: ' + err.message);
        });
    }

    function editTeamInline(team) {
        var name = prompt('Team name:', team.name);
        if (name === null) return;
        var abbr = prompt('Abbreviation:', team.abbreviation);
        if (abbr === null) return;
        var coach = prompt('Head coach:', team.staff ? team.staff.head_coach : '');
        if (coach === null) return;
        var gm = prompt('GM:', team.staff ? team.staff.gm : '');
        if (gm === null) return;
        apiPut('api/teams/' + team.id, {
            name: name, abbreviation: abbr, head_coach: coach, gm: gm
        }).then(function() {
            loadAllData().then(refreshCurrentPage);
        }).catch(function(err) {
            alert('Failed to update team: ' + err.message);
        });
    }

    function addTeam() {
        var name = prompt('Team name:');
        if (!name) return;
        var abbr = prompt('Abbreviation (3 letters):', 'XXX');
        var league = prompt('League:', 'NBA');
        apiPost('api/teams', {
            name: name, abbreviation: abbr, league: league
        }).then(function() {
            loadAllData().then(refreshCurrentPage);
        }).catch(function(err) {
            alert('Failed to create team: ' + err.message);
        });
    }

    function deleteTeam(id) {
        if (!confirm('Delete this team?')) return;
        apiDelete('api/teams/' + id).then(function() {
            loadAllData().then(refreshCurrentPage);
        }).catch(function(err) {
            alert('Failed to delete team: ' + err.message);
        });
    }

    // Expose functions globally for inline handlers
    window.toggleEditMode = toggleEditMode;
    window.editPlayerInline = editPlayerInline;
    window.addPlayer = addPlayer;
    window.deletePlayer = deletePlayer;
    window.editTeamInline = editTeamInline;
    window.addTeam = addTeam;
    window.deleteTeam = deleteTeam;
    window.getTeamById = getTeamById;
    window.getPlayerById = getPlayerById;
    window.getPlayerTeam = getPlayerTeam;
    window.pctStr = pctStr;
    window.numStr = numStr;
    window.loadAllData = loadAllData;
})();
