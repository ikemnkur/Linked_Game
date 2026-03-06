const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const DB_PATH = path.join(__dirname, 'data', 'db.json');
const HISTORY_DIR = path.join(__dirname, 'data', 'game_history');
if (!fs.existsSync(HISTORY_DIR)) fs.mkdirSync(HISTORY_DIR, { recursive: true });

// ─── In-memory timer state (not persisted to JSON) ────────
const activeTimers = {};  // gameId -> intervalId
const gameClocks  = {};  // gameId -> { color: remainingMs, ... }
const turnStartTs = {};  // gameId -> Date.now() when current turn began
const drawRequests = {};  // gameId -> { requestedBy: userId, agreedBy: [userIds] }

// ─── helpers ──────────────────────────────────────────────
function readDB() {
  try {
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
  } catch {
    return { users: [], games: [] };
  }
}

function writeDB(db) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

// ─── middleware ───────────────────────────────────────────
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ─── REST API ────────────────────────────────────────────

// Auth — always allows retries; never locks out
app.post('/api/auth', (req, res) => {
  const { username, password, email } = req.body;
  if (!username || typeof username !== 'string' || username.trim().length === 0) {
    return res.status(400).json({ error: 'Username is required.' });
  }
  if (username.trim().length < 2 || username.trim().length > 20) {
    return res.status(400).json({ error: 'Username must be 2-20 characters.' });
  }

  // Validate password if provided
  if (password && (typeof password !== 'string' || password.length < 4)) {
    return res.status(400).json({ error: 'Password must be at least 4 characters.' });
  }

  // Validate email if provided
  if (email && (typeof email !== 'string' || !email.includes('@'))) {
    return res.status(400).json({ error: 'Invalid email format.' });
  }

  const db = readDB();
  let user = db.users.find(u => u.username.toLowerCase() === username.trim().toLowerCase());
  
  if (!user) {
    // Create new user
    user = { 
      id: uuidv4(), 
      username: username.trim(),
      password: password || null,
      email: email ? email.trim() : null,
      stats: { wins: 0, losses: 0, draws: 0, gamesPlayed: 0 },
      createdAt: new Date().toISOString()
    };
    db.users.push(user);
    writeDB(db);
  } else {
    // Existing user - verify password if they have one set
    if (user.password && password !== user.password) {
      return res.status(401).json({ error: 'Incorrect password.' });
    }
    
    // Ensure stats exist for existing users
    if (!user.stats) {
      user.stats = { wins: 0, losses: 0, draws: 0, gamesPlayed: 0 };
      writeDB(db);
    }
  }
  
  // Return user without password
  const { password: _, ...userWithoutPassword } = user;
  res.json({ user: userWithoutPassword });
});

// List games
app.get('/api/games', (_req, res) => {
  const db = readDB();
  const games = db.games.map(g => ({
    id: g.id,
    name: g.name,
    status: g.status,
    playerCount: g.players.length,
    maxPlayers: g.maxPlayers || 4,
    players: g.players.map(p => ({ username: p.username, color: p.color })),
    timerMode: g.timerMode || 'none',
    timerValue: g.timerValue || 0,
  }));
  res.json({ games });
});

// Create game
app.post('/api/games', (req, res) => {
  const { userId, gameName, maxPlayers, timerMode, timerValue } = req.body;
  const db = readDB();
  const user = db.users.find(u => u.id === userId);
  if (!user) return res.status(400).json({ error: 'User not found.' });

  const COLORS = ['red', 'blue', 'green', 'yellow'];
  const max = [2, 3, 4].includes(maxPlayers) ? maxPlayers : 4;

  // timerMode: 'none' | 'total' | 'perTurn'
  // timerValue: minutes (for total) or seconds (for perTurn, min 10)
  let tMode = 'none', tValue = 0;
  if (timerMode === 'total' && timerValue > 0) {
    tMode = 'total';
    tValue = Math.max(1, Math.min(60, timerValue)); // 1-60 minutes
  } else if (timerMode === 'perTurn' && timerValue > 0) {
    tMode = 'perTurn';
    tValue = Math.max(10, Math.min(300, timerValue)); // 10-300 seconds
  }

  const game = {
    id: uuidv4(),
    name: gameName || `${user.username}'s Game`,
    status: 'waiting',
    maxPlayers: max,
    players: [{ id: user.id, username: user.username, color: COLORS[0] }],
    board: createEmptyBoard(),
    currentTurn: 0,
    turnCount: 0,
    centerHoldTracker: { red: 0, blue: 0, green: 0, yellow: 0 },
    winner: null,
    timerMode: tMode,
    timerValue: tValue,
    eliminatedColors: [],
    moveHistory: [],
  };

  db.games.push(game);
  writeDB(db);

  io.emit('lobby:update');
  res.json({ game: { id: game.id, name: game.name, status: game.status, playerCount: game.players.length, maxPlayers: max } });
});

