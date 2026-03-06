/* ─── Game Screen Page (React) ─────────────────────────── */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import BoardCanvas from '../BoardCanvas';
import LinkedEngine from '../engine';
import SocketClient from '../socket';
import SoundManager from '../sound';
import { useGameToast } from '../GameToast';

const API_BASE = import.meta.env.VITE_API_BASE || '';

function getUser() {
  try { return JSON.parse(localStorage.getItem('linked_user')); } catch { return null; }
}

function getColorCSS(color) {
  const map = { red: '#e94560', blue: '#4ecdc4', green: '#a8e6cf', yellow: '#ffd93d' };
  return map[color] || '#888';
}

export default function GamePage() {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const toast = useGameToast();
  const boardRef = useRef(null);
  const user = getUser();

  const [gameState, setGameState] = useState(null);
  const [error, setError] = useState('');
  const [showShareModal, setShowShareModal] = useState(false);
  const [showWinBanner, setShowWinBanner] = useState(false);

  const selectedPieceRef = useRef(null);
  const gameStateRef = useRef(null);
  const clockIntervalRef = useRef(null);
  const localClocksRef = useRef(null);
  const localTurnStartRef = useRef(null);
  const currentTickColorRef = useRef(null);
  const previousPlayerCountRef = useRef(0);
  const previousMoveCountRef = useRef(0);
  const hasPlayedHurryUpRef = useRef(false);
  const previousGameStatusRef = useRef(null);

  // Keep gameStateRef synced
  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  const renderClocks = useCallback(() => {
    const el = document.getElementById('player-clocks');
    const gs = gameStateRef.current;
    if (!el || !gs) return;

    if (gs.timerMode === 'none' || !localClocksRef.current) {
      el.innerHTML = '';
      return;
    }

    const eliminated = gs.eliminatedColors || [];
    el.innerHTML = gs.players.map(p => {
      let remaining = localClocksRef.current[p.color] || 0;

      if (p.color === currentTickColorRef.current && !eliminated.includes(p.color) && gs.status === 'playing') {
        const elapsed = Date.now() - (localTurnStartRef.current || Date.now());
        if (gs.timerMode === 'total') {
          remaining = Math.max(0, remaining - elapsed);
        } else {
          remaining = Math.max(0, (gs.timerValue * 1000) - elapsed);
        }

        if (remaining < 20000 && remaining > 0 && !hasPlayedHurryUpRef.current) {
          const currentPlayer = gs.players.find(player => player.color === currentTickColorRef.current);
          if (currentPlayer && currentPlayer.id === user?.id) {
            SoundManager.play('hurryUp');
            hasPlayedHurryUpRef.current = true;
          }
        }
      }

      const secs = Math.ceil(remaining / 1000);
      const mins = Math.floor(secs / 60);
      const s = secs % 60;
      const display = gs.timerMode === 'total'
        ? `${mins}:${s.toString().padStart(2, '0')}`
        : `${secs}s`;

      const isActive = currentTickColorRef.current === p.color && gs.status === 'playing';
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
  }, [user]);

  // Click handler for board
  const handleBoardClick = useCallback((r, c) => {
    const gs = gameStateRef.current;
    if (!gs || gs.status !== 'playing') return;

    const currentPlayer = gs.players[gs.currentTurn];
    if (!currentPlayer || currentPlayer.id !== user?.id) return;

    const eliminated = gs.eliminatedColors || [];
    if (eliminated.includes(currentPlayer.color)) return;

    const myColor = currentPlayer.color;
    const board = gs.board;
    const renderer = boardRef.current;
    if (!renderer) return;

    if (selectedPieceRef.current) {
      const [sr, sc] = selectedPieceRef.current;
      if (sr === r && sc === c) {
        selectedPieceRef.current = null;
        renderer.clearHighlights();
        return;
      }

      const result = LinkedEngine.processMove(board, myColor, [sr, sc], [r, c]);
      if (result.valid) {
        SocketClient.sendMove(gs.id, user.id, [sr, sc], [r, c]);
        selectedPieceRef.current = null;
        renderer.clearHighlights();
        return;
      }

      if (board[r][c] && board[r][c].color === myColor) {
        selectedPieceRef.current = [r, c];
        const moves = LinkedEngine.getLegalMoves(board, myColor, r, c);
        renderer.setSelected([r, c]);
        renderer.setLegalMoves(moves);
        return;
      }

      setError(result.error || 'Invalid move.');
      setTimeout(() => setError(''), 2000);
      return;
    }

    if (board[r][c] && board[r][c].color === myColor) {
      selectedPieceRef.current = [r, c];
      const moves = LinkedEngine.getLegalMoves(board, myColor, r, c);
      renderer.setSelected([r, c]);
      renderer.setLegalMoves(moves);
      SoundManager.play('select');
    }
  }, [user]);

  // Main effect: fetch game, set up socket listeners
  useEffect(() => {
    if (!user) { navigate('/'); return; }

    // Fetch initial game state
    const fetchGame = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/games/${gameId}`);
        const data = await res.json();
        if (data.game) {
          previousPlayerCountRef.current = data.game.players.length;
          previousMoveCountRef.current = (data.game.moveHistory || []).length;
          previousGameStatusRef.current = data.game.status;
          setGameState(data.game);
          gameStateRef.current = data.game;
          if (boardRef.current) {
            boardRef.current.setBoard(data.game.board);
          }
          if (data.game.clocks) {
            localClocksRef.current = { ...data.game.clocks };
            localTurnStartRef.current = data.game.turnStartTs || Date.now();
            currentTickColorRef.current = data.game.players[data.game.currentTurn]?.color || null;
          }
        }
      } catch {}
    };

    SocketClient.connect();
    SocketClient.joinGame(gameId);
    fetchGame();

    // Game update handler
    const gameUpdateHandler = (game) => {
      const prevState = gameStateRef.current;

      // Detect player joins
      if (game.status === 'waiting' && game.players.length > previousPlayerCountRef.current) {
        const newPlayer = game.players[game.players.length - 1];
        if (newPlayer.id !== user.id) {
          toast?.info(`${newPlayer.username} joined the game!`, 3000);
        }
      }

      // Detect game start
      if (game.status === 'playing' && prevState && prevState.status === 'waiting') {
        const maxP = game.maxPlayers || 4;
        toast?.success(`All ${maxP} players joined! Game starting in 3 seconds...`, 3500);
        setTimeout(() => SoundManager.play('gameStart'), 3000);
      }

      // Detect new moves
      const currentMoveCount = (game.moveHistory || []).length;
      if (currentMoveCount > previousMoveCountRef.current) {
        const lastMove = game.moveHistory[currentMoveCount - 1];
        if (lastMove.event === 'eliminated' || lastMove.event === 'resigned') {
          if (lastMove.event === 'eliminated') SoundManager.play('elimination');
          else SoundManager.play('resign');
        } else if (lastMove.from && lastMove.to) {
          const dr = Math.abs(lastMove.to[0] - lastMove.from[0]);
          const dc = Math.abs(lastMove.to[1] - lastMove.from[1]);
          const isAttack = (dr === 1 && dc === 1);
          const isHop = (dr === 2 && dc === 2);
          const destCell = prevState?.board?.[lastMove.to[0]]?.[lastMove.to[1]];
          const hadEnemy = destCell !== null && destCell !== undefined && destCell.color !== lastMove.color;
          if (isAttack && hadEnemy) SoundManager.play('hit');
          else if (isHop) SoundManager.play('capture');
          else SoundManager.play('move');
        }
        previousMoveCountRef.current = currentMoveCount;
        hasPlayedHurryUpRef.current = false;
      }

      // Detect game end
      if (game.status === 'finished' && previousGameStatusRef.current === 'playing') {
        const userPlayer = game.players.find(p => p.id === user.id);
        setTimeout(() => {
          if (game.winner === 'draw') SoundManager.play('draw');
          else if (userPlayer && userPlayer.color === game.winner) SoundManager.play('win');
          else if (userPlayer) SoundManager.play('lose');
        }, 1000);
      }

      previousGameStatusRef.current = game.status;
      previousPlayerCountRef.current = game.players.length;

      // Animate
      const lastMove = (game.moveHistory || []).length > 0
        ? game.moveHistory[game.moveHistory.length - 1]
        : null;
      const isNewRegularMove = lastMove && lastMove.from && lastMove.to
        && (game.moveHistory.length > ((prevState?.moveHistory) || []).length);

      const oldBoard = prevState?.board;

      if (game.clocks) {
        localClocksRef.current = { ...game.clocks };
        localTurnStartRef.current = game.turnStartTs || Date.now();
        currentTickColorRef.current = game.players[game.currentTurn]?.color || null;
      }

      if (isNewRegularMove && oldBoard && boardRef.current) {
        boardRef.current.animateMove(oldBoard, game.board, lastMove.from, lastMove.to);
      } else if (boardRef.current) {
        boardRef.current.setBoard(game.board);
      }

      setGameState(game);
      gameStateRef.current = game;

      selectedPieceRef.current = null;
      if (boardRef.current) boardRef.current.clearHighlights();
    };

    const timerTickHandler = (data) => {
      localClocksRef.current = data.clocks;
      currentTickColorRef.current = data.currentColor;
      localTurnStartRef.current = data.turnStartTs;
      renderClocks();
    };

    const moveErrorHandler = ({ error: err }) => {
      setError(err);
      setTimeout(() => setError(''), 3000);
    };

    const drawRequestedHandler = (data) => {
      toast?.warning(`${data.requestedBy} requested a draw (${data.agreedCount}/${data.totalPlayers} agreed)`, 5000);
    };

    SocketClient.onGameUpdate(gameUpdateHandler);
    SocketClient.onTimerTick(timerTickHandler);
    SocketClient.onMoveError(moveErrorHandler);
    SocketClient.onDrawRequested(drawRequestedHandler);

    clockIntervalRef.current = setInterval(renderClocks, 250);

    return () => {
      SocketClient.off('game:update', gameUpdateHandler);
      SocketClient.off('game:timerTick', timerTickHandler);
      SocketClient.off('game:moveError', moveErrorHandler);
      SocketClient.off('game:drawRequested', drawRequestedHandler);
      if (clockIntervalRef.current) clearInterval(clockIntervalRef.current);
    };
  }, [gameId]);

  // Win banner
  useEffect(() => {
    if (gameState?.winner) {
      setShowWinBanner(true);
      const timer = setTimeout(() => setShowWinBanner(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [gameState?.winner]);

  const handleResign = () => {
    if (!gameState || gameState.status !== 'playing') return;
    if (window.confirm('Are you sure you want to resign?')) {
      SocketClient.requestResign(gameId, user.id);
    }
  };

  const handleDraw = () => {
    if (!gameState || gameState.status !== 'playing') return;
    SocketClient.requestDraw(gameId, user.id);
    toast?.info('Draw request sent. Waiting for other players to agree...', 3000);
  };

  const handleDownload = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/games/${gameId}/history/download`);
      if (!res.ok) throw new Error('Not found');
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
      toast?.error('Download failed – game may still be in progress.', 3000);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`${location.origin}/game/${gameId}`)
      .then(() => toast?.success('Link copied!', 2000))
      .catch(() => toast?.error('Copy failed', 2000));
  };

  const handleCopyJSON = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/games/${gameId}/history`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
      toast?.success('JSON copied to clipboard!', 2000);
    } catch {
      toast?.error('Could not copy JSON.', 3000);
    }
  };

  const handleRotate = () => {
    if (!gameState || !boardRef.current) return;
    const userPlayer = gameState.players.find(p => p.id === user?.id);
    if (userPlayer) {
      boardRef.current.rotateToPlayer(userPlayer.color);
      toast?.info(`Board rotated to ${userPlayer.color} perspective`, 2000);
    }
  };

  // Render move log
  const moves = gameState?.moveHistory || [];
  const recent = moves.slice(-50).reverse();
  const eliminated = gameState?.eliminatedColors || [];

  // Turn indicator
  let turnText = 'Loading…';
  let turnBg = 'var(--bg-hover)';
  let turnColor = '#fff';
  if (gameState?.status === 'playing') {
    const cp = gameState.players[gameState.currentTurn];
    const isMyTurn = cp?.id === user?.id;
    if (eliminated.includes(cp?.color)) {
      turnText = `${cp.username} eliminated`;
      turnBg = '#555';
    } else {
      turnText = isMyTurn ? 'Your Turn' : `${cp?.username}'s Turn`;
      turnBg = getColorCSS(cp?.color);
      turnColor = (cp?.color === 'yellow' || cp?.color === 'green') ? '#222' : '#fff';
    }
  } else if (gameState?.status === 'waiting') {
    turnText = 'Waiting for players…';
  }

  // Win banner text
  let winText = '';
  let winColor = 'var(--text)';
  if (gameState?.winner) {
    if (gameState.winner === 'draw') {
      winText = 'Game Ended in a Draw!';
    } else {
      const wp = gameState.players.find(p => p.color === gameState.winner);
      winText = `${wp?.username || gameState.winner} Wins!`;
      winColor = getColorCSS(gameState.winner);
    }
  }

  const boardSize = Math.min(480, typeof window !== 'undefined' ? window.innerWidth - 40 : 480);

  return (
    <div className="game-page">
      <div className="game-header">
        <button id="back-to-lobby" className="btn-secondary" onClick={() => navigate('/lobby')}>← Lobby</button>
        <h2>{gameState?.name || 'Loading…'}</h2>
        <div className="turn-indicator" style={{ background: turnBg, color: turnColor }}>{turnText}</div>
      </div>

      <div className="game-body">
        <div className="game-left">
          <div id="player-clocks" className="player-clocks"></div>
          <div className="board-container">
            <BoardCanvas ref={boardRef} size={boardSize} onCellClick={handleBoardClick} />
          </div>
          <div className="board-controls">
            <button className="btn-icon" title="Rotate board" onClick={handleRotate}>🔄</button>
          </div>
          <div className="player-labels">
            {gameState?.players.map((p, i) => (
              <div key={p.id} className={`player-label ${gameState.currentTurn === i ? 'active' : ''} ${eliminated.includes(p.color) ? 'eliminated' : ''}`}>
                <span className="dot" style={{ background: getColorCSS(p.color) }}></span>
                {p.username} {eliminated.includes(p.color) ? '(out)' : ''}
              </div>
            ))}
          </div>
          {error && <p className="error-msg">{error}</p>}
          {gameState?.status === 'playing' && (
            <div className="game-actions" style={{ display: 'flex' }}>
              <button className="btn-danger" onClick={handleResign}>Resign</button>
              <button className="btn-secondary" onClick={handleDraw}>Offer Draw</button>
            </div>
          )}
        </div>

        <div className="game-right">
          <div className="move-log-panel card">
            <div className="move-log-header">
              <h3>Move History</h3>
            </div>
            <div className="move-log-list">
              {moves.length === 0 ? (
                <p className="empty-log">No moves yet.</p>
              ) : (
                recent.map((m, idx) => {
                  const prevMove = recent[idx + 1];
                  const timeDiff = (m.timestamp && prevMove?.timestamp)
                    ? ((m.timestamp - prevMove.timestamp) / 1000).toFixed(1)
                    : null;
                  const timeTag = timeDiff !== null ? <span className="move-time">{timeDiff}s</span> : null;

                  if (m.event === 'eliminated') {
                    return (
                      <div key={idx} className="move-entry elimination">
                        <span className="move-dot" style={{ background: getColorCSS(m.color) }}></span>
                        <span>{m.color} eliminated ({m.reason})</span>
                        {timeTag}
                      </div>
                    );
                  }
                  if (m.event === 'turnSkipped') {
                    return (
                      <div key={idx} className="move-entry turn-skipped">
                        <span className="move-dot" style={{ background: getColorCSS(m.color) }}></span>
                        <span>{m.color} turn skipped ({m.reason})</span>
                        {timeTag}
                      </div>
                    );
                  }
                  if (m.event === 'resigned') {
                    return (
                      <div key={idx} className="move-entry resignation">
                        <span className="move-dot" style={{ background: getColorCSS(m.color) }}></span>
                        <span>{m.color} resigned</span>
                        {timeTag}
                      </div>
                    );
                  }
                  if (m.event === 'draw') {
                    return (
                      <div key={idx} className="move-entry draw-agreed">
                        <span>🤝 Game ended in a draw ({m.reason})</span>
                        {timeTag}
                      </div>
                    );
                  }
                  const fromStr = `${String.fromCharCode(97 + m.from[1])}${8 - m.from[0]}`;
                  const toStr = `${String.fromCharCode(97 + m.to[1])}${8 - m.to[0]}`;
                  return (
                    <div key={idx} className="move-entry">
                      <span className="move-num">#{m.turn + 1}</span>
                      <span className="move-dot" style={{ background: getColorCSS(m.color) }}></span>
                      <span>{m.username}: {fromStr}→{toStr}</span>
                      {timeTag}
                    </div>
                  );
                })
              )}
            </div>
            <br />
            <div className="move-log-actions">
              <button className="btn-sm" onClick={() => navigate(`/review/${gameId}`)}>🎬 Review</button>
              <button className="btn-sm" onClick={handleDownload}>⬇ Download</button>
              <button className="btn-sm" onClick={() => setShowShareModal(true)}>🔗 Share</button>
            </div>
          </div>
        </div>
      </div>

      {/* Win Banner */}
      {showWinBanner && (
        <div className="win-banner" style={{ display: 'flex' }}>
          <h1 style={{ color: winColor }}>{winText}</h1>
          <button onClick={() => navigate('/lobby')}>Back to Lobby</button>
        </div>
      )}

      {/* Share Modal */}
      {showShareModal && (
        <div className="share-modal" style={{ display: 'flex' }} onClick={(e) => { if (e.target === e.currentTarget) setShowShareModal(false); }}>
          <div className="share-modal-box">
            <h3>Share Game</h3>
            <p>Game ID: <strong>{gameId}</strong></p>
            <div className="share-modal-actions">
              <button onClick={handleCopyLink}>🔗 Copy Link</button>
              <button className="btn-secondary" onClick={handleCopyJSON}>📄 Copy JSON</button>
            </div>
            <button className="btn-secondary" style={{ marginTop: '12px', width: '100%' }} onClick={() => setShowShareModal(false)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
