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
| **Frontend (React SPA)** | React 18 + Vite, React Router, Material UI (theme/CssBaseline), JSX components |
| **Frontend (Legacy)** | Vanilla HTML / CSS / JS (SPA with client-side routing) — in `frontend/public/` |
| **Backend** | Node.js + Express |
| **Real-time** | Socket.IO (lobby updates & live game moves) |
| **Data Store** | Server: JSON file (`data/db.json`); Client: `localStorage` for session |
| **Game History** | Per-game JSON files in `data/game_history/` |

---

## Pages / Screens

### 1. Game Auth (`/game-auth`)
- Username-only entry — stored in `localStorage` as `linked_user`
- Retries always allowed; no lockout on bad input
- "Enter Game" → Lobby

### 2. Lobby (`/lobby`)
- Lists open/waiting games with live player-count dots
- **Create Game** — configurable player count, timer mode (none / total / per-turn)
- **Join** button on each open game
- **Stats** button → `/stats`
- **Practice** button → `/practice`
- **How to Play** button → `/how-to-play`
- Real-time updates via Socket.IO + 5 s polling fallback

### 3. Game Screen (`/game/:gameId`)
- 8×8 canvas board with piece-value dots
- Turn indicator with current player colour
- Legal-move highlights on piece selection
- Per-player countdown clocks (if timer enabled)
- **Board rotation button (🔄)** — rotates the canvas so the current player's pieces are at the bottom
- **Move History panel** (right sidebar):
  - Each entry shows: move number, colour dot, player name, algebraic coordinates, and time elapsed
  - **🎬 Review** — navigates to `/review/:gameId`
  - **⬇ Download** — downloads `game-<id>.json`
  - **🔗 Share** — opens a modal with Copy Link / Copy JSON
- Resign / Offer Draw buttons
- Win banner on game end

### 4. Practice Room (`/practice`)
- Full 8×8 board with all 4 colours
- **Free mode**: add (with selectable piece value 1/2/3), remove, or move any piece
- **View from** buttons (Red / Blue / Green / Yellow) — rotates the board
- Reset / Clear buttons

### 5. Stats Page (`/stats`)
- **Personal stats card**: ELO rating, games played, wins, losses, draws, win rate
- **Recent Games list** (last 10) with Review and Download buttons per game
- **Leaderboard** — top 20 players sorted by ELO

### 6. Game Review (`/review/:gameId`)
- Replays board states move-by-move
- **Playback controls**: ⏮ First · ◀ Prev · ▶ Play · ⏸ Pause · ▶ Next · ⏭ Last
- **Keyboard shortcuts**: ← / → arrows, Space (play/pause), Home / End
- **Speed selector**: 0.5× / 1× / 2× / 4×
- **View perspective buttons**; clickable move list

### 7. Rules Page (`/how-to-play` or `/rules`)
- Full game rules reference

### 8. Spectate Page (`/spectate/:gameId`)
- Live board updates for observers
- Spectator chat
- Rotation controls
- Move history and game info panels

---

## Architecture & File Structure

