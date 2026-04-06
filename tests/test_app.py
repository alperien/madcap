"""Tests for MADCAP Flask API."""
import json
import os
import sys
import unittest

# Add admin dir to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'admin'))

from app import app


class TestMADCAPAPI(unittest.TestCase):
    """Test suite for MADCAP API endpoints."""

    def setUp(self):
        """Set up test client."""
        app.config['TESTING'] = True
        app.config['SECRET_KEY'] = 'test-secret-key'
        self.client = app.test_client()
        self.auth = ('admin', 'madcap')

    def _auth_headers(self):
        """Return headers with basic auth."""
        import base64
        credentials = base64.b64encode(f'{self.auth[0]}:{self.auth[1]}'.encode()).decode()
        return {'Authorization': f'Basic {credentials}'}

    # --- Health Check ---
    def test_health_check(self):
        """Test /health endpoint."""
        resp = self.client.get('/health')
        self.assertEqual(resp.status_code, 200)
        data = json.loads(resp.data)
        self.assertEqual(data['status'], 'ok')

    # --- Auth ---
    def test_unauthorized_post(self):
        """Test that POST without auth returns 401."""
        resp = self.client.post('/api/players', json={'name': 'Test'})
        self.assertEqual(resp.status_code, 401)

    def test_unauthorized_put(self):
        """Test that PUT without auth returns 401."""
        resp = self.client.put('/api/players/marcus_thompson', json={'name': 'Test'})
        self.assertEqual(resp.status_code, 401)

    def test_unauthorized_delete(self):
        """Test that DELETE without auth returns 401."""
        resp = self.client.delete('/api/players/marcus_thompson')
        self.assertEqual(resp.status_code, 401)

    # --- Players ---
    def test_get_players(self):
        """Test GET /api/players."""
        resp = self.client.get('/api/players')
        self.assertEqual(resp.status_code, 200)
        data = json.loads(resp.data)
        self.assertIsInstance(data, list)
        self.assertGreater(len(data), 0)

    def test_get_player(self):
        """Test GET /api/players/<id>."""
        resp = self.client.get('/api/players/marcus_thompson')
        self.assertEqual(resp.status_code, 200)
        data = json.loads(resp.data)
        self.assertEqual(data['id'], 'marcus_thompson')

    def test_get_player_not_found(self):
        """Test GET /api/players/<id> for non-existent player."""
        resp = self.client.get('/api/players/nonexistent_player')
        self.assertEqual(resp.status_code, 404)

    def test_create_player(self):
        """Test POST /api/players."""
        resp = self.client.post('/api/players',
                                json={'name': 'Test Player', 'position': 'PG'},
                                headers=self._auth_headers())
        self.assertEqual(resp.status_code, 201)
        data = json.loads(resp.data)
        self.assertEqual(data['name'], 'Test Player')

    def test_create_player_no_name(self):
        """Test POST /api/players without name returns 400."""
        resp = self.client.post('/api/players',
                                json={'position': 'PG'},
                                headers=self._auth_headers())
        self.assertEqual(resp.status_code, 400)

    def test_update_player(self):
        """Test PUT /api/players/<id>."""
        resp = self.client.put('/api/players/marcus_thompson',
                               json={'name': 'Updated Name'},
                               headers=self._auth_headers())
        self.assertEqual(resp.status_code, 200)

    def test_update_player_not_found(self):
        """Test PUT /api/players/<id> for non-existent player."""
        resp = self.client.put('/api/players/nonexistent_player',
                               json={'name': 'Test'},
                               headers=self._auth_headers())
        self.assertEqual(resp.status_code, 404)

    # --- Player expanded data ---
    def test_get_player_has_attributes(self):
        """Test that fictional player has attributes field."""
        resp = self.client.get('/api/players/marcus_thompson')
        data = json.loads(resp.data)
        self.assertIn('attributes', data)
        self.assertIn('inside_scoring', data['attributes'])

    def test_get_player_has_badges(self):
        """Test that fictional player has badges field."""
        resp = self.client.get('/api/players/marcus_thompson')
        data = json.loads(resp.data)
        self.assertIn('badges', data)
        self.assertIsInstance(data['badges'], list)
        self.assertGreater(len(data['badges']), 0)

    def test_get_player_has_injuries(self):
        """Test that fictional player has injuries field."""
        resp = self.client.get('/api/players/marcus_thompson')
        data = json.loads(resp.data)
        self.assertIn('injuries', data)
        self.assertIsInstance(data['injuries'], list)

    def test_get_player_has_transactions(self):
        """Test that fictional player has transactions field."""
        resp = self.client.get('/api/players/marcus_thompson')
        data = json.loads(resp.data)
        self.assertIn('transactions', data)
        self.assertIsInstance(data['transactions'], list)

    def test_get_player_has_awards(self):
        """Test that fictional player has awards field."""
        resp = self.client.get('/api/players/marcus_thompson')
        data = json.loads(resp.data)
        self.assertIn('awards', data)
        self.assertIsInstance(data['awards'], list)

    def test_get_player_has_contract(self):
        """Test that fictional player has contract field."""
        resp = self.client.get('/api/players/marcus_thompson')
        data = json.loads(resp.data)
        self.assertIn('contract', data)
        self.assertIn('total_value', data['contract'])

    def test_get_player_has_measurements(self):
        """Test that fictional player has measurements field."""
        resp = self.client.get('/api/players/marcus_thompson')
        data = json.loads(resp.data)
        self.assertIn('measurements', data)
        self.assertIn('wingspan', data['measurements'])

    def test_get_player_has_tendencies(self):
        """Test that fictional player has tendencies field."""
        resp = self.client.get('/api/players/marcus_thompson')
        data = json.loads(resp.data)
        self.assertIn('tendencies', data)

    def test_get_player_has_jersey_history(self):
        """Test that fictional player has jersey_history field."""
        resp = self.client.get('/api/players/marcus_thompson')
        data = json.loads(resp.data)
        self.assertIn('jersey_history', data)

    # --- Player sub-resource endpoints ---
    def test_get_player_injuries_endpoint(self):
        """Test GET /api/players/<id>/injuries."""
        resp = self.client.get('/api/players/marcus_thompson/injuries')
        self.assertEqual(resp.status_code, 200)
        data = json.loads(resp.data)
        self.assertIsInstance(data, list)

    def test_get_player_transactions_endpoint(self):
        """Test GET /api/players/<id>/transactions."""
        resp = self.client.get('/api/players/marcus_thompson/transactions')
        self.assertEqual(resp.status_code, 200)
        data = json.loads(resp.data)
        self.assertIsInstance(data, list)

    def test_get_player_awards_endpoint(self):
        """Test GET /api/players/<id>/awards."""
        resp = self.client.get('/api/players/marcus_thompson/awards')
        self.assertEqual(resp.status_code, 200)
        data = json.loads(resp.data)
        self.assertIsInstance(data, list)

    def test_get_player_attributes_endpoint(self):
        """Test GET /api/players/<id>/attributes."""
        resp = self.client.get('/api/players/marcus_thompson/attributes')
        self.assertEqual(resp.status_code, 200)
        data = json.loads(resp.data)
        self.assertIsInstance(data, dict)

    def test_get_player_badges_endpoint(self):
        """Test GET /api/players/<id>/badges."""
        resp = self.client.get('/api/players/marcus_thompson/badges')
        self.assertEqual(resp.status_code, 200)
        data = json.loads(resp.data)
        self.assertIsInstance(data, list)

    def test_get_player_contract_endpoint(self):
        """Test GET /api/players/<id>/contract."""
        resp = self.client.get('/api/players/marcus_thompson/contract')
        self.assertEqual(resp.status_code, 200)
        data = json.loads(resp.data)
        self.assertIsInstance(data, dict)

    def test_get_player_game_log(self):
        """Test GET /api/players/<id>/game-log."""
        resp = self.client.get('/api/players/marcus_thompson/game-log')
        self.assertEqual(resp.status_code, 200)
        data = json.loads(resp.data)
        self.assertIsInstance(data, list)
        self.assertGreater(len(data), 0)

    def test_get_player_game_log_with_season_filter(self):
        """Test GET /api/players/<id>/game-log?season=2024-25."""
        resp = self.client.get('/api/players/marcus_thompson/game-log?season=2024-25')
        self.assertEqual(resp.status_code, 200)
        data = json.loads(resp.data)
        self.assertIsInstance(data, list)
        for g in data:
            self.assertEqual(g['season'], '2024-25')

    def test_get_player_game_log_not_found(self):
        """Test GET /api/players/<id>/game-log for non-existent player."""
        resp = self.client.get('/api/players/nonexistent/game-log')
        self.assertEqual(resp.status_code, 404)

    # --- Teams ---
    def test_get_teams(self):
        """Test GET /api/teams."""
        resp = self.client.get('/api/teams')
        self.assertEqual(resp.status_code, 200)
        data = json.loads(resp.data)
        self.assertIsInstance(data, list)
        self.assertGreater(len(data), 0)

    def test_get_team(self):
        """Test GET /api/teams/<id>."""
        resp = self.client.get('/api/teams/nba_cha')
        self.assertEqual(resp.status_code, 200)
        data = json.loads(resp.data)
        self.assertEqual(data['id'], 'nba_cha')

    # --- Games ---
    def test_get_games(self):
        """Test GET /api/games."""
        resp = self.client.get('/api/games')
        self.assertEqual(resp.status_code, 200)
        data = json.loads(resp.data)
        self.assertIsInstance(data, list)
        self.assertGreater(len(data), 0)

    def test_get_games_have_box_scores(self):
        """Test that games have box_score field."""
        resp = self.client.get('/api/games')
        data = json.loads(resp.data)
        final_games = [g for g in data if g.get('status') == 'final']
        self.assertGreater(len(final_games), 0)
        for g in final_games:
            self.assertIn('box_score', g)

    # --- Leagues ---
    def test_get_leagues(self):
        """Test GET /api/leagues."""
        resp = self.client.get('/api/leagues')
        self.assertEqual(resp.status_code, 200)
        data = json.loads(resp.data)
        self.assertIsInstance(data, list)

    # --- Drafts ---
    def test_get_drafts(self):
        """Test GET /api/drafts."""
        resp = self.client.get('/api/drafts')
        self.assertEqual(resp.status_code, 200)
        data = json.loads(resp.data)
        self.assertIsInstance(data, list)

    # --- Events ---
    def test_get_events(self):
        """Test GET /api/events."""
        resp = self.client.get('/api/events')
        self.assertEqual(resp.status_code, 200)
        data = json.loads(resp.data)
        self.assertIsInstance(data, list)

    # --- Transactions ---
    def test_get_transactions(self):
        """Test GET /api/transactions."""
        resp = self.client.get('/api/transactions')
        self.assertEqual(resp.status_code, 200)
        data = json.loads(resp.data)
        self.assertIsInstance(data, list)
        self.assertGreater(len(data), 0)

    def test_create_transaction(self):
        """Test POST /api/transactions."""
        resp = self.client.post('/api/transactions',
                                json={'date': '2025-04-01', 'type': 'signed', 'player_id': 'test', 'details': 'Test txn'},
                                headers=self._auth_headers())
        self.assertEqual(resp.status_code, 201)
        data = json.loads(resp.data)
        self.assertIn('id', data)

    def test_transactions_unauthorized(self):
        """Test POST /api/transactions without auth returns 401."""
        resp = self.client.post('/api/transactions', json={'type': 'signed'})
        self.assertEqual(resp.status_code, 401)

    # --- Injuries ---
    def test_get_injuries(self):
        """Test GET /api/injuries."""
        resp = self.client.get('/api/injuries')
        self.assertEqual(resp.status_code, 200)
        data = json.loads(resp.data)
        self.assertIsInstance(data, list)
        self.assertGreater(len(data), 0)

    def test_create_injury(self):
        """Test POST /api/injuries."""
        resp = self.client.post('/api/injuries',
                                json={'player_id': 'test', 'type': 'Sprain', 'severity': 'minor'},
                                headers=self._auth_headers())
        self.assertEqual(resp.status_code, 201)

    # --- Awards ---
    def test_get_awards(self):
        """Test GET /api/awards."""
        resp = self.client.get('/api/awards')
        self.assertEqual(resp.status_code, 200)
        data = json.loads(resp.data)
        self.assertIn('award_definitions', data)
        self.assertIn('winners', data)
        self.assertGreater(len(data['winners']), 0)

    # --- Mock Drafts ---
    def test_get_mock_drafts(self):
        """Test GET /api/mock-drafts."""
        resp = self.client.get('/api/mock-drafts')
        self.assertEqual(resp.status_code, 200)
        data = json.loads(resp.data)
        self.assertIsInstance(data, list)
        self.assertGreater(len(data), 0)

    def test_get_mock_draft_by_id(self):
        """Test GET /api/mock-drafts/<id>."""
        resp = self.client.get('/api/mock-drafts/mock_2025')
        self.assertEqual(resp.status_code, 200)
        data = json.loads(resp.data)
        self.assertEqual(data['id'], 'mock_2025')

    def test_get_mock_draft_not_found(self):
        """Test GET /api/mock-drafts/<id> for non-existent."""
        resp = self.client.get('/api/mock-drafts/nonexistent')
        self.assertEqual(resp.status_code, 404)

    # --- Seasons ---
    def test_get_seasons(self):
        """Test GET /api/seasons."""
        resp = self.client.get('/api/seasons')
        self.assertEqual(resp.status_code, 200)
        data = json.loads(resp.data)
        self.assertIsInstance(data, list)
        self.assertGreater(len(data), 0)

    # --- Compare ---
    def test_compare_players(self):
        """Test GET /api/compare?ids=marcus_thompson,jamal_reeves."""
        resp = self.client.get('/api/compare?ids=marcus_thompson,jamal_reeves')
        self.assertEqual(resp.status_code, 200)
        data = json.loads(resp.data)
        self.assertIsInstance(data, list)
        self.assertEqual(len(data), 2)

    def test_compare_missing_ids(self):
        """Test GET /api/compare without ids returns 400."""
        resp = self.client.get('/api/compare')
        self.assertEqual(resp.status_code, 400)

    def test_compare_single_id(self):
        """Test GET /api/compare with single id returns 400."""
        resp = self.client.get('/api/compare?ids=marcus_thompson')
        self.assertEqual(resp.status_code, 400)

    # --- Admin UI Routes ---
    def test_admin_login_page(self):
        """Test GET /admin/login returns 200."""
        resp = self.client.get('/admin/login')
        self.assertEqual(resp.status_code, 200)

    def test_admin_panel_unauthorized(self):
        """Test GET /admin/panel without auth returns 401."""
        resp = self.client.get('/admin/panel')
        self.assertEqual(resp.status_code, 401)

    def test_admin_panel_authorized(self):
        """Test GET /admin/panel with auth returns 200."""
        resp = self.client.get('/admin/panel', headers=self._auth_headers())
        self.assertEqual(resp.status_code, 200)

    def test_admin_players_authorized(self):
        """Test GET /admin/players with auth returns 200."""
        resp = self.client.get('/admin/players', headers=self._auth_headers())
        self.assertEqual(resp.status_code, 200)

    def test_admin_teams_authorized(self):
        """Test GET /admin/teams with auth returns 200."""
        resp = self.client.get('/admin/teams', headers=self._auth_headers())
        self.assertEqual(resp.status_code, 200)

    def test_admin_games_authorized(self):
        """Test GET /admin/games with auth returns 200."""
        resp = self.client.get('/admin/games', headers=self._auth_headers())
        self.assertEqual(resp.status_code, 200)

    def test_admin_transactions_authorized(self):
        """Test GET /admin/transactions with auth returns 200."""
        resp = self.client.get('/admin/transactions', headers=self._auth_headers())
        self.assertEqual(resp.status_code, 200)

    def test_admin_injuries_authorized(self):
        """Test GET /admin/injuries with auth returns 200."""
        resp = self.client.get('/admin/injuries', headers=self._auth_headers())
        self.assertEqual(resp.status_code, 200)

    def test_admin_awards_authorized(self):
        """Test GET /admin/awards with auth returns 200."""
        resp = self.client.get('/admin/awards', headers=self._auth_headers())
        self.assertEqual(resp.status_code, 200)

    def test_admin_mock_drafts_authorized(self):
        """Test GET /admin/mock-drafts with auth returns 200."""
        resp = self.client.get('/admin/mock-drafts', headers=self._auth_headers())
        self.assertEqual(resp.status_code, 200)

    def test_admin_events_authorized(self):
        """Test GET /admin/events with auth returns 200."""
        resp = self.client.get('/admin/events', headers=self._auth_headers())
        self.assertEqual(resp.status_code, 200)

    def test_admin_import_authorized(self):
        """Test GET /admin/import with auth returns 200."""
        resp = self.client.get('/admin/import', headers=self._auth_headers())
        self.assertEqual(resp.status_code, 200)

    def test_admin_player_edit_authorized(self):
        """Test GET /admin/players/<id>/edit with auth returns 200."""
        resp = self.client.get('/admin/players/marcus_thompson/edit', headers=self._auth_headers())
        self.assertEqual(resp.status_code, 200)

    # --- Static Files ---
    def test_index(self):
        """Test GET /."""
        resp = self.client.get('/')
        self.assertEqual(resp.status_code, 200)

    def test_new_pages_exist(self):
        """Test that new HTML pages are served."""
        pages = ['compare.html', 'gamelog.html', 'game.html', 'injuries.html',
                 'transactions.html', 'awards.html', 'lore.html', 'mockdraft.html', 'season.html']
        for page in pages:
            resp = self.client.get(f'/{page}')
            self.assertEqual(resp.status_code, 200, f'{page} should return 200')

    def test_not_found(self):
        """Test GET /nonexistent returns 404."""
        resp = self.client.get('/nonexistent')
        self.assertEqual(resp.status_code, 404)
        data = json.loads(resp.data)
        self.assertIn('error', data)

    # --- Security Headers ---
    def test_security_headers(self):
        """Test that security headers are present on responses."""
        resp = self.client.get('/health')
        self.assertEqual(resp.headers.get('X-Content-Type-Options'), 'nosniff')
        self.assertEqual(resp.headers.get('X-Frame-Options'), 'SAMEORIGIN')
        self.assertEqual(resp.headers.get('X-XSS-Protection'), '1; mode=block')
        self.assertEqual(resp.headers.get('Referrer-Policy'), 'strict-origin-when-cross-origin')

    # --- Path Traversal ---
    def test_path_traversal(self):
        """Test path traversal is blocked."""
        resp = self.client.get('/../../etc/passwd')
        self.assertIn(resp.status_code, [403, 404])

    # --- YAML backwards compatibility ---
    def test_old_player_format_loads(self):
        """Test that players without new fields still load correctly."""
        resp = self.client.get('/api/players/cameron_boozer')
        self.assertEqual(resp.status_code, 200)
        data = json.loads(resp.data)
        self.assertEqual(data['id'], 'cameron_boozer')
        # Old format players may not have new fields, but should still load


if __name__ == '__main__':
    unittest.main()
