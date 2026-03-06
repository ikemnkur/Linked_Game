/* ─── Practice Room Page (React) ──────────────────────── */
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import BoardCanvas from '../BoardCanvas';
import LinkedEngine from '../engine';

export default function PracticePage() {
  const navigate = useNavigate();
  const boardRef = useRef(null);
  const boardDataRef = useRef(LinkedEngine.createStartingBoard());
  const selectedPieceRef = useRef(null);

  const [mode, setModeState] = useState('move');
  const [selectedColor, setSelectedColor] = useState('red');
  const [selectedValue, setSelectedValue] = useState(1);
  const [infoText, setInfoText] = useState('Click a piece then click a destination. All colors can be moved.');

  const modeRef = useRef('move');
  const selectedColorRef = useRef('red');
  const selectedValueRef = useRef(1);

  const setMode = (m) => {
    modeRef.current = m;
    setModeState(m);
    selectedPieceRef.current = null;
    if (boardRef.current) boardRef.current.clearHighlights();

    if (m === 'move') setInfoText('Click a piece then click a destination. All colors can be moved.');
    else if (m === 'place') setInfoText('Click any empty square to place a piece of the selected color.');
    else if (m === 'erase') setInfoText('Click any piece to remove it.');
  };

  const handleClick = useCallback((r, c) => {
    const currentMode = modeRef.current;
    const board = boardDataRef.current;
    const renderer = boardRef.current;
    if (!renderer) return;

    if (currentMode === 'place') {
      if (board[r][c] === null) {
        board[r][c] = { color: selectedColorRef.current, value: selectedValueRef.current };
        renderer.setBoard(board);
      }
      return;
    }

    if (currentMode === 'erase') {
      if (board[r][c] !== null) {
        board[r][c] = null;
        renderer.setBoard(board);
      }
      return;
    }

    // Move mode
    if (selectedPieceRef.current) {
      const [sr, sc] = selectedPieceRef.current;
      if (sr === r && sc === c) {
        selectedPieceRef.current = null;
        renderer.clearHighlights();
        return;
      }

      const dr = Math.abs(r - sr);
      const dc = Math.abs(c - sc);
      if (dr <= 1 && dc <= 1 && (dr + dc) > 0) {
        if (board[r][c] === null) {
          board[r][c] = board[sr][sc];
          board[sr][sc] = null;
        } else {
          const temp = board[r][c];
          board[r][c] = board[sr][sc];
          board[sr][sc] = temp;
        }
        selectedPieceRef.current = null;
        renderer.clearHighlights();
        renderer.setBoard(board);
        return;
      }

      // Teleport
      if (board[r][c] === null) {
        board[r][c] = board[sr][sc];
        board[sr][sc] = null;
        selectedPieceRef.current = null;
        renderer.clearHighlights();
        renderer.setBoard(board);
        return;
      }

      // Select another piece
      if (board[r][c] !== null) {
        selectedPieceRef.current = [r, c];
        renderer.setSelected([r, c]);
        renderer.setLegalMoves([]);
        return;
      }

      selectedPieceRef.current = null;
      renderer.clearHighlights();
      return;
    }

    if (board[r][c] !== null) {
      selectedPieceRef.current = [r, c];
      renderer.setSelected([r, c]);
      renderer.setLegalMoves([]);
    }
  }, []);

  const resetBoard = () => {
    boardDataRef.current = LinkedEngine.createStartingBoard();
    selectedPieceRef.current = null;
    if (boardRef.current) {
      boardRef.current.clearHighlights();
      boardRef.current.setBoard(boardDataRef.current);
    }
  };

  const clearBoard = () => {
    boardDataRef.current = LinkedEngine.createEmptyBoard();
    selectedPieceRef.current = null;
    if (boardRef.current) {
      boardRef.current.clearHighlights();
      boardRef.current.setBoard(boardDataRef.current);
    }
  };

  useEffect(() => {
    if (boardRef.current) {
      boardRef.current.setBoard(boardDataRef.current);
    }
  }, []);

  const boardSize = Math.min(480, typeof window !== 'undefined' ? window.innerWidth - 40 : 480);

  return (
    <div className="practice-page">
      <div className="game-header" style={{ justifyContent: 'space-between', display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
        <button className="btn-secondary" onClick={() => navigate('/lobby')}>← Lobby</button>
        <h2>Practice Room</h2>
        <div></div>
      </div>

      <p className="practice-mode-label">Mode: <strong>{mode === 'move' ? 'Move Pieces' : mode === 'place' ? 'Place Pieces' : 'Erase Pieces'}</strong></p>

      <div className="practice-controls">
        <button className={mode === 'move' ? '' : 'btn-secondary'} onClick={() => setMode('move')}>Move</button>
        <button className={mode === 'place' ? '' : 'btn-secondary'} onClick={() => setMode('place')}>Place</button>
        <button className={mode === 'erase' ? '' : 'btn-secondary'} onClick={() => setMode('erase')}>Erase</button>
        <button className="btn-secondary" onClick={resetBoard}>Reset Board</button>
        <button className="btn-secondary" onClick={clearBoard}>Clear Board</button>
      </div>

      <div className="color-picker">
        {['red', 'blue', 'green', 'yellow'].map(color => (
          <button
            key={color}
            className={`color-btn ${color} ${selectedColor === color ? 'selected' : ''}`}
            data-color={color}
            onClick={() => { setSelectedColor(color); selectedColorRef.current = color; }}
          />
        ))}
      </div>

      <div className="value-picker" style={{ marginTop: '12px' }}>
        <label style={{ color: 'var(--text-muted)', marginRight: '8px' }}>Piece Value:</label>
        {[1, 2, 3].map(v => (
          <button
            key={v}
            className={`value-btn ${selectedValue === v ? 'selected' : ''}`}
            onClick={() => { setSelectedValue(v); selectedValueRef.current = v; }}
          >
            {v}
          </button>
        ))}
      </div>

      <div className="rotation-controls" style={{ marginTop: '12px', display: 'flex', gap: '8px', justifyContent: 'center' }}>
        <label style={{ color: 'var(--text-muted)' }}>View from:</label>
        {['red', 'blue', 'green', 'yellow'].map(color => (
          <button
            key={color}
            className="rotate-color-btn"
            onClick={() => boardRef.current?.rotateToPlayer(color)}
          >
            {color.charAt(0).toUpperCase() + color.slice(1)}
          </button>
        ))}
      </div>
      <br />

      <div className="board-container">
        <BoardCanvas ref={boardRef} size={boardSize} onCellClick={handleClick} />
      </div>
      <p className="error-msg" style={{ color: 'var(--text-muted)', marginTop: '12px' }}>{infoText}</p>
    </div>
  );
}