// Join game
app.post('/api/games/:gameId/join', (req, res) => {
  const { userId } = req.body;
  const db = readDB();
  const game = db.games.find(g => g.id === req.params.gameId);
  if (!game) return res.status(404).json({ error: 'Game not found.' });
  if (game.status !== 'waiting') return res.status(400).json({ error: 'Game already started.' });
  const maxP = game.maxPlayers || 4;
  if (game.players.length >= maxP) return res.status(400).json({ error: 'Game is full.' });
  if (game.players.find(p => p.id === userId)) return res.status(400).json({ error: 'Already in this game.' });

  const user = db.users.find(u => u.id === userId);
  if (!user) return res.status(400).json({ error: 'User not found.' });

  const COLORS = ['red', 'blue', 'green', 'yellow'];
  const takenColors = game.players.map(p => p.color);
  const color = COLORS.find(c => !takenColors.includes(c));

  game.players.push({ id: user.id, username: user.username, color });

  if (game.players.length === maxP) {
    game.status = 'playing';
    game.board = createStartingBoard(game.players);
    game.timerStartsAt = Date.now() + 3000;  // Timer starts in 3 seconds
    // Start timers after 3-second buffer
    setTimeout(() => startGameTimers(game), 3000);
  }

  writeDB(db);
  io.emit('lobby:update');
  io.to(game.id).emit('game:update', sanitizeGame(game));
  res.json({ game: sanitizeGame(game) });
});

// Get game state
app.get('/api/games/:gameId', (req, res) => {
  const db = readDB();
  const game = db.games.find(g => g.id === req.params.gameId);
  if (!game) return res.status(404).json({ error: 'Game not found.' });
  res.json({ game: sanitizeGame(game) });
});

// ─── Board helpers ──────────────────────────────────────

function createEmptyBoard() {
  return Array.from({ length: 8 }, () => Array(8).fill(null));
}

function createStartingBoard(players) {
  const board = createEmptyBoard();
  const colorToEdge = {};
  players.forEach(p => { colorToEdge[p.color] = p.color; });

  // Red = top edge (row 0, cols 1-6)
  if (colorToEdge.red) for (let c = 1; c <= 6; c++) board[0][c] = { color: 'red' };
  // Blue = bottom edge (row 7, cols 1-6)
  if (colorToEdge.blue) for (let c = 1; c <= 6; c++) board[7][c] = { color: 'blue' };
  // Green = left edge (col 0, rows 1-6)
  if (colorToEdge.green) for (let r = 1; r <= 6; r++) board[r][0] = { color: 'green' };
  // Yellow = right edge (col 7, rows 1-6)
  if (colorToEdge.yellow) for (let r = 1; r <= 6; r++) board[r][7] = { color: 'yellow' };

  return board;
}

function sanitizeGame(game) {
  // Attach live clock data if available
  const clocks = gameClocks[game.id] || null;
  return {
    id: game.id,
    name: game.name,
    status: game.status,
    maxPlayers: game.maxPlayers || 4,
    players: game.players.map(p => ({ id: p.id, username: p.username, color: p.color })),
    board: game.board,
    currentTurn: game.currentTurn,
    turnCount: game.turnCount,
    centerHoldTracker: game.centerHoldTracker,
    winner: game.winner,
    timerMode: game.timerMode || 'none',
    timerValue: game.timerValue || 0,
    timerStartsAt: game.timerStartsAt || null,
    clocks: clocks,
    turnStartTs: turnStartTs[game.id] || null,
    eliminatedColors: game.eliminatedColors || [],
    moveHistory: game.moveHistory || [],
  };
}

// ─── Socket.IO ───────────────────────────────────────────

