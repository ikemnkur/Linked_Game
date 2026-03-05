const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const BOARD_SIZE = 8;
const TILE_SIZE = canvas.width / BOARD_SIZE;

let board = [];
let currentPlayer = 'red';
let movesLeft = 5;
let selectedPiece = null;
let gameMode = 'move'; // 'move', 'promote', 'attack'

class GamePiece {
    constructor(rank, x, y, owner) {
        this.rank = rank;
        this.x = x;
        this.y = y;
        this.owner = owner; // 'red' or 'blue'
        // this.hasMoved = false; // To track moves per turn
    }
}

// Initialize the board with null values
for (let y = 0; y < BOARD_SIZE; y++) {
    board[y] = [];
    for (let x = 0; x < BOARD_SIZE; x++) {
        board[y][x] = null;
    }
}

// Place initial pieces
function initializePieces() {
    for (let y = 0; y < 3; y++) {
        for (let x = 0; x < BOARD_SIZE; x++) {
            board[y][x] = new GamePiece(1, x, y, 'blue');
            board[BOARD_SIZE - y - 1][x] = new GamePiece(1, x, BOARD_SIZE - y - 1, 'red');
        }
    }
}

initializePieces();


function drawBoard() {
    for (let y = 0; y < BOARD_SIZE; y++) {
        for (let x = 0; x < BOARD_SIZE; x++) {
            // Draw tiles
            ctx.fillStyle = (x + y) % 2 === 0 ? '#EEE' : '#AAA';
            ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);

            // Highlight selected piece
            if (selectedPiece && selectedPiece.x === x && selectedPiece.y === y) {
                ctx.strokeStyle = 'yellow';
                ctx.lineWidth = 3;
                ctx.strokeRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
            }

            // Draw possible moves
            if (possibleMoves.some(pos => pos.x === x && pos.y === y)) {
                ctx.fillStyle = 'rgba(0, 255, 0, 0.3)';
                ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
            }

            // Draw pieces
            const piece = board[y][x];
            if (piece) {
                ctx.fillStyle = piece.owner;
                ctx.beginPath();
                ctx.arc(
                    x * TILE_SIZE + TILE_SIZE / 2,
                    y * TILE_SIZE + TILE_SIZE / 2,
                    TILE_SIZE / 3,
                    0,
                    Math.PI * 2
                );
                ctx.fill();

                // Draw rank
                ctx.fillStyle = '#FFF';
                ctx.font = '16px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(
                    piece.rank,
                    x * TILE_SIZE + TILE_SIZE / 2,
                    y * TILE_SIZE + TILE_SIZE / 2
                );
            }
        }
    }
}


let possibleMoves = [];



function calculatePossibleMoves(piece) {
    possibleMoves = [];
    const movementRange = getMovementRange(piece.rank);
  
    for (let dx = -movementRange; dx <= movementRange; dx++) {
      for (let dy = -movementRange; dy <= movementRange; dy++) {
        if (dx === 0 && dy === 0) continue;
        const targetX = piece.x + dx;
        const targetY = piece.y + dy;
        if (canMove(piece, targetX, targetY)) {
          possibleMoves.push({ x: targetX, y: targetY });
        }
      }
    }
  }

canvas.addEventListener('click', handleCanvasClick);

function handleCanvasClick(event) {
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((event.clientX - rect.left) / TILE_SIZE);
    const y = Math.floor((event.clientY - rect.top) / TILE_SIZE);

    
    console.log("x: "+ x + ", "+"y: "+ y)
    const clickedPiece = board[y][x];

    if (selectedPiece) {
        if (selectedPiece.x === x && selectedPiece.y === y) {
            // Deselect the piece if clicked again
            console.log("selectedPiece.x: "+ selectedPiece.x + ", "+"selectedPiece.y: "+ selectedPiece.y)
            selectedPiece = null;
            possibleMoves = [];
            updateButtons();
            console.log("deselect")
            drawBoard();
            return;
        }

        if (gameMode === 'move') {
            attemptMove(selectedPiece, x, y);
        } else if (gameMode === 'promote') {
            attemptPromote(selectedPiece, x, y);
        } else if (gameMode === 'attack') {
            attemptAttack(selectedPiece, x, y);
        }
    } else {
        if (clickedPiece && clickedPiece.owner === currentPlayer) {
            selectedPiece = clickedPiece;
            calculatePossibleMoves(selectedPiece);
            updateButtons();
            drawBoard();
        }
    }
}

