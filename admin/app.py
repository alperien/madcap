import os
import json
import threading
import secrets
import logging
import re
from functools import wraps
from datetime import datetime
from flask import Flask, request, jsonify, send_from_directory, session, redirect, url_for

# --- Configuration ---
app = Flask(__name__, static_folder='static')
app.secret_key = os.environ.get('SECRET_KEY', secrets.token_hex(32))
app.config['MAX_CONTENT_LENGTH'] = 2 * 1024 * 1024  # 2MB max request size (#73)

# --- Logging (#41) ---
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# --- Paths ---
BASE_DIR = os.path.dirname(os.path.dirname(__file__))
PUBLIC_DIR = os.path.join(BASE_DIR, 'public')
DATA_DIR = os.path.join(BASE_DIR, 'data')

# --- Auth (#1, #2, #5) ---
ADMIN_USER = os.environ.get('ADMIN_USER', 'admin')
ADMIN_PASS = os.environ.get('ADMIN_PASS', 'madcap')

# --- Thread safety ---
file_lock = threading.Lock()

# --- Simple in-memory CSRF token store ---
csrf_tokens = set()


def generate_csrf_token():
    token = secrets.token_hex(32)
    csrf_tokens.add(token)
    return token


def validate_csrf_token(token):
    if token in csrf_tokens:
        csrf_tokens.discard(token)
        return True
    return False


# --- Auth decorators (#1, #3) ---
def require_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        # Support session-based auth and basic auth for API
        if 'authenticated' in session:
            return f(*args, **kwargs)
        auth = request.authorization
        if auth and auth.username == ADMIN_USER and auth.password == ADMIN_PASS:
            return f(*args, **kwargs)
        # Also accept CSRF-protected form submissions with valid session
        if request.method in ('POST', 'PUT', 'DELETE'):
            token = request.headers.get('X-CSRF-Token') or request.form.get('csrf_token')
            if token and validate_csrf_token(token) and session.get('authenticated'):
                return f(*args, **kwargs)
        return jsonify({'error': 'Unauthorized'}), 401
    return decorated


# --- Data helpers ---
def load_data(filename):
    """Load JSON data with error handling (#35)."""
    filepath = os.path.join(DATA_DIR, filename)
    try:
        with file_lock:
            with open(filepath, 'r') as f:
                return json.load(f)
    except FileNotFoundError:
        logger.error(f"Data file not found: {filename}")
        return {}
    except json.JSONDecodeError as e:
        logger.error(f"Invalid JSON in {filename}: {e}")
        return {}


def save_data(filename, data):
    """Save JSON data with error handling."""
    filepath = os.path.join(DATA_DIR, filename)
    with file_lock:
        with open(filepath, 'w') as f:
            json.dump(data, f, indent=2)
    logger.info(f"Saved {filename}")


def get_players():
    return load_data('players.json').get('players', [])


def get_teams():
    return load_data('teams.json').get('teams', [])


def get_leagues():
    return load_data('leagues.json').get('leagues', [])


def get_games():
    return load_data('games.json').get('games', [])


def get_drafts():
    return load_data('drafts.json').get('drafts', [])


def get_events():
    return load_data('events.json').get('events', [])


# --- Input validation helpers (#4, #33) ---
def validate_string(val, field, max_len=200, required=False):
    if required and (val is None or val == ''):
        return None, f'{field} is required'
    if val is not None:
        if not isinstance(val, str):
            return None, f'{field} must be a string'
        if len(val) > max_len:
            return None, f'{field} must be under {max_len} characters'
    return val, None


def validate_int(val, field, min_val=None, max_val=None, default=None):
    if val is None:
        return default, None
    try:
        v = int(val)
        if min_val is not None and v < min_val:
            return None, f'{field} must be >= {min_val}'
        if max_val is not None and v > max_val:
            return None, f'{field} must be <= {max_val}'
        return v, None
    except (ValueError, TypeError):
        return None, f'{field} must be an integer'