io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  socket.on('game:join', (gameId) => {
    socket.join(gameId);
  });

  socket.on('game:move', (data) => {
    const { gameId, userId, from, to } = data;
    const db = readDB();
    const game = db.games.find(g => g.id === gameId);
    if (!game || game.status !== 'playing') return;

    const playerIndex = game.players.findIndex(p => p.id === userId);
    if (playerIndex === -1 || playerIndex !== game.currentTurn) return;

    const playerColor = game.players[playerIndex].color;
    // Check if this player is eliminated
    if (game.eliminatedColors && game.eliminatedColors.includes(playerColor)) {
      socket.emit('game:moveError', { error: 'You have been eliminated (time ran out).' });
      return;
    }

    const result = processMove(game, playerColor, from, to);
    if (!result.valid) {
      socket.emit('game:moveError', { error: result.error });
      return;
    }

    game.board = result.board;

    // Record move in history
    if (!game.moveHistory) game.moveHistory = [];
    game.moveHistory.push({
      turn: game.turnCount,
      color: playerColor,
      username: game.players[playerIndex].username,
      from, to,
      timestamp: Date.now(),
    });

    // Update clocks for total-time mode
    if (game.timerMode === 'total' && gameClocks[game.id]) {
      const now = Date.now();
      const elapsed = now - (turnStartTs[game.id] || now);
      gameClocks[game.id][playerColor] = Math.max(0, (gameClocks[game.id][playerColor] || 0) - elapsed);
    }

    // Check win condition
    const centerSquares = [[3,3],[3,4],[4,3],[4,4]];
    const centerCounts = { red: 0, blue: 0, green: 0, yellow: 0 };
    for (const [r,c] of centerSquares) {
      if (game.board[r][c]) {
        centerCounts[game.board[r][c].color]++;
      }
    }

    for (const color of Object.keys(centerCounts)) {
      if (centerCounts[color] >= 3) {
        game.centerHoldTracker[color]++;
      } else {
        game.centerHoldTracker[color] = 0;
      }
    }

    // Win if held for 2 turns
    for (const color of Object.keys(game.centerHoldTracker)) {
      if (game.centerHoldTracker[color] >= 2) {
        game.winner = color;
        game.status = 'finished';
        clearInterval(activeTimers[game.id]);
        delete activeTimers[game.id];
        updatePlayerStats(game, db);
      }
    }

    // Advance turn (skip eliminated players)
    game.currentTurn = advanceTurn(game);
    game.turnCount++;

    // Reset turn-start timestamp for new player's clock
    turnStartTs[game.id] = Date.now();

    writeDB(db);
    saveGameHistory(game);
    io.to(gameId).emit('game:update', sanitizeGame(game));
    io.emit('lobby:update');
  });

  socket.on('game:resign', (data) => {
    const { gameId, userId } = data;
    const db = readDB();
    const game = db.games.find(g => g.id === gameId);
    if (!game || game.status !== 'playing') return;

    const player = game.players.find(p => p.id === userId);
    if (!player) return;

    // Eliminate the resigning player
    if (!game.eliminatedColors) game.eliminatedColors = [];
    if (!game.eliminatedColors.includes(player.color)) {
      game.eliminatedColors.push(player.color);
    }

    // Record in history
    if (!game.moveHistory) game.moveHistory = [];
    game.moveHistory.push({
      turn: game.turnCount,
      color: player.color,
      event: 'resigned',
      timestamp: Date.now(),
    });

    // Check if only one player remains
    const alive = game.players.filter(p => !game.eliminatedColors.includes(p.color));
    if (alive.length <= 1) {
      if (alive.length === 1) game.winner = alive[0].color;
      game.status = 'finished';
      clearInterval(activeTimers[game.id]);
      delete activeTimers[game.id];
      updatePlayerStats(game, db);
    } else if (game.currentTurn === game.players.indexOf(player)) {
      // If it was their turn, advance to next player
      game.currentTurn = advanceTurn(game);
      turnStartTs[game.id] = Date.now();
    }

    writeDB(db);
    saveGameHistory(game);
    io.to(game.id).emit('game:update', sanitizeGame(game));
    io.emit('lobby:update');
  });

  socket.on('game:requestDraw', (data) => {
    const { gameId, userId } = data;
    const db = readDB();
    const game = db.games.find(g => g.id === gameId);
    if (!game || game.status !== 'playing') return;

    const player = game.players.find(p => p.id === userId);
    if (!player) return;

    // Initialize draw request
    if (!drawRequests[gameId]) {
      drawRequests[gameId] = { requestedBy: userId, agreedBy: [userId] };
      
      // Notify other players
      io.to(gameId).emit('game:drawRequested', {
        requestedBy: player.username,
        agreedCount: 1,
        totalPlayers: game.players.length
      });
    } else if (!drawRequests[gameId].agreedBy.includes(userId)) {
      // Player agrees to existing draw request
      drawRequests[gameId].agreedBy.push(userId);
      
      const agreedCount = drawRequests[gameId].agreedBy.length;
      io.to(gameId).emit('game:drawRequested', {
        requestedBy: db.users.find(u => u.id === drawRequests[gameId].requestedBy)?.username,
        agreedCount,
        totalPlayers: game.players.length
      });

      // If all players agreed, end game as draw
      if (agreedCount === game.players.length) {
        game.status = 'finished';
        game.winner = 'draw';
        clearInterval(activeTimers[game.id]);
        delete activeTimers[game.id];
        delete drawRequests[gameId];
        
        // Record in history
        if (!game.moveHistory) game.moveHistory = [];
        game.moveHistory.push({
          turn: game.turnCount,
          event: 'draw',
          reason: 'agreement',
          timestamp: Date.now(),
        });

        updatePlayerStats(game, db);
        writeDB(db);
        saveGameHistory(game);
        io.to(gameId).emit('game:update', sanitizeGame(game));
        io.emit('lobby:update');
      }
    }
  });

  socket.on('disconnect', () => {
    console.log(`Socket disconnected: ${socket.id}`);
  });
});