function attemptMove(piece, targetX, targetY) {
    // Implement movement logic here
    if (canMove(piece, targetX, targetY)) {
        executeMove(piece, targetX, targetY);
        selectedPiece = null;
    }
}

function canMove(piece, targetX, targetY) {

    // Ensure the target is within bounds
    if (targetX < 0 || targetX >= BOARD_SIZE || targetY < 0 || targetY >= BOARD_SIZE) {
        return false;
    }

    // Check if target tile is occupied by own piece
    const targetPiece = board[targetY][targetX];
    // if (targetPiece && targetPiece.owner === piece.owner) {
    //     return false;
    // }

    // Calculate movement range based on rank
    const movementRange = getMovementRange(piece.rank);

    // Check if hopping over an enemy piece
    const dx = targetX - piece.x;
    const dy = targetY - piece.y;
    const distance = Math.max(Math.abs(dx), Math.abs(dy));

    if (distance > 1) {
        const midX = piece.x + Math.sign(dx);
        const midY = piece.y + Math.sign(dy);
        const midPiece = board[midY][midX];
        if (midPiece && midPiece.owner !== piece.owner) {
            // Hopping over enemy piece
            return true;
        }
    }

    // King/Queen-like movement
    if ((dx !== 0 && dy !== 0 && dx !== dy) || dx > movementRange || dy > movementRange) {
        return false;
    }

    // Check path is clear (optional for simplicity)
    // If moving into an enemy-occupied square
    if (targetPiece && targetPiece.owner !== piece.owner) {
        if (piece.rank >= targetPiece.rank) {
            // Can capture enemy piece of equal or lower rank
            return true;
        } else {
            // Cannot move into square with higher-ranked enemy piece
            return false;
        }
    }

    // Path checking and other validations can be added here

    return !targetPiece; // Allow move if the target square is empty

    // return true;
}

function getMovementRange(rank) {
    if (rank === 1) return 5;
    if (rank === 2) return 2;
    return 1;
}

// function executeMove(piece, targetX, targetY) {
//     // Update board positions
//     board[piece.y][piece.x] = null;
//     piece.x = targetX;
//     piece.y = targetY;
//     board[targetY][targetX] = piece;

//     // Handle hopping over enemy piece
//     const dx = targetX - piece.x;
//     const dy = targetY - piece.y;
//     const distance = Math.max(Math.abs(dx), Math.abs(dy));

//     if (distance > 1) {
//         const midX = piece.x + Math.sign(dx);
//         const midY = piece.y + Math.sign(dy);
//         const midPiece = board[midY][midX];
//         if (midPiece && midPiece.owner !== piece.owner) {
//             // Remove the enemy piece
//             board[midY][midX] = null;
//         }
//     }

//     // Update moves left
//     const moveCost = getMoveCost(piece.rank);
//     movesLeft -= moveCost;
//     piece.hasMoved = true;

//     updateHUD();
//     drawBoard();
// }

function getMoveCost(rank) {
    if (rank === 1) return 1;
    if (rank === 2) return 2;
    if (rank === 3) return 3;
    if (rank === 4) return 4;
    if (rank === 5) return 5;
    return 1;
}

function updateHUD() {
    document.getElementById('currentTurn').textContent = currentPlayer.charAt(0).toUpperCase() + currentPlayer.slice(1);
    document.getElementById('movesLeft').textContent = movesLeft;

    const { redPieces, bluePieces } = countPieces();
    document.getElementById('redPieces').textContent = redPieces;
    document.getElementById('bluePieces').textContent = bluePieces;
}

function countPieces() {
    let redPieces = 0;
    let bluePieces = 0;
    for (let row of board) {
        for (let piece of row) {
            if (piece) {
                if (piece.owner === 'red') redPieces += piece.rank;
                if (piece.owner === 'blue') bluePieces += piece.rank;
            }
        }
    }
    return { redPieces, bluePieces };
}


document.getElementById('endTurnButton').addEventListener('click', endTurn);

function endTurn() {
    // Reset move flags
    // for (let row of board) {
    //     for (let piece of row) {
    //         if (piece) {
    //             piece.hasMoved = false;
    //         }
    //     }
    // }

    // Switch player
    currentPlayer = currentPlayer === 'red' ? 'blue' : 'red';
    movesLeft = 5;
    selectedPiece = null;
    gameMode = 'move';
    updateHUD();
    drawBoard();
}