# --- Auth routes (#2, #9) ---
@app.route('/admin/login', methods=['GET', 'POST'])
def admin_login():
    if request.method == 'POST':
        username = request.form.get('username', '')
        password = request.form.get('password', '')
        if username == ADMIN_USER and password == ADMIN_PASS:
            session['authenticated'] = True
            session['csrf_token'] = generate_csrf_token()
            return redirect(url_for('admin_panel'))
        return render_admin_login(error='Invalid credentials')
    if session.get('authenticated'):
        return redirect(url_for('admin_panel'))
    return render_admin_login()


def render_admin_login(error=None):
    csrf = generate_csrf_token()
    session['csrf_token'] = csrf
    error_html = f'<p style="color:red;">{error}</p>' if error else ''
    return f'''<!DOCTYPE html>
<html><head><title>MADCAP Admin Login</title>
<style>
body{{font-family:Verdana,sans-serif;background:#E5E5E5;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;}}
.login-box{{background:#FFF;border:1px solid #B0B0B0;padding:24px;width:320px;}}
.login-box h2{{margin:0 0 16px;color:#0066CC;font-size:16px;}}
.login-box input[type="text"],.login-box input[type="password"]{{width:100%;padding:6px;margin:4px 0 12px;border:1px solid #B0B0B0;box-sizing:border-box;}}
.login-box input[type="submit"]{{background:#0066CC;color:#FFF;border:none;padding:8px 16px;cursor:pointer;font-weight:bold;}}
.login-box input[type="submit"]:hover{{background:#0055AA;}}
</style></head><body>
<div class="login-box"><h2>MADCAP Admin Login</h2>
{error_html}
<form method="post">
<input type="hidden" name="csrf_token" value="{csrf}">
<label>Username:<br><input type="text" name="username" required></label>
<label>Password:<br><input type="password" name="password" required></label>
<input type="submit" value="Login">
</form></div></body></html>'''


@app.route('/admin/panel')
@require_auth
def admin_panel():
    return '''<!DOCTYPE html>
<html><head><title>MADCAP Admin Panel</title>
<style>
body{font-family:Verdana,sans-serif;background:#E5E5E5;margin:0;padding:16px;}
.container{max-width:900px;margin:0 auto;}
h1{color:#0066CC;font-size:18px;}
table{width:100%;border-collapse:collapse;background:#FFF;border:1px solid #B0B0B0;margin-bottom:16px;}
th,td{border:1px solid #B0B0B0;padding:6px 8px;text-align:left;font-size:11px;}
th{background:#0066CC;color:#FFF;}
a{color:#0000FF;}
.btn{background:#0066CC;color:#FFF;border:none;padding:4px 8px;cursor:pointer;font-size:10px;text-decoration:none;display:inline-block;}
.btn-danger{background:#CC0000;}
</style></head><body>
<div class="container">
<h1>MADCAP Admin Panel</h1>
<p><a href="/">View Site</a> | <a href="/admin/logout">Logout</a></p>
<h2>API Endpoints</h2>
<table>
<tr><th>Resource</th><th>GET</th><th>POST</th><th>PUT</th><th>DELETE</th></tr>
<tr><td>Players</td><td>/api/players</td><td>/api/players</td><td>/api/players/&lt;id&gt;</td><td>/api/players/&lt;id&gt;</td></tr>
<tr><td>Teams</td><td>/api/teams</td><td>/api/teams</td><td>/api/teams/&lt;id&gt;</td><td>/api/teams/&lt;id&gt;</td></tr>
<tr><td>Games</td><td>/api/games</td><td>/api/games</td><td>/api/games/&lt;id&gt;</td><td>/api/games/&lt;id&gt;</td></tr>
<tr><td>Leagues</td><td>/api/leagues</td><td>/api/leagues</td><td>/api/leagues/&lt;id&gt;</td><td>/api/leagues/&lt;id&gt;</td></tr>
<tr><td>Drafts</td><td>/api/drafts</td><td>/api/drafts</td><td>/api/drafts/&lt;year&gt;</td><td>/api/drafts/&lt;year&gt;</td></tr>
<tr><td>Events</td><td>/api/events</td><td>/api/events</td><td>/api/events/&lt;id&gt;</td><td>/api/events/&lt;id&gt;</td></tr>
</table>
<p class="gensmall">Use Basic Auth (admin/password) or login session for API access.</p>
</div></body></html>'''


