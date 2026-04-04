# MADCAP - Modular Athlete Database & Career Analysis Platform

A professional scouting-style platform for tracking a fictional NBA2K universe. Manage career data from high school through professional leagues (NBA, G-League, FIBA, international), blending hardcore statistical data with narrative world-building.

## Features

- Player profiles with full career stats (HS, College, Pro)
- Team pages with rosters, depth charts, and game history
- League standings and schedules
- Draft history with fictional pick tracking
- Career timeline / lore events
- Stat progression charts (Chart.js)
- Admin panel with authentication for full CRUD management
- Responsive design for mobile and desktop
- Full REST API with authentication for all entities

## Tech Stack

- **Frontend**: Static HTML/CSS/JS (old-school forum aesthetic, responsive)
- **Backend**: Python Flask (admin panel + JSON API with auth)
- **Data**: JSON flat files
- **Charts**: Chart.js 4.x (CDN with SRI)

## Quick Start

```bash
pip install -r requirements.txt
./run.sh
```

- Frontend: http://localhost:8081/
- Admin panel: http://localhost:8081/admin/login (default: admin / madcap)
- API: http://localhost:8081/api/*
- Health check: http://localhost:8081/health

Or serve static files separately:
```bash
python -m http.server 8000 -d public/
```
Then configure `app.js` to point to the Flask API URL.

## Project Structure

```
madcap/
├── data/                    # JSON data files
│   ├── players.json
│   ├── teams.json
│   ├── leagues.json
│   ├── games.json
│   ├── drafts.json
│   └── events.json
├── public/                  # Static frontend
│   ├── index.html
│   ├── players.html
│   ├── player.html
│   ├── teams.html
│   ├── team.html
│   ├── leagues.html
│   ├── drafts.html
│   ├── schedule.html
│   ├── css/style.css
│   └── js/
│       ├── app.js           # Core: data loading, API helpers, edit mode, CRUD
│       ├── render.js        # Shared render functions
│       ├── players.js       # Player list, profile, career stats, charts
│       ├── teams.js         # Team list, team page, roster, depth chart, games
│       └── drafts.js        # Draft history rendering
├── admin/                   # Flask admin panel
│   └── app.py               # Flask app with REST API + auth + admin UI
├── tests/                   # Test suite
│   └── test_app.py
├── requirements.txt
├── run.sh
└── .gitignore
```

## Data Management

All data is stored in JSON files under `data/`. The admin panel provides a web interface for CRUD operations. You can also edit JSON files directly.

### Adding Players

Use the API: `POST /api/players` (requires auth) or edit `data/players.json` directly. Set `is_fictional: true` for fictional draft picks.

### Adding Teams

Use the API: `POST /api/teams` (requires auth) or edit `data/teams.json`. Team IDs follow the pattern `{league}_{abbreviation}` (e.g., `nba_cha`).

### Adding Lore Events

Create events in `data/events.json` and reference them in player `lore_events` arrays.

## API Endpoints

All write endpoints (POST, PUT, DELETE) require authentication via Basic Auth or session.

### Players
- `GET /api/players` - All players
- `GET /api/players/<id>` - Single player
- `POST /api/players` - Create player (auth required)
- `PUT /api/players/<id>` - Update player (auth required)
- `DELETE /api/players/<id>` - Delete player (auth required)

### Teams
- `GET /api/teams` - All teams
- `GET /api/teams/<id>` - Single team
- `POST /api/teams` - Create team (auth required)
- `PUT /api/teams/<id>` - Update team (auth required)
- `DELETE /api/teams/<id>` - Delete team (auth required)

### Games
- `GET /api/games` - All games
- `GET /api/games/<id>` - Single game
- `POST /api/games` - Create game (auth required)
- `PUT /api/games/<id>` - Update game (auth required)
- `DELETE /api/games/<id>` - Delete game (auth required)

### Leagues
- `GET /api/leagues` - All leagues
- `GET /api/leagues/<id>` - Single league
- `POST /api/leagues` - Create league (auth required)
- `PUT /api/leagues/<id>` - Update league (auth required)
- `DELETE /api/leagues/<id>` - Delete league (auth required)

### Drafts
- `GET /api/drafts` - All drafts
- `GET /api/drafts/<year>` - Draft by year
- `POST /api/drafts` - Create draft (auth required)
- `PUT /api/drafts/<year>` - Update draft (auth required)
- `DELETE /api/drafts/<year>` - Delete draft (auth required)

### Events
- `GET /api/events` - All events
- `GET /api/events/<id>` - Single event
- `POST /api/events` - Create event (auth required)
- `PUT /api/events/<id>` - Update event (auth required)
- `DELETE /api/events/<id>` - Delete event (auth required)

### Other
- `GET /health` - Health check
- `GET /admin/login` - Admin login page
- `GET /admin/panel` - Admin panel (auth required)
- `GET /admin/logout` - Logout

## Authentication

Default credentials: `admin` / `madcap`

Change via environment variables:
```bash
export ADMIN_USER=youruser
export ADMIN_PASS=yourpass
export SECRET_KEY=your-random-secret-key
```

API access supports Basic Auth:
```bash
curl -u admin:madcap http://localhost:8081/api/players
```

## Security

- All write endpoints require authentication
- Path traversal protection on static file serving
- Input validation and sanitization on all API endpoints
- Request size limits (2MB max)
- CSRF protection for form submissions
- No hardcoded secrets (use environment variables)

## Running Tests

```bash
python -m pytest tests/ -v
# or
python -m unittest discover tests/
```

## Sample Data

The project includes 3 sample players (2 fictional, 1 real), 5 NBA teams, 2 draft years, 3 games, and 4 lore events as a starting point.
