# Linked — 4-Player Board Game Web App

## Overview
**Linked** is a 4-player online board game played on a checker-style board. Each player controls 6 pieces and tries to accumulate **6 points** in the center 4 squares of the board for 2 consecutive turns to win. Pieces have values (1–3) displayed as gray dots.

---

## Game Rules Summary

### Setup
- 8×8 board
- 4 players: **Red** (top), **Blue** (bottom), **Green** (left), **Yellow** (right)
- 6 pieces per player, centered on their back row (edge of the board)
- Pieces have values arranged as: **[x, 3, 2, 1, 1, 2, 3, x]**
  - The two pieces closest to the center have value **1**
  - The next two outward have value **2**
  - The outermost two have value **3**
  - Corner squares remain empty
- Piece values are displayed as **gray dots** on the pieces (1 dot, 2 dots, 3 dots)

### Objective
- Move pieces onto the **center 4 squares** (the 2×2 block in the middle) to accumulate **≥ 6 points**
- Points are the sum of `value` properties of all your pieces on the center squares
- Hold that score for **2 consecutive turns** to win

### Movement
| Move | Direction | Condition |
|------|-----------|-----------|
| **Walk** | Up / Down / Left / Right (orthogonal) | Target square is empty |
| **Attack** | Diagonal (1 step) | Target square has an enemy piece; enemy is pushed to the closest free square **not adjacent** to the attacker's original position |
| **Hop** | Diagonal (1 step) to empty square | Landing square must be adjacent to a friendly piece (connects the group) |

### Linking Rule (core mechanic)
- Every piece **must** be part of a connected group (orthogonal + diagonal adjacency, i.e., 8-square neighbourhood).
- After any move, if a piece has **no friendly piece within its 8 surrounding squares**, it is **unlinked** and **removed** from the board.
- This applies to **all** of that player's pieces simultaneously — a single move can unlink multiple pieces.

### Attack Push Resolution
1. Attacker moves diagonally onto the enemy square.
2. The enemy piece is displaced to the **closest free square** that is:
   - **Not adjacent** (8-neighbourhood) to the attacker's **original** position.
3. Search order: BFS outward from the attacked square.

### Win Condition
- A player has **≥ 6 center points** at the **end** of their turn.
- That state must survive the **next full round** (all other active players take a turn).
- If the total drops below 6 during that round, the countdown resets.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Vanilla HTML / CSS / JavaScript (SPA with client-side routing) |
| **Backend** | Node.js + Express |
| **Real-time** | Socket.IO (lobby updates & live game moves) |
| **Data Store** | Server: JSON file (`data/db.json`); Client: `localStorage` for session |
| **Game History** | Per-game JSON files in `data/game_history/` |

---

## Pages / Screens

### 1. Home / Auth (`/`)
- Username-only entry — stored in `localStorage`
- Retries always allowed; no lockout on bad input
- "Enter Game" → Lobby

### 2. Lobby (`/lobby`)
- Lists open/waiting games with live player-count dots
- **Create Game** — configurable player count, timer mode (none / total / per-turn)
- **Join** button on each open game
- **Stats** button → `/stats`
- **Practice** button → `/practice`
- **How to Play** button → `/rules`
- Real-time updates via Socket.IO + 5 s polling fallback

### 3. Game Screen (`/game/:id`)
- 8×8 canvas board with piece-value dots
- Turn indicator with current player colour
- Legal-move highlights on piece selection
- Per-player countdown clocks (if timer enabled)
- **Board rotation button (🔄)** — rotates the canvas so the current player's pieces are at the bottom; supports 0°/90°/180°/270°
- **Move History panel** (right sidebar):
  - Each entry shows: move number, colour dot, player name, algebraic coordinates, and **time elapsed since the previous move (seconds, 1 d.p.)**
  - **🎬 Review** — navigates to `/review/:id`
  - **⬇ Download** — downloads `game-<id>.json`
  - **🔗 Share** — opens a modal with:
    - *Copy Link* — copies `origin/game/:id` to clipboard
    - *Copy JSON* — fetches and copies the raw history JSON
- Resign / Offer Draw buttons
- Win banner on game end