// ─── Game engine ─────────────────────────────────────────

function processMove(game, playerColor, from, to) {
  const board = game.board.map(row => row.map(cell => cell ? { ...cell } : null));
  const [fr, fc] = from;
  const [tr, tc] = to;

  // Validate source
  if (!board[fr][fc] || board[fr][fc].color !== playerColor) {
    return { valid: false, error: 'Not your piece.' };
  }
  
  //   dr - delta row, dc - delta column
  const dr = tr - fr;
  const dc = tc - fc;
  const isDiagonal = Math.abs(dr) === 1 && Math.abs(dc) === 1;
  const isOrthogonal = (Math.abs(dr) + Math.abs(dc)) === 1;
  const isTwoAwayDiagonally = Math.abs(dr) === 2 && Math.abs(dc) === 2;
    
  if ((!isDiagonal && !isOrthogonal)) {
//   if ((!isDiagonal && !isOrthogonal) || (!isTwoAwayDiagonally && !isDiagonal && !isOrthogonal)) {
    return { valid: false, error: 'Invalid move distance.' };
  }

  // Orthogonal walk
  if (isOrthogonal) {
    if (board[tr][tc] !== null) {
      return { valid: false, error: 'Square is occupied.' };
    }
    board[tr][tc] = board[fr][fc];
    board[fr][fc] = null;
  }

  // Diagonal move
  if (isDiagonal) {
    if (board[tr][tc] !== null && board[tr][tc].color !== playerColor) {
      // Attack: push enemy away
      const enemy = board[tr][tc];
      const pushTarget = findPushLanding(board, fr, fc, tr, tc);
      if (!pushTarget) {
        return { valid: false, error: 'No valid square to push enemy to.' };
      }
      board[pushTarget[0]][pushTarget[1]] = enemy;
      board[tr][tc] = board[fr][fc];
      board[fr][fc] = null;
    } else if (board[tr][tc] === null) {
      // Hop: must connect to a friendly piece
      const willConnect = hasAdjacentFriendly(board, tr, tc, playerColor, fr, fc);
      if (!willConnect) {
        return { valid: false, error: 'Diagonal hop must connect to a friendly piece.' };
      }
      board[tr][tc] = board[fr][fc];
      board[fr][fc] = null;
    } else {
      return { valid: false, error: 'Cannot move onto your own piece.' };
    }
  }

  // Check linking — remove unlinked pieces
  removeUnlinkedPieces(board, playerColor);

  return { valid: true, board };
}

