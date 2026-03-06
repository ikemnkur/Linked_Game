/* ─── Board Renderer (Canvas) ─────────────────────────── */

window.BoardRenderer = (() => {
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

  function create(container, opts = {}) {
    const size = opts.size || 480;
    const cellSize = size / 8;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    container.appendChild(canvas);
    const ctx = canvas.getContext('2d');

    let board = LinkedEngine.createEmptyBoard();
    let selectedCell = null;
    let legalMoves = [];
    let onCellClick = null;
    let rotation = 0; // 0, 90, 180, 270 degrees

    // ─── Animation state ──────────────────────────────────
    let animating = false;
    let animPiece = null;       // { color, value } being slid
    let animFromDisplay = null; // [displayR, displayC] start
    let animToDisplay = null;   // [displayR, displayC] end
    let animProgress = 0;       // 0→1
    let animStartTime = 0;
    let animDuration = 500;     // ms
    let animFrameId = null;
    let animHideLogical = null; // [logR, logC] to hide from static draw (source square)
    let fadingPieces = [];      // [{logR, logC, opacity, piece}] pieces fading out
    let fadeStartTime = 0;
    let fadeDuration = 400;     // ms for fade-out

    // Transform logical board coordinates to display coordinates based on rotation
    function transformCoords(r, c) {
      switch(rotation) {
        case 0:   return [r, c];
        case 90:  return [c, 7 - r];
        case 180: return [7 - r, 7 - c];
        case 270: return [7 - c, r];
        default:  return [r, c];
      }
    }

    // Transform display coordinates to logical board coordinates
    function inverseTransformCoords(r, c) {
      switch(rotation) {
        case 0:   return [r, c];
        case 90:  return [7 - c, r];
        case 180: return [7 - r, 7 - c];
        case 270: return [c, 7 - r];
        default:  return [r, c];
      }
    }

    // ─── Draw a single piece at pixel (cx, cy) ──────────
    function drawPieceAt(piece, cx, cy, alpha) {
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
    }

    function draw() {
      ctx.clearRect(0, 0, size, size);

      for (let displayR = 0; displayR < 8; displayR++) {
        for (let displayC = 0; displayC < 8; displayC++) {
          const x = displayC * cellSize;
          const y = displayR * cellSize;
          
          // Get logical coordinates from display coordinates
          const [logicalR, logicalC] = inverseTransformCoords(displayR, displayC);

          // Board square color
          ctx.fillStyle = (displayR + displayC) % 2 === 0 ? LIGHT : DARK;
          ctx.fillRect(x, y, cellSize, cellSize);

          // Center highlight
          if (LinkedEngine.isCenter(logicalR, logicalC)) {
            ctx.fillStyle = CENTER_HIGHLIGHT;
            ctx.fillRect(x, y, cellSize, cellSize);
            // Dashed border
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
            // Small circle indicator
            ctx.beginPath();
            ctx.arc(x + cellSize / 2, y + cellSize / 2, cellSize * 0.15, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(100, 255, 100, 0.7)';
            ctx.fill();
          }

          // Skip the piece on the animating source square (it's being drawn separately)
          if (animHideLogical && animHideLogical[0] === logicalR && animHideLogical[1] === logicalC) {
            continue;
          }

          // Piece
          if (board[logicalR][logicalC]) {
            const piece = board[logicalR][logicalC];
            const cx = x + cellSize / 2;
            const cy = y + cellSize / 2;

            // Check if this piece is fading out
            const fading = fadingPieces.find(f => f.logR === logicalR && f.logC === logicalC);
            drawPieceAt(piece, cx, cy, fading ? fading.opacity : 1);
          }
        }
      }

      // Draw fading-out pieces that are no longer on the board
      for (const fp of fadingPieces) {
        if (board[fp.logR] && board[fp.logR][fp.logC]) continue; // still on board, drawn above
        const [dR, dC] = transformCoords(fp.logR, fp.logC);
        const cx = dC * cellSize + cellSize / 2;
        const cy = dR * cellSize + cellSize / 2;
        drawPieceAt(fp.piece, cx, cy, fp.opacity);
      }

      // Draw the sliding piece on top
      if (animating && animPiece) {
        // easeInOutCubic for smooth feel
        let t = animProgress;
        t = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

        const fromX = animFromDisplay[1] * cellSize + cellSize / 2;
        const fromY = animFromDisplay[0] * cellSize + cellSize / 2;
        const toX   = animToDisplay[1]   * cellSize + cellSize / 2;
        const toY   = animToDisplay[0]   * cellSize + cellSize / 2;

        const cx = fromX + (toX - fromX) * t;
        const cy = fromY + (toY - fromY) * t;
        drawPieceAt(animPiece, cx, cy, 1);
      }
    }

    canvas.addEventListener('click', (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const displayC = Math.floor(x / cellSize);
      const displayR = Math.floor(y / cellSize);
      if (displayR >= 0 && displayR < 8 && displayC >= 0 && displayC < 8 && onCellClick) {
        // Convert display coordinates to logical coordinates
        const [logicalR, logicalC] = inverseTransformCoords(displayR, displayC);
        onCellClick(logicalR, logicalC);
      }
    });

    return {
      canvas,
      setBoard(b) { board = b; if (!animating) draw(); },
      getBoard() { return board; },
      setSelected(cell) { selectedCell = cell; draw(); },
      setLegalMoves(moves) { legalMoves = moves; draw(); },
      clearHighlights() { selectedCell = null; legalMoves = []; draw(); },
      onClick(fn) { onCellClick = fn; },
      isAnimating() { return animating; },

      /**
       * Animate a move:
       *  - oldBoard: board BEFORE the move
       *  - newBoard: board AFTER the move (final state)
       *  - from/to : [logicalR, logicalC]
       *
       * Phase 1 (0→500 ms): slide piece from → to (using oldBoard visuals)
       * Phase 2 (500→1500 ms): show final board; fade out any pieces that
       *         were on oldBoard but NOT on newBoard (captures / unlinks)
       */
      animateMove(oldBoard, newBoard, from, to) {
        // Cancel any running animation
        if (animFrameId) { cancelAnimationFrame(animFrameId); animFrameId = null; }
        fadingPieces = [];
        animating = true;

        const piece = oldBoard[from[0]][from[1]];
        if (!piece) { board = newBoard; animating = false; draw(); return; }

        // Derive display coords (respecting rotation)
        animFromDisplay = transformCoords(from[0], from[1]);
        animToDisplay   = transformCoords(to[0], to[1]);
        animPiece       = { ...piece };
        animHideLogical = [from[0], from[1]];
        animProgress    = 0;
        animStartTime   = performance.now();

        // During slide, show oldBoard except the piece being moved
        board = oldBoard.map(row => row.map(c => c ? { ...c } : null));

        function slideLoop(now) {
          animProgress = Math.min(1, (now - animStartTime) / animDuration);
          draw();
          if (animProgress < 1) {
            animFrameId = requestAnimationFrame(slideLoop);
          } else {
            // Slide done → switch to final board and start fade phase
            animPiece = null;
            animHideLogical = null;
            board = newBoard;

            // Find pieces that disappeared (captured / unlinked)
            const disappeared = [];
            for (let r = 0; r < 8; r++) {
              for (let c = 0; c < 8; c++) {
                const oldP = oldBoard[r][c];
                const newP = newBoard[r][c];
                if (oldP && !newP) {
                  // skip the source square of the move (piece moved, not removed)
                  if (r === from[0] && c === from[1]) continue;
                  disappeared.push({ logR: r, logC: c, piece: { ...oldP }, opacity: 1 });
                }
              }
            }

            if (disappeared.length === 0) {
              // No removals → done
              animating = false;
              draw();
              return;
            }

            // Fade phase: 1 second delay then 400 ms fade-out
            fadingPieces = disappeared;
            draw(); // show final board + full-opacity ghost pieces

            setTimeout(() => {
              fadeStartTime = performance.now();
              function fadeLoop(now) {
                const t = Math.min(1, (now - fadeStartTime) / fadeDuration);
                for (const fp of fadingPieces) fp.opacity = 1 - t;
                draw();
                if (t < 1) {
                  animFrameId = requestAnimationFrame(fadeLoop);
                } else {
                  fadingPieces = [];
                  animating = false;
                  draw();
                }
              }
              animFrameId = requestAnimationFrame(fadeLoop);
            }, 1000); // 1-second delay before fade begins
          }
        }
        animFrameId = requestAnimationFrame(slideLoop);
      },

      setRotation(degrees) { rotation = degrees; draw(); },
      getRotation() { return rotation; },
      rotateToPlayer(color) {
        // Rotate board so player's pieces are at the bottom
        offset = 180; // Can add an offset if needed for aesthetics
        switch(color) {
          case 'red':    rotation = 0 + offset;   break; // Top -> no rotation
          case 'blue':   rotation = 180 + offset; break; // Bottom -> 180°
          case 'green':  rotation = 90 + offset;  break; // Left -> 90° CW
          case 'yellow': rotation = 270 + offset; break; // Right -> 270° CW (90° CCW)
          default:       rotation = 0 + offset;
        }
        draw();
      },
      draw,
    };
  }

  return { create };
})();