@app.route('/admin/logout')
def admin_logout():
    session.pop('authenticated', None)
    return redirect(url_for('admin_login'))


# --- Health check (#72) ---
@app.route('/health')
def health_check():
    return jsonify({'status': 'ok', 'timestamp': datetime.now().isoformat()})


# --- API: Players ---
@app.route('/api/players')
def api_players():
    return jsonify(get_players())


@app.route('/api/players/<player_id>')
def api_player(player_id):
    players = get_players()
    for p in players:
        if p['id'] == player_id:
            return jsonify(p)
    return jsonify({'error': 'Player not found'}), 404


@app.route('/api/players', methods=['POST'])
@require_auth
def api_create_player():
    body = request.json
    if not body:
        return jsonify({'error': 'Request body required'}), 400

    # Validate inputs (#4)
    name, err = validate_string(body.get('name'), 'name', required=True)
    if err:
        return jsonify({'error': err}), 400
    position, err = validate_string(body.get('position', 'PG'), 'position')
    if err:
        return jsonify({'error': err}), 400
    overall, err = validate_int(body.get('overall', 70), 'overall', 1, 99)
    if err:
        return jsonify({'error': err}), 400

    data = load_data('players.json')
    players = data.get('players', [])
    existing_ids = [p['id'] for p in players]
    counter = 1
    while f'player_{counter:03d}' in existing_ids:
        counter += 1
    new_id = f'player_{counter:03d}'
    new_player = {
        'id': new_id,
        'name': name,
        'position': position,
        'height': body.get('height', '6\'0"'),
        'weight': int(body.get('weight', 180)),
        'birthdate': body.get('birthdate', '2000-01-01'),
        'nationality': body.get('nationality', 'USA'),
        'overall': overall,
        'archetype': body.get('archetype', 'All-Around'),
        'status': body.get('status', 'active'),
        'career': {'highschool': {'school': '', 'state': '', 'class': '', 'seasons': []},
                   'college': {'school': '', 'conference': '', 'division': '', 'seasons': []},
                   'pro': []},
        'draft': {'year': body.get('draft_year', 2024),
                  'league': body.get('draft_league', 'NBA'),
                  'round': body.get('draft_round', 2),
                  'pick': body.get('draft_pick', 30),
                  'team_id': body.get('draft_team', '')},
        'lore_events': [],
        'is_fictional': body.get('is_fictional', False),
        'notes': body.get('notes', '')
    }
    players.append(new_player)
    data['players'] = players
    save_data('players.json', data)
    logger.info(f"Created player: {new_id} ({name})")
    return jsonify(new_player), 201


@app.route('/api/players/<player_id>', methods=['PUT'])
@require_auth
def api_update_player(player_id):
    data = load_data('players.json')
    players = data.get('players', [])
    body = request.json
    if not body:
        return jsonify({'error': 'Request body required'}), 400

    found = False
    for i, p in enumerate(players):
        if p['id'] == player_id:
            found = True
            for key in ['name', 'position', 'height', 'nationality', 'archetype', 'status', 'notes']:
                if key in body:
                    players[i][key] = body[key]
            if 'weight' in body:
                players[i]['weight'] = int(body['weight'])
            if 'overall' in body:
                players[i]['overall'] = int(body['overall'])
            if 'is_fictional' in body:
                players[i]['is_fictional'] = bool(body['is_fictional'])
            break

    if not found:
        return jsonify({'error': 'Player not found'}), 404  # (#46, #47)

    data['players'] = players
    save_data('players.json', data)
    logger.info(f"Updated player: {player_id}")
    return jsonify({'ok': True})


