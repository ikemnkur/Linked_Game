/* ─── Game Engine (shared logic, client-side) ─────────── */

window.LinkedEngine = (() => {
  const BOARD_SIZE = 8;
  const CENTER_SQUARES = [[3,3],[3,4],[4,3],[4,4]];
  const COLORS = ['red', 'blue', 'green', 'yellow'];

  function createEmptyBoard() {
    return Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(null));
  }

  function createStartingBoard() {
    const board = createEmptyBoard();
    // Piece values: [x, 3, 2, 1, 1, 2, 3, x]
    const values = [null, 3, 2, 1, 1, 2, 3, null];
    
    // Red = top (row 0, cols 1-6)
    for (let c = 1; c <= 6; c++) board[0][c] = { color: 'red', value: values[c] };
    // Blue = bottom (row 7, cols 1-6)
    for (let c = 1; c <= 6; c++) board[7][c] = { color: 'blue', value: values[c] };
    // Green = left (col 0, rows 1-6)
    for (let r = 1; r <= 6; r++) board[r][0] = { color: 'green', value: values[r] };
    // Yellow = right (col 7, rows 1-6)
    for (let r = 1; r <= 6; r++) board[r][7] = { color: 'yellow', value: values[r] };
    return board;
  }

  function cloneBoard(board) {
    return board.map(row => row.map(cell => cell ? { ...cell } : null));
  }

  function inBounds(r, c) {
    return r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE;
  }

  function isCenter(r, c) {
    return CENTER_SQUARES.some(([cr, cc]) => cr === r && cc === c);
  }

  function getAdjacentSquares(r, c) {
    const results = [];
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = r + dr, nc = c + dc;
        if (inBounds(nr, nc)) results.push([nr, nc]);
      }
    }
    return results;
  }

  function hasAdjacentFriendly(board, r, c, color, excludeR, excludeC) {
    for (const [nr, nc] of getAdjacentSquares(r, c)) {
      if (nr === excludeR && nc === excludeC) continue;
      if (board[nr][nc] && board[nr][nc].color === color) return true;
    }
    return false;
  }

  function findPushLanding(board, origR, origC, attackedR, attackedC) {
    const dr = attackedR - origR; // push direction row (-1 or +1)
    const dc = attackedC - origC; // push direction col (-1 or +1)

    // Priority-ordered push destinations:
    // [1] Continue diagonal, [2] two orthogonal components, [3] two remaining diagonals
    const candidates = [
      [attackedR + dr, attackedC + dc],   // [1] diagonal continuation
      [attackedR + dr, attackedC],         // [2] orthogonal (row component)
      [attackedR, attackedC + dc],         // [2] orthogonal (col component)
      [attackedR - dr, attackedC + dc],    // [3] far diagonal
      [attackedR + dr, attackedC - dc],    // [3] far diagonal
    ];

    for (const [r, c] of candidates) {
      if (inBounds(r, c) && board[r][c] === null) {
        return [r, c];
      }
    }
    return null;
  }

  function getConnectedComponents(board, color) {
    const pieces = [];
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if (board[r][c] && board[r][c].color === color) {
          pieces.push([r, c]);
        }
      }
    }

    const visited = new Set();
    const components = [];

    function bfs(startR, startC) {
      const comp = [];
      const q = [[startR, startC]];
      visited.add(`${startR},${startC}`);
      while (q.length > 0) {
        const [r, c] = q.shift();
        comp.push([r, c]);
        for (const [nr, nc] of getAdjacentSquares(r, c)) {
          const key = `${nr},${nc}`;
          if (visited.has(key)) continue;
          if (board[nr][nc] && board[nr][nc].color === color) {
            visited.add(key);
            q.push([nr, nc]);
          }
        }
      }
      return comp;
    }

    for (const [r, c] of pieces) {
      if (!visited.has(`${r},${c}`)) {
        components.push(bfs(r, c));
      }
    }
    return components;
  }

  function removeUnlinkedPieces(board, color) {
    const components = getConnectedComponents(board, color);
    const removed = [];
    for (const comp of components) {
      if (comp.length === 1) {
        const [r, c] = comp[0];
        board[r][c] = null;
        removed.push([r, c]);
      }
    }
    return removed;
  }

  // Returns { valid, board, error }
  function processMove(board, playerColor, from, to) {
    const b = cloneBoard(board);
    const [fr, fc] = from;
    const [tr, tc] = to;

    if (!b[fr][fc] || b[fr][fc].color !== playerColor) {
      return { valid: false, error: 'Not your piece.' };
    }

    const dr = tr - fr;
    const dc = tc - fc;
    const isDiag = Math.abs(dr) === 1 && Math.abs(dc) === 1;
    const isOrtho = (Math.abs(dr) + Math.abs(dc)) === 1;
    const isTwoAwayDiagonally = Math.abs(dr) === 2 && Math.abs(dc) === 2;

    // 2-square diagonal = checker-style hop over an enemy piece
    const isHop  = isTwoAwayDiagonally;

    if (!isDiag && !isOrtho && !isTwoAwayDiagonally) {
      return { valid: false, error: 'Invalid move distance.' };
    }

    if (isOrtho) {
      if (b[tr][tc] !== null) {
        return { valid: false, error: 'Square is occupied.' };
      }
      b[tr][tc] = b[fr][fc];
      b[fr][fc] = null;
    }

    if (isDiag) {
      if (b[tr][tc] !== null && b[tr][tc].color !== playerColor) {
        // Attack – push the enemy to the nearest valid free square
        const enemy = b[tr][tc];
        const pushTarget = findPushLanding(b, fr, fc, tr, tc);
        if (!pushTarget) return { valid: false, error: 'No valid push landing.' };
        b[pushTarget[0]][pushTarget[1]] = enemy;
        b[tr][tc] = b[fr][fc];
        b[fr][fc] = null;
      } else if (b[tr][tc] === null) {
        // Diagonal step to empty square – must connect to a friendly piece
        const willConnect = hasAdjacentFriendly(b, tr, tc, playerColor, fr, fc);
        if (!willConnect) return { valid: false, error: 'Hop must connect to a friendly piece.' };
        b[tr][tc] = b[fr][fc];
        b[fr][fc] = null;
      } else {
        // own piece is blocking
        return { valid: false, error: 'Cannot move onto your own piece.' };
      }
    }

    // Checker-style capture: 2-square diagonal jump over an enemy piece
    if (isHop) {
      if (b[tr][tc] !== null) {
        return { valid: false, error: 'Cannot capture – landing square is occupied.' };
      }
      const midR = fr + dr / 2;
      const midC = fc + dc / 2;
      if (!b[midR][midC] || b[midR][midC].color === playerColor) {
        return { valid: false, error: 'Cannot capture – must jump over an enemy piece.' };
      }
      // Capture: delete the enemy piece; links may break (allowed for captures)
      b[midR][midC] = null;
      b[tr][tc] = b[fr][fc];
      b[fr][fc] = null;
    }

    removeAllUnlinkedPieces(b, playerColor);
    return { valid: true, board: b };
  }