```
Linked_Game/
├── PLAN.md                           # This file
├── README.md
│
├── backend/
│   ├── package.json
│   ├── server.cjs                    # Express + Socket.IO server (CommonJS)
│   └── game-server.js                # Game logic server module
│
├── data/
│   ├── db.json                       # Persistent user & game data
│   └── game_history/                 # One JSON file per finished game
│       └── <game-uuid>.json
│
├── frontend/
│   ├── package.json                  # Vite + React dependencies
│   │
│   ├── public/                       # Legacy vanilla JS frontend (Express-served)
│   │   ├── index.html                # Legacy SPA shell
│   │   ├── css/
│   │   │   └── style.css             # All legacy styles (dark theme)
│   │   ├── js/
│   │   │   ├── app.js                # Legacy client-side router & bootstrap
│   │   │   ├── auth.js               # Legacy auth page
│   │   │   ├── lobby.js              # Legacy lobby page
│   │   │   ├── game.js               # Legacy game screen
│   │   │   ├── practice.js           # Legacy practice room
│   │   │   ├── stats.js              # Legacy stats page
│   │   │   ├── review.js             # Legacy game review page
│   │   │   ├── rules.js              # Legacy rules page
│   │   │   ├── spectate.js           # Legacy spectate page
│   │   │   ├── board.js              # Legacy canvas board renderer
│   │   │   ├── engine.js             # Legacy game engine
│   │   │   ├── socket.js             # Legacy Socket.IO wrapper
│   │   │   ├── toast.js              # Legacy toast notifications
│   │   │   └── sound.js              # Legacy sound manager
│   │   └── assets/
│   │       └── sounds/               # Game sound effects
│   │
│   ├── middleware/
│   │   └── auth.js
│   │
│   └── src/                          # React SPA (Vite)
│       ├── main.jsx                  # React entry point
│       ├── App.jsx                   # Root component with all routes
│       ├── App.css
│       ├── index.css
│       ├── styles.css
│       ├── theme.js                  # MUI theme
│       │
│       ├── api/                      # API client utilities
│       │   ├── api.js
│       │   └── client.js
│       │
│       ├── components/               # Shared React components
│       │   ├── Auth.jsx
│       │   ├── NavBar.jsx
│       │   ├── ProtectedRoute.jsx
│       │   ├── ErrorBoundary.jsx
│       │   ├── Stripe.jsx
│       │   └── ...
│       │
│       ├── contexts/                 # React contexts
│       │   ├── AuthContext.jsx
│       │   ├── FingerprintContext.jsx
│       │   └── ToastContext.jsx
│       │
│       ├── pages/                    # Non-game pages (existing app)
│       │   ├── Main.jsx
│       │   ├── Account.jsx
│       │   ├── HelpPage.jsx
│       │   ├── Info.jsx
│       │   ├── Plans.jsx
│       │   ├── Wallet.jsx
│       │   ├── Loading.jsx
│       │   └── ...
│       │
│       ├── game/                     # ★ Linked Game module (React)
│       │   ├── index.js              # Re-exports all game modules
│       │   ├── engine.js             # Game rules engine (ES module)
│       │   ├── socket.js             # Socket.IO client wrapper
│       │   ├── sound.js              # Sound effect manager
│       │   ├── BoardCanvas.jsx       # Canvas board renderer component
│       │   ├── GameToast.jsx         # Toast notification context + imperative API
│       │   └── pages/
│       │       ├── GameAuth.jsx      # Username auth for the game
│       │       ├── LobbyPage.jsx     # Game lobby
│       │       ├── GameScreen.jsx    # Live game screen
│       │       ├── PracticePage.jsx  # Practice room
│       │       ├── StatsPage.jsx     # Stats & leaderboard
│       │       ├── ReviewPage.jsx    # Game review / replay
│       │       ├── RulesPage.jsx     # Game rules
│       │       └── SpectatePage.jsx  # Spectate live games
│       │
│       └── utils/
│           ├── bcryptHelper.js
│           └── ...
│
└── test game/                        # Standalone test page
    ├── index.html
    ├── game.js
    └── styles.css
```

---

## React Component Mapping (Legacy → React)

| Legacy File (`public/js/`) | React Component (`src/game/`) | Route |
|----------------------------|-------------------------------|-------|
| `app.js` (router) | `App.jsx` (React Router) | — |
| `auth.js` | `pages/GameAuth.jsx` | `/game-auth` |
| `lobby.js` | `pages/LobbyPage.jsx` | `/lobby` |
| `game.js` | `pages/GameScreen.jsx` | `/game/:gameId` |
| `practice.js` | `pages/PracticePage.jsx` | `/practice` |
| `stats.js` | `pages/StatsPage.jsx` | `/stats` |
| `review.js` | `pages/ReviewPage.jsx` | `/review/:gameId` |
| `rules.js` | `pages/RulesPage.jsx` | `/how-to-play`, `/rules` |
| `spectate.js` | `pages/SpectatePage.jsx` | `/spectate/:gameId` |
| `board.js` | `BoardCanvas.jsx` | (component) |
| `engine.js` | `engine.js` | (utility) |
| `socket.js` | `socket.js` | (utility) |
| `sound.js` | `sound.js` | (utility) |
| `toast.js` | `GameToast.jsx` | (context + provider) |

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

---

## ELO Rating System

- New users start at **1200**
- Ratings updated on game finish (K-factor = 32)
- **4-player scoring** — each player scored against the group average ELO:
  | Result | Score |
  |--------|-------|
  | Winner | 1.0 |
  | Survived (no win) | 0.33 |
  | Eliminated | 0.0 |
- Minimum ELO capped at **100**
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
| GET | `/api/games/:id/live` | Get live game state (for spectators) |
| GET | `/api/games/:id/history` | Full game history (for review) |
| GET | `/api/games/:id/history/download` | Download history as JSON attachment |
| GET | `/api/users/:id/stats` | Get a user's stats + ELO |
| GET | `/api/users/:id/games` | Get a user's recent finished games |
| GET | `/api/leaderboard` | Top 100 players by ELO |