@app.route('/api/players/<player_id>', methods=['DELETE'])
@require_auth
def api_delete_player(player_id):
    data = load_data('players.json')
    original_count = len(data.get('players', []))
    data['players'] = [p for p in data['players'] if p['id'] != player_id]

    if len(data['players']) == original_count:
        return jsonify({'error': 'Player not found'}), 404  # (#46, #47)

    save_data('players.json', data)

    # Clean up references (#36)
    cleanup_player_references(player_id)

    logger.info(f"Deleted player: {player_id}")
    return jsonify({'ok': True})


def cleanup_player_references(player_id):
    """Remove player references from teams, games, drafts, events (#36)."""
    # Clean team rosters and depth charts
    teams_data = load_data('teams.json')
    teams = teams_data.get('teams', [])
    for team in teams:
        if 'roster' in team:
            team['roster'] = [rid for rid in team['roster'] if rid != player_id]
        if 'depth_chart' in team:
            for pos in team['depth_chart']:
                team['depth_chart'][pos] = [pid for pid in team['depth_chart'][pos] if pid != player_id]
    save_data('teams.json', teams_data)

    # Clean game box scores
    games_data = load_data('games.json')
    games = games_data.get('games', [])
    for game in games:
        if 'box_score' in game:
            game['box_score'] = [bs for bs in game['box_score'] if bs.get('player_id') != player_id]
    save_data('games.json', games_data)

    # Clean draft picks
    drafts_data = load_data('drafts.json')
    for draft in drafts_data.get('drafts', []):
        if 'picks' in draft:
            draft['picks'] = [p for p in draft['picks'] if p.get('player_id') != player_id]
    save_data('drafts.json', drafts_data)

    # Clean event references
    events_data = load_data('events.json')
    events_data['events'] = [e for e in events_data.get('events', []) if e.get('player_id') != player_id]
    save_data('events.json', events_data)


# --- API: Teams ---
@app.route('/api/teams')
def api_teams():
    return jsonify(get_teams())


@app.route('/api/teams/<team_id>')
def api_team(team_id):
    teams = get_teams()
    for t in teams:
        if t['id'] == team_id:
            return jsonify(t)
    return jsonify({'error': 'Team not found'}), 404


@app.route('/api/teams', methods=['POST'])
@require_auth
def api_create_team():
    body = request.json
    if not body:
        return jsonify({'error': 'Request body required'}), 400

    name, err = validate_string(body.get('name'), 'name', required=True)
    if err:
        return jsonify({'error': err}), 400

    data = load_data('teams.json')
    teams = data.get('teams', [])
    league = body.get('league', 'NBA').lower()
    abbr = body.get('abbreviation', 'XXX').lower()
    new_id = f'{league}_{abbr}'

    # Check for duplicate ID
    if any(t['id'] == new_id for t in teams):
        return jsonify({'error': f'Team ID {new_id} already exists'}), 409

    new_team = {
        'id': new_id,
        'name': name,
        'abbreviation': body.get('abbreviation', 'XXX'),
        'league': body.get('league', 'NBA'),
        'conference': body.get('conference', ''),
        'division': body.get('division', ''),
        'city': body.get('city', ''),
        'state': body.get('state', ''),
        'arena': body.get('arena', ''),
        'founded': int(body.get('founded', 2024)),
        'colors': ['#000000', '#FFFFFF'],
        'current_season': {'year': '2024-25', 'wins': 0, 'losses': 0, 'win_pct': 0.0, 'conference_rank': 0, 'division_rank': 0},
        'roster': [],
        'depth_chart': {'PG': [], 'SG': [], 'SF': [], 'PF': [], 'C': []},
        'staff': {'head_coach': body.get('head_coach', ''), 'gm': body.get('gm', '')}
    }
    teams.append(new_team)
    data['teams'] = teams
    save_data('teams.json', data)
    logger.info(f"Created team: {new_id} ({name})")
    return jsonify(new_team), 201