### 4. Practice Room (`/practice`)
- Full 8×8 board with all 4 colours
- **Free mode**: add (with selectable piece value 1/2/3), remove, or move any piece
- **View from** buttons (Red / Blue / Green / Yellow) — rotates the board to that colour's perspective
- Reset button restores default starting positions; Clear removes all pieces
- No turn order, no win detection

### 5. Stats Page (`/stats`)
- **Personal stats card**: ELO rating, games played, wins, losses, draws, win rate
- **Recent Games list** (last 10 finished games):
  - Win/Loss/Draw badge, game name, player badges, turn count, date
  - Per-game **Review** and **Download** buttons
- **Leaderboard** — top 20 players sorted by ELO; gold/silver/bronze rank styling; current user highlighted

### 6. Game Review (`/review/:id`)
- Fetches full move history from `/api/games/:id/history`
- Replays board states move-by-move, reconstructing each position via the engine
- **Playback controls**: ⏮ First · ◀ Prev · ▶ Play · ⏸ Pause · ▶ Next · ⏭ Last
- **Keyboard shortcuts**: ← / → arrows, Space (play/pause), Home / End
- **Speed selector**: 0.5× / 1× / 2× / 4×
- **View perspective buttons**: rotate board to Red / Blue / Green / Yellow
- Clickable move list (right panel) — jumps directly to that board state; active entry highlighted with auto-scroll
- Game information card: players, result, total moves

### 7. Rules Page (`/rules` or `/how-to-play`)
- Full game rules reference

---

## Architecture & File Structure

```
Linked_Game/
├── PLAN.md
├── package.json
├── server.js                      # Express + Socket.IO server
├── data/
│   ├── db.json                    # Persistent user & game data
│   └── game_history/              # One JSON file per finished game
│       └── <game-uuid>.json
└── public/
    ├── index.html                 # SPA shell
    ├── css/
    │   └── style.css              # All styles (dark theme)
    ├── js/
    │   ├── app.js                 # Client-side router & bootstrap
    │   ├── auth.js                # Home / auth page
    │   ├── lobby.js               # Lobby page
    │   ├── game.js                # Game screen (board, clocks, chat, move log)
    │   ├── practice.js            # Practice room
    │   ├── stats.js               # Stats page & leaderboard
    │   ├── review.js              # Game review / replay page
    │   ├── rules.js               # Rules reference page
    │   ├── board.js               # Canvas board renderer (rotation-aware)
    │   ├── engine.js              # Game rules engine (runs on client & server)
    │   ├── socket.js              # Socket.IO client wrapper
    │   ├── toast.js               # Toast notification system
    │   └── sound.js               # Sound effect manager
    └── assets/
        └── sounds/
```

---

## Data Models

### User (`db.json`)
```json
{
  "id": "uuid",
  "username": "PlayerOne",
  "password": null,
  "email": null,
  "stats": {
    "wins": 0,
    "losses": 0,
    "draws": 0,
    "gamesPlayed": 0,
    "elo": 1200
  },
  "createdAt": "ISO-date"
}
```

### Game (`db.json`)
```json
{
  "id": "game-uuid",
  "name": "My Game",
  "status": "waiting | playing | finished",
  "maxPlayers": 4,
  "players": [
    { "id": "user-uuid", "username": "Alice", "color": "red" }
  ],
  "board": [ [null, ...], ... ],
  "currentTurn": 0,
  "turnCount": 0,
  "centerHoldTracker": { "red": 0, "blue": 0, "green": 0, "yellow": 0 },
  "eliminatedColors": [],
  "winner": null,
  "timerMode": "none | total | perTurn",
  "timerValue": 0,
  "moveHistory": [],
  "finishedAt": 1234567890
}
```

### Board Cell
```json
null | { "color": "red", "value": 1 }
```
`value` is 1, 2, or 3 — used both for display (gray dots) and win-condition point totals.

### Move History Entry
```json
{
  "turn": 5,
  "color": "red",
  "username": "Alice",
  "from": [0, 1],
  "to": [1, 1],
  "timestamp": 1234567890
}
```
Special events use `"event": "resigned" | "eliminated" | "draw" | "turnSkipped"` instead of `from`/`to`.