---

## Socket.IO Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `game:join` | client → server | Join a game room |
| `game:move` | client → server | Send a move `{ gameId, userId, from, to }` |
| `game:resign` | client → server | Request resign |
| `game:requestDraw` | client → server | Request draw |
| `game:update` | server → client | Full game state broadcast |
| `game:moveError` | server → client | Move validation error |
| `game:timerTick` | server → client | Timer update `{ clocks, currentColor, turnStartTs }` |
| `game:drawRequested` | server → client | Draw request notification |
| `lobby:update` | server → client | Lobby state changed |
| `spectate:join` | client → server | Join spectator room |
| `spectate:chat:send` | client → server | Send chat message |
| `spectate:chat:msg` | server → client | New chat message |
| `spectate:chat:history` | server → client | Chat history on join |

---

## Build Phases

### Phase 1 — Scaffolding ✅
- [x] Project init (npm, Express, folder structure)
- [x] Basic SPA routing (vanilla JS)
- [x] Home/auth page with retry on failure
- [x] Lobby, Game, Practice page shells

### Phase 2 — Game Engine ✅
- [x] Board state representation with piece values
- [x] Move validation (walk, attack, hop, long hop)
- [x] Link checking after every move
- [x] Attack push resolution
- [x] Win condition: ≥ 6 center points held for 2 consecutive turns

### Phase 3 — Multiplayer ✅
- [x] Socket.IO integration
- [x] Game creation & joining (2–4 players)
- [x] Turn synchronisation with per-player clocks
- [x] Real-time board updates
- [x] Lobby live refresh
- [x] Resign & draw-offer flow
- [x] Player elimination on timeout

### Phase 4 — Polish ✅
- [x] Sound effects (move, capture, win, lose, game start, hurry-up)
- [x] Toast notifications
- [x] Board rotation (rotates to own colour's perspective)
- [x] Piece value dots (gray dot pattern on canvas)
- [x] Move history panel with elapsed time per move
- [x] Download / Share / Review buttons
- [x] Win banner

### Phase 5 — Stats & Review ✅
- [x] ELO rating system (K=32, 4-player scoring)
- [x] Stats page: personal stats, recent games, leaderboard
- [x] Game review page: move-by-move replay with keyboard nav, speed control, rotation
- [x] Game history persistence to `data/game_history/`
- [x] Download/share game history

### Phase 6 — React Migration ✅
- [x] Convert all vanilla JS pages to React JSX components
- [x] Set up React Router routes in `App.jsx`
- [x] Create `BoardCanvas` as a `forwardRef` canvas component with imperative API
- [x] Port `engine.js`, `socket.js`, `sound.js` to ES modules
- [x] Create `GameToast` context (React-friendly toast system)
- [x] Wire up `GameToastProvider` in App component tree
- [x] Preserve all game functionality: auth, lobby, gameplay, spectate, review, practice, stats, rules

### Phase 7 — Remaining / Future Work
- [ ] Move animations polish (currently working via `BoardCanvas.animateMove`)
- [ ] Mobile responsiveness improvements
- [ ] In-game chat (player-to-player)
- [ ] Rematch button on win banner
- [ ] AI / bot player
- [ ] Migrate legacy `public/` frontend fully to React (remove vanilla JS files)
- [ ] Unify styling (port `style.css` to CSS modules or styled-components)
- [ ] Better edge-case handling & automated tests
- [ ] Environment variable configuration for API base URL

---

## Key Design Decisions

1. **No passwords by default** — lightweight auth via username only; session stored in `localStorage`. Password field is optional.
2. **Auth retries always allowed** — the auth form never locks out.
3. **Canvas-based board** — performant rendering with rotation transform; all click coordinates are inverse-transformed to logical board space. Exposed via React `forwardRef` with an imperative API.
4. **Game engine runs on both client and server** — client for instant legal-move feedback; server is the authority.
5. **JSON file DB** — simple persistence; easy to inspect and reset. `db.json` for live state, `game_history/` for archives.
6. **Piece values drive win condition** — the `value` property on each board cell replaces a flat piece count.
7. **Dual frontend** — legacy vanilla JS (`public/js/`) coexists with the new React SPA (`src/game/`) during migration. Both share the same backend API and Socket.IO server.
8. **React component structure** — game-specific code is isolated in `src/game/` with its own index.js re-exports, keeping it separate from the existing app pages/components.