function attemptPromote(piece, targetX, targetY) {
    const targetPiece = board[targetY][targetX];
    const distance = Math.max(Math.abs(targetX - piece.x), Math.abs(targetY - piece.y));

    if (targetPiece && targetPiece.owner === piece.owner && targetPiece !== piece && distance === 1) {
        if (piece.rank + targetPiece.rank <= 5) {
            const moveCost = 2; // Promotion costs 2 moves

            if (movesLeft - moveCost < 0) {
                alert('Not enough moves left for this action.');
                return;
            }

            // Update moves left
            movesLeft -= moveCost;

            // Promote
            board[piece.y][piece.x] = null;
            targetPiece.rank += piece.rank;

            updateHUD();
            drawBoard();
            selectedPiece = null;
            possibleMoves = [];
        } else {
            alert('Cannot promote beyond rank 5.');
        }
    } else {
        alert('Promotion requires adjacent friendly piece.');
    }
}


function attemptDemote(piece, targetX, targetY) {
    if (!board[targetY][targetX] && piece.rank > 1) {
        // Demote
        const demotedPiece = new GamePiece(1, targetX, targetY, piece.owner);
        board[targetY][targetX] = demotedPiece;
        piece.rank -= 1;
        movesLeft -= 1; // Demotion costs 1 move
        // piece.hasMoved = true;
        updateHUD();
        drawBoard();
        selectedPiece = null;
    }
}

function attemptAttack(attacker, targetX, targetY) {
    const defender = board[targetY][targetX];
    const distance = Math.max(Math.abs(targetX - attacker.x), Math.abs(targetY - attacker.y));
  
    if (defender && defender.owner !== attacker.owner) {
      if (distance === 1) {
        if (attacker.rank < defender.rank) {
          const moveCost = 1; // Attacking costs 1 move
  
          if (movesLeft - moveCost < 0) {
            alert('Not enough moves left for this action.');
            return;
          }
  
          // Attack the defender
          defender.rank -= 1;
          movesLeft -= moveCost;
  
          if (defender.rank <= 0) {
            // Remove the defender from the board
            board[defender.y][defender.x] = null;
          }
  
          updateHUD();
          drawBoard();
          selectedPiece = null;
          possibleMoves = [];
        } else {
          alert('You can capture this piece by moving onto it.');
        }
      } else {
        alert('Attack requires adjacent enemy piece.');
      }
    } else {
      alert('No enemy piece to attack.');
    }
  }

// function attemptAttack(attacker, targetX, targetY) {
//     if (movesLeft - moveCost < 0) {
//         alert('Not enough moves left for this action.');
//         return;
//     }
//     const defender = board[targetY][targetX];
//     if (defender && defender.owner !== attacker.owner) {
//         const distance = Math.max(Math.abs(targetX - attacker.x), Math.abs(targetY - attacker.y));
//         if (distance === 1 && attacker.rank < defender.rank) {
//             // Attack (demote) the defender
//             defender.rank -= 1;
//             movesLeft -= 1; // Attack costs 1 move
//             // attacker.hasMoved = true;
//             if (defender.rank <= 0) {
//                 board[defender.y][defender.x] = null;
//             }
//             updateHUD();
//             drawBoard();
//             selectedPiece = null;
//             possibleMoves = [];
//         } else if (attacker.rank >= defender.rank) {
//             alert('Cannot attack an equal or higher-ranked piece.');
//         } else {
//             alert('Attack requires adjacent enemy piece.');
//         }
//     } else {
//         alert('No enemy piece to attack.');
//     }
// }

function updateButtons() {
    const promoteButton = document.getElementById('promoteButton');
    const attackButton = document.getElementById('attackButton');
  
    if (selectedPiece) {
      // Check for possible promotion
      const canPromote = checkCanPromote(selectedPiece);
      promoteButton.style.display = canPromote ? 'inline' : 'none';
  
      // Check for possible attack
      const canAttack = checkCanAttack(selectedPiece);
      attackButton.style.display = canAttack ? 'inline' : 'none';
    } else {
      promoteButton.style.display = 'none';
      attackButton.style.display = 'none';
    }
  }
  

function checkCanPromote(piece) {
    // Check adjacent squares for friendly pieces
    for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
            if (dx === 0 && dy === 0) continue;
            const x = piece.x + dx;
            const y = piece.y + dy;
            if (x >= 0 && x < BOARD_SIZE && y >= 0 && y < BOARD_SIZE) {
                const neighbor = board[y][x];
                if (neighbor && neighbor.owner === piece.owner && neighbor !== piece) {
                    if (piece.rank + neighbor.rank <= 5) {
                        return true;
                    }
                }
            }
        }
    }
    return false;
}

