/* ─── Board Renderer Component (Canvas) ───────────────── */
import React, { useRef, useEffect, useCallback, useImperativeHandle, forwardRef } from 'react';
import LinkedEngine from './engine';

const COLORS_MAP = {
  red:    '#e94560',
  blue:   '#4ecdc4',
  green:  '#00eb95',
  yellow: '#ffd93d',
};
const LIGHT = '#f0d9b5';
const DARK  = '#b58863';
const CENTER_HIGHLIGHT = 'rgba(233, 69, 96, 0.25)';
const SELECT_HIGHLIGHT = 'rgba(255, 255, 255, 0.35)';
const MOVE_HIGHLIGHT   = 'rgba(100, 255, 100, 0.4)';

const BoardCanvas = forwardRef(function BoardCanvas({ size = 480, onCellClick }, ref) {
  const canvasRef = useRef(null);
  const stateRef = useRef({
    board: LinkedEngine.createEmptyBoard(),
    selectedCell: null,
    legalMoves: [],
    rotation: 0,
    animating: false,
    animPiece: null,
    animFromDisplay: null,
    animToDisplay: null,
    animProgress: 0,
    animStartTime: 0,
    animDuration: 500,
    animFrameId: null,
    animHideLogical: null,
    fadingPieces: [],
    fadeStartTime: 0,
    fadeDuration: 400,
  });

  const cellSize = size / 8;

  // Transform logical board coordinates to display coordinates based on rotation
  const transformCoords = useCallback((r, c) => {
    const rotation = stateRef.current.rotation;
    switch (rotation % 360) {
      case 0:   return [r, c];
      case 90:  return [c, 7 - r];
      case 180: return [7 - r, 7 - c];
      case 270: return [7 - c, r];
      default:  return [r, c];
    }
  }, []);

  const inverseTransformCoords = useCallback((r, c) => {
    const rotation = stateRef.current.rotation;
    switch (rotation % 360) {
      case 0:   return [r, c];
      case 90:  return [7 - c, r];
      case 180: return [7 - r, 7 - c];
      case 270: return [c, 7 - r];
      default:  return [r, c];
    }
  }, []);

  const drawPieceAt = useCallback((ctx, piece, cx, cy, alpha) => {
    ctx.save();
    ctx.globalAlpha = alpha;
    const radius = cellSize * 0.35;

    // Shadow
    ctx.beginPath();
    ctx.arc(cx + 2, cy + 2, radius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fill();

    // Piece body
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fillStyle = COLORS_MAP[piece.color] || '#888';
    ctx.fill();

    // Shine
    ctx.beginPath();
    ctx.arc(cx - radius * 0.25, cy - radius * 0.25, radius * 0.35, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fill();

    // Border
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Value dots
    if (piece.value) {
      const dotRadius = cellSize * 0.045;
      const dotColor = 'rgba(80, 80, 80, 0.7)';
      if (piece.value === 1) {
        ctx.beginPath();
        ctx.arc(cx, cy, dotRadius, 0, Math.PI * 2);
        ctx.fillStyle = dotColor;
        ctx.fill();
      } else if (piece.value === 2) {
        ctx.beginPath();
        ctx.arc(cx - radius * 0.3, cy, dotRadius, 0, Math.PI * 2);
        ctx.fillStyle = dotColor;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(cx + radius * 0.3, cy, dotRadius, 0, Math.PI * 2);
        ctx.fill();
      } else if (piece.value === 3) {
        ctx.beginPath();
        ctx.arc(cx, cy - radius * 0.35, dotRadius, 0, Math.PI * 2);
        ctx.fillStyle = dotColor;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(cx - radius * 0.3, cy + radius * 0.2, dotRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(cx + radius * 0.3, cy + radius * 0.2, dotRadius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }, [cellSize]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const s = stateRef.current;
    const { board, selectedCell, legalMoves, animHideLogical, fadingPieces, animating, animPiece, animProgress, animFromDisplay, animToDisplay } = s;

    ctx.clearRect(0, 0, size, size);

    for (let displayR = 0; displayR < 8; displayR++) {
      for (let displayC = 0; displayC < 8; displayC++) {
        const x = displayC * cellSize;
        const y = displayR * cellSize;
        const [logicalR, logicalC] = inverseTransformCoords(displayR, displayC);

        // Board square color
        ctx.fillStyle = (displayR + displayC) % 2 === 0 ? LIGHT : DARK;
        ctx.fillRect(x, y, cellSize, cellSize);

        // Center highlight
        if (LinkedEngine.isCenter(logicalR, logicalC)) {
          ctx.fillStyle = CENTER_HIGHLIGHT;
          ctx.fillRect(x, y, cellSize, cellSize);
          ctx.strokeStyle = 'rgba(233, 69, 96, 0.5)';
          ctx.lineWidth = 2;
          ctx.setLineDash([4, 4]);
          ctx.strokeRect(x + 1, y + 1, cellSize - 2, cellSize - 2);
          ctx.setLineDash([]);
        }

        // Selected cell
        if (selectedCell && selectedCell[0] === logicalR && selectedCell[1] === logicalC) {
          ctx.fillStyle = SELECT_HIGHLIGHT;
          ctx.fillRect(x, y, cellSize, cellSize);
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 3;
          ctx.strokeRect(x + 1, y + 1, cellSize - 2, cellSize - 2);
        }

        // Legal move highlight
        if (legalMoves.some(([mr, mc]) => mr === logicalR && mc === logicalC)) {
          ctx.fillStyle = MOVE_HIGHLIGHT;
          ctx.fillRect(x, y, cellSize, cellSize);
          ctx.beginPath();
          ctx.arc(x + cellSize / 2, y + cellSize / 2, cellSize * 0.15, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(100, 255, 100, 0.7)';
          ctx.fill();
        }

        // Skip animating source square
        if (animHideLogical && animHideLogical[0] === logicalR && animHideLogical[1] === logicalC) {
          continue;
        }

        // Piece
        if (board[logicalR] && board[logicalR][logicalC]) {
          const piece = board[logicalR][logicalC];
          const cx = x + cellSize / 2;
          const cy = y + cellSize / 2;
          const fading = fadingPieces.find(f => f.logR === logicalR && f.logC === logicalC);
          drawPieceAt(ctx, piece, cx, cy, fading ? fading.opacity : 1);
        }
      }
    }

    // Draw fading pieces not on the board
    for (const fp of fadingPieces) {
      if (board[fp.logR] && board[fp.logR][fp.logC]) continue;
      const [dR, dC] = transformCoords(fp.logR, fp.logC);
      const cx = dC * cellSize + cellSize / 2;
      const cy = dR * cellSize + cellSize / 2;
      drawPieceAt(ctx, fp.piece, cx, cy, fp.opacity);
    }

    // Draw sliding piece on top
    if (animating && animPiece) {
      let t = animProgress;
      t = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

      const fromX = animFromDisplay[1] * cellSize + cellSize / 2;
      const fromY = animFromDisplay[0] * cellSize + cellSize / 2;
      const toX   = animToDisplay[1]   * cellSize + cellSize / 2;
      const toY   = animToDisplay[0]   * cellSize + cellSize / 2;

      const cx = fromX + (toX - fromX) * t;
      const cy = fromY + (toY - fromY) * t;
      drawPieceAt(ctx, animPiece, cx, cy, 1);
    }
  }, [size, cellSize, inverseTransformCoords, transformCoords, drawPieceAt]);

  // Click handler
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleCanvasClick = (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const displayC = Math.floor(x / cellSize);
      const displayR = Math.floor(y / cellSize);
      if (displayR >= 0 && displayR < 8 && displayC >= 0 && displayC < 8 && onCellClick) {
        const [logicalR, logicalC] = inverseTransformCoords(displayR, displayC);
        onCellClick(logicalR, logicalC);
      }
    };

    canvas.addEventListener('click', handleCanvasClick);
    return () => canvas.removeEventListener('click', handleCanvasClick);
  }, [cellSize, onCellClick, inverseTransformCoords]);

  // Expose imperative methods
  useImperativeHandle(ref, () => ({
    setBoard(b) {
      stateRef.current.board = b;
      if (!stateRef.current.animating) draw();
    },
    getBoard() {
      return stateRef.current.board;
    },
    setSelected(cell) {
      stateRef.current.selectedCell = cell;
      draw();
    },
    setLegalMoves(moves) {
      stateRef.current.legalMoves = moves;
      draw();
    },
    clearHighlights() {
      stateRef.current.selectedCell = null;
      stateRef.current.legalMoves = [];
      draw();
    },
    isAnimating() {
      return stateRef.current.animating;
    },
    setRotation(degrees) {
      stateRef.current.rotation = degrees;
      draw();
    },
    getRotation() {
      return stateRef.current.rotation;
    },
    rotateToPlayer(color) {
      const offset = 180;
      switch (color) {
        case 'red':    stateRef.current.rotation = 0 + offset;   break;
        case 'blue':   stateRef.current.rotation = 180 + offset; break;
        case 'green':  stateRef.current.rotation = 90 + offset;  break;
        case 'yellow': stateRef.current.rotation = 270 + offset; break;
        default:       stateRef.current.rotation = 0 + offset;
      }
      draw();
    },
    animateMove(oldBoard, newBoard, from, to) {
      const s = stateRef.current;
      if (s.animFrameId) {
        cancelAnimationFrame(s.animFrameId);
        s.animFrameId = null;
      }
      s.fadingPieces = [];
      s.animating = true;

      const piece = oldBoard[from[0]][from[1]];
      if (!piece) {
        s.board = newBoard;
        s.animating = false;
        draw();
        return;
      }

      s.animFromDisplay = transformCoords(from[0], from[1]);
      s.animToDisplay = transformCoords(to[0], to[1]);
      s.animPiece = { ...piece };
      s.animHideLogical = [from[0], from[1]];
      s.animProgress = 0;
      s.animStartTime = performance.now();

      s.board = oldBoard.map(row => row.map(c => c ? { ...c } : null));

      const slideLoop = (now) => {
        s.animProgress = Math.min(1, (now - s.animStartTime) / s.animDuration);
        draw();
        if (s.animProgress < 1) {
          s.animFrameId = requestAnimationFrame(slideLoop);
        } else {
          s.animPiece = null;
          s.animHideLogical = null;
          s.board = newBoard;

          const disappeared = [];
          for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
              const oldP = oldBoard[r][c];
              const newP = newBoard[r][c];
              if (oldP && !newP) {
                if (r === from[0] && c === from[1]) continue;
                disappeared.push({ logR: r, logC: c, piece: { ...oldP }, opacity: 1 });
              }
            }
          }

          if (disappeared.length === 0) {
            s.animating = false;
            draw();
            return;
          }

          s.fadingPieces = disappeared;
          draw();

          setTimeout(() => {
            s.fadeStartTime = performance.now();
            const fadeLoop = (now) => {
              const t = Math.min(1, (now - s.fadeStartTime) / s.fadeDuration);
              for (const fp of s.fadingPieces) fp.opacity = 1 - t;
              draw();
              if (t < 1) {
                s.animFrameId = requestAnimationFrame(fadeLoop);
              } else {
                s.fadingPieces = [];
                s.animating = false;
                draw();
              }
            };
            s.animFrameId = requestAnimationFrame(fadeLoop);
          }, 1000);
        }
      };
      s.animFrameId = requestAnimationFrame(slideLoop);
    },
    draw,
  }), [draw, transformCoords]);

  // Initial draw
  useEffect(() => {
    draw();
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      style={{ cursor: 'pointer', display: 'block', maxWidth: '100%' }}
    />
  );
});

export default BoardCanvas;
