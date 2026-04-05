import os
import json
import glob
import yaml
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
app.config['MAX_CONTENT_LENGTH'] = 2 * 1024 * 1024

# --- Logging ---
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# --- Paths ---
BASE_DIR = os.path.dirname(os.path.dirname(__file__))
PUBLIC_DIR = os.path.join(BASE_DIR, 'public')
DATA_DIR = os.path.join(BASE_DIR, 'data')
PLAYERS_DIR = os.path.join(DATA_DIR, 'players')
TEAMS_DIR = os.path.join(DATA_DIR, 'teams')
LORE_DIR = os.path.join(DATA_DIR, 'lore')

# --- Auth ---
ADMIN_USER = os.environ.get('ADMIN_USER', 'admin')
ADMIN_PASS = os.environ.get('ADMIN_PASS', 'madcap')

# --- Thread safety ---
file_lock = threading.Lock()

# --- CSRF ---
MAX_CSRF_TOKENS = 100
csrf_tokens = {}


def generate_csrf_token():
    token = secrets.token_hex(32)
    csrf_tokens[token] = datetime.now()
    # Prune old tokens to prevent memory leak
    if len(csrf_tokens) > MAX_CSRF_TOKENS:
        sorted_tokens = sorted(csrf_tokens.items(), key=lambda x: x[1])
        for old_token, _ in sorted_tokens[:len(csrf_tokens) - MAX_CSRF_TOKENS]:
            csrf_tokens.pop(old_token, None)
    return token


def validate_csrf_token(token):
    if token in csrf_tokens:
        del csrf_tokens[token]
        return True
    return False


def require_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if 'authenticated' in session:
            return f(*args, **kwargs)
        auth = request.authorization
        if auth and auth.username == ADMIN_USER and auth.password == ADMIN_PASS:
            return f(*args, **kwargs)
        if request.method in ('POST', 'PUT', 'DELETE'):
            token = request.headers.get('X-CSRF-Token') or request.form.get('csrf_token')
            if token and validate_csrf_token(token) and session.get('authenticated'):
                return f(*args, **kwargs)
        return jsonify({'error': 'Unauthorized'}), 401
    return decorated


# --- YAML Data helpers ---
def load_yaml(filepath):
    try:
        with open(filepath, 'r') as f:
            data = yaml.safe_load(f)
            return data if data else {}
    except FileNotFoundError:
        return {}
    except yaml.YAMLError as e:
        logger.error(f"Invalid YAML in {filepath}: {e}")
        return {}


def save_yaml(filepath, data):
    with file_lock:
        with open(filepath, 'w') as f:
            yaml.dump(data, f, default_flow_style=False, allow_unicode=True, sort_keys=False)
    logger.info(f"Saved {filepath}")