function checkCanAttack(piece) {
    // Check adjacent squares for higher-ranked enemy pieces
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        if (dx === 0 && dy === 0) continue;
        const x = piece.x + dx;
        const y = piece.y + dy;
        if (x >= 0 && x < BOARD_SIZE && y >= 0 && y < BOARD_SIZE) {
          const neighbor = board[y][x];
          if (neighbor && neighbor.owner !== piece.owner && neighbor.rank > piece.rank) {
            return true;
          }
        }
      }
    }
    return false;
  }
  
  


function checkGameOver() {
    // Example: Check if a player has no pieces left
    let redPieces = 0;
    let bluePieces = 0;

    for (let row of board) {
        for (let piece of row) {
            if (piece) {
                if (piece.owner === 'red') redPieces++;
                if (piece.owner === 'blue') bluePieces++;
            }
        }
    }

    if (redPieces === 0) {
        alert('Blue wins!');
        resetGame();
    } else if (bluePieces === 0) {
        alert('Red wins!');
        resetGame();
    }
}

function resetGame() {
    board = [];
    for (let y = 0; y < BOARD_SIZE; y++) {
        board[y] = [];
        for (let x = 0; x < BOARD_SIZE; x++) {
            board[y][x] = null;
        }
    }
    initializePieces();
    currentPlayer = 'red';
    movesLeft = 5;
    selectedPiece = null;
    gameMode = 'move';
    updateHUD();
    drawBoard();
}

function executeMove(piece, targetX, targetY) {
    const dx = targetX - piece.x;
    const dy = targetY - piece.y;
    const distance = Math.max(Math.abs(dx), Math.abs(dy));
    const targetPiece = board[targetY][targetX];
  
    let moveCost;
  
    if (targetPiece && targetPiece.owner !== piece.owner) {
      // Moving into an enemy-occupied square to capture
      moveCost = 1 + piece.rank*distance; // Capturing costs 2 or more moves
      if (piece.rank >= targetPiece.rank) {
        if (movesLeft - moveCost < 0) {
          alert('Not enough moves left for this action.');
          return;
        }
  
        // Capture the enemy piece
        board[targetY][targetX] = null;
        movesLeft -= moveCost;
      } else {
        alert('Cannot capture a higher-ranked enemy piece by moving onto it.');
        return;
      }
    } else {
      // Regular movement
      moveCost = piece.rank * distance;
      if (movesLeft - moveCost < 0) {
        alert('Not enough moves left for this action.');
        return;
      }
      movesLeft -= moveCost;
    }
  
    // Update board positions
    board[piece.y][piece.x] = null;
    piece.x = targetX;
    piece.y = targetY;
    board[targetY][targetX] = piece;
  
    updateHUD();
    drawBoard();
    selectedPiece = null;
    possibleMoves = [];
  }
  

// function executeMove(piece, targetX, targetY) {
//     const dx = targetX - piece.x;
//     const dy = targetY - piece.y;
//     const distance = Math.max(Math.abs(dx), Math.abs(dy));
//     const moveCost = piece.rank * distance;

//     if (movesLeft - moveCost < 0) {
//         alert('Not enough moves left for this action.');
//         return;
//     }

//     // Update moves left
//     movesLeft -= moveCost;

//     // Handle hopping over enemy piece
//     if (distance > 1) {
//         const midX = piece.x + Math.sign(dx);
//         const midY = piece.y + Math.sign(dy);
//         const midPiece = board[midY][midX];
//         if (midPiece && midPiece.owner !== piece.owner) {
//             // Remove the enemy piece
//             board[midY][midX] = null;
//         }
//     }

//     // Update board positions
//     board[piece.y][piece.x] = null;
//     piece.x = targetX;
//     piece.y = targetY;
//     board[targetY][targetX] = piece;

//     updateHUD();
//     drawBoard();
//     selectedPiece = null;
//     possibleMoves = [];
// }



document.getElementById('moveButton').addEventListener('click', () => {
    gameMode = 'move';
});

document.getElementById('promoteButton').addEventListener('click', () => {
    gameMode = 'promote';
});

document.getElementById('attackButton').addEventListener('click', () => {
    gameMode = 'attack';
});

function gameLoop() {
    drawBoard();
    requestAnimationFrame(gameLoop);
}

// Start the game loop
gameLoop();

updateHUD();
drawBoard();

