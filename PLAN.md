# Linked — 4-Player Board Game Web App

## Overview
**Linked** is a 4-player online board game played on a checker-style board. Each player controls 6 pieces and tries to occupy the center 4 squares of the board for 2 consecutive turns to win.

---

## Game Rules Summary

### Setup
- 8×8 board
- 4 players: **Red** (top), **Blue** (bottom), **Green** (left), **Yellow** (right)
- 6 pieces per player, centered on their back row (edge of the board)

### Objective
- Move **at least 3** of your pieces onto the **center 4 squares** (the 2×2 block in the middle)
- Hold that position for **2 consecutive turns** to win

### Movement
| Move | Direction | Condition |
|------|-----------|-----------|
| **Walk** | Up / Down / Left / Right (orthogonal) | Target square is empty |
| **Attack** | Diagonal | Target square has an enemy piece; enemy is pushed to the closest free square **not adjacent** to the attacker's original position |
| **Hop** | Diagonal over another piece | Landing square must be adjacent to a friendly piece (connects the group) |

### Linking Rule (core mechanic)
- Every piece **must** be part of a connected group (orthogonal + diagonal adjacency counts, i.e., 8-square neighborhood).
- After any move, if a piece has **no friendly piece within its 8 surrounding squares**, it is **unlinked** and **removed** from the board.
- This applies to **all** of that player's pieces — a move can unlink multiple pieces if it breaks a chain.

### Attack Push Resolution
1. Attacker moves diagonally onto the enemy square.
2. The enemy piece is displaced to the **closest free square** that is:
   - **Not adjacent** (8-neighborhood) to the attacker's **original** position (before the move).
3. Search outward (BFS from attacked square) for the first valid landing.

### Win Condition
- A player has ≥ 3 pieces on the center 4 squares at the **end** of their turn.
- That state must persist through the **next full round** (all other players take a turn) and still hold at the start of the player's next turn.
- If the condition is broken during that round, the countdown resets.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Vanilla HTML / CSS / JavaScript (single-page style with client-side routing) |
| **Backend** | Node.js + Express |
| **Data Store** | Server: JSON file (`data/db.json`); Client: `localStorage` for user session |
| **Real-time** | Socket.IO (for lobby updates & game moves) |

---

## Pages / Screens

### 1. Home / Auth (`/`)
- Simple username entry (no password) — stored in `localStorage`
- **Must allow retries** after failed/invalid entry (no lockout)
- "Enter Game" button → navigates to Lobby

### 2. Lobby (`/lobby`)
- Lists open games (waiting for players)
- Shows player count per game (0-4)
- "Create Game" button → creates a new game room
- "Join" button on each open game → joins if < 4 players
- "Practice" button → opens solo practice room
- Real-time updates via Socket.IO

### 3. Game Screen (`/game/:id`)
- Renders the 8×8 board
- Shows current player's turn indicator
- Highlights legal moves when a piece is selected
- Animates moves, attacks, hops
- Displays link-status warnings
- Shows win banner when a player wins

### 4. Practice Room (`/practice`)
- Full 8×8 board with all 4 colors available
- **Free mode**: add, remove, or move any piece freely
- No turn order, no win detection
- Useful for learning mechanics and testing theories
- Reset button to restore default starting positions

---

## Architecture & File Structure

```
Unlink_Game/
├── PLAN.md                  # This file
├── package.json
├── server.js                # Express + Socket.IO server
├── data/
│   └── db.json              # Persistent game/user data
├── public/
│   ├── index.html           # SPA shell
│   ├── css/
│   │   └── style.css        # All styles
│   ├── js/
│   │   ├── app.js           # Router & app bootstrap
│   │   ├── auth.js          # Home / auth page logic
│   │   ├── lobby.js         # Lobby page logic
│   │   ├── game.js          # Game screen logic
│   │   ├── practice.js      # Practice room logic
│   │   ├── board.js         # Board rendering (Canvas or DOM)
│   │   ├── engine.js        # Game rules engine (shared logic)
│   │   └── socket.js        # Socket.IO client wrapper
│   └── assets/
│       └── (piece SVGs or images if needed)
```

---

## Data Models

### User (localStorage + server)
```json
{
  "id": "uuid",
  "username": "PlayerOne"
}
```

### Game (server `db.json`)
```json
{
  "id": "game-uuid",
  "status": "waiting | playing | finished",
  "players": [
    { "id": "user-uuid", "username": "Alice", "color": "red" },
    ...
  ],
  "board": [ [null, null, ...], ... ],  // 8×8 grid
  "currentTurn": 0,
  "turnCount": 0,
  "centerHoldTracker": { "red": 0, "blue": 0, "green": 0, "yellow": 0 },
  "winner": null
}
```

### Board Cell
```json
null | { "color": "red", "playerId": "uuid" }
```

---

## Build Phases

### Phase 1 — Scaffolding ✅ (current)
- [x] Project init (npm, Express, folder structure)
- [x] Basic SPA routing
- [x] Home/auth page **with retry on failure**
- [x] Lobby page (static UI)
- [x] Game page shell
- [x] Practice page shell

### Phase 2 — Game Engine
- [ ] Board state representation
- [ ] Piece placement (starting positions)
- [ ] Move validation (walk, attack, hop)
- [ ] Link checking after every move
- [ ] Attack push resolution (BFS)
- [ ] Win condition checking (center hold for 2 turns)

### Phase 3 — Multiplayer
- [ ] Socket.IO integration
- [ ] Game creation & joining
- [ ] Turn synchronization
- [ ] Real-time board updates
- [ ] Lobby live refresh

### Phase 4 — Polish
- [ ] Move animations
- [ ] Sound effects
- [ ] Better UI/UX
- [ ] Mobile responsiveness
- [ ] Edge-case handling & testing

---

## Key Design Decisions
1. **No passwords** — lightweight auth via username only; session in `localStorage`.
2. **Auth retries always allowed** — the auth form never locks out; invalid input shows an error and the user can immediately try again.
3. **Canvas-based board** — performant rendering; DOM overlay for UI elements.
4. **Game engine runs on both client and server** — client for instant feedback, server as authority.
5. **JSON file DB** — simple persistence; easy to inspect and reset during development.
