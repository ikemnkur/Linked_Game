/* ─── Spectate Page ───────────────────────────────────── */

window.SpectatePage = (() => {
  let renderer    = null;
  let gameId      = null;
  let moveHistory = [];
  let gameState   = null;
  let gameUpdateHandler = null;
  let chatMsgHandler    = null;
  let chatHistoryHandler = null;

  function getUser() {
    try { return JSON.parse(localStorage.getItem('linked_user')); } catch { return null; }
  }

  async function fetchLiveGame(id) {
    try {
      const res = await fetch(`/api/games/${id}/live`);
      if (!res.ok) return null;
      const data = await res.json();
      return data.game || null;
    } catch { return null; }
  }

  async function render(id) {
    gameId = id;
    const user = getUser();
    if (!user) { window.App.navigate('/'); return; }

    const app = document.getElementById('app');
    app.innerHTML = `
      <div class="spectate-page">
        <div class="game-header">
          <button id="back-lobby-btn" class="btn-secondary">← Lobby</button>
          <h2 id="spectate-title">👁 Spectating…</h2>
          <div></div>
        </div>

        <div class="spectate-body">
          <!-- Left: board + info -->
          <div class="spectate-left">
            <div class="board-container" id="board-container"></div>

            <div class="review-controls card">
              <div class="rotation-controls" style="display:flex;gap:6px;justify-content:center;flex-wrap:wrap;align-items:center;">
                <label style="color:var(--text-muted);font-size:0.9rem;">View:</label>
                <button class="rotate-color-btn-sm" data-color="red">Red</button>
                <button class="rotate-color-btn-sm" data-color="blue">Blue</button>
                <button class="rotate-color-btn-sm" data-color="green">Green</button>
                <button class="rotate-color-btn-sm" data-color="yellow">Yellow</button>
              </div>
            </div>

            <div class="game-info-panel card" id="game-info-panel">
              <p style="color:var(--text-muted)">Loading…</p>
            </div>
          </div>

          <!-- Right: move list + chat -->
          <div class="spectate-right">
            <div class="move-history-panel card">
              <h3>Move History</h3>
              <div class="move-list" id="move-list">
                <p class="empty-message">No moves yet.</p>
              </div>
            </div>

            <div class="chat-panel card">
              <h3>Spectator Chat</h3>
              <div class="chat-messages" id="chat-messages"></div>
              <form class="chat-form" id="chat-form" autocomplete="off">
                <input type="text" id="chat-input" placeholder="Say something…" maxlength="200" />
                <button type="submit">Send</button>
              </form>
            </div>
          </div>
        </div>
      </div>
    `;

    document.getElementById('back-lobby-btn').addEventListener('click', () => {
      cleanup();
      window.App.navigate('/lobby');
    });

    // Board renderer
    const container = document.getElementById('board-container');
    renderer = BoardRenderer.create(container, { size: Math.min(480, window.innerWidth - 40) });

    // Rotation buttons
    document.querySelectorAll('.rotate-color-btn-sm').forEach(btn => {
      btn.addEventListener('click', () => renderer.rotateToPlayer(btn.dataset.color));
    });

    // Fetch initial state
    gameState = await fetchLiveGame(gameId);
    if (!gameState) {
      document.getElementById('spectate-title').textContent = '👁 Game not found';
      document.getElementById('game-info-panel').innerHTML = '<p class="error-msg">Game not found or already removed.</p>';
      return;
    }

    applyGameState(gameState);

    // Join socket room for live updates + chat history
    SocketClient.connect();
    SocketClient.joinSpectate(gameId);

    // Also join the game update room
    SocketClient.joinGame(gameId);

    // Live board updates
    gameUpdateHandler = (data) => {
      gameState = data;
      applyGameState(data);
    };
    SocketClient.onGameUpdate(gameUpdateHandler);

    // Chat
    chatHistoryHandler = (history) => {
      history.forEach(entry => appendChatMessage(entry, false));
      scrollChat();
    };
    chatMsgHandler = (entry) => {
      appendChatMessage(entry, true);
    };
    SocketClient.onChatHistory(chatHistoryHandler);
    SocketClient.onChatMessage(chatMsgHandler);

    // Chat form submit
    document.getElementById('chat-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const input = document.getElementById('chat-input');
      const msg = input.value.trim();
      if (!msg) return;
      SocketClient.sendChatMessage(gameId, user.username, msg);
      input.value = '';
    });
  }

  function applyGameState(game) {
    // Update title
    const title = document.getElementById('spectate-title');
    if (title) {
      if (game.status === 'finished') {
        title.textContent = `👁 ${game.name} — Finished`;
      } else {
        const turnColor = game.players[game.currentTurn]?.color || '?';
        title.textContent = `👁 ${game.name} — ${turnColor}'s turn`;
      }
    }

    // Update board
    if (renderer && game.board) {
      renderer.setBoard(game.board);
      renderer.clearHighlights();
    }

    // Update move list
    const history = game.moveHistory || [];
    if (history.length !== moveHistory.length) {
      moveHistory = history;
      renderMoveList();
    }

    // Update game info panel
    renderGameInfo(game);
  }

  function renderMoveList() {
    const container = document.getElementById('move-list');
    if (!container) return;
    if (moveHistory.length === 0) {
      container.innerHTML = '<p class="empty-message">No moves yet.</p>';
      return;
    }
    container.innerHTML = moveHistory.map((move, i) => {
      const colorClass = move.color || '';
      return `
        <div class="move-item ${colorClass}">
          <span class="move-number">${i + 1}.</span>
          <span class="move-text">${formatMove(move)}</span>
        </div>
      `;
    }).join('');
    // Scroll to bottom
    container.scrollTop = container.scrollHeight;
  }

  function formatMove(move) {
    if (move.event === 'resigned') return `${move.username} resigned`;
    if (move.event === 'timeout')  return `${move.username} timed out`;
    if (move.event === 'draw')     return 'Draw agreed';
    if (move.from && move.to)      return `${move.username} (${move.color}): [${move.from}] → [${move.to}]`;
    return 'Event';
  }

  function renderGameInfo(game) {
    const panel = document.getElementById('game-info-panel');
    if (!panel) return;

    const COLORS = ['red', 'blue', 'green', 'yellow'];
    const activePlayers = (game.players || []).filter(p => !(game.eliminatedColors || []).includes(p.color));

    const playersHtml = (game.players || []).map(p => {
      const isWinner   = p.color === game.winner;
      const isElim     = (game.eliminatedColors || []).includes(p.color);
      const isActive   = !isElim && !isWinner && game.status === 'playing';
      const isTurn     = game.players[game.currentTurn]?.color === p.color && isActive;
      return `
        <div class="player-info ${isWinner ? 'winner' : ''} ${isElim ? 'eliminated' : ''}">
          <span class="player-badge ${p.color}">${p.username}</span>
          ${isWinner ? '<span class="winner-badge">👑</span>' : ''}
          ${isElim   ? '<span style="color:var(--text-muted);font-size:0.8rem;"> eliminated</span>' : ''}
          ${isTurn   ? '<span style="color:var(--accent);font-size:0.8rem;"> ▶ to play</span>' : ''}
        </div>
      `;
    }).join('');

    const statusLine = game.status === 'finished'
      ? (game.winner === 'draw' ? 'Result: Draw' : `Winner: ${game.winner}`)
      : `Turn ${game.turnCount}`;

    panel.innerHTML = `
      <h3>Game Information</h3>
      <div class="info-grid">
        <div class="info-item"><strong>Game:</strong> ${game.name || 'N/A'}</div>
        <div class="info-item"><strong>Status:</strong> ${statusLine}</div>
        <div class="info-item"><strong>Moves:</strong> ${(game.moveHistory || []).length}</div>
        <div class="info-item"><strong>Players:</strong>
          <div class="players-list">${playersHtml}</div>
        </div>
      </div>
    `;
  }

  function appendChatMessage(entry, scroll) {
    const container = document.getElementById('chat-messages');
    if (!container) return;
    const time = new Date(entry.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const div = document.createElement('div');
    div.className = 'chat-msg';
    div.innerHTML = `<span class="chat-user">${escapeHtml(entry.username)}</span><span class="chat-time">${time}</span><span class="chat-text">${escapeHtml(entry.message)}</span>`;
    container.appendChild(div);
    if (scroll) scrollChat();
  }

  function scrollChat() {
    const container = document.getElementById('chat-messages');
    if (container) container.scrollTop = container.scrollHeight;
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function cleanup() {
    if (gameUpdateHandler)    SocketClient.off('game:update',              gameUpdateHandler);
    if (chatMsgHandler)       SocketClient.off('spectate:chat:msg',        chatMsgHandler);
    if (chatHistoryHandler)   SocketClient.off('spectate:chat:history',    chatHistoryHandler);
    renderer       = null;
    gameState      = null;
    moveHistory    = [];
    gameId         = null;
    gameUpdateHandler  = null;
    chatMsgHandler     = null;
    chatHistoryHandler = null;
  }

  return { render, cleanup };
})();