@app.route('/api/teams/<team_id>', methods=['PUT'])
@require_auth
def api_update_team(team_id):
    data = load_data('teams.json')
    teams = data.get('teams', [])
    body = request.json
    if not body:
        return jsonify({'error': 'Request body required'}), 400

    found = False
    for i, t in enumerate(teams):
        if t['id'] == team_id:
            found = True
            for key in ['name', 'abbreviation', 'league', 'conference', 'division', 'city', 'state', 'arena']:
                if key in body:
                    teams[i][key] = body[key]
            if 'founded' in body:
                teams[i]['founded'] = int(body['founded'])
            if 'head_coach' in body or 'gm' in body:
                teams[i]['staff'] = {
                    'head_coach': body.get('head_coach', t.get('staff', {}).get('head_coach', '')),
                    'gm': body.get('gm', t.get('staff', {}).get('gm', ''))
                }
            if 'colors' in body and isinstance(body['colors'], list):
                teams[i]['colors'] = body['colors']
            if 'current_season' in body:
                teams[i]['current_season'] = body['current_season']
            break

    if not found:
        return jsonify({'error': 'Team not found'}), 404

    data['teams'] = teams
    save_data('teams.json', data)
    logger.info(f"Updated team: {team_id}")
    return jsonify({'ok': True})


@app.route('/api/teams/<team_id>', methods=['DELETE'])
@require_auth
def api_delete_team(team_id):
    data = load_data('teams.json')
    original_count = len(data.get('teams', []))
    data['teams'] = [t for t in data['teams'] if t['id'] != team_id]

    if len(data['teams']) == original_count:
        return jsonify({'error': 'Team not found'}), 404

    save_data('teams.json', data)

    # Clean up references (#37)
    cleanup_team_references(team_id)

    logger.info(f"Deleted team: {team_id}")
    return jsonify({'ok': True})


def cleanup_team_references(team_id):
    """Remove team references from leagues, games, drafts, players (#37)."""
    # Clean league team lists and standings
    leagues_data = load_data('leagues.json')
    for league in leagues_data.get('leagues', []):
        if 'teams' in league:
            league['teams'] = [tid for tid in league['teams'] if tid != team_id]
        if 'standings' in league:
            for season, conferences in league['standings'].items():
                for conf, teams_list in conferences.items():
                    league['standings'][season][conf] = [t for t in teams_list if t.get('team_id') != team_id]
    save_data('leagues.json', leagues_data)

    # Clean player career pro team_id and draft team_id
    players_data = load_data('players.json')
    for player in players_data.get('players', []):
        if 'career' in player and 'pro' in player['career']:
            for pro in player['career']['pro']:
                if pro.get('team_id') == team_id:
                    pro['team_id'] = ''
        if 'draft' in player and player['draft'].get('team_id') == team_id:
            player['draft']['team_id'] = ''
    save_data('players.json', players_data)

    # Clean draft picks
    drafts_data = load_data('drafts.json')
    for draft in drafts_data.get('drafts', []):
        if 'picks' in draft:
            draft['picks'] = [p for p in draft['picks'] if p.get('team_id') != team_id]
    save_data('drafts.json', drafts_data)


# --- API: Games (#21) ---
@app.route('/api/games')
def api_games():
    return jsonify(get_games())


@app.route('/api/games/<game_id>')
def api_game(game_id):
    games = get_games()
    for g in games:
        if g['id'] == game_id:
            return jsonify(g)
    return jsonify({'error': 'Game not found'}), 404