function findPushLanding(board, origR, origC, attackedR, attackedC) {
  // BFS from attacked square to find closest free square not adjacent to attacker's origin
  const visited = new Set();
  const queue = [[attackedR, attackedC, 0]];
  visited.add(`${attackedR},${attackedC}`);

  const origAdjacent = new Set();
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = origR + dr;
      const nc = origC + dc;
      if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
        origAdjacent.add(`${nr},${nc}`);
      }
    }
  }
  // Also exclude the original position itself
  origAdjacent.add(`${origR},${origC}`);

  while (queue.length > 0) {
    const [r, c, dist] = queue.shift();

    // Check neighbors
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = r + dr;
        const nc = c + dc;
        if (nr < 0 || nr >= 8 || nc < 0 || nc >= 8) continue;
        const key = `${nr},${nc}`;
        if (visited.has(key)) continue;
        visited.add(key);

        if (board[nr][nc] === null && !origAdjacent.has(key)) {
          return [nr, nc];
        }
        queue.push([nr, nc, dist + 1]);
      }
    }
  }
  return null;
}

function hasAdjacentFriendly(board, r, c, color, excludeR, excludeC) {
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = r + dr;
      const nc = c + dc;
      if (nr < 0 || nr >= 8 || nc < 0 || nc >= 8) continue;
      if (nr === excludeR && nc === excludeC) continue; // piece is moving away
      if (board[nr][nc] && board[nr][nc].color === color) return true;
    }
  }
  return false;
}

function removeUnlinkedPieces(board, color) {
  // Find all pieces of this color
  const pieces = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (board[r][c] && board[r][c].color === color) {
        pieces.push([r, c]);
      }
    }
  }

  // Build adjacency & find connected components
  const visited = new Set();
  const components = [];

  function bfs(startR, startC) {
    const comp = [];
    const q = [[startR, startC]];
    visited.add(`${startR},${startC}`);
    while (q.length > 0) {
      const [r, c] = q.shift();
      comp.push([r, c]);
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          const nr = r + dr;
          const nc = c + dc;
          const key = `${nr},${nc}`;
          if (visited.has(key)) continue;
          if (nr < 0 || nr >= 8 || nc < 0 || nc >= 8) continue;
          if (board[nr][nc] && board[nr][nc].color === color) {
            visited.add(key);
            q.push([nr, nc]);
          }
        }
      }
    }
    return comp;
  }

  for (const [r, c] of pieces) {
    if (!visited.has(`${r},${c}`)) {
      components.push(bfs(r, c));
    }
  }

  // Keep only the largest connected component; remove singletons
  // Actually per rules: any piece with NO friendly neighbor is removed
  // So we remove isolated pieces (component size 1)
  for (const comp of components) {
    if (comp.length === 1) {
      const [r, c] = comp[0];
      board[r][c] = null;
    }
  }
}

// ─── Timer management ────────────────────────────────────

function startGameTimers(game) {
  if (game.timerMode === 'none') return;

  if (game.timerMode === 'total') {
    // Each player gets timerValue minutes total
    const totalMs = game.timerValue * 60 * 1000;
    gameClocks[game.id] = {};
    game.players.forEach(p => { gameClocks[game.id][p.color] = totalMs; });
  } else if (game.timerMode === 'perTurn') {
    // Each turn gets timerValue seconds; store full time for display
    const turnMs = game.timerValue * 1000;
    gameClocks[game.id] = {};
    game.players.forEach(p => { gameClocks[game.id][p.color] = turnMs; });
  }

  turnStartTs[game.id] = Date.now();

  // Tick every second to broadcast clock updates and check timeouts
  activeTimers[game.id] = setInterval(() => tickGameTimer(game.id), 1000);
}

function tickGameTimer(gameId) {
  const db = readDB();
  const game = db.games.find(g => g.id === gameId);
  if (!game || game.status !== 'playing') {
    clearInterval(activeTimers[gameId]);
    delete activeTimers[gameId];
    return;
  }

  const clocks = gameClocks[gameId];
  if (!clocks) return;

  const currentPlayer = game.players[game.currentTurn];
  if (!currentPlayer) return;
  const color = currentPlayer.color;
  const now = Date.now();
  const elapsed = now - (turnStartTs[gameId] || now);

  let remaining;
  if (game.timerMode === 'total') {
    remaining = Math.max(0, (clocks[color] || 0) - elapsed);
  } else {
    // perTurn: remaining from the turn budget
    const turnMs = game.timerValue * 1000;
    remaining = Math.max(0, turnMs - elapsed);
  }

  // Broadcast clock state
  const clockSnapshot = { ...clocks };
  clockSnapshot[color] = remaining;
  io.to(gameId).emit('game:timerTick', {
    clocks: clockSnapshot,
    currentColor: color,
    turnStartTs: turnStartTs[gameId],
  });

  // Time ran out
  if (remaining <= 0) {
    if (game.timerMode === 'perTurn') {
      // In perTurn mode, skip turn instead of eliminating
      skipPlayerTurn(game, color, db);
    } else {
      // In total mode, eliminate player
      eliminatePlayer(game, color, db);
    }
  }
}