### Game History File (`data/game_history/<id>.json`)
Full game snapshot saved on every move, including complete `board`, `players`, `moveHistory`, `winner`, and `finishedAt`.

---

## ELO Rating System

- New users start at **1200**
- Ratings are updated when a game finishes (K-factor = 32)
- **4-player scoring** — each player is scored against the group average ELO:
  | Result | Score |
  |--------|-------|
  | Winner | 1.0 |
  | Survived (no win) | 0.33 |
  | Eliminated | 0.0 |
- Minimum ELO is capped at **100**
- Draw: stats incremented, ELO unchanged

---

## REST API

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth` | Register or log in (username + optional password) |
| GET | `/api/games` | List all games (lobby) |
| POST | `/api/games` | Create a new game |
| POST | `/api/games/:id/join` | Join a game |
| GET | `/api/games/:id` | Get game state |
| GET | `/api/games/:id/history` | Full game history (for review) |
| GET | `/api/games/:id/history/download` | Download history as JSON attachment |
| GET | `/api/users/:id/stats` | Get a user's stats + ELO |
| GET | `/api/users/:id/games` | Get a user's recent finished games |
| GET | `/api/leaderboard` | Top 100 players by ELO |

---

## Build Phases

### Phase 1 — Scaffolding ✅
- [x] Project init (npm, Express, folder structure)
- [x] Basic SPA routing
- [x] Home/auth page with retry on failure
- [x] Lobby page (static UI)
- [x] Game page shell
- [x] Practice page shell

### Phase 2 — Game Engine ✅
- [x] Board state representation
- [x] Piece placement with values `[x,3,2,1,1,2,3,x]`
- [x] Move validation (walk, attack, hop)
- [x] Link checking after every move
- [x] Attack push resolution (BFS)
- [x] Win condition: ≥ 6 center points held for 2 consecutive turns

### Phase 3 — Multiplayer ✅
- [x] Socket.IO integration
- [x] Game creation & joining (2–4 players)
- [x] Turn synchronisation with per-player clocks
- [x] Real-time board updates
- [x] Lobby live refresh
- [x] Resign & draw-offer flow
- [x] Player elimination on disconnect / timeout

### Phase 4 — Polish ✅
- [x] Sound effects (move, capture, win, lose, game start, hurry-up)
- [x] Toast notifications
- [x] Board rotation (🔄 button; rotates to own colour's perspective)
- [x] Piece value dots (gray dot pattern on canvas)
- [x] Move history panel with elapsed time per move
- [x] Download / Share / Review buttons on move history panel
- [x] Win banner

### Phase 5 — Stats & Review ✅
- [x] ELO rating system (K=32, 4-player scoring)
- [x] Stats page: personal stats, recent games, leaderboard
- [x] Game review page: move-by-move replay, keyboard nav, speed control, board rotation
- [x] Game history persistence to `data/game_history/`
- [x] Download game history as JSON
- [x] Share game via link or clipboard JSON

### Phase 6 — Remaining / Future Work
- [ ] Move animations on the canvas
- [ ] Mobile responsiveness improvements
- [ ] In-game chat
- [ ] Spectator mode (join a finished or in-progress game as observer)
- [ ] Rematch button on win banner
- [ ] AI / bot player
- [ ] Better edge-case handling & automated tests

---

## Key Design Decisions
1. **No passwords by default** — lightweight auth via username only; session stored in `localStorage`. Password field is optional.
2. **Auth retries always allowed** — the auth form never locks out.
3. **Canvas-based board** — performant rendering with rotation transform built into the renderer; all click coordinates are inverse-transformed back to logical board space.
4. **Game engine runs on both client and server** — client for instant legal-move feedback; server is the authority (validates every move before broadcasting).
5. **JSON file DB** — simple persistence; easy to inspect and reset during development. `db.json` for live state, `game_history/` for immutable per-game archives.
6. **Piece values drive win condition** — the `value` property on each board cell replaces a flat piece count, making centre control more strategic.
7. **ELO averaged across opponents** — in a 4-player game each player's expected score is computed against the mean ELO of all participants, keeping the maths clean without a full round-robin matrix.
