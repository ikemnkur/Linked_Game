/* ─── Stats Page ──────────────────────────────────────── */

window.StatsPage = (() => {
  let userStats = null;
  let userGames = null;
  let leaderboard = null;

  function getUser() {
    try { return JSON.parse(localStorage.getItem('linked_user')); } catch { return null; }
  }

  async function fetchStats(userId) {
    try {
      const res = await fetch(`/api/users/${userId}/stats`);
      return await res.json();
    } catch (err) {
      console.error('Failed to fetch stats:', err);
      return null;
    }
  }

  async function fetchUserGames(userId) {
    try {
      const res = await fetch(`/api/users/${userId}/games`);
      const data = await res.json();
      return data.games || [];
    } catch (err) {
      console.error('Failed to fetch games:', err);
      return [];
    }
  }

  async function fetchLeaderboard() {
    try {
      const res = await fetch('/api/leaderboard');
      const data = await res.json();
      return data.leaderboard || [];
    } catch (err) {
      console.error('Failed to fetch leaderboard:', err);
      return [];
    }
  }

  async function render() {
    const user = getUser();
    if (!user) {
      window.App.navigate('/');
      return;
    }

    const app = document.getElementById('app');
    app.innerHTML = `
      <div class="stats-page">
        <div class="game-header">
          <button id="back-to-lobby" class="btn-secondary">← Lobby</button>
          <h2>Statistics</h2>
          <div></div>
        </div>

        <div class="stats-container">
          <div class="stats-section card">
            <h3>Your Statistics</h3>
            <div id="user-stats-content">
              <p>Loading...</p>
            </div>
          </div>

          <div class="stats-section card">
            <h3>Recent Games</h3>
            <div id="recent-games-content">
              <p>Loading...</p>
            </div>
          </div>

          <div class="stats-section card">
            <h3>Leaderboard (Top 20)</h3>
            <div id="leaderboard-content">
              <p>Loading...</p>
            </div>
          </div>
        </div>
      </div>
    `;

    document.getElementById('back-to-lobby').addEventListener('click', () => {
      window.App.navigate('/lobby');
    });

    // Load data
    userStats = await fetchStats(user.id);
    userGames = await fetchUserGames(user.id);
    leaderboard = await fetchLeaderboard();

    renderUserStats();
    renderRecentGames();
    renderLeaderboard();
  }

  function renderUserStats() {
    const content = document.getElementById('user-stats-content');
    if (!userStats) {
      content.innerHTML = '<p class="error-msg">Failed to load stats.</p>';
      return;
    }

    const stats = userStats.stats;
    const winRate = stats.gamesPlayed > 0 
      ? ((stats.wins / stats.gamesPlayed) * 100).toFixed(1) 
      : '0.0';

    content.innerHTML = `
      <div class="stats-grid">
        <div class="stat-item">
          <div class="stat-label">ELO Rating</div>
          <div class="stat-value elo">${stats.elo || 1200}</div>
        </div>
        <div class="stat-item">
          <div class="stat-label">Games Played</div>
          <div class="stat-value">${stats.gamesPlayed}</div>
        </div>
        <div class="stat-item">
          <div class="stat-label">Wins</div>
          <div class="stat-value wins">${stats.wins}</div>
        </div>
        <div class="stat-item">
          <div class="stat-label">Losses</div>
          <div class="stat-value losses">${stats.losses}</div>
        </div>
        <div class="stat-item">
          <div class="stat-label">Draws</div>
          <div class="stat-value draws">${stats.draws}</div>
        </div>
        <div class="stat-item">
          <div class="stat-label">Win Rate</div>
          <div class="stat-value">${winRate}%</div>
        </div>
      </div>
    `;
  }

  function renderRecentGames() {
    const content = document.getElementById('recent-games-content');
    if (!userGames || userGames.length === 0) {
      content.innerHTML = '<p class="empty-message">No games played yet.</p>';
      return;
    }

    const user = getUser();
    const gamesHtml = userGames.slice(0, 10).map(game => {
      const userPlayer = game.players.find(p => p.username === user.username);
      const isWinner = game.winner === userPlayer?.color;
      const isDraw = game.winner === 'draw';
      
      let resultClass = '';
      let resultText = '';
      if (isDraw) {
        resultClass = 'draw';
        resultText = 'Draw';
      } else if (isWinner) {
        resultClass = 'win';
        resultText = 'Win';
      } else {
        resultClass = 'loss';
        resultText = 'Loss';
      }

      const date = game.finishedAt 
        ? new Date(game.finishedAt).toLocaleDateString() 
        : 'N/A';

      return `
        <div class="game-item ${resultClass}">
          <div class="game-result">${resultText}</div>
          <div class="game-info">
            <div class="game-name">${game.name || 'Game'}</div>
            <div class="game-details">
              ${game.players.map(p => `<span class="player-badge ${p.color}">${p.username}</span>`).join(' ')}
            </div>
            <div class="game-meta">${game.turnCount} turns • ${date}</div>
          </div>
          <div class="game-actions">
            <button class="btn-sm review-btn" data-game-id="${game.id}">Review</button>
            <button class="btn-sm download-btn" data-game-id="${game.id}">Download</button>
          </div>
        </div>
      `;
    }).join('');

    content.innerHTML = `<div class="games-list">${gamesHtml}</div>`;

    // Add event listeners
    content.querySelectorAll('.review-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const gameId = btn.dataset.gameId;
        window.App.navigate(`/review/${gameId}`);
      });
    });

    content.querySelectorAll('.download-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const gameId = btn.dataset.gameId;
        await downloadGameHistory(gameId);
      });
    });
  }

  function renderLeaderboard() {
    const content = document.getElementById('leaderboard-content');
    if (!leaderboard || leaderboard.length === 0) {
      content.innerHTML = '<p class="empty-message">No players on leaderboard yet.</p>';
      return;
    }

    const user = getUser();
    const top20 = leaderboard.slice(0, 20);

    const leaderboardHtml = top20.map((player, index) => {
      const isCurrentUser = player.username === user.username;
      const rankClass = index < 3 ? `rank-${index + 1}` : '';
      
      return `
        <div class="leaderboard-item ${rankClass} ${isCurrentUser ? 'current-user' : ''}">
          <div class="rank">${index + 1}</div>
          <div class="player-name">${player.username}</div>
          <div class="player-elo">${player.elo}</div>
          <div class="player-record">${player.wins}W / ${player.losses}L / ${player.draws}D</div>
        </div>
      `;
    }).join('');

    content.innerHTML = `
      <div class="leaderboard-header">
        <div class="rank">Rank</div>
        <div class="player-name">Player</div>
        <div class="player-elo">ELO</div>
        <div class="player-record">Record</div>
      </div>
      <div class="leaderboard-list">${leaderboardHtml}</div>
    `;
  }

  async function downloadGameHistory(gameId) {
    try {
      const res = await fetch(`/api/games/${gameId}/history/download`);
      const data = await res.json();
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `game-${gameId}.json`;
      a.click();
      URL.revokeObjectURL(url);
      
      Toast.success('Game history downloaded!', 2000);
    } catch (err) {
      console.error('Download failed:', err);
      Toast.error('Failed to download game history.', 3000);
    }
  }

  function cleanup() {
    userStats = null;
    userGames = null;
    leaderboard = null;
  }

  return { render, cleanup };
})();
