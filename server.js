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
const activeTimers   = {};  // gameId -> intervalId
const gameClocks     = {};  // gameId -> { color: remainingMs, ... }
const turnStartTs    = {};  // gameId -> Date.now() when current turn began
const drawRequests   = {};  // gameId -> { requestedBy: userId, agreedBy: [userIds] }
const spectateChats  = {};  // gameId -> [{username, message, ts}, ...]

// ─── Pending-game cleanup (every 60 s, remove waiting games older than 5 min)
setInterval(() => {
  const db = readDB();
  const cutoff = Date.now() - 5 * 60 * 1000;
  const before = db.games.length;
  db.games = db.games.filter(g => !(g.status === 'waiting' && (g.createdAt || 0) < cutoff));
  if (db.games.length !== before) {
    writeDB(db);
    io.emit('lobby:update');
    console.log(`Cleaned up ${before - db.games.length} stale pending game(s).`);
  }
}, 60 * 1000);

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
      stats: { wins: 0, losses: 0, draws: 0, gamesPlayed: 0, elo: 1200 },
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
      user.stats = { wins: 0, losses: 0, draws: 0, gamesPlayed: 0, elo: 1200 };
      writeDB(db);
    }
    // Add ELO if missing
    if (user.stats.elo === undefined) {
      user.stats.elo = 1200;
      writeDB(db);
    }
  }
  
  // Return user without password
  const { password: _, ...userWithoutPassword } = user;
  res.json({ user: userWithoutPassword });
});