def load_json_file(filepath):
    try:
        with open(filepath, 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        return {}
    except json.JSONDecodeError as e:
        logger.error(f"Invalid JSON in {filepath}: {e}")
        return {}


def save_json_file(filepath, data):
    with file_lock:
        with open(filepath, 'w') as f:
            json.dump(data, f, indent=2)
    logger.info(f"Saved {filepath}")


def get_all_players():
    players = []
    if not os.path.exists(PLAYERS_DIR):
        return players
    for filepath in sorted(glob.glob(os.path.join(PLAYERS_DIR, '*.yaml'))):
        player = load_yaml(filepath)
        if player:
            players.append(player)
    return players


def get_player_by_id(player_id):
    filepath = os.path.join(PLAYERS_DIR, f"{player_id}.yaml")
    return load_yaml(filepath)


def save_player(player):
    filepath = os.path.join(PLAYERS_DIR, f"{player['id']}.yaml")
    save_yaml(filepath, player)


def delete_player_file(player_id):
    filepath = os.path.join(PLAYERS_DIR, f"{player_id}.yaml")
    if os.path.exists(filepath):
        os.remove(filepath)


def get_all_teams():
    teams = []
    if not os.path.exists(TEAMS_DIR):
        return teams
    for filepath in sorted(glob.glob(os.path.join(TEAMS_DIR, '*.yaml'))):
        team = load_yaml(filepath)
        if team:
            teams.append(team)
    return teams


def get_team_by_id(team_id):
    filepath = os.path.join(TEAMS_DIR, f"{team_id}.yaml")
    return load_yaml(filepath)


def save_team(team):
    filepath = os.path.join(TEAMS_DIR, f"{team['id']}.yaml")
    save_yaml(filepath, team)


def delete_team_file(team_id):
    filepath = os.path.join(TEAMS_DIR, f"{team_id}.yaml")
    if os.path.exists(filepath):
        os.remove(filepath)


def get_lore(player_id):
    filepath = os.path.join(LORE_DIR, f"{player_id}.md")
    try:
        with open(filepath, 'r') as f:
            return f.read()
    except FileNotFoundError:
        return ''


def save_lore(player_id, content):
    if not os.path.exists(LORE_DIR):
        os.makedirs(LORE_DIR)
    filepath = os.path.join(LORE_DIR, f"{player_id}.md")
    with open(filepath, 'w') as f:
        f.write(content)


def get_leagues():
    return load_json_file(os.path.join(DATA_DIR, 'leagues.json')).get('leagues', [])


def get_games():
    return load_json_file(os.path.join(DATA_DIR, 'games.json')).get('games', [])


def get_drafts():
    return load_json_file(os.path.join(DATA_DIR, 'drafts.json')).get('drafts', [])


def get_events():
    return load_json_file(os.path.join(DATA_DIR, 'events.json')).get('events', [])


def get_transactions():
    return load_json_file(os.path.join(DATA_DIR, 'transactions.json')).get('transactions', [])


def get_injuries():
    return load_json_file(os.path.join(DATA_DIR, 'injuries.json')).get('injuries', [])


def get_awards():
    return load_json_file(os.path.join(DATA_DIR, 'awards.json'))


def get_mock_drafts():
    return load_json_file(os.path.join(DATA_DIR, 'mock_drafts.json')).get('mock_drafts', [])


def get_seasons():
    return load_json_file(os.path.join(DATA_DIR, 'seasons.json')).get('seasons', [])


# --- Validation ---
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


# --- Auth routes ---
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


@app.route('/admin/logout')
def admin_logout():
    session.pop('authenticated', None)
    return redirect(url_for('admin_login'))


@app.route('/health')
def health_check():
    return jsonify({'status': 'ok', 'timestamp': datetime.now().isoformat()})


# ============================================
# API: Players (YAML per-file)
# ============================================
@app.route('/api/players')
def api_players():
    return jsonify(get_all_players())


@app.route('/api/players/<player_id>')
def api_player(player_id):
    player = get_player_by_id(player_id)
    if not player:
        return jsonify({'error': 'Player not found'}), 404
    return jsonify(player)


@app.route('/api/players', methods=['POST'])
@require_auth
def api_create_player():
    body = request.json
    if not body:
        return jsonify({'error': 'Request body required'}), 400

    name, err = validate_string(body.get('name'), 'name', required=True)
    if err:
        return jsonify({'error': err}), 400

    is_fictional = body.get('is_fictional', False)

    if is_fictional:
        player_id = body.get('id', name.lower().replace(' ', '_'))
        new_player = {
            'id': player_id,
            'name': name,
            'position': body.get('position', 'PG'),
            'height': body.get('height', '6\'0"'),
            'weight': int(body.get('weight', 180)),
            'birthdate': body.get('birthdate', '2000-01-01'),
            'nationality': body.get('nationality', 'USA'),
            'overall': int(body.get('overall', 70)),
            'archetype': body.get('archetype', 'All-Around'),
            'status': body.get('status', 'active'),
            'is_fictional': True,
            'avatar_url': body.get('avatar_url', ''),
            'career': {
                'highschool': {'school': '', 'state': '', 'seasons': [], 'awards': []},
                'college': {'school': '', 'conference': '', 'division': '', 'seasons': [], 'awards': []},
                'pro': []
            },
            'draft': {
                'year': body.get('draft_year', 2024),
                'league': body.get('draft_league', 'NBA'),
                'round': body.get('draft_round', 1),
                'pick': body.get('draft_pick', 1),
                'team_id': body.get('draft_team', '')
            },
            'media': [],
            'notes': body.get('notes', '')
        }
    else:
        player_id = body.get('id', name.lower().replace(' ', '_'))
        new_player = {
            'id': player_id,
            'name': name,
            'position': body.get('position', 'PG'),
            'height': body.get('height', ''),
            'weight': body.get('weight', 0),
            'overall': int(body.get('overall', 70)),
            'team_id': body.get('team_id', ''),
            'is_fictional': False,
            'bio': body.get('bio', '')
        }

    save_player(new_player)
    logger.info(f"Created player: {player_id}")
    return jsonify(new_player), 201


@app.route('/api/players/<player_id>', methods=['PUT'])
@require_auth
def api_update_player(player_id):
    player = get_player_by_id(player_id)
    if not player:
        return jsonify({'error': 'Player not found'}), 404

    body = request.json
    if not body:
        return jsonify({'error': 'Request body required'}), 400

    for key in ['name', 'position', 'height', 'nationality', 'archetype', 'status', 'notes', 'bio', 'team_id', 'avatar_url']:
        if key in body:
            player[key] = body[key]
    if 'weight' in body:
        player['weight'] = int(body['weight'])
    if 'overall' in body:
        player['overall'] = int(body['overall'])
    if 'is_fictional' in body:
        player['is_fictional'] = bool(body['is_fictional'])

    save_player(player)
    logger.info(f"Updated player: {player_id}")
    return jsonify({'ok': True})


@app.route('/api/players/<player_id>', methods=['DELETE'])
@require_auth
def api_delete_player(player_id):
    player = get_player_by_id(player_id)
    if not player:
        return jsonify({'error': 'Player not found'}), 404

    delete_player_file(player_id)

    lore_path = os.path.join(LORE_DIR, f"{player_id}.md")
    if os.path.exists(lore_path):
        os.remove(lore_path)

    cleanup_player_references(player_id)
    logger.info(f"Deleted player: {player_id}")
    return jsonify({'ok': True})


# --- Player Lore (Markdown) ---
@app.route('/api/players/<player_id>/lore')
def api_get_lore(player_id):
    content = get_lore(player_id)
    return jsonify({'player_id': player_id, 'content': content})


@app.route('/api/players/<player_id>/lore', methods=['PUT'])
@require_auth
def api_save_lore(player_id):
    body = request.json
    if not body or 'content' not in body:
        return jsonify({'error': 'Content required'}), 400
    save_lore(player_id, body['content'])
    return jsonify({'ok': True})


# --- Player Career: Add/Update/Delete Seasons ---
@app.route('/api/players/<player_id>/career/<level>/<int:season_idx>', methods=['PUT'])
@require_auth
def api_update_season(player_id, level, season_idx):
    player = get_player_by_id(player_id)
    if not player:
        return jsonify({'error': 'Player not found'}), 404
    if not player.get('is_fictional'):
        return jsonify({'error': 'Cannot edit seasons for NPC players'}), 400

    body = request.json
    if not body:
        return jsonify({'error': 'Request body required'}), 400

    career = player.get('career', {})
    if level == 'pro':
        team_idx = body.get('team_idx', 0)
        pro_entries = career.get('pro', [])
        if team_idx >= len(pro_entries):
            return jsonify({'error': 'Team entry not found'}), 404
        seasons = pro_entries[team_idx].get('seasons', [])
        if season_idx >= len(seasons):
            return jsonify({'error': 'Season not found'}), 404
        for key in ['year', 'ppg', 'apg', 'rpg', 'spg', 'bpg', 'fg_pct', 'fg3_pct', 'ft_pct', 'gp', 'gs', 'mpg']:
            if key in body:
                seasons[season_idx][key] = body[key]
        pro_entries[team_idx]['seasons'] = seasons
        career['pro'] = pro_entries
    elif level == 'college':
        seasons = career.get('college', {}).get('seasons', [])
        if season_idx >= len(seasons):
            return jsonify({'error': 'Season not found'}), 404
        for key in ['year', 'ppg', 'apg', 'rpg', 'spg', 'bpg', 'fg_pct', 'fg3_pct', 'ft_pct', 'gp', 'gs', 'mpg']:
            if key in body:
                seasons[season_idx][key] = body[key]
        career['college']['seasons'] = seasons
    elif level == 'highschool':
        seasons = career.get('highschool', {}).get('seasons', [])
        if season_idx >= len(seasons):
            return jsonify({'error': 'Season not found'}), 404
        for key in ['year', 'ppg', 'apg', 'rpg', 'spg', 'bpg', 'fg_pct', 'fg3_pct', 'ft_pct']:
            if key in body:
                seasons[season_idx][key] = body[key]
        career['highschool']['seasons'] = seasons
    else:
        return jsonify({'error': 'Invalid level'}), 400

    player['career'] = career
    save_player(player)
    return jsonify({'ok': True})


@app.route('/api/players/<player_id>/career/<level>', methods=['POST'])
@require_auth
def api_add_season(player_id, level):
    player = get_player_by_id(player_id)
    if not player:
        return jsonify({'error': 'Player not found'}), 404
    if not player.get('is_fictional'):
        return jsonify({'error': 'Cannot add seasons for NPC players'}), 400

    body = request.json
    if not body:
        return jsonify({'error': 'Request body required'}), 400

    career = player.get('career', {})

    if level == 'pro':
        team_id = body.get('team_id', '')
        league = body.get('league', 'NBA')
        pro_entries = career.get('pro', [])
        existing = None
        for entry in pro_entries:
            if entry.get('team_id') == team_id:
                existing = entry
                break
        if existing:
            existing['seasons'].append(body.get('season', {}))
        else:
            pro_entries.append({
                'team_id': team_id,
                'league': league,
                'seasons': [body.get('season', {})]
            })
        career['pro'] = pro_entries
    elif level == 'college':
        new_season = body.get('season', {})
        career.setdefault('college', {})['seasons'] = career.get('college', {}).get('seasons', []) + [new_season]
        if body.get('school'):
            career['college']['school'] = body['school']
        if body.get('conference'):
            career['college']['conference'] = body['conference']
        if body.get('division'):
            career['college']['division'] = body['division']
    elif level == 'highschool':
        new_season = body.get('season', {})
        career.setdefault('highschool', {})['seasons'] = career.get('highschool', {}).get('seasons', []) + [new_season]
        if body.get('school'):
            career['highschool']['school'] = body['school']
        if body.get('state'):
            career['highschool']['state'] = body['state']
    else:
        return jsonify({'error': 'Invalid level'}), 400

    player['career'] = career
    save_player(player)
    return jsonify({'ok': True}), 201


@app.route('/api/players/<player_id>/career/<level>/<int:season_idx>', methods=['DELETE'])
@require_auth
def api_delete_season(player_id, level, season_idx):
    player = get_player_by_id(player_id)
    if not player:
        return jsonify({'error': 'Player not found'}), 404

    career = player.get('career', {})
    if level == 'pro':
        team_idx = request.json.get('team_idx', 0) if request.json else 0
        pro_entries = career.get('pro', [])
        if team_idx < len(pro_entries):
            seasons = pro_entries[team_idx].get('seasons', [])
            if season_idx < len(seasons):
                seasons.pop(season_idx)
                pro_entries[team_idx]['seasons'] = seasons
                career['pro'] = pro_entries
    elif level == 'college':
        seasons = career.get('college', {}).get('seasons', [])
        if season_idx < len(seasons):
            seasons.pop(season_idx)
            career['college']['seasons'] = seasons
    elif level == 'highschool':
        seasons = career.get('highschool', {}).get('seasons', [])
        if season_idx < len(seasons):
            seasons.pop(season_idx)
            career['highschool']['seasons'] = seasons

    player['career'] = career
    save_player(player)
    return jsonify({'ok': True})


# --- Player Game Log ---
@app.route('/api/players/<player_id>/games', methods=['POST'])
@require_auth
def api_add_game(player_id):
    player = get_player_by_id(player_id)
    if not player:
        return jsonify({'error': 'Player not found'}), 404
    if not player.get('is_fictional'):
        return jsonify({'error': 'Cannot add games for NPC players'}), 400

    body = request.json
    if not body:
        return jsonify({'error': 'Request body required'}), 400

    career = player.get('career', {})
    level = body.get('level', 'pro')
    year = body.get('year', '')
    team_id = body.get('team_id', '')

    game_entry = {
        'date': body.get('date', ''),
        'opponent': body.get('opponent', ''),
        'pts': body.get('pts', 0),
        'ast': body.get('ast', 0),
        'reb': body.get('reb', 0),
        'stl': body.get('stl', 0),
        'blk': body.get('blk', 0),
        'fg_made': body.get('fg_made', 0),
        'fg_att': body.get('fg_att', 0),
        'fg3_made': body.get('fg3_made', 0),
        'fg3_att': body.get('fg3_att', 0),
        'ft_made': body.get('ft_made', 0),
        'ft_att': body.get('ft_att', 0),
        'mins': body.get('mins', 0),
        'result': body.get('result', '')
    }

    if level == 'pro':
        pro_entries = career.get('pro', [])
        for entry in pro_entries:
            if entry.get('team_id') == team_id:
                for season in entry.get('seasons', []):
                    if season.get('year') == year:
                        season.setdefault('games', []).append(game_entry)
                        player['career'] = career
                        save_player(player)
                        return jsonify({'ok': True}), 201
        return jsonify({'error': 'Team/season not found'}), 404
    elif level == 'college':
        for season in career.get('college', {}).get('seasons', []):
            if season.get('year') == year:
                season.setdefault('games', []).append(game_entry)
                player['career'] = career
                save_player(player)
                return jsonify({'ok': True}), 201
    elif level == 'highschool':
        for season in career.get('highschool', {}).get('seasons', []):
            if season.get('year') == year:
                season.setdefault('games', []).append(game_entry)
                player['career'] = career
                save_player(player)
                return jsonify({'ok': True}), 201

    return jsonify({'error': 'Season not found'}), 404


@app.route('/api/players/<player_id>/games/<level>/<int:season_idx>/<int:game_idx>', methods=['PUT'])
@require_auth
def api_update_player_game(player_id, level, season_idx, game_idx):
    player = get_player_by_id(player_id)
    if not player:
        return jsonify({'error': 'Player not found'}), 404

    body = request.json
    if not body:
        return jsonify({'error': 'Request body required'}), 400

    career = player.get('career', {})
    games = _get_games_list(career, level, season_idx)
    if games is None or game_idx >= len(games):
        return jsonify({'error': 'Game not found'}), 404

    for key in ['date', 'opponent', 'pts', 'ast', 'reb', 'stl', 'blk', 'fg_made', 'fg_att', 'fg3_made', 'fg3_att', 'ft_made', 'ft_att', 'mins', 'result']:
        if key in body:
            games[game_idx][key] = body[key]

    _save_games_list(career, level, season_idx, games, body)
    player['career'] = career
    save_player(player)
    return jsonify({'ok': True})


@app.route('/api/players/<player_id>/games/<level>/<int:season_idx>/<int:game_idx>', methods=['DELETE'])
@require_auth
def api_delete_player_game(player_id, level, season_idx, game_idx):
    player = get_player_by_id(player_id)
    if not player:
        return jsonify({'error': 'Player not found'}), 404

    career = player.get('career', {})
    games = _get_games_list(career, level, season_idx)
    if games is None or game_idx >= len(games):
        return jsonify({'error': 'Game not found'}), 404

    games.pop(game_idx)
    _save_games_list(career, level, season_idx, games, request.json or {})
    player['career'] = career
    save_player(player)
    return jsonify({'ok': True})


def _get_games_list(career, level, season_idx):
    if level == 'pro':
        team_idx = 0
        pro_entries = career.get('pro', [])
        if team_idx < len(pro_entries):
            seasons = pro_entries[team_idx].get('seasons', [])
            if season_idx < len(seasons):
                return seasons[season_idx].setdefault('games', [])
    elif level == 'college':
        seasons = career.get('college', {}).get('seasons', [])
        if season_idx < len(seasons):
            return seasons[season_idx].setdefault('games', [])
    elif level == 'highschool':
        seasons = career.get('highschool', {}).get('seasons', [])
        if season_idx < len(seasons):
            return seasons[season_idx].setdefault('games', [])
    return None


def _save_games_list(career, level, season_idx, games, body):
    if level == 'pro':
        team_idx = body.get('team_idx', 0)
        pro_entries = career.get('pro', [])
        if team_idx < len(pro_entries):
            seasons = pro_entries[team_idx].get('seasons', [])
            if season_idx < len(seasons):
                seasons[season_idx]['games'] = games
                pro_entries[team_idx]['seasons'] = seasons
                career['pro'] = pro_entries
    elif level == 'college':
        seasons = career.get('college', {}).get('seasons', [])
        if season_idx < len(seasons):
            seasons[season_idx]['games'] = games
            career['college']['seasons'] = seasons
    elif level == 'highschool':
        seasons = career.get('highschool', {}).get('seasons', [])
        if season_idx < len(seasons):
            seasons[season_idx]['games'] = games
            career['highschool']['seasons'] = seasons


# --- Player Media ---
@app.route('/api/players/<player_id>/media', methods=['POST'])
@require_auth
def api_add_media(player_id):
    player = get_player_by_id(player_id)
    if not player:
        return jsonify({'error': 'Player not found'}), 404

    body = request.json
    if not body:
        return jsonify({'error': 'Request body required'}), 400

    media_entry = {
        'date': body.get('date', ''),
        'type': body.get('type', 'news'),
        'headline': body.get('headline', ''),
        'content': body.get('content', ''),
        'source': body.get('source', '')
    }

    player.setdefault('media', []).append(media_entry)
    save_player(player)
    return jsonify({'ok': True}), 201


@app.route('/api/players/<player_id>/media/<int:idx>', methods=['PUT'])
@require_auth
def api_update_media(player_id, idx):
    player = get_player_by_id(player_id)
    if not player:
        return jsonify({'error': 'Player not found'}), 404

    body = request.json
    if not body:
        return jsonify({'error': 'Request body required'}), 400

    media_list = player.get('media', [])
    if idx >= len(media_list):
        return jsonify({'error': 'Media entry not found'}), 404

    for key in ['date', 'type', 'headline', 'content', 'source']:
        if key in body:
            media_list[idx][key] = body[key]

    player['media'] = media_list
    save_player(player)
    return jsonify({'ok': True})


@app.route('/api/players/<player_id>/media/<int:idx>', methods=['DELETE'])
@require_auth
def api_delete_media(player_id, idx):
    player = get_player_by_id(player_id)
    if not player:
        return jsonify({'error': 'Player not found'}), 404

    media_list = player.get('media', [])
    if idx >= len(media_list):
        return jsonify({'error': 'Media entry not found'}), 404

    media_list.pop(idx)
    player['media'] = media_list
    save_player(player)
    return jsonify({'ok': True})


# --- Player Awards ---
@app.route('/api/players/<player_id>/awards/<level>/<int:season_idx>', methods=['POST'])
@require_auth
def api_add_award(player_id, level, season_idx):
    player = get_player_by_id(player_id)
    if not player:
        return jsonify({'error': 'Player not found'}), 404

    body = request.json
    if not body or 'award' not in body:
        return jsonify({'error': 'Award text required'}), 400

    career = player.get('career', {})
    if level == 'pro':
        team_idx = body.get('team_idx', 0)
        pro_entries = career.get('pro', [])
        if team_idx < len(pro_entries):
            seasons = pro_entries[team_idx].get('seasons', [])
            if season_idx < len(seasons):
                seasons[season_idx].setdefault('awards', []).append(body['award'])
                pro_entries[team_idx]['seasons'] = seasons
                career['pro'] = pro_entries
    elif level == 'college':
        seasons = career.get('college', {}).get('seasons', [])
        if season_idx < len(seasons):
            seasons[season_idx].setdefault('awards', []).append(body['award'])
            career['college']['seasons'] = seasons
    elif level == 'highschool':
        seasons = career.get('highschool', {}).get('seasons', [])
        if season_idx < len(seasons):
            seasons[season_idx].setdefault('awards', []).append(body['award'])
            career['highschool']['seasons'] = seasons

    player['career'] = career
    save_player(player)
    return jsonify({'ok': True}), 201


# ============================================
# API: Teams (YAML per-file)
# ============================================
@app.route('/api/teams')
def api_teams():
    return jsonify(get_all_teams())


@app.route('/api/teams/<team_id>')
def api_team(team_id):
    team = get_team_by_id(team_id)
    if not team:
        return jsonify({'error': 'Team not found'}), 404
    return jsonify(team)


@app.route('/api/teams', methods=['POST'])
@require_auth
def api_create_team():
    body = request.json
    if not body:
        return jsonify({'error': 'Request body required'}), 400

    name, err = validate_string(body.get('name'), 'name', required=True)
    if err:
        return jsonify({'error': err}), 400

    new_id = body.get('id', f"{body.get('league', 'NBA').lower()}_{body.get('abbreviation', 'XXX').lower()}")

    if get_team_by_id(new_id):
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
        'colors': body.get('colors', ['#000000', '#FFFFFF']),
        'current_season': {
            'year': body.get('season_year', '2024-25'),
            'wins': int(body.get('wins', 0)),
            'losses': int(body.get('losses', 0)),
            'win_pct': float(body.get('win_pct', 0.0)),
            'conference_rank': int(body.get('conference_rank', 0)),
            'division_rank': int(body.get('division_rank', 0))
        },
        'roster': body.get('roster', []),
        'depth_chart': body.get('depth_chart', {'PG': [], 'SG': [], 'SF': [], 'PF': [], 'C': []}),
        'staff': {
            'head_coach': body.get('head_coach', ''),
            'gm': body.get('gm', '')
        }
    }

    save_team(new_team)
    logger.info(f"Created team: {new_id}")
    return jsonify(new_team), 201