//   scan the board for pieces that are not connected to any others of the same color, and remove them
  function removeAllUnlinkedPieces(board, color) {

    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if (board[r][c] && board[r][c].color === color) {
          const hasFriend = hasAdjacentFriendly(board, r, c, color, -1, -1);
          if (!hasFriend) {
            board[r][c] = null;
          }
        }
      }
    }

    // const components = getConnectedComponents(board, color);
    // const removed = [];
    // for (const comp of components) {
    //   if (comp.length === 1) {
    //     const [r, c] = comp[0];
    //     board[r][c] = null;
    //     removed.push([r, c]);
    //   }
    // }
    // return removed;
  }

  function getLegalMoves(board, playerColor, fromR, fromC) {
    const moves = [];
    // Orthogonal
    for (const [dr, dc] of [[0,1],[0,-1],[1,0],[-1,0]]) {
      const tr = fromR + dr, tc = fromC + dc;
      if (!inBounds(tr, tc)) continue;
      const result = processMove(board, playerColor, [fromR, fromC], [tr, tc]);
      if (result.valid) moves.push([tr, tc]);
    }
    // 1-step diagonal (attack or connect-hop)
    for (const [dr, dc] of [[1,1],[1,-1],[-1,1],[-1,-1]]) {
      const tr = fromR + dr, tc = fromC + dc;
      if (!inBounds(tr, tc)) continue;
      const result = processMove(board, playerColor, [fromR, fromC], [tr, tc]);
      if (result.valid) moves.push([tr, tc]);
    }
    // 2-step diagonal (checker-style hop over enemy)
    for (const [dr, dc] of [[2,2],[2,-2],[-2,2],[-2,-2]]) {
      const tr = fromR + dr, tc = fromC + dc;
      if (!inBounds(tr, tc)) continue;
      const result = processMove(board, playerColor, [fromR, fromC], [tr, tc]);
      if (result.valid) moves.push([tr, tc]);
    }
    return moves;
  }

  function countCenter(board, color) {
    let points = 0;
    for (const [r, c] of CENTER_SQUARES) {
      if (board[r][c] && board[r][c].color === color) {
        points += board[r][c].value || 1;
      }
    }
    return points;
  }

  return {
    BOARD_SIZE,
    CENTER_SQUARES,
    COLORS,
    createEmptyBoard,
    createStartingBoard,
    cloneBoard,
    inBounds,
    isCenter,
    processMove,
    getLegalMoves,
    removeUnlinkedPieces,
    getConnectedComponents,
    countCenter,
  };
})();