// List games (exclude finished)
app.get('/api/games', (_req, res) => {
  const db = readDB();
  const games = db.games
    .filter(g => g.status !== 'finished')
    .map(g => ({
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
    createdAt: Date.now(),
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

// Get live game state for spectators (same as above but explicit endpoint)
app.get('/api/games/:gameId/live', (req, res) => {
  const db = readDB();
  const game = db.games.find(g => g.id === req.params.gameId);
  if (!game) return res.status(404).json({ error: 'Game not found.' });
  res.json({ game: sanitizeGame(game) });
});

// Get user stats
app.get('/api/users/:userId/stats', (req, res) => {
  const db = readDB();
  const user = db.users.find(u => u.id === req.params.userId);
  if (!user) return res.status(404).json({ error: 'User not found.' });
  
  const stats = user.stats || { wins: 0, losses: 0, draws: 0, gamesPlayed: 0, elo: 1200 };
  res.json({ 
    username: user.username, 
    stats,
    createdAt: user.createdAt 
  });
});

// Get leaderboard
app.get('/api/leaderboard', (req, res) => {
  const db = readDB();
  const leaderboard = db.users
    .filter(u => u.stats && u.stats.gamesPlayed > 0)
    .map(u => ({
      id: u.id,
      username: u.username,
      elo: u.stats.elo || 1200,
      wins: u.stats.wins || 0,
      losses: u.stats.losses || 0,
      draws: u.stats.draws || 0,
      gamesPlayed: u.stats.gamesPlayed || 0
    }))
    .sort((a, b) => b.elo - a.elo)
    .slice(0, 100);
  
  res.json({ leaderboard });
});

// Download game history
app.get('/api/games/:gameId/history/download', (req, res) => {
  try {
    const histFile = path.join(HISTORY_DIR, `${req.params.gameId}.json`);
    if (!fs.existsSync(histFile)) {
      return res.status(404).json({ error: 'Game history not found.' });
    }
    
    const histData = JSON.parse(fs.readFileSync(histFile, 'utf-8'));
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="game-${req.params.gameId}.json"`);
    res.json(histData);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load game history.' });
  }
});

// Get game history for review
app.get('/api/games/:gameId/history', (req, res) => {
  try {
    const histFile = path.join(HISTORY_DIR, `${req.params.gameId}.json`);
    if (!fs.existsSync(histFile)) {
      return res.status(404).json({ error: 'Game history not found.' });
    }
    
    const histData = JSON.parse(fs.readFileSync(histFile, 'utf-8'));
    res.json(histData);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load game history.' });
  }
});

// Get user's game history list
app.get('/api/users/:userId/games', (req, res) => {
  const db = readDB();
  const user = db.users.find(u => u.id === req.params.userId);
  if (!user) return res.status(404).json({ error: 'User not found.' });
  
  const userGames = db.games
    .filter(g => g.players.some(p => p.id === req.params.userId) && g.status === 'finished')
    .sort((a, b) => (b.finishedAt || 0) - (a.finishedAt || 0))
    .slice(0, 50)
    .map(g => ({
      id: g.id,
      name: g.name,
      winner: g.winner,
      players: g.players.map(p => ({ username: p.username, color: p.color })),
      turnCount: g.turnCount,
      finishedAt: g.finishedAt
    }));
  
  res.json({ games: userGames });
});

// ─── Board helpers ──────────────────────────────────────

function createEmptyBoard() {
  return Array.from({ length: 8 }, () => Array(8).fill(null));
}

function createStartingBoard(players) {
  const board = createEmptyBoard();
  const colorToEdge = {};
  players.forEach(p => { colorToEdge[p.color] = p.color; });
  
  // Piece values: [x, 3, 2, 1, 1, 2, 3, x]
  const values = [null, 3, 2, 1, 1, 2, 3, null];

  // Red = top edge (row 0, cols 1-6)
  if (colorToEdge.red) for (let c = 1; c <= 6; c++) board[0][c] = { color: 'red', value: values[c] };
  // Blue = bottom edge (row 7, cols 1-6)
  if (colorToEdge.blue) for (let c = 1; c <= 6; c++) board[7][c] = { color: 'blue', value: values[c] };
  // Green = left edge (col 0, rows 1-6)
  if (colorToEdge.green) for (let r = 1; r <= 6; r++) board[r][0] = { color: 'green', value: values[r] };
  // Yellow = right edge (col 7, rows 1-6)
  if (colorToEdge.yellow) for (let r = 1; r <= 6; r++) board[r][7] = { color: 'yellow', value: values[r] };

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

    // Check win condition - count points (piece values) in center
    const centerSquares = [[3,3],[3,4],[4,3],[4,4]];
    const centerPoints = { red: 0, blue: 0, green: 0, yellow: 0 };
    for (const [r,c] of centerSquares) {
      if (game.board[r][c]) {
        const piece = game.board[r][c];
        centerPoints[piece.color] += piece.value || 1;
      }
    }

    for (const color of Object.keys(centerPoints)) {
      if (centerPoints[color] >= 6) {
        game.centerHoldTracker[color]++;
      } else {
        game.centerHoldTracker[color] = 0;
      }
    }

    // Win if held for 2 turns
    for (const color of Object.keys(game.centerHoldTracker)) {
      if (game.centerHoldTracker[color] >= 1) {
        game.winner = color;
        game.status = 'finished';
        game.finishedAt = Date.now();
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
      game.finishedAt = Date.now();
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
        game.finishedAt = Date.now();
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

  // ─── Spectate chat ─────────────────────────────────────────
  socket.on('spectate:chat:send', ({ gameId, username, message }) => {
    if (!gameId || !username || !message) return;
    const text = String(message).trim().slice(0, 200);
    if (!text) return;

    if (!spectateChats[gameId]) spectateChats[gameId] = [];
    const entry = { username: String(username).trim().slice(0, 20), message: text, ts: Date.now() };
    spectateChats[gameId].push(entry);
    // Keep last 100 messages
    if (spectateChats[gameId].length > 100) spectateChats[gameId].shift();

    io.to(gameId).emit('spectate:chat:msg', entry);
  });

  socket.on('spectate:join', ({ gameId }) => {
    socket.join(gameId);
    // Send chat history to the joiner
    const history = spectateChats[gameId] || [];
    socket.emit('spectate:chat:history', history);
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
    
  if (!isDiagonal && !isOrthogonal && !isTwoAwayDiagonally) {
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

  // Checker-style capture: 2-square diagonal jump over an enemy piece
  if (isTwoAwayDiagonally) {
    if (board[tr][tc] !== null) {
      return { valid: false, error: 'Cannot capture – landing square is occupied.' };
    }
    const midR = fr + dr / 2;
    const midC = fc + dc / 2;
    if (!board[midR][midC] || board[midR][midC].color === playerColor) {
      return { valid: false, error: 'Cannot capture – must jump over an enemy piece.' };
    }
    // Capture: delete the enemy piece; links may break (allowed for captures)
    board[midR][midC] = null;
    board[tr][tc] = board[fr][fc];
    board[fr][fc] = null;
  }

  // Check linking — remove unlinked pieces
  removeUnlinkedPieces(board, playerColor);

  return { valid: true, board };
}

function findPushLanding(board, origR, origC, attackedR, attackedC) {
  const dr = attackedR - origR; // push direction row (-1 or +1)
  const dc = attackedC - origC; // push direction col (-1 or +1)

  // Priority-ordered push destinations:
  // [1] Continue diagonal, [2] two orthogonal components, [3] two remaining diagonals
  const candidates = [
    [attackedR + dr, attackedC + dc],   // [1] diagonal continuation
    [attackedR + dr, attackedC],         // [2] orthogonal (row component)
    [attackedR, attackedC + dc],         // [2] orthogonal (col component)
    [attackedR - dr, attackedC + dc],    // [3] far diagonal
    [attackedR + dr, attackedC - dc],    // [3] far diagonal
  ];

  for (const [r, c] of candidates) {
    if (r >= 0 && r < 8 && c >= 0 && c < 8 && board[r][c] === null) {
      return [r, c];
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
    game.finishedAt = Date.now();
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
  
  // Calculate ELO changes
  const players = game.players.map(p => {
    const user = db.users.find(u => u.id === p.id);
    if (!user) return null;
    if (!user.stats) user.stats = { wins: 0, losses: 0, draws: 0, gamesPlayed: 0, elo: 1200 };
    if (user.stats.elo === undefined) user.stats.elo = 1200;
    return { player: p, user, oldElo: user.stats.elo };
  }).filter(Boolean);

  // For 4-player game, calculate ELO based on placement
  if (!isDraw && players.length > 0) {
    const avgElo = players.reduce((sum, p) => sum + p.oldElo, 0) / players.length;
    const K = 32; // ELO K-factor

    players.forEach(({ player, user }) => {
      let score;
      if (player.color === game.winner) {
        score = 1.0; // Winner
      } else if (game.eliminatedColors && game.eliminatedColors.includes(player.color)) {
        score = 0.0; // Eliminated
      } else {
        score = 0.33; // Survived but didn't win
      }

      const expected = 1 / (1 + Math.pow(10, (avgElo - user.stats.elo) / 400));
      const eloChange = Math.round(K * (score - expected));
      user.stats.elo = Math.max(100, user.stats.elo + eloChange); // Min ELO of 100

      user.stats.gamesPlayed++;
      if (isDraw) {
        user.stats.draws++;
      } else if (player.color === game.winner) {
        user.stats.wins++;
      } else {
        user.stats.losses++;
      }
    });
  } else {
    // Draw - small ELO adjustments
    game.players.forEach(player => {
      const user = db.users.find(u => u.id === player.id);
      if (!user) return;
      if (!user.stats) user.stats = { wins: 0, losses: 0, draws: 0, gamesPlayed: 0, elo: 1200 };
      user.stats.gamesPlayed++;
      user.stats.draws++;
    });
  }

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
