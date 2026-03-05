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

    function draw() {
      ctx.clearRect(0, 0, size, size);

      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          const x = c * cellSize;
          const y = r * cellSize;

          // Board square color
          ctx.fillStyle = (r + c) % 2 === 0 ? LIGHT : DARK;
          ctx.fillRect(x, y, cellSize, cellSize);

          // Center highlight
          if (LinkedEngine.isCenter(r, c)) {
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
          if (selectedCell && selectedCell[0] === r && selectedCell[1] === c) {
            ctx.fillStyle = SELECT_HIGHLIGHT;
            ctx.fillRect(x, y, cellSize, cellSize);
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 3;
            ctx.strokeRect(x + 1, y + 1, cellSize - 2, cellSize - 2);
          }

          // Legal move highlight
          if (legalMoves.some(([mr, mc]) => mr === r && mc === c)) {
            ctx.fillStyle = MOVE_HIGHLIGHT;
            ctx.fillRect(x, y, cellSize, cellSize);
            // Small circle indicator
            ctx.beginPath();
            ctx.arc(x + cellSize / 2, y + cellSize / 2, cellSize * 0.15, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(100, 255, 100, 0.7)';
            ctx.fill();
          }

          // Piece
          if (board[r][c]) {
            const piece = board[r][c];
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
          }
        }
      }
    }

    canvas.addEventListener('click', (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const c = Math.floor(x / cellSize);
      const r = Math.floor(y / cellSize);
      if (r >= 0 && r < 8 && c >= 0 && c < 8 && onCellClick) {
        onCellClick(r, c);
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
      draw,
    };
  }

  return { create };
})();
