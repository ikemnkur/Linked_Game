/* ─── Spectate Page (React) ────────────────────────────── */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import BoardCanvas from '../BoardCanvas';
import SocketClient from '../socket';

const API_BASE = import.meta.env.VITE_API_BASE || '';

function getUser() {
  try { return JSON.parse(localStorage.getItem('linked_user')); } catch { return null; }
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function getColorCSS(color) {
  const map = { red: '#e94560', blue: '#4ecdc4', green: '#a8e6cf', yellow: '#ffd93d' };
  return map[color] || '#888';
}

export default function SpectatePage() {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const boardRef = useRef(null);
  const user = getUser();

  const [gameState, setGameState] = useState(null);
  const [moveHistory, setMoveHistory] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const gameStateRef = useRef(null);
  const chatContainerRef = useRef(null);

  const formatMove = (move) => {
    if (move.event === 'resigned') return `${move.username} resigned`;
    if (move.event === 'timeout') return `${move.username} timed out`;
    if (move.event === 'draw') return 'Draw agreed';
    if (move.from && move.to) return `${move.username} (${move.color}): [${move.from}] → [${move.to}]`;
    return 'Event';
  };

  const scrollChat = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    if (!user) { navigate('/'); return; }

    const fetchLiveGame = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/games/${gameId}/live`);
        if (!res.ok) return null;
        const data = await res.json();
        return data.game || null;
      } catch { return null; }
    };

    const init = async () => {
      const game = await fetchLiveGame();
      if (!game) return;

      gameStateRef.current = game;
      setGameState(game);
      setMoveHistory(game.moveHistory || []);
      if (boardRef.current) {
        boardRef.current.setBoard(game.board);
        boardRef.current.clearHighlights();
      }

      SocketClient.connect();
      SocketClient.joinSpectate(gameId);
      SocketClient.joinGame(gameId);
    };

    init();

    const gameUpdateHandler = (data) => {
      const prevState = gameStateRef.current;
      const prevMoveCount = prevState ? (prevState.moveHistory || []).length : 0;
      const newMoveCount = (data.moveHistory || []).length;
      const lastMove = newMoveCount > 0 ? data.moveHistory[newMoveCount - 1] : null;
      const isNewRegularMove = lastMove && lastMove.from && lastMove.to && newMoveCount > prevMoveCount;

      if (isNewRegularMove && prevState?.board && boardRef.current) {
        boardRef.current.animateMove(prevState.board, data.board, lastMove.from, lastMove.to);
      } else if (boardRef.current && data.board) {
        boardRef.current.setBoard(data.board);
        boardRef.current.clearHighlights();
      }

      gameStateRef.current = data;
      setGameState(data);
      setMoveHistory(data.moveHistory || []);
    };

    const chatHistoryHandler = (history) => {
      setChatMessages(history);
      setTimeout(scrollChat, 50);
    };

    const chatMsgHandler = (entry) => {
      setChatMessages(prev => [...prev, entry]);
      setTimeout(scrollChat, 50);
    };

    SocketClient.onGameUpdate(gameUpdateHandler);
    SocketClient.onChatHistory(chatHistoryHandler);
    SocketClient.onChatMessage(chatMsgHandler);

    return () => {
      SocketClient.off('game:update', gameUpdateHandler);
      SocketClient.off('spectate:chat:msg', chatMsgHandler);
      SocketClient.off('spectate:chat:history', chatHistoryHandler);
    };
  }, [gameId]);

  const sendChat = (e) => {
    e.preventDefault();
    const msg = chatInput.trim();
    if (!msg) return;
    SocketClient.sendChatMessage(gameId, user.username, msg);
    setChatInput('');
  };

  // Derive display values
  let title = '👁 Spectating…';
  if (gameState) {
    if (gameState.status === 'finished') {
      title = `👁 ${gameState.name} — Finished`;
    } else {
      const turnColor = gameState.players[gameState.currentTurn]?.color || '?';
      title = `👁 ${gameState.name} — ${turnColor}'s turn`;
    }
  }

  const statusLine = gameState?.status === 'finished'
    ? (gameState.winner === 'draw' ? 'Result: Draw' : `Winner: ${gameState.winner}`)
    : `Turn ${gameState?.turnCount || 0}`;

  const boardSize = Math.min(480, typeof window !== 'undefined' ? window.innerWidth - 40 : 480);

  return (
    <div className="spectate-page">
      <div className="game-header">
        <button className="btn-secondary" onClick={() => navigate('/lobby')}>← Lobby</button>
        <h2>{title}</h2>
        <div></div>
      </div>

      <div className="spectate-body">
        <div className="spectate-left">
          <div className="board-container">
            <BoardCanvas ref={boardRef} size={boardSize} onCellClick={() => {}} />
          </div>

          <div className="review-controls card">
            <div className="rotation-controls" style={{ display: 'flex', gap: '6px', justifyContent: 'center', flexWrap: 'wrap', alignItems: 'center' }}>
              <label style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>View:</label>
              {['red', 'blue', 'green', 'yellow'].map(color => (
                <button
                  key={color}
                  className="rotate-color-btn-sm"
                  onClick={() => boardRef.current?.rotateToPlayer(color)}
                >
                  {color.charAt(0).toUpperCase() + color.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="game-info-panel card">
            <h3>Game Information</h3>
            <div className="info-grid">
              <div className="info-item"><strong>Game:</strong> {gameState?.name || 'N/A'}</div>
              <div className="info-item"><strong>Status:</strong> {statusLine}</div>
              <div className="info-item"><strong>Moves:</strong> {moveHistory.length}</div>
              <div className="info-item">
                <strong>Players:</strong>
                <div className="players-list">
                  {(gameState?.players || []).map(p => {
                    const isWinner = p.color === gameState?.winner;
                    const isElim = (gameState?.eliminatedColors || []).includes(p.color);
                    const isTurn = gameState?.players[gameState?.currentTurn]?.color === p.color && !isElim && !isWinner && gameState?.status === 'playing';
                    return (
                      <div key={p.color} className={`player-info ${isWinner ? 'winner' : ''} ${isElim ? 'eliminated' : ''}`}>
                        <span className={`player-badge ${p.color}`}>{p.username}</span>
                        {isWinner && <span className="winner-badge">👑</span>}
                        {isElim && <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}> eliminated</span>}
                        {isTurn && <span style={{ color: 'var(--accent)', fontSize: '0.8rem' }}> ▶ to play</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="spectate-right">
          <div className="move-history-panel card">
            <h3>Move History</h3>
            <div className="move-list">
              {moveHistory.length === 0 ? (
                <p className="empty-message">No moves yet.</p>
              ) : (
                moveHistory.map((move, i) => (
                  <div key={i} className={`move-item ${move.color || ''}`}>
                    <span className="move-number">{i + 1}.</span>
                    <span className="move-text">{formatMove(move)}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="chat-panel card">
            <h3>Spectator Chat</h3>
            <div className="chat-messages" ref={chatContainerRef}>
              {chatMessages.map((entry, i) => {
                const time = new Date(entry.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                return (
                  <div key={i} className="chat-msg">
                    <span className="chat-user">{escapeHtml(entry.username)}</span>
                    <span className="chat-time">{time}</span>
                    <span className="chat-text">{escapeHtml(entry.message)}</span>
                  </div>
                );
              })}
            </div>
            <form className="chat-form" onSubmit={sendChat} autoComplete="off">
              <input
                type="text"
                placeholder="Say something…"
                maxLength={200}
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
              />
              <button type="submit">Send</button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
