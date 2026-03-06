/* ─── Lobby Page (React) ──────────────────────────────── */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import SocketClient from '../socket';
import { useGameToast } from '../GameToast';

const API_BASE = import.meta.env.VITE_API_BASE || '';

function getUser() {
  try { return JSON.parse(localStorage.getItem('linked_user')); } catch { return null; }
}

export default function LobbyPage() {
  const navigate = useNavigate();
  const toast = useGameToast();
  const [games, setGames] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [gameName, setGameName] = useState('');
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [timerMode, setTimerMode] = useState('none');
  const [timerValue, setTimerValue] = useState(5);
  const pollRef = useRef(null);
  const user = getUser();

  const loadGames = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/games`);
      const data = await res.json();
      setGames(data.games || []);
    } catch {}
  }, []);

  useEffect(() => {
    if (!user) { navigate('/'); return; }

    SocketClient.connect();
    loadGames();

    const handler = () => loadGames();
    SocketClient.onLobbyUpdate(handler);

    pollRef.current = setInterval(loadGames, 5000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      SocketClient.off('lobby:update', handler);
    };
  }, []);

  const createGame = async () => {
    if (!user) return;
    try {
      const res = await fetch(`${API_BASE}/api/games`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, gameName, maxPlayers, timerMode, timerValue }),
      });
      if (res.ok) {
        setShowCreateForm(false);
        loadGames();
      }
    } catch {}
  };

  const joinGame = async (gameId) => {
    if (!user) return;
    try {
      const res = await fetch(`${API_BASE}/api/games/${gameId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      });
      const data = await res.json();
      if (res.ok) {
        loadGames();
        if (data.game?.status === 'playing') {
          navigate(`/game/${gameId}`);
        }
      }
    } catch {}
  };

  const waiting = games.filter(g => g.status === 'waiting');
  const active = games.filter(g => g.status === 'playing');

  const renderGameCard = (g) => {
    const maxP = g.maxPlayers || 4;
    const isJoined = g.players.some(p => p.username === user?.username);
    const canJoin = g.status === 'waiting' && g.playerCount < maxP && !isJoined;
    const canEnter = isJoined && g.status === 'playing';
    const canWatch = !isJoined && g.status === 'playing';

    let timerBadge = '';
    if (g.timerMode === 'total') timerBadge = `${g.timerValue}m total`;
    else if (g.timerMode === 'perTurn') timerBadge = `${g.timerValue}s/turn`;

    const statusLabel = g.status === 'playing'
      ? '🔴 Live'
      : `${g.playerCount}/${maxP} players · waiting`;

    return (
      <div key={g.id} className={`card game-card ${g.status === 'playing' ? 'game-card-active' : ''}`}>
        <div className="game-info">
          <h3>{g.name} {timerBadge && <span className="timer-badge">{timerBadge}</span>}</h3>
          <p className="player-count">{statusLabel}</p>
        </div>
        <div className="player-dots">
          {Array.from({ length: maxP }).map((_, i) => (
            <span
              key={i}
              className={`player-dot ${g.players[i] ? `filled ${g.players[i].color}` : 'empty'}`}
            />
          ))}
        </div>
        {canJoin && <button className="join-btn" onClick={() => joinGame(g.id)}>Join</button>}
        {canEnter && <button className="enter-btn" onClick={() => navigate(`/game/${g.id}`)}>Enter Game</button>}
        {isJoined && g.status === 'waiting' && !canEnter && (
          <button className="enter-btn" disabled>Waiting…</button>
        )}
        {canWatch && <button className="watch-btn" onClick={() => navigate(`/spectate/${g.id}`)}>👁 Watch</button>}
      </div>
    );
  };

  const timerLabel = timerMode === 'total' ? 'Minutes (1-60)' : 'Seconds per turn (10-300)';
  const timerMin = timerMode === 'total' ? 1 : 10;
  const timerMax = timerMode === 'total' ? 60 : 300;

  return (
    <div className="lobby-page">
      <div className="lobby-header">
        <div>
          <h1>Lobby</h1>
          <p className="user-info">Playing as <strong>{user?.username}</strong></p>
        </div>
        <div className="lobby-actions">
          <button onClick={() => setShowCreateForm(true)}>Create Game</button>
          <button className="btn-secondary" onClick={() => navigate('/stats')}>Stats</button>
          <button className="btn-secondary" onClick={() => navigate('/practice')}>Practice Room</button>
          <button className="btn-secondary" onClick={() => navigate('/how-to-play')}>How to Play</button>
          <button className="btn-secondary" onClick={() => {
            localStorage.removeItem('linked_user');
            navigate('/');
          }}>Logout</button>
        </div>
      </div>

      {showCreateForm && (
        <div className="card create-form-wrap">
          <h3 style={{ marginBottom: '14px' }}>New Game Settings</h3>
          <form className="create-game-form" onSubmit={(e) => { e.preventDefault(); createGame(); }}>
            <label>
              Game Name <small>(optional)</small>
              <input type="text" placeholder="My Game" maxLength={30} value={gameName} onChange={(e) => setGameName(e.target.value)} />
            </label>
            <label>
              Players
              <select value={maxPlayers} onChange={(e) => setMaxPlayers(parseInt(e.target.value))}>
                <option value={2}>2 Players</option>
                <option value={3}>3 Players</option>
                <option value={4}>4 Players</option>
              </select>
            </label>
            <label>
              Timer Mode
              <select value={timerMode} onChange={(e) => {
                setTimerMode(e.target.value);
                setTimerValue(e.target.value === 'total' ? 5 : 30);
              }}>
                <option value="none">No Timer</option>
                <option value="total">Total Time per Player</option>
                <option value="perTurn">Time per Turn</option>
              </select>
            </label>
            {timerMode !== 'none' && (
              <label>
                {timerLabel}
                <input type="number" min={timerMin} max={timerMax} value={timerValue} onChange={(e) => setTimerValue(parseInt(e.target.value))} />
              </label>
            )}
            <div className="create-form-actions">
              <button type="submit">Create</button>
              <button type="button" className="btn-secondary" onClick={() => setShowCreateForm(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="game-list">
        {active.length > 0 && (
          <>
            <div className="lobby-section-header">Active Games</div>
            {active.map(renderGameCard)}
          </>
        )}
        {waiting.length > 0 && (
          <>
            <div className="lobby-section-header">Open Games</div>
            {waiting.map(renderGameCard)}
          </>
        )}
        {games.length === 0 && (
          <div className="empty-lobby">No games yet. Create one to get started!</div>
        )}
      </div>
    </div>
  );
}