@app.route('/api/teams/<team_id>', methods=['PUT'])
@require_auth
def api_update_team(team_id):
    team = get_team_by_id(team_id)
    if not team:
        return jsonify({'error': 'Team not found'}), 404

    body = request.json
    if not body:
        return jsonify({'error': 'Request body required'}), 400

    for key in ['name', 'abbreviation', 'league', 'conference', 'division', 'city', 'state', 'arena', 'roster', 'depth_chart']:
        if key in body:
            team[key] = body[key]
    if 'founded' in body:
        team['founded'] = int(body['founded'])
    if 'head_coach' in body or 'gm' in body:
        team['staff'] = {
            'head_coach': body.get('head_coach', team.get('staff', {}).get('head_coach', '')),
            'gm': body.get('gm', team.get('staff', {}).get('gm', ''))
        }
    if 'colors' in body:
        team['colors'] = body['colors']
    if 'current_season' in body:
        team['current_season'] = body['current_season']

    save_team(team)
    logger.info(f"Updated team: {team_id}")
    return jsonify({'ok': True})


@app.route('/api/teams/<team_id>', methods=['DELETE'])
@require_auth
def api_delete_team(team_id):
    team = get_team_by_id(team_id)
    if not team:
        return jsonify({'error': 'Team not found'}), 404

    delete_team_file(team_id)
    cleanup_team_references(team_id)
    logger.info(f"Deleted team: {team_id}")
    return jsonify({'ok': True})


# ============================================
# API: Games, Leagues, Drafts, Events (JSON)
# ============================================
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

    games = get_games()
    existing_ids = {g['id'] for g in games}
    counter = len(games) + 1
    new_id = f'game_{counter:03d}'
    while new_id in existing_ids:
        counter += 1
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
    save_json_file(os.path.join(DATA_DIR, 'games.json'), {'games': games})
    return jsonify(new_game), 201


