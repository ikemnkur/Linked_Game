/* ─── Lobby Page ──────────────────────────────────────── */

window.LobbyPage = (() => {
  let pollTimer = null;
  let lobbyUpdateHandler = null;

  function getUser() {
    try { return JSON.parse(localStorage.getItem('linked_user')); } catch { return null; }
  }

  async function fetchGames() {
    try {
      const res = await fetch('/api/games');
      const data = await res.json();
      return data.games || [];
    } catch { return []; }
  }

  function render() {
    const user = getUser();
    if (!user) { window.App.navigate('/'); return; }

    const app = document.getElementById('app');
    app.innerHTML = `
      <div class="lobby-page">
        <div class="lobby-header">
          <div>
            <h1>Lobby</h1>
            <p class="user-info">Playing as <strong>${user.username}</strong></p>
          </div>
          <div class="lobby-actions">
            <button id="show-create-form-btn">Create Game</button>
            <button id="practice-btn" class="btn-secondary">Practice Room</button>
            <button id="rules-btn" class="btn-secondary">How to Play</button>
            <button id="logout-btn" class="btn-secondary">Logout</button>
          </div>
        </div>

        <!-- Game creation form (hidden by default) -->
        <div id="create-form-wrap" class="card create-form-wrap" style="display:none">
          <h3 style="margin-bottom:14px">New Game Settings</h3>
          <form id="create-game-form" class="create-game-form">
            <label>
              Game Name <small>(optional)</small>
              <input type="text" id="cg-name" placeholder="My Game" maxlength="30" />
            </label>
            <label>
              Players
              <select id="cg-players">
                <option value="2">2 Players</option>
                <option value="3">3 Players</option>
                <option value="4" selected>4 Players</option>
              </select>
            </label>
            <label>
              Timer Mode
              <select id="cg-timer-mode">
                <option value="none">No Timer</option>
                <option value="total">Total Time per Player</option>
                <option value="perTurn">Time per Turn</option>
              </select>
            </label>
            <div id="cg-timer-value-wrap" style="display:none">
              <label>
                <span id="cg-timer-value-label">Minutes</span>
                <input type="number" id="cg-timer-value" min="1" max="60" value="5" />
              </label>
            </div>
            <div class="create-form-actions">
              <button type="submit">Create</button>
              <button type="button" id="cancel-create" class="btn-secondary">Cancel</button>
            </div>
          </form>
        </div>

        <div id="game-list" class="game-list">
          <div class="empty-lobby">Loading games…</div>
        </div>
      </div>
    `;

    document.getElementById('show-create-form-btn').addEventListener('click', () => {
      document.getElementById('create-form-wrap').style.display = 'block';
      document.getElementById('show-create-form-btn').disabled = true;
    });
    document.getElementById('cancel-create').addEventListener('click', () => {
      document.getElementById('create-form-wrap').style.display = 'none';
      document.getElementById('show-create-form-btn').disabled = false;
    });
    // Timer mode toggle
    document.getElementById('cg-timer-mode').addEventListener('change', (e) => {
      const wrap = document.getElementById('cg-timer-value-wrap');
      const label = document.getElementById('cg-timer-value-label');
      const input = document.getElementById('cg-timer-value');
      if (e.target.value === 'none') {
        wrap.style.display = 'none';
      } else {
        wrap.style.display = 'block';
        if (e.target.value === 'total') {
          label.textContent = 'Minutes (1-60)';
          input.min = 1; input.max = 60; input.value = 5;
        } else {
          label.textContent = 'Seconds per turn (10-300)';
          input.min = 10; input.max = 300; input.value = 30;
        }
      }
    });

    document.getElementById('create-game-form').addEventListener('submit', (e) => {
      e.preventDefault();
      createGame();
    });
    document.getElementById('practice-btn').addEventListener('click', () => window.App.navigate('/practice'));
    document.getElementById('rules-btn').addEventListener('click', () => window.App.navigate('/rules'));
    document.getElementById('logout-btn').addEventListener('click', () => {
      localStorage.removeItem('linked_user');
      window.App.navigate('/');
    });

    loadGames();

    // Real-time updates
    SocketClient.connect();
    lobbyUpdateHandler = () => loadGames();
    SocketClient.onLobbyUpdate(lobbyUpdateHandler);

    // Also poll as fallback
    pollTimer = setInterval(loadGames, 5000);
  }

  async function loadGames() {
    const games = await fetchGames();
    const container = document.getElementById('game-list');
    if (!container) return;

    if (games.length === 0) {
      container.innerHTML = '<div class="empty-lobby">No games yet. Create one to get started!</div>';
      return;
    }

    const user = getUser();
    container.innerHTML = games.map(g => {
      const maxP = g.maxPlayers || 4;
      const dots = [];
      const COLORS = ['red', 'blue', 'green', 'yellow'];
      for (let i = 0; i < maxP; i++) {
        if (g.players[i]) {
          dots.push(`<span class="player-dot filled ${g.players[i].color}"></span>`);
        } else {
          dots.push(`<span class="player-dot empty"></span>`);
        }
      }

      const isJoined = g.players.some(p => p.username === user.username);
      const canJoin = g.status === 'waiting' && g.playerCount < maxP && !isJoined;
      const canEnter = isJoined && g.status === 'playing';

      let timerBadge = '';
      if (g.timerMode === 'total') timerBadge = `<span class="timer-badge">${g.timerValue}m total</span>`;
      else if (g.timerMode === 'perTurn') timerBadge = `<span class="timer-badge">${g.timerValue}s/turn</span>`;

      let actionBtn = '';
      if (canJoin) {
        actionBtn = `<button class="join-btn" data-id="${g.id}">Join</button>`;
      } else if (canEnter) {
        // automatically enter if game is already in progress and user is a participant
        setTimeout(() => {
        window.App.navigate(`/game/${g.id}`);
        }, 1000); // slight delay to ensure lobby updates first

        actionBtn = `<button class="enter-btn" data-id="${g.id}" disabled>Entering…</button>`;

        // actionBtn = `<button class="enter-btn" data-id="${g.id}">Enter Game</button>`;
      } else if (isJoined && g.status === 'waiting') {
        actionBtn = `<button class="enter-btn" data-id="${g.id}" disabled>Waiting…</button>`;
      } else if (g.status === 'finished') {
        actionBtn = `<span style="color:var(--text-muted)">Finished</span>`;
      }

      return `
        <div class="card game-card">
          <div class="game-info">
            <h3>${g.name} ${timerBadge}</h3>
            <p class="player-count">${g.playerCount}/${maxP} players · ${g.status}</p>
          </div>
          <div class="player-dots">${dots.join('')}</div>
          ${actionBtn}
        </div>
      `;
    }).join('');

    // Bind join buttons
    container.querySelectorAll('.join-btn').forEach(btn => {
      btn.addEventListener('click', () => joinGame(btn.dataset.id));
    });
    container.querySelectorAll('.enter-btn').forEach(btn => {
      btn.addEventListener('click', () => window.App.navigate(`/game/${btn.dataset.id}`));
    });
  }

  async function createGame() {
    const user = getUser();
    if (!user) return;

    const gameName = (document.getElementById('cg-name').value || '').trim();
    const maxPlayers = parseInt(document.getElementById('cg-players').value) || 4;
    const timerMode = document.getElementById('cg-timer-mode').value;
    const timerValue = parseInt(document.getElementById('cg-timer-value').value) || 0;

    try {
      const res = await fetch('/api/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, gameName, maxPlayers, timerMode, timerValue }),
      });
      if (res.ok) {
        document.getElementById('create-form-wrap').style.display = 'none';
        document.getElementById('show-create-form-btn').disabled = false;
        loadGames();
      }
    } catch {}
  }

  async function joinGame(gameId) {
    const user = getUser();
    if (!user) return;
    try {
      const res = await fetch(`/api/games/${gameId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      });
      const data = await res.json();
      if (res.ok) {
        loadGames();
        if (data.game && data.game.status === 'playing') {
          window.App.navigate(`/game/${gameId}`);
        }
      }
    } catch {}
  }

  function cleanup() {
    if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
    if (lobbyUpdateHandler) SocketClient.off('lobby:update', lobbyUpdateHandler);
    lobbyUpdateHandler = null;
  }

  return { render, cleanup };
})();
