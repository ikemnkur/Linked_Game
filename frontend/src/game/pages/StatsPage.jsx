/* ─── Stats Page (React) ──────────────────────────────── */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameToast } from '../GameToast';

const API_BASE = import.meta.env.VITE_API_BASE || '';

function getUser() {
  try { return JSON.parse(localStorage.getItem('linked_user')); } catch { return null; }
}

export default function StatsPage() {
  const navigate = useNavigate();
  const toast = useGameToast();
  const user = getUser();

  const [userStats, setUserStats] = useState(null);
  const [userGames, setUserGames] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);

  useEffect(() => {
    if (!user) { navigate('/'); return; }

    const load = async () => {
      try {
        const [statsRes, gamesRes, lbRes] = await Promise.all([
          fetch(`${API_BASE}/api/users/${user.id}/stats`),
          fetch(`${API_BASE}/api/users/${user.id}/games`),
          fetch(`${API_BASE}/api/leaderboard`),
        ]);
        const statsData = await statsRes.json();
        const gamesData = await gamesRes.json();
        const lbData = await lbRes.json();
        setUserStats(statsData.stats || statsData);
        setUserGames(gamesData.games || []);
        setLeaderboard(lbData.leaderboard || []);
      } catch (err) {
        console.error('Failed to load stats:', err);
      }
    };
    load();
  }, []);

  const downloadGame = async (gameId) => {
    try {
      const res = await fetch(`${API_BASE}/api/games/${gameId}/history/download`);
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `game-${gameId}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast?.success('Game history downloaded!', 2000);
    } catch {
      toast?.error('Failed to download game history.', 3000);
    }
  };

  const stats = userStats;
  const winRate = stats?.gamesPlayed > 0
    ? ((stats.wins / stats.gamesPlayed) * 100).toFixed(1)
    : '0.0';

  return (
    <div className="stats-page">
      <div className="game-header">
        <button className="btn-secondary" onClick={() => navigate('/lobby')}>← Lobby</button>
        <h2>Statistics</h2>
        <div></div>
      </div>

      <div className="stats-container">
        {/* User Stats */}
        <div className="stats-section card">
          <h3>Your Statistics</h3>
          {!stats ? (
            <p>Loading...</p>
          ) : (
            <div className="stats-grid">
              <div className="stat-item"><div className="stat-label">ELO Rating</div><div className="stat-value elo">{stats.elo || 1200}</div></div>
              <div className="stat-item"><div className="stat-label">Games Played</div><div className="stat-value">{stats.gamesPlayed}</div></div>
              <div className="stat-item"><div className="stat-label">Wins</div><div className="stat-value wins">{stats.wins}</div></div>
              <div className="stat-item"><div className="stat-label">Losses</div><div className="stat-value losses">{stats.losses}</div></div>
              <div className="stat-item"><div className="stat-label">Draws</div><div className="stat-value draws">{stats.draws}</div></div>
              <div className="stat-item"><div className="stat-label">Win Rate</div><div className="stat-value">{winRate}%</div></div>
            </div>
          )}
        </div>

        {/* Recent Games */}
        <div className="stats-section card">
          <h3>Recent Games</h3>
          {userGames.length === 0 ? (
            <p className="empty-message">No games played yet.</p>
          ) : (
            <div className="games-list">
              {userGames.slice(0, 10).map(game => {
                const userPlayer = game.players.find(p => p.username === user?.username);
                const isWinner = game.winner === userPlayer?.color;
                const isDraw = game.winner === 'draw';
                let resultClass = isDraw ? 'draw' : isWinner ? 'win' : 'loss';
                let resultText = isDraw ? 'Draw' : isWinner ? 'Win' : 'Loss';
                const date = game.finishedAt ? new Date(game.finishedAt).toLocaleDateString() : 'N/A';

                return (
                  <div key={game.id} className={`game-item ${resultClass}`}>
                    <div className="game-result">{resultText}</div>
                    <div className="game-info">
                      <div className="game-name">{game.name || 'Game'}</div>
                      <div className="game-details">
                        {game.players.map(p => (
                          <span key={p.color} className={`player-badge ${p.color}`}>{p.username}</span>
                        ))}
                      </div>
                      <div className="game-meta">{game.turnCount} turns • {date}</div>
                    </div>
                    <div className="game-actions">
                      <button className="btn-sm" onClick={() => navigate(`/review/${game.id}`)}>Review</button>
                      <button className="btn-sm" onClick={() => downloadGame(game.id)}>Download</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Leaderboard */}
        <div className="stats-section card">
          <h3>Leaderboard (Top 20)</h3>
          {leaderboard.length === 0 ? (
            <p className="empty-message">No players on leaderboard yet.</p>
          ) : (
            <>
              <div className="leaderboard-header">
                <div className="rank">Rank</div>
                <div className="player-name">Player</div>
                <div className="player-elo">ELO</div>
                <div className="player-record">Record</div>
              </div>
              <div className="leaderboard-list">
                {leaderboard.slice(0, 20).map((player, index) => (
                  <div
                    key={player.username}
                    className={`leaderboard-item ${index < 3 ? `rank-${index + 1}` : ''} ${player.username === user?.username ? 'current-user' : ''}`}
                  >
                    <div className="rank">{index + 1}</div>
                    <div className="player-name">{player.username}</div>
                    <div className="player-elo">{player.elo}</div>
                    <div className="player-record">{player.wins}W / {player.losses}L / {player.draws}D</div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