@app.route('/api/games/<game_id>', methods=['PUT'])
@require_auth
def api_update_game(game_id):
    games = get_games()
    body = request.json
    if not body:
        return jsonify({'error': 'Request body required'}), 400

    for i, g in enumerate(games):
        if g['id'] == game_id:
            for key in ['date', 'time', 'league', 'season', 'home_team_id', 'away_team_id', 'status', 'venue', 'box_score']:
                if key in body:
                    games[i][key] = body[key]
            if 'home_score' in body:
                games[i]['home_score'] = int(body['home_score'])
            if 'away_score' in body:
                games[i]['away_score'] = int(body['away_score'])
            if 'attendance' in body:
                games[i]['attendance'] = body['attendance']
            save_json_file(os.path.join(DATA_DIR, 'games.json'), {'games': games})
            return jsonify({'ok': True})

    return jsonify({'error': 'Game not found'}), 404


@app.route('/api/games/<game_id>', methods=['DELETE'])
@require_auth
def api_delete_game(game_id):
    games = get_games()
    filtered = [g for g in games if g['id'] != game_id]
    if len(filtered) == len(games):
        return jsonify({'error': 'Game not found'}), 404
    save_json_file(os.path.join(DATA_DIR, 'games.json'), {'games': filtered})
    return jsonify({'ok': True})


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

    leagues = get_leagues()
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
    save_json_file(os.path.join(DATA_DIR, 'leagues.json'), {'leagues': leagues})
    return jsonify(new_league), 201


@app.route('/api/leagues/<league_id>', methods=['PUT'])
@require_auth
def api_update_league(league_id):
    leagues = get_leagues()
    body = request.json
    if not body:
        return jsonify({'error': 'Request body required'}), 400

    for i, l in enumerate(leagues):
        if l['id'] == league_id:
            for key in ['name', 'abbreviation', 'level', 'country', 'current_season', 'teams', 'standings']:
                if key in body:
                    leagues[i][key] = body[key]
            save_json_file(os.path.join(DATA_DIR, 'leagues.json'), {'leagues': leagues})
            return jsonify({'ok': True})

    return jsonify({'error': 'League not found'}), 404


@app.route('/api/leagues/<league_id>', methods=['DELETE'])
@require_auth
def api_delete_league(league_id):
    leagues = get_leagues()
    filtered = [l for l in leagues if l['id'] != league_id]
    if len(filtered) == len(leagues):
        return jsonify({'error': 'League not found'}), 404
    save_json_file(os.path.join(DATA_DIR, 'leagues.json'), {'leagues': filtered})
    return jsonify({'ok': True})


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

    drafts = get_drafts()
    year = int(body.get('year', 2024))

    if any(d['year'] == year for d in drafts):
        return jsonify({'error': f'Draft for year {year} already exists'}), 409

    new_draft = {
        'year': year,
        'league': body.get('league', 'NBA'),
        'picks': body.get('picks', [])
    }
    drafts.append(new_draft)
    save_json_file(os.path.join(DATA_DIR, 'drafts.json'), {'drafts': drafts})
    return jsonify(new_draft), 201


@app.route('/api/drafts/<int:year>', methods=['PUT'])
@require_auth
def api_update_draft(year):
    drafts = get_drafts()
    body = request.json
    if not body:
        return jsonify({'error': 'Request body required'}), 400

    for i, d in enumerate(drafts):
        if d['year'] == year:
            if 'league' in body:
                drafts[i]['league'] = body['league']
            if 'picks' in body:
                drafts[i]['picks'] = body['picks']
            save_json_file(os.path.join(DATA_DIR, 'drafts.json'), {'drafts': drafts})
            return jsonify({'ok': True})

    return jsonify({'error': 'Draft not found'}), 404


@app.route('/api/drafts/<int:year>', methods=['DELETE'])
@require_auth
def api_delete_draft(year):
    drafts = get_drafts()
    filtered = [d for d in drafts if d['year'] != year]
    if len(filtered) == len(drafts):
        return jsonify({'error': 'Draft not found'}), 404
    save_json_file(os.path.join(DATA_DIR, 'drafts.json'), {'drafts': filtered})
    return jsonify({'ok': True})


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

    events = get_events()
    existing_ids = {e['id'] for e in events}
    counter = len(events) + 1
    new_id = f'event_{counter:03d}'
    while new_id in existing_ids:
        counter += 1
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
    save_json_file(os.path.join(DATA_DIR, 'events.json'), {'events': events})
    return jsonify(new_event), 201


@app.route('/api/events/<event_id>', methods=['PUT'])
@require_auth
def api_update_event(event_id):
    events = get_events()
    body = request.json
    if not body:
        return jsonify({'error': 'Request body required'}), 400

    for i, e in enumerate(events):
        if e['id'] == event_id:
            for key in ['date', 'player_id', 'type', 'title', 'description', 'tags', 'media']:
                if key in body:
                    events[i][key] = body[key]
            save_json_file(os.path.join(DATA_DIR, 'events.json'), {'events': events})
            return jsonify({'ok': True})

    return jsonify({'error': 'Event not found'}), 404


@app.route('/api/events/<event_id>', methods=['DELETE'])
@require_auth
def api_delete_event(event_id):
    events = get_events()
    filtered = [e for e in events if e['id'] != event_id]
    if len(filtered) == len(events):
        return jsonify({'error': 'Event not found'}), 404
    save_json_file(os.path.join(DATA_DIR, 'events.json'), {'events': filtered})
    return jsonify({'ok': True})


# ============================================
# API: Transactions (JSON)
# ============================================
@app.route('/api/transactions')
def api_transactions():
    return jsonify(get_transactions())


@app.route('/api/transactions', methods=['POST'])
@require_auth
def api_create_transaction():
    body = request.json
    if not body:
        return jsonify({'error': 'Request body required'}), 400

    txns = get_transactions()
    existing_ids = {t['id'] for t in txns}
    counter = len(txns) + 1
    new_id = f'txn_{counter:03d}'
    while new_id in existing_ids:
        counter += 1
        new_id = f'txn_{counter:03d}'

    new_txn = {
        'id': new_id,
        'date': body.get('date', ''),
        'type': body.get('type', 'signed'),
        'player_id': body.get('player_id', ''),
        'from_team_id': body.get('from_team_id', ''),
        'to_team_id': body.get('to_team_id', ''),
        'details': body.get('details', '')
    }
    txns.append(new_txn)
    save_json_file(os.path.join(DATA_DIR, 'transactions.json'), {'transactions': txns})
    return jsonify(new_txn), 201


@app.route('/api/transactions/<txn_id>', methods=['PUT'])
@require_auth
def api_update_transaction(txn_id):
    txns = get_transactions()
    body = request.json
    if not body:
        return jsonify({'error': 'Request body required'}), 400

    for i, t in enumerate(txns):
        if t['id'] == txn_id:
            for key in ['date', 'type', 'player_id', 'from_team_id', 'to_team_id', 'details']:
                if key in body:
                    txns[i][key] = body[key]
            save_json_file(os.path.join(DATA_DIR, 'transactions.json'), {'transactions': txns})
            return jsonify({'ok': True})
    return jsonify({'error': 'Transaction not found'}), 404


@app.route('/api/transactions/<txn_id>', methods=['DELETE'])
@require_auth
def api_delete_transaction(txn_id):
    txns = get_transactions()
    filtered = [t for t in txns if t['id'] != txn_id]
    if len(filtered) == len(txns):
        return jsonify({'error': 'Transaction not found'}), 404
    save_json_file(os.path.join(DATA_DIR, 'transactions.json'), {'transactions': filtered})
    return jsonify({'ok': True})


# --- Player-specific transactions ---
@app.route('/api/players/<player_id>/transactions')
def api_player_transactions(player_id):
    player = get_player_by_id(player_id)
    if not player:
        return jsonify({'error': 'Player not found'}), 404
    return jsonify(player.get('transactions', []))


@app.route('/api/players/<player_id>/transactions', methods=['POST'])
@require_auth
def api_add_player_transaction(player_id):
    player = get_player_by_id(player_id)
    if not player:
        return jsonify({'error': 'Player not found'}), 404
    body = request.json
    if not body:
        return jsonify({'error': 'Request body required'}), 400
    txn = {
        'date': body.get('date', ''),
        'type': body.get('type', 'signed'),
        'from_team_id': body.get('from_team_id', ''),
        'to_team_id': body.get('to_team_id', ''),
        'details': body.get('details', '')
    }
    player.setdefault('transactions', []).append(txn)
    save_player(player)
    return jsonify({'ok': True}), 201


# ============================================
# API: Injuries (JSON)
# ============================================
@app.route('/api/injuries')
def api_injuries():
    return jsonify(get_injuries())


@app.route('/api/injuries', methods=['POST'])
@require_auth
def api_create_injury():
    body = request.json
    if not body:
        return jsonify({'error': 'Request body required'}), 400

    injuries = get_injuries()
    existing_ids = {inj['id'] for inj in injuries}
    counter = len(injuries) + 1
    new_id = f'inj_{counter:03d}'
    while new_id in existing_ids:
        counter += 1
        new_id = f'inj_{counter:03d}'

    new_inj = {
        'id': new_id,
        'player_id': body.get('player_id', ''),
        'date': body.get('date', ''),
        'type': body.get('type', ''),
        'severity': body.get('severity', 'minor'),
        'games_missed': int(body.get('games_missed', 0)),
        'return_date': body.get('return_date'),
        'status': body.get('status', 'active'),
        'notes': body.get('notes', '')
    }
    injuries.append(new_inj)
    save_json_file(os.path.join(DATA_DIR, 'injuries.json'), {'injuries': injuries})
    return jsonify(new_inj), 201