@app.route('/api/games', methods=['POST'])
@require_auth
def api_create_game():
    body = request.json
    if not body:
        return jsonify({'error': 'Request body required'}), 400

    data = load_data('games.json')
    games = data.get('games', [])
    counter = len(games) + 1
    new_id = f'game_{counter:03d}'

    new_game = {
        'id': new_id,
        'date': body.get('date', '2024-01-01'),
        'time': body.get('time', '19:00'),
        'league': body.get('league', 'NBA'),
        'season': body.get('season', '2024-25'),
        'home_team_id': body.get('home_team_id', ''),
        'away_team_id': body.get('away_team_id', ''),
        'home_score': int(body.get('home_score', 0)),
        'away_score': int(body.get('away_score', 0)),
        'status': body.get('status', 'scheduled'),
        'venue': body.get('venue', ''),
        'attendance': body.get('attendance'),
        'box_score': body.get('box_score', [])
    }
    games.append(new_game)
    data['games'] = games
    save_data('games.json', data)
    logger.info(f"Created game: {new_id}")
    return jsonify(new_game), 201


@app.route('/api/games/<game_id>', methods=['PUT'])
@require_auth
def api_update_game(game_id):
    data = load_data('games.json')
    games = data.get('games', [])
    body = request.json
    if not body:
        return jsonify({'error': 'Request body required'}), 400

    found = False
    for i, g in enumerate(games):
        if g['id'] == game_id:
            found = True
            for key in ['date', 'time', 'league', 'season', 'home_team_id', 'away_team_id',
                        'status', 'venue', 'box_score']:
                if key in body:
                    games[i][key] = body[key]
            if 'home_score' in body:
                games[i]['home_score'] = int(body['home_score'])
            if 'away_score' in body:
                games[i]['away_score'] = int(body['away_score'])
            if 'attendance' in body:
                games[i]['attendance'] = body['attendance']
            break

    if not found:
        return jsonify({'error': 'Game not found'}), 404

    data['games'] = games
    save_data('games.json', data)
    logger.info(f"Updated game: {game_id}")
    return jsonify({'ok': True})


@app.route('/api/games/<game_id>', methods=['DELETE'])
@require_auth
def api_delete_game(game_id):
    data = load_data('games.json')
    original_count = len(data.get('games', []))
    data['games'] = [g for g in data['games'] if g['id'] != game_id]

    if len(data['games']) == original_count:
        return jsonify({'error': 'Game not found'}), 404

    save_data('games.json', data)
    logger.info(f"Deleted game: {game_id}")
    return jsonify({'ok': True})


# --- API: Leagues (#22) ---
@app.route('/api/leagues')
def api_leagues():
    return jsonify(get_leagues())


@app.route('/api/leagues/<league_id>')
def api_league(league_id):
    leagues = get_leagues()
    for l in leagues:
        if l['id'] == league_id:
            return jsonify(l)
    return jsonify({'error': 'League not found'}), 404


@app.route('/api/leagues', methods=['POST'])
@require_auth
def api_create_league():
    body = request.json
    if not body:
        return jsonify({'error': 'Request body required'}), 400

    data = load_data('leagues.json')
    leagues = data.get('leagues', [])
    new_id = body.get('id', body.get('name', 'new_league').lower().replace(' ', '_'))

    if any(l['id'] == new_id for l in leagues):
        return jsonify({'error': f'League ID {new_id} already exists'}), 409

    new_league = {
        'id': new_id,
        'name': body.get('name', 'New League'),
        'abbreviation': body.get('abbreviation', new_id.upper()),
        'level': body.get('level', 'pro'),
        'country': body.get('country', 'USA'),
        'current_season': body.get('current_season', '2024-25'),
        'teams': body.get('teams', []),
        'standings': body.get('standings', {})
    }
    leagues.append(new_league)
    data['leagues'] = leagues
    save_data('leagues.json', data)
    logger.info(f"Created league: {new_id}")
    return jsonify(new_league), 201


