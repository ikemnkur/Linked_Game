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

          // Piece
          if (board[logicalR][logicalC]) {
            const piece = board[logicalR][logicalC];
            const cx = x + cellSize / 2;
            const cy = y + cellSize / 2;
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

            // Value dots (gray dots showing piece value)
            if (piece.value) {
              const dotRadius = cellSize * 0.045;
              const dotColor = 'rgba(80, 80, 80, 0.7)';
              
              if (piece.value === 1) {
                // 1 dot: center
                ctx.beginPath();
                ctx.arc(cx, cy, dotRadius, 0, Math.PI * 2);
                ctx.fillStyle = dotColor;
                ctx.fill();
              } else if (piece.value === 2) {
                // 2 dots: horizontal
                ctx.beginPath();
                ctx.arc(cx - radius * 0.3, cy, dotRadius, 0, Math.PI * 2);
                ctx.fillStyle = dotColor;
                ctx.fill();
                ctx.beginPath();
                ctx.arc(cx + radius * 0.3, cy, dotRadius, 0, Math.PI * 2);
                ctx.fill();
              } else if (piece.value === 3) {
                // 3 dots: triangular pattern
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
          }
        }
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
      setBoard(b) { board = b; draw(); },
      getBoard() { return board; },
      setSelected(cell) { selectedCell = cell; draw(); },
      setLegalMoves(moves) { legalMoves = moves; draw(); },
      clearHighlights() { selectedCell = null; legalMoves = []; draw(); },
      onClick(fn) { onCellClick = fn; },
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