@app.route('/api/injuries/<inj_id>', methods=['PUT'])
@require_auth
def api_update_injury(inj_id):
    injuries = get_injuries()
    body = request.json
    if not body:
        return jsonify({'error': 'Request body required'}), 400

    for i, inj in enumerate(injuries):
        if inj['id'] == inj_id:
            for key in ['player_id', 'date', 'type', 'severity', 'return_date', 'status', 'notes']:
                if key in body:
                    injuries[i][key] = body[key]
            if 'games_missed' in body:
                injuries[i]['games_missed'] = int(body['games_missed'])
            save_json_file(os.path.join(DATA_DIR, 'injuries.json'), {'injuries': injuries})
            return jsonify({'ok': True})
    return jsonify({'error': 'Injury not found'}), 404


@app.route('/api/injuries/<inj_id>', methods=['DELETE'])
@require_auth
def api_delete_injury(inj_id):
    injuries = get_injuries()
    filtered = [inj for inj in injuries if inj['id'] != inj_id]
    if len(filtered) == len(injuries):
        return jsonify({'error': 'Injury not found'}), 404
    save_json_file(os.path.join(DATA_DIR, 'injuries.json'), {'injuries': filtered})
    return jsonify({'ok': True})


# --- Player-specific injuries ---
@app.route('/api/players/<player_id>/injuries')
def api_player_injuries(player_id):
    player = get_player_by_id(player_id)
    if not player:
        return jsonify({'error': 'Player not found'}), 404
    return jsonify(player.get('injuries', []))


@app.route('/api/players/<player_id>/injuries', methods=['POST'])
@require_auth
def api_add_player_injury(player_id):
    player = get_player_by_id(player_id)
    if not player:
        return jsonify({'error': 'Player not found'}), 404
    body = request.json
    if not body:
        return jsonify({'error': 'Request body required'}), 400
    inj = {
        'date': body.get('date', ''),
        'type': body.get('type', ''),
        'severity': body.get('severity', 'minor'),
        'games_missed': int(body.get('games_missed', 0)),
        'return_date': body.get('return_date'),
        'notes': body.get('notes', '')
    }
    player.setdefault('injuries', []).append(inj)
    save_player(player)
    return jsonify({'ok': True}), 201


@app.route('/api/players/<player_id>/injuries/<int:idx>', methods=['PUT'])
@require_auth
def api_update_player_injury(player_id, idx):
    player = get_player_by_id(player_id)
    if not player:
        return jsonify({'error': 'Player not found'}), 404
    body = request.json
    if not body:
        return jsonify({'error': 'Request body required'}), 400
    injuries = player.get('injuries', [])
    if idx >= len(injuries):
        return jsonify({'error': 'Injury entry not found'}), 404
    for key in ['date', 'type', 'severity', 'return_date', 'notes']:
        if key in body:
            injuries[idx][key] = body[key]
    if 'games_missed' in body:
        injuries[idx]['games_missed'] = int(body['games_missed'])
    player['injuries'] = injuries
    save_player(player)
    return jsonify({'ok': True})


@app.route('/api/players/<player_id>/injuries/<int:idx>', methods=['DELETE'])
@require_auth
def api_delete_player_injury(player_id, idx):
    player = get_player_by_id(player_id)
    if not player:
        return jsonify({'error': 'Player not found'}), 404
    injuries = player.get('injuries', [])
    if idx >= len(injuries):
        return jsonify({'error': 'Injury entry not found'}), 404
    injuries.pop(idx)
    player['injuries'] = injuries
    save_player(player)
    return jsonify({'ok': True})


# ============================================
# API: Awards (JSON)
# ============================================
@app.route('/api/awards')
def api_awards():
    return jsonify(get_awards())


# --- Player-specific awards ---
@app.route('/api/players/<player_id>/awards')
def api_player_awards(player_id):
    player = get_player_by_id(player_id)
    if not player:
        return jsonify({'error': 'Player not found'}), 404
    return jsonify(player.get('awards', []))


@app.route('/api/players/<player_id>/awards', methods=['POST'])
@require_auth
def api_add_player_award(player_id):
    player = get_player_by_id(player_id)
    if not player:
        return jsonify({'error': 'Player not found'}), 404
    body = request.json
    if not body:
        return jsonify({'error': 'Request body required'}), 400
    award = {
        'year': body.get('year', ''),
        'name': body.get('name', ''),
        'league': body.get('league', 'NBA')
    }
    player.setdefault('awards', []).append(award)
    save_player(player)
    return jsonify({'ok': True}), 201


@app.route('/api/players/<player_id>/awards/<int:idx>', methods=['PUT'])
@require_auth
def api_update_player_award(player_id, idx):
    player = get_player_by_id(player_id)
    if not player:
        return jsonify({'error': 'Player not found'}), 404
    body = request.json
    if not body:
        return jsonify({'error': 'Request body required'}), 400
    awards = player.get('awards', [])
    if idx >= len(awards):
        return jsonify({'error': 'Award entry not found'}), 404
    for key in ['year', 'name', 'league']:
        if key in body:
            awards[idx][key] = body[key]
    player['awards'] = awards
    save_player(player)
    return jsonify({'ok': True})


@app.route('/api/players/<player_id>/awards/<int:idx>', methods=['DELETE'])
@require_auth
def api_delete_player_award(player_id, idx):
    player = get_player_by_id(player_id)
    if not player:
        return jsonify({'error': 'Player not found'}), 404
    awards = player.get('awards', [])
    if idx >= len(awards):
        return jsonify({'error': 'Award entry not found'}), 404
    awards.pop(idx)
    player['awards'] = awards
    save_player(player)
    return jsonify({'ok': True})


# ============================================
# API: Player Attributes, Badges, Contract
# ============================================
@app.route('/api/players/<player_id>/attributes')
def api_player_attributes(player_id):
    player = get_player_by_id(player_id)
    if not player:
        return jsonify({'error': 'Player not found'}), 404
    return jsonify(player.get('attributes', {}))


@app.route('/api/players/<player_id>/attributes', methods=['PUT'])
@require_auth
def api_update_player_attributes(player_id):
    player = get_player_by_id(player_id)
    if not player:
        return jsonify({'error': 'Player not found'}), 404
    body = request.json
    if not body:
        return jsonify({'error': 'Request body required'}), 400
    player['attributes'] = body
    save_player(player)
    return jsonify({'ok': True})


@app.route('/api/players/<player_id>/badges')
def api_player_badges(player_id):
    player = get_player_by_id(player_id)
    if not player:
        return jsonify({'error': 'Player not found'}), 404
    return jsonify(player.get('badges', []))


@app.route('/api/players/<player_id>/badges', methods=['POST'])
@require_auth
def api_add_player_badge(player_id):
    player = get_player_by_id(player_id)
    if not player:
        return jsonify({'error': 'Player not found'}), 404
    body = request.json
    if not body:
        return jsonify({'error': 'Request body required'}), 400
    badge = {'name': body.get('name', ''), 'tier': body.get('tier', 'bronze')}
    player.setdefault('badges', []).append(badge)
    save_player(player)
    return jsonify({'ok': True}), 201


@app.route('/api/players/<player_id>/badges/<int:idx>', methods=['DELETE'])
@require_auth
def api_delete_player_badge(player_id, idx):
    player = get_player_by_id(player_id)
    if not player:
        return jsonify({'error': 'Player not found'}), 404
    badges = player.get('badges', [])
    if idx >= len(badges):
        return jsonify({'error': 'Badge not found'}), 404
    badges.pop(idx)
    player['badges'] = badges
    save_player(player)
    return jsonify({'ok': True})


@app.route('/api/players/<player_id>/contract')
def api_player_contract(player_id):
    player = get_player_by_id(player_id)
    if not player:
        return jsonify({'error': 'Player not found'}), 404
    return jsonify(player.get('contract', {}))


@app.route('/api/players/<player_id>/contract', methods=['PUT'])
@require_auth
def api_update_player_contract(player_id):
    player = get_player_by_id(player_id)
    if not player:
        return jsonify({'error': 'Player not found'}), 404
    body = request.json
    if not body:
        return jsonify({'error': 'Request body required'}), 400
    player['contract'] = body
    save_player(player)
    return jsonify({'ok': True})


# ============================================
# API: Mock Drafts (JSON)
# ============================================
@app.route('/api/mock-drafts')
def api_mock_drafts():
    return jsonify(get_mock_drafts())


@app.route('/api/mock-drafts/<mock_id>')
def api_mock_draft(mock_id):
    mocks = get_mock_drafts()
    for m in mocks:
        if m['id'] == mock_id:
            return jsonify(m)
    return jsonify({'error': 'Mock draft not found'}), 404


@app.route('/api/mock-drafts', methods=['POST'])
@require_auth
def api_create_mock_draft():
    body = request.json
    if not body:
        return jsonify({'error': 'Request body required'}), 400
    mocks = get_mock_drafts()
    new_id = body.get('id', f"mock_{body.get('year', 2025)}")
    new_mock = {
        'id': new_id,
        'title': body.get('title', 'New Mock Draft'),
        'author': body.get('author', 'MADCAP Scouting'),
        'date': body.get('date', ''),
        'league': body.get('league', 'NBA'),
        'year': int(body.get('year', 2025)),
        'picks': body.get('picks', [])
    }
    mocks.append(new_mock)
    save_json_file(os.path.join(DATA_DIR, 'mock_drafts.json'), {'mock_drafts': mocks})
    return jsonify(new_mock), 201