@app.route('/api/leagues/<league_id>', methods=['PUT'])
@require_auth
def api_update_league(league_id):
    data = load_data('leagues.json')
    leagues = data.get('leagues', [])
    body = request.json
    if not body:
        return jsonify({'error': 'Request body required'}), 400

    found = False
    for i, l in enumerate(leagues):
        if l['id'] == league_id:
            found = True
            for key in ['name', 'abbreviation', 'level', 'country', 'current_season', 'teams', 'standings']:
                if key in body:
                    leagues[i][key] = body[key]
            break

    if not found:
        return jsonify({'error': 'League not found'}), 404

    data['leagues'] = leagues
    save_data('leagues.json', data)
    logger.info(f"Updated league: {league_id}")
    return jsonify({'ok': True})


@app.route('/api/leagues/<league_id>', methods=['DELETE'])
@require_auth
def api_delete_league(league_id):
    data = load_data('leagues.json')
    original_count = len(data.get('leagues', []))
    data['leagues'] = [l for l in data['leagues'] if l['id'] != league_id]

    if len(data['leagues']) == original_count:
        return jsonify({'error': 'League not found'}), 404

    save_data('leagues.json', data)
    logger.info(f"Deleted league: {league_id}")
    return jsonify({'ok': True})


# --- API: Drafts (#23) ---
@app.route('/api/drafts')
def api_drafts():
    return jsonify(get_drafts())


@app.route('/api/drafts/<int:year>')
def api_draft(year):
    drafts = get_drafts()
    for d in drafts:
        if d['year'] == year:
            return jsonify(d)
    return jsonify({'error': 'Draft not found'}), 404


@app.route('/api/drafts', methods=['POST'])
@require_auth
def api_create_draft():
    body = request.json
    if not body:
        return jsonify({'error': 'Request body required'}), 400

    data = load_data('drafts.json')
    drafts = data.get('drafts', [])
    year = int(body.get('year', 2024))

    # Check if draft year already exists
    for d in drafts:
        if d['year'] == year:
            return jsonify({'error': f'Draft for year {year} already exists'}), 409

    new_draft = {
        'year': year,
        'league': body.get('league', 'NBA'),
        'picks': body.get('picks', [])
    }
    drafts.append(new_draft)
    data['drafts'] = drafts
    save_data('drafts.json', data)
    logger.info(f"Created draft: {year}")
    return jsonify(new_draft), 201


@app.route('/api/drafts/<int:year>', methods=['PUT'])
@require_auth
def api_update_draft(year):
    data = load_data('drafts.json')
    drafts = data.get('drafts', [])
    body = request.json
    if not body:
        return jsonify({'error': 'Request body required'}), 400

    found = False
    for i, d in enumerate(drafts):
        if d['year'] == year:
            found = True
            if 'league' in body:
                drafts[i]['league'] = body['league']
            if 'picks' in body:
                drafts[i]['picks'] = body['picks']
            break

    if not found:
        return jsonify({'error': 'Draft not found'}), 404

    data['drafts'] = drafts
    save_data('drafts.json', data)
    logger.info(f"Updated draft: {year}")
    return jsonify({'ok': True})


@app.route('/api/drafts/<int:year>', methods=['DELETE'])
@require_auth
def api_delete_draft(year):
    data = load_data('drafts.json')
    original_count = len(data.get('drafts', []))
    data['drafts'] = [d for d in data['drafts'] if d['year'] != year]

    if len(data['drafts']) == original_count:
        return jsonify({'error': 'Draft not found'}), 404

    save_data('drafts.json', data)
    logger.info(f"Deleted draft: {year}")
    return jsonify({'ok': True})


# --- API: Events (#24) ---
@app.route('/api/events')
def api_events():
    return jsonify(get_events())


@app.route('/api/events/<event_id>')
def api_event(event_id):
    events = get_events()
    for e in events:
        if e['id'] == event_id:
            return jsonify(e)
    return jsonify({'error': 'Event not found'}), 404


