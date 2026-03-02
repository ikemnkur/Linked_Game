/* ─── Game Screen Page ────────────────────────────────── */

window.GamePage = (() => {
  let renderer = null;
  let gameState = null;
  let selectedPiece = null;
  let clockInterval = null;
  let localClocks = null;    // { color: remainingMs }
  let localTurnStart = null;
  let currentTickColor = null;
  let previousPlayerCount = 0;  // Track player joins
  let previousMoveCount = 0;  // Track moves for sound
  let hasPlayedHurryUp = false;  // Only play hurryup once per turn
  let previousGameStatus = null;  // Track game state changes
  let gameUpdateHandler = null;
  let timerTickHandler = null;
  let moveErrorHandler = null;
  let drawRequestedHandler = null;

  function getUser() {
    try { return JSON.parse(localStorage.getItem('linked_user')); } catch { return null; }
  }

  function render(gameId) {
    const user = getUser();
    if (!user) { window.App.navigate('/'); return; }

    const app = document.getElementById('app');
    app.innerHTML = `
      <div class="game-page">
        <div class="game-header">
          <button id="back-to-lobby" class="btn-secondary">← Lobby</button>
          <h2 id="game-title">Loading…</h2>
          <div class="turn-indicator" id="turn-indicator"></div>
        </div>

        <div class="game-body">
          <div class="game-left">
            <div id="player-clocks" class="player-clocks"></div>
            <div class="board-container" id="board-container"></div>
            <div class="player-labels" id="player-labels"></div>
            <p class="error-msg" id="game-error"></p>
            <div class="game-actions" id="game-actions">
              <button id="resign-btn" class="btn-danger">Resign</button>
              <button id="draw-btn" class="btn-secondary">Offer Draw</button>
            </div>
          </div>
          <div class="game-right">
            <div class="move-log-panel card" id="move-log-panel">
              <h3>Move History</h3>
              <div class="move-log-list" id="move-log-list">
                <p class="empty-log">No moves yet.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="win-banner" id="win-banner" style="display:none">
        <h1 id="win-text"></h1>
        <button id="win-back-btn">Back to Lobby</button>
      </div>
    `;

    document.getElementById('back-to-lobby').addEventListener('click', () => window.App.navigate('/lobby'));
    document.getElementById('win-back-btn').addEventListener('click', () => window.App.navigate('/lobby'));

    const container = document.getElementById('board-container');
    renderer = BoardRenderer.create(container, { size: Math.min(480, window.innerWidth - 40) });
    renderer.onClick((r, c) => handleClick(r, c, user));

    fetchGame(gameId);

    SocketClient.connect();
    SocketClient.joinGame(gameId);
    
    // Store handler references for cleanup
    gameUpdateHandler = (game) => {
      // Detect player joins
      if (game.status === 'waiting' && game.players.length > previousPlayerCount) {
        const newPlayer = game.players[game.players.length - 1];
        const user = getUser();
        // Show toast if it's not the current user who just joined
        if (newPlayer.id !== user.id) {
          Toast.info(`${newPlayer.username} joined the game!`, 3000);
        }
      }

      // Detect game start with timer buffer
      if (game.status === 'playing' && gameState && gameState.status === 'waiting') {
        const maxPlayers = game.maxPlayers || 4;
        Toast.success(`All ${maxPlayers} players joined! Game starting in 3 seconds...`, 3500);
        // Play game start sound after 3 seconds
        setTimeout(() => SoundManager.play('gameStart'), 3000);
      }

      // Detect new moves and play sound
      const currentMoveCount = (game.moveHistory || []).length;
      if (currentMoveCount > previousMoveCount) {
        const lastMove = game.moveHistory[currentMoveCount - 1];
        
        // Check if it was a special event
        if (lastMove.event === 'eliminated' || lastMove.event === 'resigned') {
          // Don't play move sound for eliminations/resignations
        } else if (lastMove.from && lastMove.to) {
          // Regular move - check if it was a capture
          const dr = Math.abs(lastMove.to[0] - lastMove.from[0]);
          const dc = Math.abs(lastMove.to[1] - lastMove.from[1]);
          const isAttackOrHop = (dr === 1 && dc === 1) || (dr === 2 && dc === 2);
          
          if (isAttackOrHop) {
            SoundManager.play('capture');
          } else {
            SoundManager.play('move');
          }
        }
        previousMoveCount = currentMoveCount;
        hasPlayedHurryUp = false; // Reset hurry up for new move
      }

      // Detect game end and play win/lose sound
      if (game.status === 'finished' && previousGameStatus === 'playing') {
        const user = getUser();
        const userPlayer = game.players.find(p => p.id === user.id);
        
        if (game.winner === 'draw') {
          // Draw - no win/lose sound
        } else if (userPlayer && userPlayer.color === game.winner) {
          SoundManager.play('win');
        } else if (userPlayer) {
          SoundManager.play('lose');
        }
      }

      previousGameStatus = game.status;

      previousPlayerCount = game.players.length;

      // Update game state
      gameState = game;
      // Sync clocks from server snapshot
      if (game.clocks) {
        localClocks = { ...game.clocks };
        localTurnStart = game.turnStartTs || Date.now();
        currentTickColor = game.players[game.currentTurn]?.color || null;
      }
      updateUI(user);
    };
    SocketClient.onGameUpdate(gameUpdateHandler);
    
    timerTickHandler = (data) => {
      localClocks = data.clocks;
      currentTickColor = data.currentColor;
      localTurnStart = data.turnStartTs;
      renderClocks();
    };
    SocketClient.onTimerTick(timerTickHandler);
    
    moveErrorHandler = ({ error }) => {
      document.getElementById('game-error').textContent = error;
      setTimeout(() => {
        const el = document.getElementById('game-error');
        if (el) el.textContent = '';
      }, 3000);
    };
    SocketClient.onMoveError(moveErrorHandler);
    
    drawRequestedHandler = (data) => {
      const { requestedBy, agreedCount, totalPlayers } = data;
      Toast.warning(`${requestedBy} requested a draw (${agreedCount}/${totalPlayers} agreed)`, 5000);
    };
    SocketClient.onDrawRequested(drawRequestedHandler);

    // Resign button
    document.getElementById('resign-btn').addEventListener('click', () => {
      if (!gameState || gameState.status !== 'playing') return;
      if (confirm('Are you sure you want to resign? You will lose this game.')) {
        SocketClient.requestResign(gameId, user.id);
      }
    });

    // Draw button
    document.getElementById('draw-btn').addEventListener('click', () => {
      if (!gameState || gameState.status !== 'playing') return;
      SocketClient.requestDraw(gameId, user.id);
      Toast.info('Draw request sent. Waiting for other players to agree...', 3000);
    });

    // Local clock countdown for smooth display
    clockInterval = setInterval(renderClocks, 250);
  }

  async function fetchGame(gameId) {
    try {
      const res = await fetch(`/api/games/${gameId}`);
      const data = await res.json();
      if (data.game) {
        gameState = data.game;
        previousPlayerCount = data.game.players.length;  // Initialize count
        previousMoveCount = (data.game.moveHistory || []).length;  // Initialize move count
        previousGameStatus = data.game.status;  // Initialize status
        const user = getUser();
        updateUI(user);
      }
    } catch {}
  }

  function updateUI(user) {
    if (!gameState || !renderer) return;

    renderer.setBoard(gameState.board);

    // Title
    document.getElementById('game-title').textContent = gameState.name;

    // Turn indicator
    const turnEl = document.getElementById('turn-indicator');
    const eliminated = gameState.eliminatedColors || [];
    if (gameState.status === 'playing') {
      const currentPlayer = gameState.players[gameState.currentTurn];
      const isMyTurn = currentPlayer && currentPlayer.id === user.id;
      if (eliminated.includes(currentPlayer?.color)) {
        turnEl.textContent = `${currentPlayer.username} eliminated`;
        turnEl.style.background = '#555';
        turnEl.style.color = '#fff';
      } else {
        turnEl.textContent = isMyTurn ? 'Your Turn' : `${currentPlayer.username}'s Turn`;
        turnEl.style.background = getColorCSS(currentPlayer.color);
        turnEl.style.color = (currentPlayer.color === 'yellow' || currentPlayer.color === 'green') ? '#222' : '#fff';
      }
    } else if (gameState.status === 'waiting') {
      turnEl.textContent = 'Waiting for players…';
      turnEl.style.background = 'var(--bg-hover)';
      turnEl.style.color = '#fff';
    }

    // Player labels (with eliminated styling)
    const labelsEl = document.getElementById('player-labels');
    labelsEl.innerHTML = gameState.players.map((p, i) => {
      const active = gameState.currentTurn === i ? 'active' : '';
      const elim = eliminated.includes(p.color) ? 'eliminated' : '';
      return `
        <div class="player-label ${active} ${elim}">
          <span class="dot" style="background:${getColorCSS(p.color)}"></span>
          ${p.username} ${elim ? '(out)' : ''}
        </div>
      `;
    }).join('');

    // Clocks
    renderClocks();

    // Move log
    renderMoveLog();

    // Game actions visibility
    const actionsEl = document.getElementById('game-actions');
    if (actionsEl) {
      actionsEl.style.display = (gameState.status === 'playing') ? 'flex' : 'none';
    }

    // Win
    if (gameState.winner) {
      const banner = document.getElementById('win-banner');
      const text = document.getElementById('win-text');
      if (gameState.winner === 'draw') {
        text.textContent = "Game Ended in a Draw!";
        text.style.color = 'var(--text)';
      } else {
        const winnerPlayer = gameState.players.find(p => p.color === gameState.winner);
        text.textContent = `${winnerPlayer ? winnerPlayer.username : gameState.winner} Wins!`;
        text.style.color = getColorCSS(gameState.winner);
      }
      banner.style.display = 'flex';

    //   disappears after 3 seconds     
      setTimeout(() => {
        banner.style.display = 'none';
      }, 3000);
    }

    // Clear selection
    selectedPiece = null;
    renderer.clearHighlights();
  }

  function renderClocks() {
    const el = document.getElementById('player-clocks');
    if (!el || !gameState) return;

    if (gameState.timerMode === 'none' || !localClocks) {
      el.innerHTML = '';
      return;
    }

    const eliminated = gameState.eliminatedColors || [];
    el.innerHTML = gameState.players.map(p => {
      let remaining = localClocks[p.color] || 0;

      // For the active player, subtract elapsed since last tick
      if (p.color === currentTickColor && !eliminated.includes(p.color) && gameState.status === 'playing') {
        const elapsed = Date.now() - (localTurnStart || Date.now());
        if (gameState.timerMode === 'total') {
          remaining = Math.max(0, remaining - elapsed);
        } else {
          remaining = Math.max(0, (gameState.timerValue * 1000) - elapsed);
        }
        
        // Play hurry up sound when time is low (once per turn)
        if (remaining < 20000 && remaining > 0 && !hasPlayedHurryUp) {
          const user = getUser();
          const currentPlayer = gameState.players.find(player => player.color === currentTickColor);
          if (currentPlayer && currentPlayer.id === user.id) {
            SoundManager.play('hurryUp');
            hasPlayedHurryUp = true;
          }
        }
      }

      const secs = Math.ceil(remaining / 1000);
      const mins = Math.floor(secs / 60);
      const s = secs % 60;
      const display = gameState.timerMode === 'total'
        ? `${mins}:${s.toString().padStart(2, '0')}`
        : `${secs}s`;

      const isActive = currentTickColor === p.color && gameState.status === 'playing';
      const isElim = eliminated.includes(p.color);
      const low = remaining < 10000 && !isElim;

      return `
        <div class="player-clock ${isActive ? 'active' : ''} ${isElim ? 'eliminated' : ''} ${low ? 'low' : ''}">
          <span class="clock-dot" style="background:${getColorCSS(p.color)}"></span>
          <span class="clock-name">${p.username}</span>
          <span class="clock-time">${isElim ? 'OUT' : display}</span>
        </div>
      `;
    }).join('');
  }

  function renderMoveLog() {
    const el = document.getElementById('move-log-list');
    if (!el || !gameState) return;

    const moves = gameState.moveHistory || [];
    if (moves.length === 0) {
      el.innerHTML = '<p class="empty-log">No moves yet.</p>';
      return;
    }

    // Show latest moves at top, limit 50
    const recent = moves.slice(-50).reverse();
    el.innerHTML = recent.map(m => {
      if (m.event === 'eliminated') {
        return `<div class="move-entry elimination">
          <span class="move-dot" style="background:${getColorCSS(m.color)}"></span>
          <span>${m.color} eliminated (${m.reason})</span>
        </div>`;
      }
      if (m.event === 'turnSkipped') {
        return `<div class="move-entry turn-skipped">
          <span class="move-dot" style="background:${getColorCSS(m.color)}"></span>
          <span>${m.color} turn skipped (${m.reason})</span>
        </div>`;
      }
      if (m.event === 'resigned') {
        return `<div class="move-entry resignation">
          <span class="move-dot" style="background:${getColorCSS(m.color)}"></span>
          <span>${m.color} resigned</span>
        </div>`;
      }
      if (m.event === 'draw') {
        return `<div class="move-entry draw-agreed">
          <span>🤝 Game ended in a draw (${m.reason})</span>
        </div>`;
      }
      const fromStr = `${String.fromCharCode(97 + m.from[1])}${8 - m.from[0]}`;
      const toStr = `${String.fromCharCode(97 + m.to[1])}${8 - m.to[0]}`;
      return `<div class="move-entry">
        <span class="move-num">#${m.turn + 1}</span>
        <span class="move-dot" style="background:${getColorCSS(m.color)}"></span>
        <span>${m.username}: ${fromStr}→${toStr}</span>
      </div>`;
    }).join('');

    // Auto-scroll to top (latest)
    el.scrollTop = 0;
  }

  function handleClick(r, c, user) {
    if (!gameState || gameState.status !== 'playing') return;

    const currentPlayer = gameState.players[gameState.currentTurn];
    if (!currentPlayer || currentPlayer.id !== user.id) return;

    // Check if eliminated
    const eliminated = gameState.eliminatedColors || [];
    if (eliminated.includes(currentPlayer.color)) return;

    const myColor = currentPlayer.color;
    const board = gameState.board;

    if (selectedPiece) {
      const [sr, sc] = selectedPiece;
      // Clicking same piece — deselect
      if (sr === r && sc === c) {
        selectedPiece = null;
        renderer.clearHighlights();
        return;
      }

      // Try to move
      const result = LinkedEngine.processMove(board, myColor, [sr, sc], [r, c]);
      if (result.valid) {
        SocketClient.sendMove(gameState.id, user.id, [sr, sc], [r, c]);
        selectedPiece = null;
        renderer.clearHighlights();
        return;
      }

      // If clicked another own piece, select it instead
      if (board[r][c] && board[r][c].color === myColor) {
        selectedPiece = [r, c];
        const moves = LinkedEngine.getLegalMoves(board, myColor, r, c);
        renderer.setSelected([r, c]);
        renderer.setLegalMoves(moves);
        return;
      }

      // Invalid move
      document.getElementById('game-error').textContent = result.error || 'Invalid move.';
      setTimeout(() => {
        const el = document.getElementById('game-error');
        if (el) el.textContent = '';
      }, 2000);
      return;
    }

    // No piece selected — select own piece
    if (board[r][c] && board[r][c].color === myColor) {
      selectedPiece = [r, c];
      const moves = LinkedEngine.getLegalMoves(board, myColor, r, c);
      renderer.setSelected([r, c]);
      renderer.setLegalMoves(moves);
      SoundManager.play('select');  // Play select sound
    }
  }

  function getColorCSS(color) {
    const map = { red: '#e94560', blue: '#4ecdc4', green: '#a8e6cf', yellow: '#ffd93d' };
    return map[color] || '#888';
  }

  function cleanup() {
    // Remove only this page's listeners
    if (gameUpdateHandler) SocketClient.off('game:update', gameUpdateHandler);
    if (timerTickHandler) SocketClient.off('game:timerTick', timerTickHandler);
    if (moveErrorHandler) SocketClient.off('game:moveError', moveErrorHandler);
    if (drawRequestedHandler) SocketClient.off('game:drawRequested', drawRequestedHandler);
    
    if (clockInterval) { clearInterval(clockInterval); clockInterval = null; }
    renderer = null;
    gameState = null;
    selectedPiece = null;
    localClocks = null;
    currentTickColor = null;
    previousPlayerCount = 0;
    previousMoveCount = 0;
    hasPlayedHurryUp = false;
    previousGameStatus = null;
    gameUpdateHandler = null;
    timerTickHandler = null;
    moveErrorHandler = null;
    drawRequestedHandler = null;
  }

  return { render, cleanup };
})();
