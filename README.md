# MADCAP - Modular Athlete Database & Career Analysis Platform

A dense, information-rich, Web 1.0-style basketball player tracking platform. MADCAP tracks fictional NBA2K characters (full career, lore, game logs, media) with secondary support for real teammates (basic bio + current stats).

Visual target: Basketball-Reference data density meets classic phpBB forum aesthetics.

## Features

### Core
- **Player Database** - 16 player YAML files with detailed career stats, game logs, and biographical data
- **Team Management** - Team profiles with rosters, depth charts, and season records
- **League Standings** - Conference and division standings
- **Draft History** - Historical draft records
- **Schedule & Results** - Game schedule with scores and box scores

### New in v2.0
- **2K Attributes & Badges** - Full 16-attribute rating system with tiered badges (Bronze/Silver/Gold/Hall of Fame)
- **Injury Tracking** - Global injury report with severity levels, game missed tracking, and player-specific injury history
- **Transaction Log** - Full transaction history (drafts, trades, signings, waivers)
- **Award System** - Award definitions and historical winners, player trophy cases
- **Mock Draft Board** - Analyst mock draft projections
- **Season Archives** - Browse historical seasons with stat leaders
- **Player Comparison** - Side-by-side player comparison with radar charts
- **Full Game Logs** - Per-game stats with filtering by season and level
- **Box Scores** - Full game box scores with individual player stats
- **Lore System** - Rich narrative markdown articles for fictional players
- **Physical Measurements** - Combine data (wingspan, vertical, sprint times)
- **Contract Tracking** - Contract details, values, and option years
- **Media Clippings** - News headlines and articles per player
- **Three-Column Dashboard** - Dense ESPN-2003-style homepage with ticker bar
- **Admin Dashboard** - Full CRUD admin UI with player editor, transaction management, injury reports, bulk import

### Frontend Pages
| Page | Description |
|------|-------------|
| `index.html` | Three-column dashboard with ticker, sidebars, stat leaders |
| `players.html` | Player database with filtering and sorting |
| `player.html` | Dense player profile (14+ sections) |
| `teams.html` | Team database |
| `team.html` | Team profile |
| `leagues.html` | League standings |
| `drafts.html` | Draft history |
| `schedule.html` | Game schedule and results |
| `compare.html` | Player comparison with radar charts |
| `gamelog.html` | Full player game log |
| `game.html` | Game detail with box scores |
| `injuries.html` | Injury report board |
| `transactions.html` | Transaction log feed |
| `awards.html` | Award history by year |
| `lore.html` | Player lore/narrative page |
| `mockdraft.html` | Mock draft board |
| `season.html` | Season archive |

### API Endpoints
| Resource | GET | POST | PUT | DELETE |
|----------|-----|------|-----|--------|
| Players | `/api/players` | `/api/players` | `/api/players/<id>` | `/api/players/<id>` |
| Teams | `/api/teams` | `/api/teams` | `/api/teams/<id>` | `/api/teams/<id>` |
| Games | `/api/games` | `/api/games` | `/api/games/<id>` | `/api/games/<id>` |
| Leagues | `/api/leagues` | `/api/leagues` | `/api/leagues/<id>` | `/api/leagues/<id>` |
| Drafts | `/api/drafts` | `/api/drafts` | `/api/drafts/<year>` | `/api/drafts/<year>` |
| Events | `/api/events` | `/api/events` | `/api/events/<id>` | `/api/events/<id>` |
| Transactions | `/api/transactions` | `/api/transactions` | `/api/transactions/<id>` | `/api/transactions/<id>` |
| Injuries | `/api/injuries` | `/api/injuries` | `/api/injuries/<id>` | `/api/injuries/<id>` |
| Awards | `/api/awards` | - | - | - |
| Mock Drafts | `/api/mock-drafts` | `/api/mock-drafts` | `/api/mock-drafts/<id>` | `/api/mock-drafts/<id>` |
| Seasons | `/api/seasons` | - | - | - |
| Compare | `/api/compare?ids=a,b` | - | - | - |
| Game Log | `/api/players/<id>/game-log` | - | - | - |

Player sub-resources: `/api/players/<id>/injuries`, `/api/players/<id>/transactions`, `/api/players/<id>/awards`, `/api/players/<id>/attributes`, `/api/players/<id>/badges`, `/api/players/<id>/contract`, `/api/players/<id>/lore`

## Tech Stack
- **Backend**: Flask (Python) with YAML/JSON data storage
- **Frontend**: Vanilla HTML/CSS/JS, Chart.js for charts
- **Auth**: Basic Auth + session-based login
- **Style**: phpBB-inspired CSS with Basketball-Reference density

## Setup

```bash
pip install -r requirements.txt
python admin/app.py
```

Server runs on `http://localhost:8081`. Admin login: `admin` / `madcap`.

## Running Tests

```bash
python -m pytest tests/ -v
```

## Data Structure
- `data/players/*.yaml` - Player profiles (fictional with full career data, real with basic stats)
- `data/teams/*.yaml` - Team profiles
- `data/lore/*.md` - Player narrative articles
- `data/games.json` - Game schedule and box scores
- `data/leagues.json` - League definitions and standings
- `data/drafts.json` - Draft history
- `data/events.json` - Timeline events
- `data/transactions.json` - Transaction log
- `data/injuries.json` - Injury report
- `data/awards.json` - Award definitions and winners
- `data/mock_drafts.json` - Mock draft boards
- `data/seasons.json` - Season archive metadata