@app.route('/api/events', methods=['POST'])
@require_auth
def api_create_event():
    body = request.json
    if not body:
        return jsonify({'error': 'Request body required'}), 400

    data = load_data('events.json')
    events = data.get('events', [])
    counter = len(events) + 1
    new_id = f'event_{counter:03d}'

    new_event = {
        'id': new_id,
        'date': body.get('date', '2024-01-01'),
        'player_id': body.get('player_id', ''),
        'type': body.get('type', 'milestone'),
        'title': body.get('title', 'New Event'),
        'description': body.get('description', ''),
        'tags': body.get('tags', []),
        'media': body.get('media')
    }
    events.append(new_event)
    data['events'] = events
    save_data('events.json', data)
    logger.info(f"Created event: {new_id}")
    return jsonify(new_event), 201


@app.route('/api/events/<event_id>', methods=['PUT'])
@require_auth
def api_update_event(event_id):
    data = load_data('events.json')
    events = data.get('events', [])
    body = request.json
    if not body:
        return jsonify({'error': 'Request body required'}), 400

    found = False
    for i, e in enumerate(events):
        if e['id'] == event_id:
            found = True
            for key in ['date', 'player_id', 'type', 'title', 'description', 'tags', 'media']:
                if key in body:
                    events[i][key] = body[key]
            break

    if not found:
        return jsonify({'error': 'Event not found'}), 404

    data['events'] = events
    save_data('events.json', data)
    logger.info(f"Updated event: {event_id}")
    return jsonify({'ok': True})


@app.route('/api/events/<event_id>', methods=['DELETE'])
@require_auth
def api_delete_event(event_id):
    data = load_data('events.json')
    original_count = len(data.get('events', []))
    data['events'] = [e for e in data['events'] if e['id'] != event_id]

    if len(data['events']) == original_count:
        return jsonify({'error': 'Event not found'}), 404

    save_data('events.json', data)

    # Clean up player lore_events references
    players_data = load_data('players.json')
    for player in players_data.get('players', []):
        if 'lore_events' in player:
            player['lore_events'] = [eid for eid in player['lore_events'] if eid != event_id]
    save_data('players.json', players_data)

    logger.info(f"Deleted event: {event_id}")
    return jsonify({'ok': True})


# --- Static file serving with path traversal protection (#6) ---
@app.route('/')
def index():
    return send_from_directory(PUBLIC_DIR, 'index.html')


@app.route('/<path:path>')
def serve_public(path):
    # Path traversal protection (#6)
    full_path = os.path.normpath(os.path.join(PUBLIC_DIR, path))
    if not full_path.startswith(os.path.normpath(PUBLIC_DIR)):
        return jsonify({'error': 'Forbidden'}), 403
    if os.path.isfile(full_path):
        return send_from_directory(PUBLIC_DIR, path)
    # Proper 404 instead of serving index.html (#55)
    return jsonify({'error': 'Not found'}), 404


# --- Error handlers ---
@app.errorhandler(404)
def not_found(e):
    if request.path.startswith('/api/'):
        return jsonify({'error': 'Not found'}), 404
    return send_from_directory(PUBLIC_DIR, 'index.html')


@app.errorhandler(500)
def server_error(e):
    logger.error(f"Internal server error: {e}")
    return jsonify({'error': 'Internal server error'}), 500


@app.errorhandler(413)
def request_too_large(e):
    return jsonify({'error': 'Request too large (max 2MB)'}), 413


# --- Run ---
if __name__ == '__main__':
    debug = os.environ.get('FLASK_DEBUG', 'false').lower() == 'true'  # (#40)
    port = int(os.environ.get('PORT', 8081))
    logger.info(f"Starting MADCAP on port {port} (debug={debug})")
    app.run(debug=debug, port=port, host='0.0.0.0')
