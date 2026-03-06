/* ─── Game Review Page (React) ─────────────────────────── */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import BoardCanvas from '../BoardCanvas';
import LinkedEngine from '../engine';

const API_BASE = import.meta.env.VITE_API_BASE || '';

function getUser() {
  try { return JSON.parse(localStorage.getItem('linked_user')); } catch { return null; }
}

export default function ReviewPage() {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const boardRef = useRef(null);
  const autoPlayRef = useRef(null);

  const [gameHistory, setGameHistory] = useState(null);
  const [moveHistory, setMoveHistory] = useState([]);
  const [boardStates, setBoardStates] = useState([]);
  const [currentMoveIndex, setCurrentMoveIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1000);
  const currentIndexRef = useRef(0);
  const boardStatesRef = useRef([]);

  useEffect(() => {
    const user = getUser();
    if (!user) { navigate('/'); return; }

    const load = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/games/${gameId}/history`);
        const data = await res.json();
        setGameHistory(data);
        initializeReview(data);
      } catch (err) {
        console.error('Failed to load game history:', err);
      }
    };
    load();

    return () => {
      if (autoPlayRef.current) clearInterval(autoPlayRef.current);
      document.removeEventListener('keydown', handleKeyPress);
    };
  }, [gameId]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, []);

  const initializeReview = (data) => {
    const moves = data.moveHistory || [];
    setMoveHistory(moves);

    const states = [];
    let board = LinkedEngine.createStartingBoard();
    states.push(LinkedEngine.cloneBoard(board));

    moves.forEach((move) => {
      if (move.from && move.to) {
        const result = LinkedEngine.processMove(board, move.color, move.from, move.to);
        if (result.valid) {
          board = result.board;
          states.push(LinkedEngine.cloneBoard(board));
        } else {
          board[move.to[0]][move.to[1]] = board[move.from[0]][move.from[1]];
          board[move.from[0]][move.from[1]] = null;
          states.push(LinkedEngine.cloneBoard(board));
        }
      } else {
        states.push(LinkedEngine.cloneBoard(board));
      }
    });

    setBoardStates(states);
    boardStatesRef.current = states;
    showMove(0, states);
  };

  const showMove = useCallback((index, states) => {
    const s = states || boardStatesRef.current;
    if (index < 0) index = 0;
    if (index >= s.length) index = s.length - 1;

    currentIndexRef.current = index;
    setCurrentMoveIndex(index);

    if (boardRef.current && s[index]) {
      boardRef.current.setBoard(s[index]);
      boardRef.current.clearHighlights();
    }
  }, []);

  const handleKeyPress = useCallback((e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    switch (e.key) {
      case 'ArrowLeft':
        stopAutoPlay();
        showMove(currentIndexRef.current - 1);
        break;
      case 'ArrowRight':
        stopAutoPlay();
        showMove(currentIndexRef.current + 1);
        break;
      case ' ':
        e.preventDefault();
        if (autoPlayRef.current) stopAutoPlay();
        else startAutoPlay();
        break;
      case 'Home':
        stopAutoPlay();
        showMove(0);
        break;
      case 'End':
        stopAutoPlay();
        showMove(boardStatesRef.current.length - 1);
        break;
    }
  }, [showMove]);

  const startAutoPlay = () => {
    if (autoPlayRef.current) return;
    setIsPlaying(true);
    autoPlayRef.current = setInterval(() => {
      const next = currentIndexRef.current + 1;
      if (next >= boardStatesRef.current.length) {
        stopAutoPlay();
        return;
      }
      showMove(next);
    }, speed);
  };

  const stopAutoPlay = () => {
    if (autoPlayRef.current) {
      clearInterval(autoPlayRef.current);
      autoPlayRef.current = null;
    }
    setIsPlaying(false);
  };

  const formatMove = (move) => {
    if (move.event === 'resigned') return `${move.username} resigned`;
    if (move.event === 'timeout') return `${move.username} timed out`;
    if (move.event === 'draw') return 'Draw agreed';
    if (move.from && move.to) {
      return `${move.username} (${move.color}): [${move.from}] → [${move.to}]`;
    }
    return 'Unknown move';
  };

  const moveIndicatorText = currentMoveIndex === 0
    ? 'Start Position'
    : moveHistory[currentMoveIndex - 1]
      ? `Move ${currentMoveIndex}: ${formatMove(moveHistory[currentMoveIndex - 1])}`
      : `Move ${currentMoveIndex}`;

  const players = gameHistory?.players || [];
  const winner = gameHistory?.winner;
  const resultText = winner === 'draw' ? 'Draw' : winner ? `Winner: ${winner}` : 'N/A';

  const boardSize = Math.min(480, typeof window !== 'undefined' ? window.innerWidth - 40 : 480);

  return (
    <div className="review-page">
      <div className="game-header">
        <button className="btn-secondary" onClick={() => { stopAutoPlay(); navigate('/stats'); }}>← Stats</button>
        <h2>Game Review</h2>
        <div></div>
      </div>

      <div className="review-body">
        <div className="review-left">
          <div className="board-container">
            <BoardCanvas ref={boardRef} size={boardSize} onCellClick={() => {}} />
          </div>

          <div className="review-controls card">
            <div className="playback-controls">
              <button className="btn-icon" title="First Move" onClick={() => { stopAutoPlay(); showMove(0); }}>⏮</button>
              <button className="btn-icon" title="Previous" onClick={() => { stopAutoPlay(); showMove(currentMoveIndex - 1); }}>◀</button>
              {!isPlaying ? (
                <button className="btn-icon" title="Auto Play" onClick={startAutoPlay}>▶</button>
              ) : (
                <button className="btn-icon" title="Pause" onClick={stopAutoPlay}>⏸</button>
              )}
              <button className="btn-icon" title="Next" onClick={() => { stopAutoPlay(); showMove(currentMoveIndex + 1); }}>▶</button>
              <button className="btn-icon" title="Last Move" onClick={() => { stopAutoPlay(); showMove(boardStates.length - 1); }}>⏭</button>
            </div>
            <div className="move-counter">
              <span>{moveIndicatorText}</span>
            </div>
            <div className="playback-speed">
              <label>Speed:</label>
              <select value={speed} onChange={(e) => setSpeed(parseInt(e.target.value))}>
                <option value={2000}>0.5x</option>
                <option value={1000}>1x</option>
                <option value={500}>2x</option>
                <option value={250}>4x</option>
              </select>
            </div>
            <div className="rotation-controls" style={{ marginTop: '8px', display: 'flex', gap: '6px', justifyContent: 'center', flexWrap: 'wrap' }}>
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
              <div className="info-item"><strong>Game Name:</strong> {gameHistory?.name || 'N/A'}</div>
              <div className="info-item"><strong>Result:</strong> {resultText}</div>
              <div className="info-item"><strong>Total Moves:</strong> {moveHistory.length}</div>
              <div className="info-item">
                <strong>Players:</strong>
                <div className="players-list">
                  {players.map(p => (
                    <div key={p.color} className={`player-info ${p.color === winner ? 'winner' : ''}`}>
                      <span className={`player-badge ${p.color}`}>{p.username}</span>
                      {p.color === winner && <span className="winner-badge">👑</span>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="review-right">
          <div className="move-history-panel card">
            <h3>Move History</h3>
            <div className="move-list">
              {moveHistory.length === 0 ? (
                <p className="empty-message">No moves recorded.</p>
              ) : (
                moveHistory.map((move, index) => (
                  <div
                    key={index}
                    className={`move-item ${move.color || ''} ${index + 1 === currentMoveIndex ? 'active' : ''}`}
                    onClick={() => { stopAutoPlay(); showMove(index + 1); }}
                  >
                    <span className="move-number">{index + 1}.</span>
                    <span className="move-text">{formatMove(move)}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
