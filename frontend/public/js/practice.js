/* ─── Practice Room ───────────────────────────────────── */

window.PracticePage = (() => {
  let renderer = null;
  let board = null;
  let mode = 'move';       // 'move' | 'place' | 'erase'
  let selectedColor = 'red';
  let selectedValue = 1;
  let selectedPiece = null;

  function render() {
    const app = document.getElementById('app');
    app.innerHTML = `
      <div class="practice-page">
        <div class="game-header" style="justify-content:space-between; display:flex; align-items:center; margin-bottom:16px;">
          <button id="back-to-lobby" class="btn-secondary">← Lobby</button>
          <h2>Practice Room</h2>
          <div></div>
        </div>

        <p class="practice-mode-label">Mode: <strong id="mode-label">Move Pieces</strong></p>

        <div class="practice-controls">
          <button id="mode-move" class="btn-secondary">Move</button>
          <button id="mode-place">Place</button>
          <button id="mode-erase" class="btn-secondary">Erase</button>
          <button id="reset-btn" class="btn-secondary">Reset Board</button>
          <button id="clear-btn" class="btn-secondary">Clear Board</button>
        </div>

        <div class="color-picker" id="color-picker">
          <button class="color-btn red selected" data-color="red"></button>
          <button class="color-btn blue" data-color="blue"></button>
          <button class="color-btn green" data-color="green"></button>
          <button class="color-btn yellow" data-color="yellow"></button>
        </div>

        <div class="value-picker" id="value-picker" style="margin-top: 12px;">
          <label style="color: var(--text-muted); margin-right: 8px;">Piece Value:</label>
          <button class="value-btn selected" data-value="1">1</button>
          <button class="value-btn" data-value="2">2</button>
          <button class="value-btn" data-value="3">3</button>
        </div>

        <div class="rotation-controls" style="margin-top: 12px; display: flex; gap: 8px; justify-content: center;">
          <label style="color: var(--text-muted);">View from:</label>
          <button class="rotate-color-btn" data-color="red">Red</button>
          <button class="rotate-color-btn" data-color="blue">Blue</button>
          <button class="rotate-color-btn" data-color="green">Green</button>
          <button class="rotate-color-btn" data-color="yellow">Yellow</button>
        </div>
        <br> 

        <div class="board-container" id="board-container"></div>
        <p class="error-msg" id="practice-info" style="color: var(--text-muted); margin-top:12px;"></p>
      </div>
    `;

    board = LinkedEngine.createStartingBoard();

    const container = document.getElementById('board-container');
    renderer = BoardRenderer.create(container, { size: Math.min(480, window.innerWidth - 40) });
    renderer.setBoard(board);

    renderer.onClick(handleClick);

    // Buttons
    document.getElementById('back-to-lobby').addEventListener('click', () => window.App.navigate('/lobby'));
    document.getElementById('mode-move').addEventListener('click', () => setMode('move'));
    document.getElementById('mode-place').addEventListener('click', () => setMode('place'));
    document.getElementById('mode-erase').addEventListener('click', () => setMode('erase'));
    document.getElementById('reset-btn').addEventListener('click', resetBoard);
    document.getElementById('clear-btn').addEventListener('click', clearBoard);

    // Color picker
    document.querySelectorAll('.color-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        selectedColor = btn.dataset.color;
        document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
      });
    });

    // Value picker
    document.querySelectorAll('.value-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        selectedValue = parseInt(btn.dataset.value);
        document.querySelectorAll('.value-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
      });
    });

    // Rotation controls
    document.querySelectorAll('.rotate-color-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const color = btn.dataset.color;
        renderer.rotateToPlayer(color);
      });
    });

    setMode('move');
  }

  function setMode(m) {
    mode = m;
    selectedPiece = null;
    renderer.clearHighlights();

    const labels = { move: 'Move Pieces', place: 'Place Pieces', erase: 'Erase Pieces' };
    document.getElementById('mode-label').textContent = labels[m];

    // Button styling
    ['mode-move', 'mode-place', 'mode-erase'].forEach(id => {
      const btn = document.getElementById(id);
      btn.className = id.includes(m) ? '' : 'btn-secondary';
    });

    const info = document.getElementById('practice-info');
    if (m === 'move') info.textContent = 'Click a piece then click a destination. All colors can be moved.';
    else if (m === 'place') info.textContent = 'Click any empty square to place a piece of the selected color.';
    else if (m === 'erase') info.textContent = 'Click any piece to remove it.';
  }

  function handleClick(r, c) {
    if (mode === 'place') {
      if (board[r][c] === null) {
        board[r][c] = { color: selectedColor, value: selectedValue };
        renderer.setBoard(board);
      }
      return;
    }

    if (mode === 'erase') {
      if (board[r][c] !== null) {
        board[r][c] = null;
        renderer.setBoard(board);
      }
      return;
    }

    // Move mode
    if (selectedPiece) {
      const [sr, sc] = selectedPiece;
      if (sr === r && sc === c) {
        // Deselect
        selectedPiece = null;
        renderer.clearHighlights();
        return;
      }

      // In practice mode, allow free movement (any adjacent square)
      const dr = Math.abs(r - sr);
      const dc = Math.abs(c - sc);
      if (dr <= 1 && dc <= 1 && (dr + dc) > 0) {
        // Just move it freely — no rule enforcement in practice
        if (board[r][c] === null) {
          board[r][c] = board[sr][sc];
          board[sr][sc] = null;
        } else {
          // Swap pieces if destination is occupied
          const temp = board[r][c];
          board[r][c] = board[sr][sc];
          board[sr][sc] = temp;
        }
        selectedPiece = null;
        renderer.clearHighlights();
        renderer.setBoard(board);
        return;
      }

      // If further than adjacent, allow teleport in practice
      if (board[r][c] === null) {
        board[r][c] = board[sr][sc];
        board[sr][sc] = null;
        selectedPiece = null;
        renderer.clearHighlights();
        renderer.setBoard(board);
        return;
      }

      // Clicking another piece — select it
      if (board[r][c] !== null) {
        selectedPiece = [r, c];
        renderer.setSelected([r, c]);
        renderer.setLegalMoves([]);
        return;
      }

      selectedPiece = null;
      renderer.clearHighlights();
      return;
    }

    // No selection yet
    if (board[r][c] !== null) {
      selectedPiece = [r, c];
      renderer.setSelected([r, c]);
      renderer.setLegalMoves([]); // No rule enforcement hints in practice
    }
  }

  function resetBoard() {
    board = LinkedEngine.createStartingBoard();
    selectedPiece = null;
    renderer.clearHighlights();
    renderer.setBoard(board);
  }

  function clearBoard() {
    board = LinkedEngine.createEmptyBoard();
    selectedPiece = null;
    renderer.clearHighlights();
    renderer.setBoard(board);
  }

  function cleanup() {
    renderer = null;
    board = null;
    selectedPiece = null;
  }

  return { render, cleanup };
})();