@app.route('/api/mock-drafts/<mock_id>', methods=['PUT'])
@require_auth
def api_update_mock_draft(mock_id):
    mocks = get_mock_drafts()
    body = request.json
    if not body:
        return jsonify({'error': 'Request body required'}), 400
    for i, m in enumerate(mocks):
        if m['id'] == mock_id:
            for key in ['title', 'author', 'date', 'league', 'picks']:
                if key in body:
                    mocks[i][key] = body[key]
            if 'year' in body:
                mocks[i]['year'] = int(body['year'])
            save_json_file(os.path.join(DATA_DIR, 'mock_drafts.json'), {'mock_drafts': mocks})
            return jsonify({'ok': True})
    return jsonify({'error': 'Mock draft not found'}), 404


@app.route('/api/mock-drafts/<mock_id>', methods=['DELETE'])
@require_auth
def api_delete_mock_draft(mock_id):
    mocks = get_mock_drafts()
    filtered = [m for m in mocks if m['id'] != mock_id]
    if len(filtered) == len(mocks):
        return jsonify({'error': 'Mock draft not found'}), 404
    save_json_file(os.path.join(DATA_DIR, 'mock_drafts.json'), {'mock_drafts': filtered})
    return jsonify({'ok': True})


# ============================================
# API: Seasons (JSON)
# ============================================
@app.route('/api/seasons')
def api_seasons():
    return jsonify(get_seasons())


# ============================================
# API: Player Comparison
# ============================================
@app.route('/api/compare')
def api_compare():
    ids_param = request.args.get('ids', '')
    if not ids_param:
        return jsonify({'error': 'ids parameter required (comma-separated)'}), 400
    ids = [i.strip() for i in ids_param.split(',') if i.strip()]
    if len(ids) < 2:
        return jsonify({'error': 'At least 2 player IDs required'}), 400
    players = []
    for pid in ids:
        p = get_player_by_id(pid)
        if p:
            players.append(p)
    if len(players) < 2:
        return jsonify({'error': 'Not enough valid players found'}), 404
    return jsonify(players)


# ============================================
# API: Player Game Log (aggregated)
# ============================================
@app.route('/api/players/<player_id>/game-log')
def api_player_game_log(player_id):
    player = get_player_by_id(player_id)
    if not player:
        return jsonify({'error': 'Player not found'}), 404

    season_filter = request.args.get('season', '')
    level_filter = request.args.get('level', '')
    career = player.get('career', {})
    game_log = []

    def collect_games(seasons, level_name, team_label=''):
        for s in (seasons or []):
            if season_filter and s.get('year') != season_filter:
                continue
            for g in s.get('games', []):
                entry = dict(g)
                entry['season'] = s.get('year', '')
                entry['level'] = level_name
                entry['team'] = team_label
                game_log.append(entry)

    if not level_filter or level_filter == 'highschool':
        hs = career.get('highschool', {})
        collect_games(hs.get('seasons', []), 'highschool', hs.get('school', ''))

    if not level_filter or level_filter == 'college':
        col = career.get('college', {})
        collect_games(col.get('seasons', []), 'college', col.get('school', ''))

    if not level_filter or level_filter == 'pro':
        for pro in career.get('pro', []):
            team = get_team_by_id(pro.get('team_id', ''))
            team_label = team['abbreviation'] if team else pro.get('team_id', '')
            collect_games(pro.get('seasons', []), 'pro', team_label)

    game_log.sort(key=lambda g: g.get('date', ''), reverse=True)
    return jsonify(game_log)


# ============================================
# Admin UI: Dashboard & Management Pages
# ============================================
@app.route('/admin/panel')
@require_auth
def admin_panel():
    players = get_all_players()
    teams = get_all_teams()
    games = get_games()
    injuries = get_injuries()
    transactions = get_transactions()
    active_injuries = [i for i in injuries if i.get('status') in ('active', 'day-to-day')]
    recent_txns = sorted(transactions, key=lambda t: t.get('date', ''), reverse=True)[:5]

    txn_html = ''
    for t in recent_txns:
        txn_html += f'<tr class="row1"><td>{t.get("date","")}</td><td>{t.get("type","")}</td><td>{t.get("player_id","")}</td><td>{t.get("details","")[:60]}</td></tr>'
    if not txn_html:
        txn_html = '<tr class="row1"><td colspan="4">No transactions</td></tr>'

    inj_html = ''
    for i in active_injuries:
        inj_html += f'<tr class="row1"><td>{i.get("player_id","")}</td><td>{i.get("type","")}</td><td>{i.get("severity","")}</td><td>{i.get("status","")}</td></tr>'
    if not inj_html:
        inj_html = '<tr class="row1"><td colspan="4">No active injuries</td></tr>'

    return f'''<!DOCTYPE html>
<html><head><title>MADCAP Admin Dashboard</title>
<style>
body{{font-family:Verdana,sans-serif;background:#E5E5E5;margin:0;padding:16px;font-size:11px;}}
.container{{max-width:1100px;margin:0 auto;}}
h1{{color:#0066CC;font-size:18px;margin-bottom:8px;}}
h2{{color:#0055AA;font-size:14px;margin:12px 0 4px;}}
.stats-row{{display:flex;gap:12px;margin-bottom:12px;}}
.stat-card{{background:#FFF;border:1px solid #B0B0B0;padding:12px;flex:1;text-align:center;}}
.stat-card .num{{font-size:24px;font-weight:bold;color:#0066CC;}}
.stat-card .label{{font-size:10px;color:#666;}}
table{{width:100%;border-collapse:collapse;background:#FFF;border:1px solid #B0B0B0;margin-bottom:12px;}}
th,td{{border:1px solid #B0B0B0;padding:4px 8px;text-align:left;font-size:11px;}}
th{{background:#0066CC;color:#FFF;}}
.row1{{background:#F5F5F5;}}
a{{color:#0000FF;}}
.nav-links{{margin:8px 0;}}
.nav-links a{{margin-right:8px;font-weight:bold;}}
.quick-actions a{{display:inline-block;background:#0066CC;color:#FFF;padding:4px 12px;margin:2px 4px;text-decoration:none;font-size:10px;}}
.quick-actions a:hover{{background:#0055AA;}}
</style></head><body>
<div class="container">
<h1>MADCAP Admin Dashboard</h1>
<div class="nav-links">
<a href="/">View Site</a> | <a href="/admin/players">Players</a> | <a href="/admin/teams">Teams</a> |
<a href="/admin/games">Games</a> | <a href="/admin/transactions">Transactions</a> |
<a href="/admin/injuries">Injuries</a> | <a href="/admin/awards">Awards</a> |
<a href="/admin/drafts">Drafts</a> | <a href="/admin/mock-drafts">Mock Drafts</a> |
<a href="/admin/events">Events</a> | <a href="/admin/import">Bulk Import</a> |
<a href="/admin/logout">Logout</a>
</div>

<div class="stats-row">
<div class="stat-card"><div class="num">{len(players)}</div><div class="label">Players</div></div>
<div class="stat-card"><div class="num">{len(teams)}</div><div class="label">Teams</div></div>
<div class="stat-card"><div class="num">{len(games)}</div><div class="label">Games</div></div>
<div class="stat-card"><div class="num">{len(active_injuries)}</div><div class="label">Active Injuries</div></div>
<div class="stat-card"><div class="num">{len(transactions)}</div><div class="label">Transactions</div></div>
</div>

<h2>Recent Transactions</h2>
<table><tr><th>Date</th><th>Type</th><th>Player</th><th>Details</th></tr>{txn_html}</table>

<h2>Active Injuries</h2>
<table><tr><th>Player</th><th>Injury</th><th>Severity</th><th>Status</th></tr>{inj_html}</table>

<h2>Quick Actions</h2>
<div class="quick-actions">
<a href="/admin/players">Manage Players</a>
<a href="/admin/games">Manage Games</a>
<a href="/admin/transactions">Add Transaction</a>
<a href="/admin/injuries">Update Injuries</a>
</div>

<h2>API Reference</h2>
<table>
<tr><th>Resource</th><th>GET</th><th>POST</th><th>PUT</th><th>DELETE</th></tr>
<tr class="row1"><td>Players</td><td>/api/players</td><td>/api/players</td><td>/api/players/&lt;id&gt;</td><td>/api/players/&lt;id&gt;</td></tr>
<tr class="row1"><td>Teams</td><td>/api/teams</td><td>/api/teams</td><td>/api/teams/&lt;id&gt;</td><td>/api/teams/&lt;id&gt;</td></tr>
<tr class="row1"><td>Games</td><td>/api/games</td><td>/api/games</td><td>/api/games/&lt;id&gt;</td><td>/api/games/&lt;id&gt;</td></tr>
<tr class="row1"><td>Transactions</td><td>/api/transactions</td><td>/api/transactions</td><td>/api/transactions/&lt;id&gt;</td><td>/api/transactions/&lt;id&gt;</td></tr>
<tr class="row1"><td>Injuries</td><td>/api/injuries</td><td>/api/injuries</td><td>/api/injuries/&lt;id&gt;</td><td>/api/injuries/&lt;id&gt;</td></tr>
<tr class="row1"><td>Awards</td><td>/api/awards</td><td>-</td><td>-</td><td>-</td></tr>
<tr class="row1"><td>Mock Drafts</td><td>/api/mock-drafts</td><td>/api/mock-drafts</td><td>/api/mock-drafts/&lt;id&gt;</td><td>/api/mock-drafts/&lt;id&gt;</td></tr>
<tr class="row1"><td>Seasons</td><td>/api/seasons</td><td>-</td><td>-</td><td>-</td></tr>
<tr class="row1"><td>Compare</td><td>/api/compare?ids=a,b</td><td>-</td><td>-</td><td>-</td></tr>
<tr class="row1"><td>Game Log</td><td>/api/players/&lt;id&gt;/game-log</td><td>-</td><td>-</td><td>-</td></tr>
</table>
<p style="font-size:10px;color:#666;">Use Basic Auth (admin/madcap) or login session for write access.</p>
</div></body></html>'''


