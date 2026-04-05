# MADCAP - Modular Athlete Database & Career Analysis Platform

A sports scouting web application for tracking fictional (and real) NBA2K universe players, teams, leagues, drafts, and game schedules.

## Features

- **Player Database** - Browse, search, and filter players by name, position, league, status, and fictional flag
- **Player Profiles** - Detailed career statistics, stat progression charts (Chart.js), draft info, lore timeline, scouting notes
- **Team Pages** - Roster, depth chart, and recent game history
- **League Standings** - Conference-based standings with win/loss records
- **Draft History** - Historical draft picks linked to player profiles
- **Schedule & Results** - Game schedule with scores and venue info
- **Admin Panel** - CRUD operations for all entities via REST API with Basic Auth or session login
- **YAML Data Files** - Individual player and team records stored as YAML for easy editing
- **Lore System** - Markdown-based career narratives and timeline events

## Quick Start

```bash
# Clone the repository
git clone https://github.com/alperien/madcap.git
cd madcap

# Install dependencies
pip install -r requirements.txt

# Run the application
bash run.sh
```

The app will be available at:
- **Frontend**: http://localhost:8081/
- **Admin Panel**: http://localhost:8081/admin/login
- **API**: http://localhost:8081/api/*
- **Health Check**: http://localhost:8081/health

Default admin credentials: `admin` / `madcap` (override with `ADMIN_USER` and `ADMIN_PASS` env vars).

## Project Structure

```
madcap/
  admin/
    app.py           # Flask backend - API routes, auth, static file serving
  data/
    players/         # Individual player YAML files
    teams/           # Individual team YAML files
    lore/            # Player lore markdown files
    leagues.json     # League definitions and standings
    games.json       # Game schedule and results
    drafts.json      # Draft history
    events.json      # Lore/timeline events
  public/
    index.html       # Homepage - league hub, scores, events, stat leaders
    players.html     # Player database listing
    player.html      # Individual player profile with charts
    teams.html       # Team database listing
    team.html        # Individual team page
    leagues.html     # League standings
    drafts.html      # Draft history
    schedule.html    # Game schedule and results
    css/style.css    # Stylesheet
    js/
      app.js         # Core data loading, modal system, edit mode
      render.js      # Shared rendering functions (homepage, standings, schedule)
      players.js     # Player list and profile rendering
      teams.js       # Team list and page rendering
      drafts.js      # Draft rendering
      charts.js      # Chart.js extensions (placeholder)
  tests/
    test_app.py      # API test suite
  requirements.txt   # Python dependencies (Flask, PyYAML)
  run.sh             # Startup script
```

## API Endpoints

| Resource | GET (list) | GET (single) | POST | PUT | DELETE |
|----------|-----------|-------------|------|-----|--------|
| Players  | `/api/players` | `/api/players/<id>` | `/api/players` | `/api/players/<id>` | `/api/players/<id>` |
| Teams    | `/api/teams` | `/api/teams/<id>` | `/api/teams` | `/api/teams/<id>` | `/api/teams/<id>` |
| Games    | `/api/games` | `/api/games/<id>` | `/api/games` | `/api/games/<id>` | `/api/games/<id>` |
| Leagues  | `/api/leagues` | `/api/leagues/<id>` | `/api/leagues` | `/api/leagues/<id>` | `/api/leagues/<id>` |
| Drafts   | `/api/drafts` | `/api/drafts/<year>` | `/api/drafts` | `/api/drafts/<year>` | `/api/drafts/<year>` |
| Events   | `/api/events` | `/api/events/<id>` | `/api/events` | `/api/events/<id>` | `/api/events/<id>` |

Write endpoints require Basic Auth or an authenticated admin session.

## Running Tests

```bash
cd madcap
python -m pytest tests/ -v
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `SECRET_KEY` | Random hex | Flask session secret key |
| `ADMIN_USER` | `admin` | Admin panel username |
| `ADMIN_PASS` | `madcap` | Admin panel password |
| `FLASK_DEBUG` | `false` | Enable Flask debug mode |
| `PORT` | `8081` | Server port |

## License

See [LICENSE](LICENSE) for details.
