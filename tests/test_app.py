"""Tests for MADCAP Flask API."""
import json
import os
import sys
import unittest
import tempfile

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

    # --- Static Files ---
    def test_index(self):
        """Test GET /."""
        resp = self.client.get('/')
        self.assertEqual(resp.status_code, 200)

    def test_not_found(self):
        """Test GET /nonexistent returns 404."""
        resp = self.client.get('/nonexistent')
        self.assertEqual(resp.status_code, 404)

    # --- Path Traversal ---
    def test_path_traversal(self):
        """Test path traversal is blocked."""
        resp = self.client.get('/../../etc/passwd')
        self.assertIn(resp.status_code, [403, 404])


if __name__ == '__main__':
    unittest.main()