@app.route('/admin/players')
@require_auth
def admin_players_list():
    players = get_all_players()
    rows = ''
    for p in players:
        fic = 'YES' if p.get('is_fictional') else 'no'
        rows += f'<tr class="row1"><td><a href="/admin/players/{p["id"]}/edit">{p.get("name","")}</a></td><td>{p.get("position","")}</td><td>{p.get("overall","")}</td><td>{fic}</td><td>{p.get("status","")}</td><td><a href="/admin/players/{p["id"]}/edit">[edit]</a></td></tr>'
    return f'''<!DOCTYPE html>
<html><head><title>MADCAP Admin - Players</title>
<style>body{{font-family:Verdana,sans-serif;background:#E5E5E5;margin:0;padding:16px;font-size:11px;}}
.container{{max-width:900px;margin:0 auto;}}h1{{color:#0066CC;font-size:16px;}}
table{{width:100%;border-collapse:collapse;background:#FFF;border:1px solid #B0B0B0;}}
th,td{{border:1px solid #B0B0B0;padding:4px 8px;font-size:11px;}}th{{background:#0066CC;color:#FFF;}}
.row1{{background:#F5F5F5;}}a{{color:#0000FF;}}</style></head><body>
<div class="container"><h1>Player Management</h1>
<p><a href="/admin/panel">Back to Dashboard</a></p>
<table><tr><th>Name</th><th>Pos</th><th>OVR</th><th>Fictional</th><th>Status</th><th>Actions</th></tr>{rows}</table>
</div></body></html>'''


@app.route('/admin/players/<player_id>/edit')
@require_auth
def admin_player_edit(player_id):
    player = get_player_by_id(player_id)
    if not player:
        return 'Player not found', 404
    csrf = generate_csrf_token()
    data_json = json.dumps(player, indent=2)
    return f'''<!DOCTYPE html>
<html><head><title>MADCAP Admin - Edit {player.get("name","")}</title>
<style>body{{font-family:Verdana,sans-serif;background:#E5E5E5;margin:0;padding:16px;font-size:11px;}}
.container{{max-width:900px;margin:0 auto;}}h1{{color:#0066CC;font-size:16px;}}
textarea{{width:100%;height:500px;font-family:monospace;font-size:11px;border:1px solid #B0B0B0;}}
input[type=submit]{{background:#0066CC;color:#FFF;border:none;padding:6px 16px;cursor:pointer;font-weight:bold;margin-top:8px;}}
a{{color:#0000FF;}}.msg{{color:green;font-weight:bold;}}</style></head><body>
<div class="container"><h1>Edit Player: {player.get("name","")}</h1>
<p><a href="/admin/players">Back to Players</a> | <a href="/player.html?id={player_id}">View Profile</a></p>
<form method="post" action="/admin/players/{player_id}/save">
<input type="hidden" name="csrf_token" value="{csrf}">
<p>Edit the full player YAML data below:</p>
<textarea name="yaml_data">{data_json}</textarea>
<br><input type="submit" value="Save Changes">
</form></div></body></html>'''


@app.route('/admin/players/<player_id>/save', methods=['POST'])
@require_auth
def admin_player_save(player_id):
    yaml_data = request.form.get('yaml_data', '')
    try:
        data = json.loads(yaml_data)
        if data.get('id') != player_id:
            data['id'] = player_id
        save_player(data)
        return redirect(f'/admin/players/{player_id}/edit')
    except (json.JSONDecodeError, Exception) as e:
        return f'Error saving: {e}', 400


@app.route('/admin/teams')
@require_auth
def admin_teams_list():
    teams = get_all_teams()
    rows = ''
    for t in teams:
        rows += f'<tr class="row1"><td>{t.get("name","")}</td><td>{t.get("abbreviation","")}</td><td>{t.get("league","")}</td><td><a href="/team.html?id={t["id"]}">[view]</a></td></tr>'
    return f'''<!DOCTYPE html>
<html><head><title>MADCAP Admin - Teams</title>
<style>body{{font-family:Verdana,sans-serif;background:#E5E5E5;margin:0;padding:16px;font-size:11px;}}
.container{{max-width:900px;margin:0 auto;}}h1{{color:#0066CC;font-size:16px;}}
table{{width:100%;border-collapse:collapse;background:#FFF;border:1px solid #B0B0B0;}}
th,td{{border:1px solid #B0B0B0;padding:4px 8px;font-size:11px;}}th{{background:#0066CC;color:#FFF;}}
.row1{{background:#F5F5F5;}}a{{color:#0000FF;}}</style></head><body>
<div class="container"><h1>Team Management</h1>
<p><a href="/admin/panel">Back to Dashboard</a></p>
<table><tr><th>Name</th><th>Abbr</th><th>League</th><th>Actions</th></tr>{rows}</table>
</div></body></html>'''


@app.route('/admin/games')
@require_auth
def admin_games_list():
    games = get_games()
    rows = ''
    for g in games:
        rows += f'<tr class="row1"><td>{g.get("date","")}</td><td>{g.get("away_team_id","") or g.get("away_team_name","?")}</td><td>{g.get("away_score",0)}-{g.get("home_score",0)}</td><td>{g.get("home_team_id","") or g.get("home_team_name","?")}</td><td>{g.get("status","")}</td></tr>'
    return f'''<!DOCTYPE html>
<html><head><title>MADCAP Admin - Games</title>
<style>body{{font-family:Verdana,sans-serif;background:#E5E5E5;margin:0;padding:16px;font-size:11px;}}
.container{{max-width:900px;margin:0 auto;}}h1{{color:#0066CC;font-size:16px;}}
table{{width:100%;border-collapse:collapse;background:#FFF;border:1px solid #B0B0B0;}}
th,td{{border:1px solid #B0B0B0;padding:4px 8px;font-size:11px;}}th{{background:#0066CC;color:#FFF;}}
.row1{{background:#F5F5F5;}}a{{color:#0000FF;}}</style></head><body>
<div class="container"><h1>Game Management</h1>
<p><a href="/admin/panel">Back to Dashboard</a></p>
<table><tr><th>Date</th><th>Away</th><th>Score</th><th>Home</th><th>Status</th></tr>{rows}</table>
</div></body></html>'''


@app.route('/admin/transactions')
@require_auth
def admin_transactions_list():
    txns = sorted(get_transactions(), key=lambda t: t.get('date', ''), reverse=True)
    rows = ''
    for t in txns:
        rows += f'<tr class="row1"><td>{t.get("date","")}</td><td>{t.get("type","")}</td><td>{t.get("player_id","")}</td><td>{t.get("details","")}</td></tr>'
    return f'''<!DOCTYPE html>
<html><head><title>MADCAP Admin - Transactions</title>
<style>body{{font-family:Verdana,sans-serif;background:#E5E5E5;margin:0;padding:16px;font-size:11px;}}
.container{{max-width:900px;margin:0 auto;}}h1{{color:#0066CC;font-size:16px;}}
table{{width:100%;border-collapse:collapse;background:#FFF;border:1px solid #B0B0B0;}}
th,td{{border:1px solid #B0B0B0;padding:4px 8px;font-size:11px;}}th{{background:#0066CC;color:#FFF;}}
.row1{{background:#F5F5F5;}}a{{color:#0000FF;}}</style></head><body>
<div class="container"><h1>Transaction Log</h1>
<p><a href="/admin/panel">Back to Dashboard</a></p>
<table><tr><th>Date</th><th>Type</th><th>Player</th><th>Details</th></tr>{rows}</table>
</div></body></html>'''


@app.route('/admin/injuries')
@require_auth
def admin_injuries_list():
    injuries = sorted(get_injuries(), key=lambda i: i.get('date', ''), reverse=True)
    rows = ''
    for i in injuries:
        rows += f'<tr class="row1"><td>{i.get("date","")}</td><td>{i.get("player_id","")}</td><td>{i.get("type","")}</td><td>{i.get("severity","")}</td><td>{i.get("status","")}</td><td>{i.get("games_missed",0)}</td></tr>'
    return f'''<!DOCTYPE html>
<html><head><title>MADCAP Admin - Injuries</title>
<style>body{{font-family:Verdana,sans-serif;background:#E5E5E5;margin:0;padding:16px;font-size:11px;}}
.container{{max-width:900px;margin:0 auto;}}h1{{color:#0066CC;font-size:16px;}}
table{{width:100%;border-collapse:collapse;background:#FFF;border:1px solid #B0B0B0;}}
th,td{{border:1px solid #B0B0B0;padding:4px 8px;font-size:11px;}}th{{background:#0066CC;color:#FFF;}}
.row1{{background:#F5F5F5;}}a{{color:#0000FF;}}</style></head><body>
<div class="container"><h1>Injury Report</h1>
<p><a href="/admin/panel">Back to Dashboard</a></p>
<table><tr><th>Date</th><th>Player</th><th>Injury</th><th>Severity</th><th>Status</th><th>Games Missed</th></tr>{rows}</table>
</div></body></html>'''