function eliminatePlayer(game, color, db) {
  if (!game.eliminatedColors) game.eliminatedColors = [];
  if (game.eliminatedColors.includes(color)) return;

  game.eliminatedColors.push(color);

  // Deduct clock to 0
  if (gameClocks[game.id]) gameClocks[game.id][color] = 0;

  // Record in history
  if (!game.moveHistory) game.moveHistory = [];
  game.moveHistory.push({
    turn: game.turnCount,
    color,
    event: 'eliminated',
    reason: 'timeout',
    timestamp: Date.now(),
  });

  // Check if only one player remains
  const alive = game.players.filter(p => !game.eliminatedColors.includes(p.color));
  if (alive.length <= 1) {
    if (alive.length === 1) game.winner = alive[0].color;
    game.status = 'finished';
    clearInterval(activeTimers[game.id]);
    delete activeTimers[game.id];
    updatePlayerStats(game, db);
  } else {
    // Skip to next non-eliminated player
    game.currentTurn = advanceTurn(game);
    turnStartTs[game.id] = Date.now();
    // Reset per-turn clock for next player
    if (game.timerMode === 'perTurn' && gameClocks[game.id]) {
      const nextColor = game.players[game.currentTurn].color;
      gameClocks[game.id][nextColor] = game.timerValue * 1000;
    }
  }

  writeDB(db);
  saveGameHistory(game);
  io.to(game.id).emit('game:update', sanitizeGame(game));
  io.emit('lobby:update');
}

function skipPlayerTurn(game, color, db) {
  // Record in history
  if (!game.moveHistory) game.moveHistory = [];
  game.moveHistory.push({
    turn: game.turnCount,
    color,
    event: 'turnSkipped',
    reason: 'timeout',
    timestamp: Date.now(),
  });

  // Advance to next player
  game.currentTurn = advanceTurn(game);
  turnStartTs[game.id] = Date.now();

  // Reset per-turn clock for next player
  if (game.timerMode === 'perTurn' && gameClocks[game.id]) {
    const nextColor = game.players[game.currentTurn].color;
    gameClocks[game.id][nextColor] = game.timerValue * 1000;
  }

  writeDB(db);
  saveGameHistory(game);
  io.to(game.id).emit('game:update', sanitizeGame(game));
}

function advanceTurn(game) {
  const n = game.players.length;
  let next = (game.currentTurn + 1) % n;
  const eliminated = game.eliminatedColors || [];
  // Skip eliminated players (up to full loop)
  for (let i = 0; i < n; i++) {
    if (!eliminated.includes(game.players[next].color)) break;
    next = (next + 1) % n;
  }

  // For perTurn mode, reset the new player's clock to full
  if (game.timerMode === 'perTurn' && gameClocks[game.id]) {
    const nextColor = game.players[next].color;
    gameClocks[game.id][nextColor] = game.timerValue * 1000;
  }

  return next;
}

function updatePlayerStats(game, db) {
  if (game.status !== 'finished') return;

  const isDraw = game.winner === 'draw';
  
  game.players.forEach(player => {
    const user = db.users.find(u => u.id === player.id);
    if (!user) return;
    if (!user.stats) user.stats = { wins: 0, losses: 0, draws: 0, gamesPlayed: 0 };

    user.stats.gamesPlayed++;

    if (isDraw) {
      user.stats.draws++;
    } else if (player.color === game.winner) {
      user.stats.wins++;
    } else {
      user.stats.losses++;
    }
  });

  writeDB(db);
}

function saveGameHistory(game) {
  try {
    const histFile = path.join(HISTORY_DIR, `${game.id}.json`);
    const histData = {
      id: game.id,
      name: game.name,
      players: game.players,
      status: game.status,
      winner: game.winner,
      moveHistory: game.moveHistory || [],
      updatedAt: new Date().toISOString(),
    };
    fs.writeFileSync(histFile, JSON.stringify(histData, null, 2));
  } catch (e) {
    console.error('Failed to save game history:', e.message);
  }
}

// ─── SPA fallback ────────────────────────────────────────
app.use((_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ─── Start ───────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Linked server running on http://localhost:${PORT}`);
});
