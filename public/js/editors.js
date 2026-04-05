// ============================================
// MADCAP Editor Functions
// All modal-based editors for player profile sections,
// team sections, and global data pages.
// Depends on: app.js (shared helpers), render.js
// ============================================
(function() {
    'use strict';

    // ============================================
    // PLAYER BIO EDITOR (Enhanced)
    // ============================================
    function openPlayerBioEditor(player) {
        var isEdit = !!player;
        var p = player || {};
        var isFic = isEdit ? p.is_fictional : true;

        var html = '<form id="player-bio-form" onsubmit="return false;">';
        html += '<input type="hidden" id="pf-is-fic" value="' + (isFic ? '1' : '0') + '">';
        html += formRow('Name', formInput('pf-name', p.name, { required: true }));
        html += formRow('Position', formSelect('pf-pos', ['PG','SG','SF','PF','C'], p.position || 'PG'));
        html += formRow('Height', formInput('pf-height', p.height, { placeholder: '6\'4"' }));
        html += formRow('Weight', formNumber('pf-weight', p.weight, 100, 400));
        html += formRow('Overall', formNumber('pf-ovr', p.overall || 70, 1, 99));
        html += formRow('Archetype', formInput('pf-arch', p.archetype, { placeholder: 'All-Around' }));
        html += formRow('Status', formSelect('pf-status', ['active','free_agent','injured','retired','redshirt'], p.status || 'active'));
        html += formRow('Birthdate', formInput('pf-birth', p.birthdate, { type: 'date' }));
        html += formRow('Nationality', formInput('pf-nat', p.nationality, { placeholder: 'USA' }));

        if (isFic) {
            html += formRow('Avatar', imageUploadWidget('pf-avatar', p.avatar_url, 'players'));
            html += formRow('Notes', formTextarea('pf-notes', p.notes, 3));
        } else {
            html += formRow('Team ID', teamSelectOptionsWithId('pf-team', p.team_id));
            html += formRow('Bio', formTextarea('pf-bio', p.bio, 3));
        }

        html += formRow('', '<label style="min-width:0"><input type="checkbox" id="pf-fic-check"' + (isFic ? ' checked' : '') + ' onclick="document.getElementById(\'pf-is-fic\').value=this.checked?\'1\':\'0\'"> Fictional Player</label>');

        html += '<div class="form-actions"><button type="button" class="btn-primary" onclick="savePlayerBio(' + (isEdit ? "'" + p.id + "'" : 'null') + ')">Save</button> <button type="button" class="btn-secondary" onclick="closeModal()">Cancel</button></div>';
        html += '</form>';

        openModal((isEdit ? 'Edit' : 'Add') + ' Player', html, '520px');
    }
    window.openPlayerBioEditor = openPlayerBioEditor;

    function savePlayerBio(editId) {
        var isFic = document.getElementById('pf-is-fic').value === '1';
        var body = {
            name: document.getElementById('pf-name').value.trim(),
            position: document.getElementById('pf-pos').value,
            height: document.getElementById('pf-height').value,
            weight: parseInt(document.getElementById('pf-weight').value) || 0,
            overall: parseInt(document.getElementById('pf-ovr').value) || 70,
            archetype: document.getElementById('pf-arch').value,
            status: document.getElementById('pf-status').value,
            birthdate: document.getElementById('pf-birth').value,
            nationality: document.getElementById('pf-nat').value,
            is_fictional: isFic
        };
        if (isFic) {
            body.avatar_url = document.getElementById('pf-avatar') ? document.getElementById('pf-avatar').value : '';
            body.notes = document.getElementById('pf-notes') ? document.getElementById('pf-notes').value : '';
        } else {
            body.team_id = document.getElementById('pf-team') ? document.getElementById('pf-team').value : '';
            body.bio = document.getElementById('pf-bio') ? document.getElementById('pf-bio').value : '';
        }
        if (!body.name) { showToast('Name is required', 'error'); return; }

        var url = editId ? 'api/players/' + editId : 'api/players';
        var method = editId ? 'PUT' : 'POST';
        saveAndRefresh(url, method, body, 'Player saved');
    }
    window.savePlayerBio = savePlayerBio;

    // ============================================
    // DRAFT INFO EDITOR
    // ============================================
    function openDraftEditor(player) {
        var d = player.draft || {};
        var html = '<form id="draft-form" onsubmit="return false;">';
        html += formRow('Year', formNumber('df-year', d.year || 2024, 1990, 2040));
        html += formRow('League', formSelect('df-league', ['NBA','NCAA','G-League','International','Other'], d.league || 'NBA'));
        html += formRow('Round', formNumber('df-round', d.round || 1, 1, 10));
        html += formRow('Pick', formNumber('df-pick', d.pick || 1, 1, 60));
        html += formRow('Team', teamSelectOptionsWithId('df-team', d.team_id));
        html += '<div class="form-actions"><button type="button" class="btn-primary" onclick="saveDraftInfo(\'' + player.id + '\')">Save</button> <button type="button" class="btn-secondary" onclick="closeModal()">Cancel</button></div>';
        html += '</form>';
        openModal('Edit Draft Info', html, '420px');
    }
    window.openDraftEditor = openDraftEditor;

    function saveDraftInfo(playerId) {
        var body = {
            year: parseInt(document.getElementById('df-year').value) || 2024,
            league: document.getElementById('df-league').value,
            round: parseInt(document.getElementById('df-round').value) || 1,
            pick: parseInt(document.getElementById('df-pick').value) || 1,
            team_id: document.getElementById('df-team').value
        };
        saveAndRefresh('api/players/' + playerId + '/draft', 'PUT', body, 'Draft info saved');
    }
    window.saveDraftInfo = saveDraftInfo;

    // ============================================
    // ATTRIBUTES EDITOR (16 sliders)
    // ============================================
    function openAttributesEditor(player) {
        var attrs = player.attributes || {};
        var attrNames = {
            inside_scoring: 'Inside Scoring', mid_range: 'Mid-Range', three_point: '3-Point',
            free_throw: 'Free Throw', ball_handling: 'Ball Handling', passing: 'Passing',
            offensive_rebound: 'Off. Rebound', defensive_rebound: 'Def. Rebound',
            steal: 'Steal', block: 'Block', lateral_quickness: 'Lateral Quickness',
            speed: 'Speed', acceleration: 'Acceleration', strength: 'Strength',
            vertical: 'Vertical', stamina: 'Stamina'
        };
        var html = '<form id="attrs-form" onsubmit="return false;">';
        html += '<div style="max-height:400px;overflow-y:auto;padding-right:6px;">';
        for (var key in attrNames) {
            html += formSlider('attr-' + key, attrs[key] || 50, 0, 99, attrNames[key]);
        }
        html += '</div>';
        html += '<div class="form-actions"><button type="button" class="btn-primary" onclick="saveAttributes(\'' + player.id + '\')">Save</button> <button type="button" class="btn-secondary" onclick="closeModal()">Cancel</button></div>';
        html += '</form>';
        openModal('Edit Attributes', html, '480px');
    }
    window.openAttributesEditor = openAttributesEditor;

    function saveAttributes(playerId) {
        var keys = ['inside_scoring','mid_range','three_point','free_throw','ball_handling','passing','offensive_rebound','defensive_rebound','steal','block','lateral_quickness','speed','acceleration','strength','vertical','stamina'];
        var body = {};
        for (var i = 0; i < keys.length; i++) {
            var el = document.getElementById('attr-' + keys[i]);
            body[keys[i]] = el ? parseInt(el.value) || 0 : 0;
        }
        saveAndRefresh('api/players/' + playerId + '/attributes', 'PUT', body, 'Attributes saved');
    }
    window.saveAttributes = saveAttributes;

    // ============================================
    // BADGES EDITOR
    // ============================================
    function openAddBadgeEditor(playerId) {
        var html = '<form id="badge-form" onsubmit="return false;">';
        html += formRow('Badge Name', formInput('bg-name', '', { required: true, placeholder: 'Catch & Shoot' }));
        html += formRow('Tier', formSelect('bg-tier', [
            { value: 'bronze', label: 'Bronze' },
            { value: 'silver', label: 'Silver' },
            { value: 'gold', label: 'Gold' },
            { value: 'hall_of_fame', label: 'Hall of Fame' }
        ], 'bronze'));
        html += '<div class="form-actions"><button type="button" class="btn-primary" onclick="saveNewBadge(\'' + playerId + '\')">Add Badge</button> <button type="button" class="btn-secondary" onclick="closeModal()">Cancel</button></div>';
        html += '</form>';
        openModal('Add Badge', html, '380px');
    }
    window.openAddBadgeEditor = openAddBadgeEditor;

    function saveNewBadge(playerId) {
        var name = document.getElementById('bg-name').value.trim();
        if (!name) { showToast('Badge name required', 'error'); return; }
        var body = { name: name, tier: document.getElementById('bg-tier').value };
        saveAndRefresh('api/players/' + playerId + '/badges', 'POST', body, 'Badge added');
    }
    window.saveNewBadge = saveNewBadge;

    function deleteBadge(playerId, idx) {
        confirmAndDelete('badge', 'api/players/' + playerId + '/badges/' + idx);
    }
    window.deleteBadge = deleteBadge;

    // ============================================
    // TENDENCIES EDITOR
    // ============================================
    function openTendenciesEditor(player) {
        var tend = player.tendencies || {};
        var tendNames = {
            drive_tendency: 'Drive', spot_up_tendency: 'Spot-Up',
            post_up_tendency: 'Post-Up', iso_tendency: 'Isolation',
            pick_and_roll_tendency: 'Pick & Roll'
        };
        var html = '<form id="tend-form" onsubmit="return false;">';
        for (var key in tendNames) {
            html += formSlider('tend-' + key, tend[key] || 0, 0, 100, tendNames[key]);
        }
        html += '<div class="form-actions"><button type="button" class="btn-primary" onclick="saveTendencies(\'' + player.id + '\')">Save</button> <button type="button" class="btn-secondary" onclick="closeModal()">Cancel</button></div>';
        html += '</form>';
        openModal('Edit Tendencies', html, '440px');
    }
    window.openTendenciesEditor = openTendenciesEditor;

    function saveTendencies(playerId) {
        var keys = ['drive_tendency','spot_up_tendency','post_up_tendency','iso_tendency','pick_and_roll_tendency'];
        var body = {};
        for (var i = 0; i < keys.length; i++) {
            var el = document.getElementById('tend-' + keys[i]);
            body[keys[i]] = el ? parseInt(el.value) || 0 : 0;
        }
        saveAndRefresh('api/players/' + playerId + '/tendencies', 'PUT', body, 'Tendencies saved');
    }
    window.saveTendencies = saveTendencies;

    // ============================================
    // MEASUREMENTS EDITOR
    // ============================================
    function openMeasurementsEditor(player) {
        var m = player.measurements || {};
        var html = '<form id="meas-form" onsubmit="return false;">';
        html += formRow('Wingspan', formInput('ms-wingspan', m.wingspan, { placeholder: '6\'8"' }));
        html += formRow('Standing Reach', formInput('ms-standing-reach', m.standing_reach, { placeholder: '8\'4"' }));
        html += formRow('Hand Length', formInput('ms-hand-length', m.hand_length, { placeholder: '8.75"' }));
        html += formRow('Hand Width', formInput('ms-hand-width', m.hand_width, { placeholder: '9.25"' }));
        html += formRow('Body Fat %', formNumber('ms-body-fat', m.body_fat_pct, 0, 40, 0.1));
        html += formRow('No-Step Vertical', formNumber('ms-no-step-vert', m.no_step_vertical, 0, 50, 0.5));
        html += formRow('Max Vertical', formNumber('ms-max-vert', m.max_vertical, 0, 50, 0.5));
        html += formRow('Lane Agility (s)', formNumber('ms-lane-agility', m.lane_agility, 5, 20, 0.01));
        html += formRow('3/4 Sprint (s)', formNumber('ms-sprint', m.three_quarter_sprint, 2, 5, 0.01));
        html += '<div class="form-actions"><button type="button" class="btn-primary" onclick="saveMeasurements(\'' + player.id + '\')">Save</button> <button type="button" class="btn-secondary" onclick="closeModal()">Cancel</button></div>';
        html += '</form>';
        openModal('Edit Measurements', html, '440px');
    }
    window.openMeasurementsEditor = openMeasurementsEditor;

    function saveMeasurements(playerId) {
        var body = {
            wingspan: document.getElementById('ms-wingspan').value,
            standing_reach: document.getElementById('ms-standing-reach').value,
            hand_length: document.getElementById('ms-hand-length').value,
            hand_width: document.getElementById('ms-hand-width').value,
            body_fat_pct: parseFloat(document.getElementById('ms-body-fat').value) || 0,
            no_step_vertical: parseFloat(document.getElementById('ms-no-step-vert').value) || 0,
            max_vertical: parseFloat(document.getElementById('ms-max-vert').value) || 0,
            lane_agility: parseFloat(document.getElementById('ms-lane-agility').value) || 0,
            three_quarter_sprint: parseFloat(document.getElementById('ms-sprint').value) || 0
        };
        saveAndRefresh('api/players/' + playerId + '/measurements', 'PUT', body, 'Measurements saved');
    }
    window.saveMeasurements = saveMeasurements;

    // ============================================
    // CONTRACT EDITOR
    // ============================================
    function openContractEditor(player) {
        var c = player.contract || {};
        var html = '<form id="contract-form" onsubmit="return false;">';
        html += formRow('Type', formSelect('ct-type', [
            { value: 'rookie_scale', label: 'Rookie Scale' },
            { value: 'standard', label: 'Standard' },
            { value: 'max', label: 'Max' },
            { value: 'supermax', label: 'Supermax' },
            { value: 'vet_min', label: 'Veteran Minimum' },
            { value: 'two_way', label: 'Two-Way' },
            { value: 'exhibit_10', label: 'Exhibit 10' }
        ], c.type || 'standard'));
        html += formRow('Years Remaining', formNumber('ct-years', c.years_remaining, 0, 10));
        html += formRow('Total Value ($)', formNumber('ct-total', c.total_value, 0));
        html += formRow('Annual Value ($)', formNumber('ct-annual', c.annual_value, 0));
        html += formRow('Team Option Year', formNumber('ct-team-opt', c.team_option_year, 2020, 2040));
        html += formRow('Player Option Year', formNumber('ct-player-opt', c.player_option_year, 2020, 2040));
        html += '<div class="form-actions"><button type="button" class="btn-primary" onclick="saveContract(\'' + player.id + '\')">Save</button> <button type="button" class="btn-secondary" onclick="closeModal()">Cancel</button></div>';
        html += '</form>';
        openModal('Edit Contract', html, '440px');
    }
    window.openContractEditor = openContractEditor;

    function saveContract(playerId) {
        var body = {
            type: document.getElementById('ct-type').value,
            years_remaining: parseInt(document.getElementById('ct-years').value) || 0,
            total_value: parseInt(document.getElementById('ct-total').value) || 0,
            annual_value: parseInt(document.getElementById('ct-annual').value) || 0,
            team_option_year: parseInt(document.getElementById('ct-team-opt').value) || null,
            player_option_year: parseInt(document.getElementById('ct-player-opt').value) || null
        };
        saveAndRefresh('api/players/' + playerId + '/contract', 'PUT', body, 'Contract saved');
    }
    window.saveContract = saveContract;

    // ============================================
    // JERSEY HISTORY EDITOR
    // ============================================
    function openAddJerseyEditor(playerId) {
        var html = '<form id="jersey-form" onsubmit="return false;">';
        html += formRow('Team', teamSelectOptionsWithId('jh-team', ''));
        html += formRow('Number', formNumber('jh-number', '', 0, 99));
        html += formRow('Years', formInput('jh-years', '', { placeholder: '2022-2024' }));
        html += '<div class="form-actions"><button type="button" class="btn-primary" onclick="saveNewJersey(\'' + playerId + '\')">Add</button> <button type="button" class="btn-secondary" onclick="closeModal()">Cancel</button></div>';
        html += '</form>';
        openModal('Add Jersey History', html, '400px');
    }
    window.openAddJerseyEditor = openAddJerseyEditor;

    function openEditJerseyEditor(playerId, idx, entry) {
        var html = '<form id="jersey-form" onsubmit="return false;">';
        html += formRow('Team', teamSelectOptionsWithId('jh-team', entry.team_id));
        html += formRow('Number', formNumber('jh-number', entry.number, 0, 99));
        html += formRow('Years', formInput('jh-years', entry.years, { placeholder: '2022-2024' }));
        html += '<div class="form-actions"><button type="button" class="btn-primary" onclick="saveEditJersey(\'' + playerId + '\',' + idx + ')">Save</button> <button type="button" class="btn-secondary" onclick="closeModal()">Cancel</button></div>';
        html += '</form>';
        openModal('Edit Jersey History', html, '400px');
    }
    window.openEditJerseyEditor = openEditJerseyEditor;

    function saveNewJersey(playerId) {
        var body = {
            team_id: document.getElementById('jh-team').value,
            number: parseInt(document.getElementById('jh-number').value) || 0,
            years: document.getElementById('jh-years').value
        };
        saveAndRefresh('api/players/' + playerId + '/jersey-history', 'POST', body, 'Jersey added');
    }
    window.saveNewJersey = saveNewJersey;

    function saveEditJersey(playerId, idx) {
        var body = {
            team_id: document.getElementById('jh-team').value,
            number: parseInt(document.getElementById('jh-number').value) || 0,
            years: document.getElementById('jh-years').value
        };
        saveAndRefresh('api/players/' + playerId + '/jersey-history/' + idx, 'PUT', body, 'Jersey updated');
    }
    window.saveEditJersey = saveEditJersey;

    function deleteJersey(playerId, idx) {
        confirmAndDelete('jersey entry', 'api/players/' + playerId + '/jersey-history/' + idx);
    }
    window.deleteJersey = deleteJersey;

    // ============================================
    // CAREER SEASON EDITOR
    // ============================================
    function openSeasonEditor(playerId, level, seasonIdx, season, teamIdx) {
        var s = season || {};
        var isEdit = seasonIdx !== null && seasonIdx !== undefined;
        var player = getPlayerById(playerId);
        var html = '<form id="season-form" onsubmit="return false;">';

        // Show school/team context fields when adding (not editing) college or HS seasons
        if (!isEdit && level === 'college') {
            var college = (player && player.career && player.career.college) || {};
            html += formRow('School', formInput('ss-school', college.school, { placeholder: 'Duke' }));
            html += formRow('Conference', formInput('ss-conference', college.conference, { placeholder: 'ACC' }));
            html += formRow('Division', formInput('ss-division', college.division, { placeholder: 'D1' }));
            html += '<hr style="border-color:var(--border-color);margin:6px 0;">';
        }
        if (!isEdit && level === 'highschool') {
            var hs = (player && player.career && player.career.highschool) || {};
            html += formRow('School', formInput('ss-school', hs.school, { placeholder: 'Montverde Academy' }));
            html += formRow('State', formInput('ss-state', hs.state, { placeholder: 'FL' }));
            html += '<hr style="border-color:var(--border-color);margin:6px 0;">';
        }

        html += formRow('Year', formInput('ss-year', s.year, { placeholder: '2024-25' }));
        html += formRow('PPG', formNumber('ss-ppg', s.ppg, 0, 60, 0.1));
        html += formRow('APG', formNumber('ss-apg', s.apg, 0, 20, 0.1));
        html += formRow('RPG', formNumber('ss-rpg', s.rpg, 0, 25, 0.1));
        html += formRow('SPG', formNumber('ss-spg', s.spg, 0, 10, 0.1));
        html += formRow('BPG', formNumber('ss-bpg', s.bpg, 0, 10, 0.1));
        html += formRow('FG%', formNumber('ss-fg', s.fg_pct, 0, 1, 0.001));
        html += formRow('3P%', formNumber('ss-fg3', s.fg3_pct, 0, 1, 0.001));
        html += formRow('FT%', formNumber('ss-ft', s.ft_pct, 0, 1, 0.001));
        html += formRow('GP', formNumber('ss-gp', s.gp, 0, 100));
        html += formRow('GS', formNumber('ss-gs', s.gs, 0, 100));
        html += formRow('MPG', formNumber('ss-mpg', s.mpg, 0, 48, 0.1));

        if (isEdit) {
            var extra = teamIdx !== undefined ? ',team_idx:' + teamIdx : '';
            html += '<div class="form-actions"><button type="button" class="btn-primary" onclick="saveSeasonEdit(\'' + playerId + '\',\'' + level + '\',' + seasonIdx + ',' + (teamIdx !== undefined ? teamIdx : 'null') + ')">Save</button> <button type="button" class="btn-secondary" onclick="closeModal()">Cancel</button></div>';
        } else {
            html += '<div class="form-actions"><button type="button" class="btn-primary" onclick="saveSeasonAdd(\'' + playerId + '\',\'' + level + '\',' + (teamIdx !== undefined ? teamIdx : 'null') + ')">Add Season</button> <button type="button" class="btn-secondary" onclick="closeModal()">Cancel</button></div>';
        }
        html += '</form>';
        openModal((isEdit ? 'Edit' : 'Add') + ' Season (' + level + ')', html, '440px');
    }
    window.openSeasonEditor = openSeasonEditor;

    function getSeasonFormData() {
        var body = {
            year: document.getElementById('ss-year').value,
            ppg: parseFloat(document.getElementById('ss-ppg').value) || 0,
            apg: parseFloat(document.getElementById('ss-apg').value) || 0,
            rpg: parseFloat(document.getElementById('ss-rpg').value) || 0,
            spg: parseFloat(document.getElementById('ss-spg').value) || 0,
            bpg: parseFloat(document.getElementById('ss-bpg').value) || 0,
            fg_pct: parseFloat(document.getElementById('ss-fg').value) || 0,
            fg3_pct: parseFloat(document.getElementById('ss-fg3').value) || 0,
            ft_pct: parseFloat(document.getElementById('ss-ft').value) || 0
        };
        var gp = document.getElementById('ss-gp');
        if (gp) body.gp = parseInt(gp.value) || 0;
        var gs = document.getElementById('ss-gs');
        if (gs) body.gs = parseInt(gs.value) || 0;
        var mpg = document.getElementById('ss-mpg');
        if (mpg) body.mpg = parseFloat(mpg.value) || 0;
        return body;
    }

    function saveSeasonEdit(playerId, level, seasonIdx, teamIdx) {
        var body = getSeasonFormData();
        if (teamIdx !== null) body.team_idx = teamIdx;
        saveAndRefresh('api/players/' + playerId + '/career/' + level + '/' + seasonIdx, 'PUT', body, 'Season updated');
    }
    window.saveSeasonEdit = saveSeasonEdit;

    function saveSeasonAdd(playerId, level, teamIdx) {
        var seasonData = getSeasonFormData();
        var body = { season: seasonData };
        if (level === 'pro' && teamIdx !== null) {
            // Get team_id from existing pro entries
            var player = getPlayerById(playerId);
            if (player && player.career && player.career.pro && player.career.pro[teamIdx]) {
                body.team_id = player.career.pro[teamIdx].team_id;
                body.league = player.career.pro[teamIdx].league;
            }
        }
        if (level === 'college') {
            var schoolEl = document.getElementById('ss-school');
            var confEl = document.getElementById('ss-conference');
            var divEl = document.getElementById('ss-division');
            if (schoolEl && schoolEl.value) body.school = schoolEl.value;
            if (confEl && confEl.value) body.conference = confEl.value;
            if (divEl && divEl.value) body.division = divEl.value;
        }
        if (level === 'highschool') {
            var hsSchoolEl = document.getElementById('ss-school');
            var stateEl = document.getElementById('ss-state');
            if (hsSchoolEl && hsSchoolEl.value) body.school = hsSchoolEl.value;
            if (stateEl && stateEl.value) body.state = stateEl.value;
        }
        saveAndRefresh('api/players/' + playerId + '/career/' + level, 'POST', body, 'Season added');
    }
    window.saveSeasonAdd = saveSeasonAdd;

    // ============================================
    // ADD PRO TEAM ENTRY (for adding seasons to a new team)
    // ============================================
    function openAddProTeamSeasonEditor(playerId) {
        var html = '<form id="pro-team-form" onsubmit="return false;">';
        html += formRow('Team', teamSelectOptionsWithId('pt-team', ''));
        html += formRow('League', formSelect('pt-league', ['NBA','G-League','International','Other'], 'NBA'));
        html += '<hr style="border-color:var(--border-color);margin:6px 0;">';
        html += formRow('Year', formInput('ss-year', '', { placeholder: '2024-25' }));
        html += formRow('PPG', formNumber('ss-ppg', 0, 0, 60, 0.1));
        html += formRow('APG', formNumber('ss-apg', 0, 0, 20, 0.1));
        html += formRow('RPG', formNumber('ss-rpg', 0, 0, 25, 0.1));
        html += formRow('SPG', formNumber('ss-spg', 0, 0, 10, 0.1));
        html += formRow('BPG', formNumber('ss-bpg', 0, 0, 10, 0.1));
        html += formRow('FG%', formNumber('ss-fg', 0, 0, 1, 0.001));
        html += formRow('3P%', formNumber('ss-fg3', 0, 0, 1, 0.001));
        html += formRow('FT%', formNumber('ss-ft', 0, 0, 1, 0.001));
        html += formRow('GP', formNumber('ss-gp', 0, 0, 100));
        html += formRow('GS', formNumber('ss-gs', 0, 0, 100));
        html += formRow('MPG', formNumber('ss-mpg', 0, 0, 48, 0.1));
        html += '<div class="form-actions"><button type="button" class="btn-primary" onclick="saveNewProTeamSeason(\'' + playerId + '\')">Add</button> <button type="button" class="btn-secondary" onclick="closeModal()">Cancel</button></div>';
        html += '</form>';
        openModal('Add Pro Season (New Team)', html, '440px');
    }
    window.openAddProTeamSeasonEditor = openAddProTeamSeasonEditor;

    function saveNewProTeamSeason(playerId) {
        var body = {
            team_id: document.getElementById('pt-team').value,
            league: document.getElementById('pt-league').value,
            season: getSeasonFormData()
        };
        saveAndRefresh('api/players/' + playerId + '/career/pro', 'POST', body, 'Pro season added');
    }
    window.saveNewProTeamSeason = saveNewProTeamSeason;

    // ============================================
    // GAME LOG EDITOR
    // ============================================
    function openGameEditor(playerId, level, seasonIdx, gameIdx, game, teamIdx) {
        var g = game || {};
        var isEdit = gameIdx !== null && gameIdx !== undefined;
        var html = '<form id="game-form" onsubmit="return false;">';
        html += formRow('Date', formInput('gm-date', g.date, { type: 'date' }));
        html += formRow('Opponent', formInput('gm-opp', g.opponent, { placeholder: 'GSW' }));
        html += formRow('Result', formInput('gm-result', g.result, { placeholder: 'W 110-102' }));
        html += formRow('Minutes', formNumber('gm-mins', g.mins, 0, 60));
        html += formRow('Points', formNumber('gm-pts', g.pts, 0, 100));
        html += formRow('Assists', formNumber('gm-ast', g.ast, 0, 30));
        html += formRow('Rebounds', formNumber('gm-reb', g.reb, 0, 30));
        html += formRow('Steals', formNumber('gm-stl', g.stl, 0, 15));
        html += formRow('Blocks', formNumber('gm-blk', g.blk, 0, 15));
        html += formRow('FG Made', formNumber('gm-fgm', g.fg_made, 0, 30));
        html += formRow('FG Att', formNumber('gm-fga', g.fg_att, 0, 40));
        html += formRow('3P Made', formNumber('gm-fg3m', g.fg3_made, 0, 20));
        html += formRow('3P Att', formNumber('gm-fg3a', g.fg3_att, 0, 30));
        html += formRow('FT Made', formNumber('gm-ftm', g.ft_made, 0, 20));
        html += formRow('FT Att', formNumber('gm-fta', g.ft_att, 0, 25));

        if (isEdit) {
            html += '<div class="form-actions"><button type="button" class="btn-primary" onclick="saveGameEdit(\'' + playerId + '\',\'' + level + '\',' + seasonIdx + ',' + gameIdx + ')">Save</button> <button type="button" class="btn-secondary" onclick="closeModal()">Cancel</button></div>';
        } else {
            html += '<div class="form-actions"><button type="button" class="btn-primary" onclick="saveGameAdd(\'' + playerId + '\',\'' + level + '\',' + seasonIdx + ',' + (teamIdx !== undefined ? teamIdx : 'null') + ')">Add Game</button> <button type="button" class="btn-secondary" onclick="closeModal()">Cancel</button></div>';
        }
        html += '</form>';
        openModal((isEdit ? 'Edit' : 'Add') + ' Game', html, '440px');
    }
    window.openGameEditor = openGameEditor;

    function getGameFormData() {
        return {
            date: document.getElementById('gm-date').value,
            opponent: document.getElementById('gm-opp').value,
            result: document.getElementById('gm-result').value,
            mins: parseInt(document.getElementById('gm-mins').value) || 0,
            pts: parseInt(document.getElementById('gm-pts').value) || 0,
            ast: parseInt(document.getElementById('gm-ast').value) || 0,
            reb: parseInt(document.getElementById('gm-reb').value) || 0,
            stl: parseInt(document.getElementById('gm-stl').value) || 0,
            blk: parseInt(document.getElementById('gm-blk').value) || 0,
            fg_made: parseInt(document.getElementById('gm-fgm').value) || 0,
            fg_att: parseInt(document.getElementById('gm-fga').value) || 0,
            fg3_made: parseInt(document.getElementById('gm-fg3m').value) || 0,
            fg3_att: parseInt(document.getElementById('gm-fg3a').value) || 0,
            ft_made: parseInt(document.getElementById('gm-ftm').value) || 0,
            ft_att: parseInt(document.getElementById('gm-fta').value) || 0
        };
    }

    function saveGameEdit(playerId, level, seasonIdx, gameIdx) {
        saveAndRefresh('api/players/' + playerId + '/games/' + level + '/' + seasonIdx + '/' + gameIdx, 'PUT', getGameFormData(), 'Game updated');
    }
    window.saveGameEdit = saveGameEdit;

    function saveGameAdd(playerId, level, seasonIdx, teamIdx) {
        var body = getGameFormData();
        body.level = level;
        body.season_idx = seasonIdx;
        if (teamIdx !== null) body.team_idx = teamIdx;
        saveAndRefresh('api/players/' + playerId + '/games', 'POST', body, 'Game added');
    }
    window.saveGameAdd = saveGameAdd;

    function deleteGame(playerId, level, seasonIdx, gameIdx) {
        confirmAndDelete('game', 'api/players/' + playerId + '/games/' + level + '/' + seasonIdx + '/' + gameIdx);
    }
    window.deleteGame = deleteGame;

    // ============================================
    // INJURY EDITOR
    // ============================================
    function openInjuryEditor(playerId, idx, injury) {
        var inj = injury || {};
        var isEdit = idx !== null && idx !== undefined;
        var html = '<form id="injury-form" onsubmit="return false;">';
        html += formRow('Date', formInput('inj-date', inj.date, { type: 'date' }));
        html += formRow('Type', formInput('inj-type', inj.type, { placeholder: 'Hamstring Strain' }));
        html += formRow('Severity', formSelect('inj-sev', ['minor','moderate','severe','season-ending'], inj.severity || 'minor'));
        html += formRow('Games Missed', formNumber('inj-missed', inj.games_missed, 0, 82));
        html += formRow('Return Date', formInput('inj-return', inj.return_date, { type: 'date' }));
        html += formRow('Notes', formTextarea('inj-notes', inj.notes, 2));
        if (isEdit) {
            html += '<div class="form-actions"><button type="button" class="btn-primary" onclick="saveInjuryEdit(\'' + playerId + '\',' + idx + ')">Save</button> <button type="button" class="btn-secondary" onclick="closeModal()">Cancel</button></div>';
        } else {
            html += '<div class="form-actions"><button type="button" class="btn-primary" onclick="saveInjuryAdd(\'' + playerId + '\')">Add</button> <button type="button" class="btn-secondary" onclick="closeModal()">Cancel</button></div>';
        }
        html += '</form>';
        openModal((isEdit ? 'Edit' : 'Add') + ' Injury', html, '420px');
    }
    window.openInjuryEditor = openInjuryEditor;

    function getInjuryFormData() {
        return {
            date: document.getElementById('inj-date').value,
            type: document.getElementById('inj-type').value,
            severity: document.getElementById('inj-sev').value,
            games_missed: parseInt(document.getElementById('inj-missed').value) || 0,
            return_date: document.getElementById('inj-return').value,
            notes: document.getElementById('inj-notes').value
        };
    }

    function saveInjuryEdit(playerId, idx) {
        saveAndRefresh('api/players/' + playerId + '/injuries/' + idx, 'PUT', getInjuryFormData(), 'Injury updated');
    }
    window.saveInjuryEdit = saveInjuryEdit;

    function saveInjuryAdd(playerId) {
        saveAndRefresh('api/players/' + playerId + '/injuries', 'POST', getInjuryFormData(), 'Injury added');
    }
    window.saveInjuryAdd = saveInjuryAdd;

    function deleteInjury(playerId, idx) {
        confirmAndDelete('injury', 'api/players/' + playerId + '/injuries/' + idx);
    }
    window.deleteInjury = deleteInjury;

    // ============================================
    // TRANSACTION EDITOR
    // ============================================
    function openTransactionEditor(playerId, idx, txn) {
        var t = txn || {};
        var isEdit = idx !== null && idx !== undefined;
        var html = '<form id="txn-form" onsubmit="return false;">';
        html += formRow('Date', formInput('txn-date', t.date, { type: 'date' }));
        html += formRow('Type', formSelect('txn-type', ['drafted','traded','signed','waived','released','recalled','assigned'], t.type || 'traded'));
        html += formRow('From Team', teamSelectOptionsWithId('txn-from', t.from_team_id));
        html += formRow('To Team', teamSelectOptionsWithId('txn-to', t.to_team_id));
        html += formRow('Details', formTextarea('txn-details', t.details, 2));
        if (isEdit) {
            html += '<div class="form-actions"><button type="button" class="btn-primary" onclick="saveTransactionEdit(\'' + playerId + '\',' + idx + ')">Save</button> <button type="button" class="btn-secondary" onclick="closeModal()">Cancel</button></div>';
        } else {
            html += '<div class="form-actions"><button type="button" class="btn-primary" onclick="saveTransactionAdd(\'' + playerId + '\')">Add</button> <button type="button" class="btn-secondary" onclick="closeModal()">Cancel</button></div>';
        }
        html += '</form>';
        openModal((isEdit ? 'Edit' : 'Add') + ' Transaction', html, '440px');
    }
    window.openTransactionEditor = openTransactionEditor;

    function getTransactionFormData() {
        return {
            date: document.getElementById('txn-date').value,
            type: document.getElementById('txn-type').value,
            from_team_id: document.getElementById('txn-from').value,
            to_team_id: document.getElementById('txn-to').value,
            details: document.getElementById('txn-details').value
        };
    }

    function saveTransactionEdit(playerId, idx) {
        saveAndRefresh('api/players/' + playerId + '/transactions/' + idx, 'PUT', getTransactionFormData(), 'Transaction updated');
    }
    window.saveTransactionEdit = saveTransactionEdit;

    function saveTransactionAdd(playerId) {
        saveAndRefresh('api/players/' + playerId + '/transactions', 'POST', getTransactionFormData(), 'Transaction added');
    }
    window.saveTransactionAdd = saveTransactionAdd;

    function deleteTransaction(playerId, idx) {
        confirmAndDelete('transaction', 'api/players/' + playerId + '/transactions/' + idx);
    }
    window.deleteTransaction = deleteTransaction;

    // ============================================
    // AWARD EDITOR
    // ============================================
    function openAwardEditor(playerId, idx, award) {
        var a = award || {};
        var isEdit = idx !== null && idx !== undefined;
        var html = '<form id="award-form" onsubmit="return false;">';
        html += formRow('Year/Season', formInput('aw-year', a.year, { placeholder: '2024-25' }));
        html += formRow('Award Name', formInput('aw-name', a.name, { placeholder: 'All-Star', required: true }));
        html += formRow('League', formSelect('aw-league', ['NBA','NCAA','G-League','International','Other'], a.league || 'NBA'));
        if (isEdit) {
            html += '<div class="form-actions"><button type="button" class="btn-primary" onclick="saveAwardEdit(\'' + playerId + '\',' + idx + ')">Save</button> <button type="button" class="btn-secondary" onclick="closeModal()">Cancel</button></div>';
        } else {
            html += '<div class="form-actions"><button type="button" class="btn-primary" onclick="saveAwardAdd(\'' + playerId + '\')">Add</button> <button type="button" class="btn-secondary" onclick="closeModal()">Cancel</button></div>';
        }
        html += '</form>';
        openModal((isEdit ? 'Edit' : 'Add') + ' Award', html, '400px');
    }
    window.openAwardEditor = openAwardEditor;

    function getAwardFormData() {
        return {
            year: document.getElementById('aw-year').value,
            name: document.getElementById('aw-name').value,
            league: document.getElementById('aw-league').value
        };
    }

    function saveAwardEdit(playerId, idx) {
        if (!document.getElementById('aw-name').value.trim()) { showToast('Award name required', 'error'); return; }
        saveAndRefresh('api/players/' + playerId + '/awards/' + idx, 'PUT', getAwardFormData(), 'Award updated');
    }
    window.saveAwardEdit = saveAwardEdit;

    function saveAwardAdd(playerId) {
        if (!document.getElementById('aw-name').value.trim()) { showToast('Award name required', 'error'); return; }
        saveAndRefresh('api/players/' + playerId + '/awards', 'POST', getAwardFormData(), 'Award added');
    }
    window.saveAwardAdd = saveAwardAdd;

    function deleteAward(playerId, idx) {
        confirmAndDelete('award', 'api/players/' + playerId + '/awards/' + idx);
    }
    window.deleteAward = deleteAward;

    // ============================================
    // MEDIA CLIPPINGS EDITOR
    // ============================================
    function openMediaEditor(playerId, idx, media) {
        var m = media || {};
        var isEdit = idx !== null && idx !== undefined;
        var html = '<form id="media-form" onsubmit="return false;">';
        html += formRow('Date', formInput('md-date', m.date, { type: 'date' }));
        html += formRow('Type', formSelect('md-type', ['news','feature','interview','rumor','injury_report'], m.type || 'news'));
        html += formRow('Headline', formInput('md-headline', m.headline, { required: true }));
        html += formRow('Source', formInput('md-source', m.source, { placeholder: 'MADCAP News Wire' }));
        html += formRow('Content', formTextarea('md-content', m.content, 4));
        if (isEdit) {
            html += '<div class="form-actions"><button type="button" class="btn-primary" onclick="saveMediaEdit(\'' + playerId + '\',' + idx + ')">Save</button> <button type="button" class="btn-secondary" onclick="closeModal()">Cancel</button></div>';
        } else {
            html += '<div class="form-actions"><button type="button" class="btn-primary" onclick="saveMediaAdd(\'' + playerId + '\')">Add</button> <button type="button" class="btn-secondary" onclick="closeModal()">Cancel</button></div>';
        }
        html += '</form>';
        openModal((isEdit ? 'Edit' : 'Add') + ' Media Clipping', html, '480px');
    }
    window.openMediaEditor = openMediaEditor;

    function getMediaFormData() {
        return {
            date: document.getElementById('md-date').value,
            type: document.getElementById('md-type').value,
            headline: document.getElementById('md-headline').value,
            source: document.getElementById('md-source').value,
            content: document.getElementById('md-content').value
        };
    }

    function saveMediaEdit(playerId, idx) {
        if (!document.getElementById('md-headline').value.trim()) { showToast('Headline required', 'error'); return; }
        saveAndRefresh('api/players/' + playerId + '/media/' + idx, 'PUT', getMediaFormData(), 'Media updated');
    }
    window.saveMediaEdit = saveMediaEdit;

    function saveMediaAdd(playerId) {
        if (!document.getElementById('md-headline').value.trim()) { showToast('Headline required', 'error'); return; }
        saveAndRefresh('api/players/' + playerId + '/media', 'POST', getMediaFormData(), 'Media added');
    }
    window.saveMediaAdd = saveMediaAdd;

    function deleteMedia(playerId, idx) {
        confirmAndDelete('media clipping', 'api/players/' + playerId + '/media/' + idx);
    }
    window.deleteMedia = deleteMedia;

    // ============================================
    // LORE EDITOR
    // ============================================
    function openLoreEditor(playerId) {
        // Fetch current lore first
        fetch('api/players/' + playerId + '/lore').then(function(r) { return r.json(); }).then(function(data) {
            var html = '<form id="lore-form" onsubmit="return false;">';
            html += '<div class="form-row" style="flex-direction:column;align-items:stretch;">';
            html += '<label style="min-width:0;margin-bottom:3px;">Lore Content (Markdown)</label>';
            html += '<textarea id="lore-content" rows="16" style="width:100%;font-family:\'Lucida Console\',monospace;font-size:10px;">' + esc(data.content || '') + '</textarea>';
            html += '</div>';
            html += '<div class="form-actions"><button type="button" class="btn-primary" onclick="saveLore(\'' + playerId + '\')">Save</button> <button type="button" class="btn-secondary" onclick="closeModal()">Cancel</button></div>';
            html += '</form>';
            openModal('Edit Lore', html, '640px');
        }).catch(function() {
            showToast('Could not load lore', 'error');
        });
    }
    window.openLoreEditor = openLoreEditor;

    function saveLore(playerId) {
        var content = document.getElementById('lore-content').value;
        saveAndRefresh('api/players/' + playerId + '/lore', 'PUT', { content: content }, 'Lore saved');
    }
    window.saveLore = saveLore;

    // ============================================
    // TEAM EDITORS
    // ============================================
    function openTeamBioEditor(team) {
        var isEdit = !!team;
        var t = team || {};
        var staff = t.staff || {};

        var html = '<form id="team-bio-form" onsubmit="return false;">';
        html += formRow('Name', formInput('tf-name', t.name, { required: true }));
        html += formRow('Abbreviation', formInput('tf-abbr', t.abbreviation, { maxlength: 6 }));
        html += formRow('League', formInput('tf-league', t.league));
        html += formRow('Conference', formInput('tf-conf', t.conference));
        html += formRow('Division', formInput('tf-div', t.division));
        html += formRow('City', formInput('tf-city', t.city));
        html += formRow('State', formInput('tf-state', t.state));
        html += formRow('Arena', formInput('tf-arena', t.arena));
        html += formRow('Founded', formNumber('tf-founded', t.founded, 1900, 2040));
        html += formRow('Color 1 (hex)', formInput('tf-color1', t.colors && t.colors[0] ? t.colors[0] : '', { placeholder: '#1D1160' }));
        html += formRow('Color 2 (hex)', formInput('tf-color2', t.colors && t.colors[1] ? t.colors[1] : '', { placeholder: '#00788C' }));
        html += formRow('Logo', imageUploadWidget('tf-logo', t.logo_url, 'teams'));
        html += formRow('Head Coach', formInput('tf-coach', staff.head_coach));
        html += formRow('GM', formInput('tf-gm', staff.gm));
        html += '<div class="form-actions"><button type="button" class="btn-primary" onclick="saveTeamBio(' + (isEdit ? "'" + t.id + "'" : 'null') + ')">Save</button> <button type="button" class="btn-secondary" onclick="closeModal()">Cancel</button></div>';
        html += '</form>';
        openModal((isEdit ? 'Edit' : 'Add') + ' Team', html, '480px');
    }
    window.openTeamBioEditor = openTeamBioEditor;

    function saveTeamBio(editId) {
        var body = {
            name: document.getElementById('tf-name').value.trim(),
            abbreviation: document.getElementById('tf-abbr').value,
            league: document.getElementById('tf-league').value,
            conference: document.getElementById('tf-conf').value,
            division: document.getElementById('tf-div').value,
            city: document.getElementById('tf-city').value,
            state: document.getElementById('tf-state').value,
            arena: document.getElementById('tf-arena').value,
            founded: parseInt(document.getElementById('tf-founded').value) || null,
            head_coach: document.getElementById('tf-coach').value,
            gm: document.getElementById('tf-gm').value
        };
        var c1 = document.getElementById('tf-color1').value.trim();
        var c2 = document.getElementById('tf-color2').value.trim();
        if (c1 || c2) body.colors = [c1, c2].filter(function(c) { return c; });
        body.logo_url = document.getElementById('tf-logo') ? document.getElementById('tf-logo').value : '';

        if (!body.name) { showToast('Name is required', 'error'); return; }

        var url = editId ? 'api/teams/' + editId : 'api/teams';
        var method = editId ? 'PUT' : 'POST';
        saveAndRefresh(url, method, body, 'Team saved');
    }
    window.saveTeamBio = saveTeamBio;

    // Team Roster Editor
    function openRosterEditor(team) {
        var roster = team.roster || [];
        var html = '<form id="roster-form" onsubmit="return false;">';
        html += '<div id="roster-list">';
        for (var i = 0; i < roster.length; i++) {
            var p = getPlayerById(roster[i]);
            html += '<div class="form-row" data-roster-idx="' + i + '"><span style="flex:1;font-size:9px;">' + (p ? p.name : roster[i]) + ' (' + roster[i] + ')</span>';
            html += '<button type="button" class="btn-danger" onclick="this.parentNode.remove()" style="padding:1px 6px;">X</button></div>';
        }
        html += '</div>';
        html += '<div class="form-row">' + playerSelectOptions('roster-add-player', '') + ' <button type="button" class="btn-secondary" onclick="addToRosterList()">Add</button></div>';
        html += '<div class="form-actions"><button type="button" class="btn-primary" onclick="saveRoster(\'' + team.id + '\')">Save Roster</button> <button type="button" class="btn-secondary" onclick="closeModal()">Cancel</button></div>';
        html += '</form>';
        openModal('Edit Roster', html, '440px');
    }
    window.openRosterEditor = openRosterEditor;

    function addToRosterList() {
        var sel = document.getElementById('roster-add-player');
        var val = sel.value;
        if (!val) return;
        var p = getPlayerById(val);
        var list = document.getElementById('roster-list');
        var div = document.createElement('div');
        div.className = 'form-row';
        div.setAttribute('data-player-id', val);
        div.innerHTML = '<span style="flex:1;font-size:9px;">' + (p ? p.name : val) + ' (' + val + ')</span><button type="button" class="btn-danger" onclick="this.parentNode.remove()" style="padding:1px 6px;">X</button>';
        list.appendChild(div);
        sel.value = '';
    }
    window.addToRosterList = addToRosterList;

    function saveRoster(teamId) {
        var list = document.getElementById('roster-list');
        var rows = list.querySelectorAll('.form-row');
        var roster = [];
        for (var i = 0; i < rows.length; i++) {
            var pid = rows[i].getAttribute('data-player-id') || rows[i].getAttribute('data-roster-idx');
            // Get from text if needed
            var text = rows[i].querySelector('span').textContent;
            var match = text.match(/\(([^)]+)\)$/);
            if (match) roster.push(match[1]);
        }
        saveAndRefresh('api/teams/' + teamId + '/roster', 'PUT', { roster: roster }, 'Roster saved');
    }
    window.saveRoster = saveRoster;

    // Team Depth Chart Editor
    function openDepthChartEditor(team) {
        var dc = team.depth_chart || { PG: [], SG: [], SF: [], PF: [], C: [] };
        var positions = ['PG', 'SG', 'SF', 'PF', 'C'];
        var html = '<form id="depth-form" onsubmit="return false;">';
        for (var p = 0; p < positions.length; p++) {
            var pos = positions[p];
            var players = dc[pos] || [];
            html += formRow(pos, '<input type="text" id="dc-' + pos + '" value="' + esc(players.join(', ')) + '" placeholder="player_id1, player_id2">');
        }
        html += '<div class="gensmall" style="margin:4px 0;color:var(--text-light);">Enter player IDs separated by commas</div>';
        html += '<div class="form-actions"><button type="button" class="btn-primary" onclick="saveDepthChart(\'' + team.id + '\')">Save</button> <button type="button" class="btn-secondary" onclick="closeModal()">Cancel</button></div>';
        html += '</form>';
        openModal('Edit Depth Chart', html, '440px');
    }
    window.openDepthChartEditor = openDepthChartEditor;

    function saveDepthChart(teamId) {
        var positions = ['PG', 'SG', 'SF', 'PF', 'C'];
        var dc = {};
        for (var i = 0; i < positions.length; i++) {
            var val = document.getElementById('dc-' + positions[i]).value;
            dc[positions[i]] = val.split(',').map(function(s) { return s.trim(); }).filter(function(s) { return s; });
        }
        saveAndRefresh('api/teams/' + teamId + '/depth-chart', 'PUT', { depth_chart: dc }, 'Depth chart saved');
    }
    window.saveDepthChart = saveDepthChart;

    // Team Season Record Editor
    function openTeamSeasonEditor(team) {
        var s = team.current_season || {};
        var html = '<form id="team-season-form" onsubmit="return false;">';
        html += formRow('Season', formInput('ts-year', s.year, { placeholder: '2024-25' }));
        html += formRow('Wins', formNumber('ts-wins', s.wins, 0, 82));
        html += formRow('Losses', formNumber('ts-losses', s.losses, 0, 82));
        html += formRow('Conf. Rank', formNumber('ts-conf-rank', s.conference_rank, 1, 30));
        html += formRow('Div. Rank', formNumber('ts-div-rank', s.division_rank, 1, 5));
        html += '<div class="form-actions"><button type="button" class="btn-primary" onclick="saveTeamSeason(\'' + team.id + '\')">Save</button> <button type="button" class="btn-secondary" onclick="closeModal()">Cancel</button></div>';
        html += '</form>';
        openModal('Edit Season Record', html, '400px');
    }
    window.openTeamSeasonEditor = openTeamSeasonEditor;

    function saveTeamSeason(teamId) {
        var body = {
            year: document.getElementById('ts-year').value,
            wins: parseInt(document.getElementById('ts-wins').value) || 0,
            losses: parseInt(document.getElementById('ts-losses').value) || 0,
            conference_rank: parseInt(document.getElementById('ts-conf-rank').value) || null,
            division_rank: parseInt(document.getElementById('ts-div-rank').value) || null
        };
        saveAndRefresh('api/teams/' + teamId + '/season', 'PUT', body, 'Season record saved');
    }
    window.saveTeamSeason = saveTeamSeason;

    // ============================================
    // GLOBAL DATA EDITORS (Games, Drafts, Leagues, etc.)
    // ============================================

    // --- Global Game Editor ---
    function openGlobalGameEditor(game) {
        var g = game || {};
        var isEdit = !!g.id;
        var html = '<form id="global-game-form" onsubmit="return false;">';
        html += formRow('Date', formInput('gg-date', g.date, { type: 'date' }));
        html += formRow('Home Team', teamSelectOptionsWithId('gg-home', g.home_team_id));
        html += formRow('Away Team', teamSelectOptionsWithId('gg-away', g.away_team_id));
        html += formRow('Home Score', formNumber('gg-hscore', g.home_score, 0, 200));
        html += formRow('Away Score', formNumber('gg-ascore', g.away_score, 0, 200));
        html += formRow('Status', formSelect('gg-status', ['scheduled','in_progress','final'], g.status || 'scheduled'));
        html += formRow('Season', formInput('gg-season', g.season, { placeholder: '2024-25' }));
        if (isEdit) {
            html += '<div class="form-actions"><button type="button" class="btn-primary" onclick="saveGlobalGame(\'' + g.id + '\')">Save</button> <button type="button" class="btn-secondary" onclick="closeModal()">Cancel</button></div>';
        } else {
            html += '<div class="form-actions"><button type="button" class="btn-primary" onclick="saveGlobalGame(null)">Add Game</button> <button type="button" class="btn-secondary" onclick="closeModal()">Cancel</button></div>';
        }
        html += '</form>';
        openModal((isEdit ? 'Edit' : 'Add') + ' Game', html, '440px');
    }
    window.openGlobalGameEditor = openGlobalGameEditor;

    function saveGlobalGame(gameId) {
        var body = {
            date: document.getElementById('gg-date').value,
            home_team_id: document.getElementById('gg-home').value,
            away_team_id: document.getElementById('gg-away').value,
            home_score: parseInt(document.getElementById('gg-hscore').value) || 0,
            away_score: parseInt(document.getElementById('gg-ascore').value) || 0,
            status: document.getElementById('gg-status').value,
            season: document.getElementById('gg-season').value
        };
        var url = gameId ? 'api/games/' + gameId : 'api/games';
        var method = gameId ? 'PUT' : 'POST';
        saveAndRefresh(url, method, body, 'Game saved');
    }
    window.saveGlobalGame = saveGlobalGame;

    function deleteGlobalGame(gameId) {
        confirmAndDelete('game', 'api/games/' + gameId);
    }
    window.deleteGlobalGame = deleteGlobalGame;

    // --- Global Transaction Editor ---
    function openGlobalTransactionEditor(txn) {
        var t = txn || {};
        var isEdit = !!t.id;
        var html = '<form id="gtxn-form" onsubmit="return false;">';
        html += formRow('Date', formInput('gt-date', t.date, { type: 'date' }));
        html += formRow('Type', formSelect('gt-type', ['drafted','traded','signed','waived','released','recalled','assigned'], t.type || 'traded'));
        html += formRow('Player', playerSelectOptions('gt-player', t.player_id));
        html += formRow('From Team', teamSelectOptionsWithId('gt-from', t.from_team_id));
        html += formRow('To Team', teamSelectOptionsWithId('gt-to', t.to_team_id));
        html += formRow('Details', formTextarea('gt-details', t.details, 2));
        if (isEdit) {
            html += '<div class="form-actions"><button type="button" class="btn-primary" onclick="saveGlobalTransaction(\'' + t.id + '\')">Save</button> <button type="button" class="btn-secondary" onclick="closeModal()">Cancel</button></div>';
        } else {
            html += '<div class="form-actions"><button type="button" class="btn-primary" onclick="saveGlobalTransaction(null)">Add</button> <button type="button" class="btn-secondary" onclick="closeModal()">Cancel</button></div>';
        }
        html += '</form>';
        openModal((isEdit ? 'Edit' : 'Add') + ' Transaction', html, '460px');
    }
    window.openGlobalTransactionEditor = openGlobalTransactionEditor;

    function saveGlobalTransaction(txnId) {
        var body = {
            date: document.getElementById('gt-date').value,
            type: document.getElementById('gt-type').value,
            player_id: document.getElementById('gt-player').value,
            from_team_id: document.getElementById('gt-from').value,
            to_team_id: document.getElementById('gt-to').value,
            details: document.getElementById('gt-details').value
        };
        var url = txnId ? 'api/transactions/' + txnId : 'api/transactions';
        var method = txnId ? 'PUT' : 'POST';
        saveAndRefresh(url, method, body, 'Transaction saved');
    }
    window.saveGlobalTransaction = saveGlobalTransaction;

    function deleteGlobalTransaction(txnId) {
        confirmAndDelete('transaction', 'api/transactions/' + txnId);
    }
    window.deleteGlobalTransaction = deleteGlobalTransaction;

    // --- Global Injury Editor ---
    function openGlobalInjuryEditor(inj) {
        var i = inj || {};
        var isEdit = !!i.id;
        var html = '<form id="ginj-form" onsubmit="return false;">';
        html += formRow('Player', playerSelectOptions('gi-player', i.player_id));
        html += formRow('Date', formInput('gi-date', i.date, { type: 'date' }));
        html += formRow('Type', formInput('gi-type', i.type, { placeholder: 'Ankle Sprain' }));
        html += formRow('Severity', formSelect('gi-sev', ['minor','moderate','severe','season-ending'], i.severity || 'minor'));
        html += formRow('Status', formSelect('gi-status', ['out','day-to-day','questionable','probable','active'], i.status || 'out'));
        html += formRow('Expected Return', formInput('gi-return', i.expected_return, { type: 'date' }));
        html += formRow('Notes', formTextarea('gi-notes', i.notes, 2));
        if (isEdit) {
            html += '<div class="form-actions"><button type="button" class="btn-primary" onclick="saveGlobalInjury(\'' + i.id + '\')">Save</button> <button type="button" class="btn-secondary" onclick="closeModal()">Cancel</button></div>';
        } else {
            html += '<div class="form-actions"><button type="button" class="btn-primary" onclick="saveGlobalInjury(null)">Add</button> <button type="button" class="btn-secondary" onclick="closeModal()">Cancel</button></div>';
        }
        html += '</form>';
        openModal((isEdit ? 'Edit' : 'Add') + ' Injury Report', html, '440px');
    }
    window.openGlobalInjuryEditor = openGlobalInjuryEditor;

    function saveGlobalInjury(injId) {
        var body = {
            player_id: document.getElementById('gi-player').value,
            date: document.getElementById('gi-date').value,
            type: document.getElementById('gi-type').value,
            severity: document.getElementById('gi-sev').value,
            status: document.getElementById('gi-status').value,
            expected_return: document.getElementById('gi-return').value,
            notes: document.getElementById('gi-notes').value
        };
        var url = injId ? 'api/injuries/' + injId : 'api/injuries';
        var method = injId ? 'PUT' : 'POST';
        saveAndRefresh(url, method, body, 'Injury report saved');
    }
    window.saveGlobalInjury = saveGlobalInjury;

    function deleteGlobalInjury(injId) {
        confirmAndDelete('injury report', 'api/injuries/' + injId);
    }
    window.deleteGlobalInjury = deleteGlobalInjury;

    // --- Mock Draft Editor ---
    function openMockDraftEditor(mock) {
        var m = mock || {};
        var isEdit = !!m.id;
        var html = '<form id="mock-form" onsubmit="return false;">';
        html += formRow('Title', formInput('mk-title', m.title, { required: true }));
        html += formRow('Author', formInput('mk-author', m.author, { placeholder: 'MADCAP Scouting' }));
        html += formRow('Date', formInput('mk-date', m.date, { type: 'date' }));
        html += formRow('League', formSelect('mk-league', ['NBA','Other'], m.league || 'NBA'));
        html += formRow('Year', formNumber('mk-year', m.year || 2025, 2020, 2040));
        if (isEdit) {
            html += '<div class="form-actions"><button type="button" class="btn-primary" onclick="saveMockDraft(\'' + m.id + '\')">Save</button> <button type="button" class="btn-secondary" onclick="closeModal()">Cancel</button></div>';
        } else {
            html += '<div class="form-actions"><button type="button" class="btn-primary" onclick="saveMockDraft(null)">Add</button> <button type="button" class="btn-secondary" onclick="closeModal()">Cancel</button></div>';
        }
        html += '</form>';
        openModal((isEdit ? 'Edit' : 'Add') + ' Mock Draft', html, '440px');
    }
    window.openMockDraftEditor = openMockDraftEditor;

    function saveMockDraft(mockId) {
        var body = {
            title: document.getElementById('mk-title').value,
            author: document.getElementById('mk-author').value,
            date: document.getElementById('mk-date').value,
            league: document.getElementById('mk-league').value,
            year: parseInt(document.getElementById('mk-year').value) || 2025
        };
        if (!body.title) { showToast('Title required', 'error'); return; }
        var url = mockId ? 'api/mock-drafts/' + mockId : 'api/mock-drafts';
        var method = mockId ? 'PUT' : 'POST';
        saveAndRefresh(url, method, body, 'Mock draft saved');
    }
    window.saveMockDraft = saveMockDraft;

    function deleteMockDraft(mockId) {
        confirmAndDelete('mock draft', 'api/mock-drafts/' + mockId);
    }
    window.deleteMockDraft = deleteMockDraft;

})();