@app.route('/admin/awards')
@require_auth
def admin_awards_list():
    awards_data = get_awards()
    winners = awards_data.get('winners', [])
    rows = ''
    for w in winners:
        rows += f'<tr class="row1"><td>{w.get("year","")}</td><td>{w.get("award_id","")}</td><td>{w.get("player_id","")}</td><td>{w.get("league","")}</td><td>{w.get("notes","")}</td></tr>'
    return f'''<!DOCTYPE html>
<html><head><title>MADCAP Admin - Awards</title>
<style>body{{font-family:Verdana,sans-serif;background:#E5E5E5;margin:0;padding:16px;font-size:11px;}}
.container{{max-width:900px;margin:0 auto;}}h1{{color:#0066CC;font-size:16px;}}
table{{width:100%;border-collapse:collapse;background:#FFF;border:1px solid #B0B0B0;}}
th,td{{border:1px solid #B0B0B0;padding:4px 8px;font-size:11px;}}th{{background:#0066CC;color:#FFF;}}
.row1{{background:#F5F5F5;}}a{{color:#0000FF;}}</style></head><body>
<div class="container"><h1>Award History</h1>
<p><a href="/admin/panel">Back to Dashboard</a></p>
<table><tr><th>Year</th><th>Award</th><th>Player</th><th>League</th><th>Notes</th></tr>{rows}</table>
</div></body></html>'''


@app.route('/admin/mock-drafts')
@require_auth
def admin_mock_drafts_list():
    mocks = get_mock_drafts()
    rows = ''
    for m in mocks:
        rows += f'<tr class="row1"><td>{m.get("title","")}</td><td>{m.get("year","")}</td><td>{m.get("author","")}</td><td>{len(m.get("picks",[]))} picks</td></tr>'
    return f'''<!DOCTYPE html>
<html><head><title>MADCAP Admin - Mock Drafts</title>
<style>body{{font-family:Verdana,sans-serif;background:#E5E5E5;margin:0;padding:16px;font-size:11px;}}
.container{{max-width:900px;margin:0 auto;}}h1{{color:#0066CC;font-size:16px;}}
table{{width:100%;border-collapse:collapse;background:#FFF;border:1px solid #B0B0B0;}}
th,td{{border:1px solid #B0B0B0;padding:4px 8px;font-size:11px;}}th{{background:#0066CC;color:#FFF;}}
.row1{{background:#F5F5F5;}}a{{color:#0000FF;}}</style></head><body>
<div class="container"><h1>Mock Draft Management</h1>
<p><a href="/admin/panel">Back to Dashboard</a></p>
<table><tr><th>Title</th><th>Year</th><th>Author</th><th>Picks</th></tr>{rows}</table>
</div></body></html>'''


@app.route('/admin/drafts')
@require_auth
def admin_drafts_list():
    drafts = get_drafts()
    rows = ''
    for d in drafts:
        rows += f'<tr class="row1"><td>{d.get("year","")}</td><td>{d.get("league","")}</td><td>{len(d.get("picks",[]))} picks</td></tr>'
    return f'''<!DOCTYPE html>
<html><head><title>MADCAP Admin - Drafts</title>
<style>body{{font-family:Verdana,sans-serif;background:#E5E5E5;margin:0;padding:16px;font-size:11px;}}
.container{{max-width:900px;margin:0 auto;}}h1{{color:#0066CC;font-size:16px;}}
table{{width:100%;border-collapse:collapse;background:#FFF;border:1px solid #B0B0B0;}}
th,td{{border:1px solid #B0B0B0;padding:4px 8px;font-size:11px;}}th{{background:#0066CC;color:#FFF;}}
.row1{{background:#F5F5F5;}}a{{color:#0000FF;}}</style></head><body>
<div class="container"><h1>Draft Management</h1>
<p><a href="/admin/panel">Back to Dashboard</a></p>
<table><tr><th>Year</th><th>League</th><th>Picks</th></tr>{rows}</table>
</div></body></html>'''


@app.route('/admin/events')
@require_auth
def admin_events_list():
    events = get_events()
    rows = ''
    for e in events:
        rows += f'<tr class="row1"><td>{e.get("date","")}</td><td>{e.get("type","")}</td><td>{e.get("player_id","")}</td><td>{e.get("title","")}</td></tr>'
    return f'''<!DOCTYPE html>
<html><head><title>MADCAP Admin - Events</title>
<style>body{{font-family:Verdana,sans-serif;background:#E5E5E5;margin:0;padding:16px;font-size:11px;}}
.container{{max-width:900px;margin:0 auto;}}h1{{color:#0066CC;font-size:16px;}}
table{{width:100%;border-collapse:collapse;background:#FFF;border:1px solid #B0B0B0;}}
th,td{{border:1px solid #B0B0B0;padding:4px 8px;font-size:11px;}}th{{background:#0066CC;color:#FFF;}}
.row1{{background:#F5F5F5;}}a{{color:#0000FF;}}</style></head><body>
<div class="container"><h1>Event Management</h1>
<p><a href="/admin/panel">Back to Dashboard</a></p>
<table><tr><th>Date</th><th>Type</th><th>Player</th><th>Title</th></tr>{rows}</table>
</div></body></html>'''


@app.route('/admin/import', methods=['GET'])
@require_auth
def admin_import_page():
    csrf = generate_csrf_token()
    return f'''<!DOCTYPE html>
<html><head><title>MADCAP Admin - Bulk Import</title>
<style>body{{font-family:Verdana,sans-serif;background:#E5E5E5;margin:0;padding:16px;font-size:11px;}}
.container{{max-width:900px;margin:0 auto;}}h1{{color:#0066CC;font-size:16px;}}
textarea{{width:100%;height:300px;font-family:monospace;font-size:11px;border:1px solid #B0B0B0;}}
select,input[type=submit]{{font-size:11px;margin:4px;}}
input[type=submit]{{background:#0066CC;color:#FFF;border:none;padding:6px 16px;cursor:pointer;font-weight:bold;}}
a{{color:#0000FF;}}</style></head><body>
<div class="container"><h1>Bulk Import Tool</h1>
<p><a href="/admin/panel">Back to Dashboard</a></p>
<form method="post" action="/admin/import">
<input type="hidden" name="csrf_token" value="{csrf}">
<label>Format: <select name="format"><option value="json">JSON</option><option value="yaml">YAML</option></select></label>
<label>Target: <select name="target"><option value="player">Player</option><option value="team">Team</option><option value="game">Game</option></select></label>
<br><textarea name="data" placeholder="Paste JSON or YAML data here..."></textarea>
<br><input type="submit" value="Import">
</form></div></body></html>'''


@app.route('/admin/import', methods=['POST'])
@require_auth
def admin_import_submit():
    fmt = request.form.get('format', 'json')
    target = request.form.get('target', 'player')
    raw = request.form.get('data', '')
    try:
        if fmt == 'yaml':
            data = yaml.safe_load(raw)
        else:
            data = json.loads(raw)
        if target == 'player' and isinstance(data, dict) and 'id' in data:
            save_player(data)
            return redirect('/admin/players')
        elif target == 'team' and isinstance(data, dict) and 'id' in data:
            save_team(data)
            return redirect('/admin/teams')
        elif target == 'game' and isinstance(data, dict):
            games = get_games()
            games.append(data)
            save_json_file(os.path.join(DATA_DIR, 'games.json'), {'games': games})
            return redirect('/admin/games')
        return 'Invalid data format for target', 400
    except Exception as e:
        return f'Import error: {e}', 400


# ============================================
# Reference cleanup
# ============================================
def cleanup_player_references(player_id):
    for team in get_all_teams():
        if 'roster' in team:
            team['roster'] = [rid for rid in team['roster'] if rid != player_id]
        if 'depth_chart' in team:
            for pos in team['depth_chart']:
                team['depth_chart'][pos] = [pid for pid in team['depth_chart'][pos] if pid != player_id]
        save_team(team)


def cleanup_team_references(team_id):
    for player in get_all_players():
        if 'career' in player and 'pro' in player['career']:
            for pro in player['career']['pro']:
                if pro.get('team_id') == team_id:
                    pro['team_id'] = ''
        if 'draft' in player and player['draft'].get('team_id') == team_id:
            player['draft']['team_id'] = ''
        save_player(player)


# ============================================
# Static file serving
# ============================================
@app.route('/')
def index():
    return send_from_directory(PUBLIC_DIR, 'index.html')


@app.route('/<path:path>')
def serve_public(path):
    full_path = os.path.normpath(os.path.join(PUBLIC_DIR, path))
    if not full_path.startswith(os.path.normpath(PUBLIC_DIR)):
        return jsonify({'error': 'Forbidden'}), 403
    if os.path.isfile(full_path):
        return send_from_directory(PUBLIC_DIR, path)
    return jsonify({'error': 'Not found'}), 404


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


if __name__ == '__main__':
    debug = os.environ.get('FLASK_DEBUG', 'false').lower() == 'true'
    port = int(os.environ.get('PORT', 8081))
    logger.info(f"Starting MADCAP on port {port} (debug={debug})")
    app.run(debug=debug, port=port, host='0.0.0.0')
