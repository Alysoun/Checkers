class Board {
    constructor() {
        this.squares = Array(8).fill().map(() => Array(8).fill(null));
        this.element = document.getElementById('board');
        this.selectedPiece = null;
        this.validMoves = [];
        this.squareElements = new Map();
    }

    initialize() {
        this.element.innerHTML = '';
        this.squares = Array(8).fill().map(() => Array(8).fill(null));
        this.squareElements.clear();

        // Create board squares
        for (let y = 0; y < 8; y++) {
            for (let x = 0; x < 8; x++) {
                const square = document.createElement('div');
                square.className = `square ${(x + y) % 2 === 0 ? 'light' : 'dark'}`;
                square.dataset.x = x;
                square.dataset.y = y;
                square.addEventListener('click', (e) => this.handleSquareClick(x, y));
                this.element.appendChild(square);
                
                // Store the square element reference
                this.squareElements.set(`${x},${y}`, square);

                // Initialize pieces
                if ((x + y) % 2 !== 0) {
                    if (y < 3) {
                        this.addPiece(new Piece('black', x, y));
                    } else if (y > 4) {
                        this.addPiece(new Piece('red', x, y));
                    }
                }
            }
        }
    }

    addPiece(piece) {
        this.squares[piece.y][piece.x] = piece;
        const square = this.getSquareElement(piece.x, piece.y);
        square.appendChild(piece.createDOMElement());
    }

    removePiece(x, y) {
        if (x < 0 || x >= 8 || y < 0 || y >= 8) return;

        const piece = this.squares[y][x];
        if (piece) {
            try {
                if (piece.element) {
                    piece.element.remove();
                }
            } catch (error) {
                console.error('Error removing piece element:', error);
            }
            this.squares[y][x] = null;
        }
    }

    movePiece(fromX, fromY, toX, toY) {
        const piece = this.getPiece(fromX, fromY);
        if (!piece) {
            console.error('No piece found at source position:', fromX, fromY);
            return null;
        }

        // Ensure piece has a DOM element
        if (!piece.element) {
            piece.createDOMElement();
        }

        // Update piece position
        this.squares[fromY][fromX] = null;
        this.squares[toY][toX] = piece;
        piece.x = toX;
        piece.y = toY;

        // Update DOM
        const targetSquare = this.getSquareElement(toX, toY);
        if (targetSquare && piece.element) {
            try {
                targetSquare.appendChild(piece.element);
            } catch (error) {
                console.error('Error moving piece element:', error);
                // Recreate and append element if there was an error
                piece.createDOMElement();
                targetSquare.appendChild(piece.element);
            }
        }

        // Check for king promotion
        if ((piece.color === 'red' && toY === 0) || 
            (piece.color === 'black' && toY === 7)) {
            try {
                piece.makeKing();
            } catch (error) {
                console.error('Error during king promotion:', error);
            }
        }

        return piece;
    }

    getPiece(x, y) {
        if (x >= 0 && x < 8 && y >= 0 && y < 8) {
            return this.squares[y][x];
        }
        return null;
    }

    getSquareElement(x, y) {
        return this.squareElements.get(`${x},${y}`);
    }

    clearHighlights() {
        this.clearPieceHighlights();
        // Remove all helper circles
        const helpers = this.element.querySelectorAll('.move-helper');
        helpers.forEach(helper => helper.remove());

        // Remove valid-move class from squares
        const squares = this.element.querySelectorAll('.valid-move');
        squares.forEach(square => square.classList.remove('valid-move'));

        this.validMoves = [];
    }

    highlightValidMoves(moves) {
        this.clearHighlights();
        this.validMoves = moves;

        moves.forEach(move => {
            const square = this.getSquareElement(move.toX, move.toY);
            if (square) {
                // Create and add the helper circle
                const helper = document.createElement('div');
                helper.className = 'move-helper';
                
                // Add special class for jumps
                if (move.jumpedPieces.length > 0) {
                    helper.classList.add('jump-helper');
                }
                
                square.appendChild(helper);
                square.classList.add('valid-move');
            }
        });
    }

    handleSquareClick(x, y) {
        Game.instance.handleSquareClick(x, y);
    }

    clear() {
        // Remove all pieces and their elements
        for (let y = 0; y < 8; y++) {
            for (let x = 0; x < 8; x++) {
                const piece = this.squares[y][x];
                if (piece && piece.element) {
                    piece.element.remove();
                }
                this.squares[y][x] = null;
            }
        }
        this.clearHighlights();
        this.clearPieceHighlights();
    }

    copy() {
        const boardCopy = new Board();
        boardCopy.squares = Array(8).fill().map(() => Array(8).fill(null));

        for (let y = 0; y < 8; y++) {
            for (let x = 0; x < 8; x++) {
                const piece = this.getPiece(x, y);
                if (piece) {
                    // Create a new piece with the same properties
                    const pieceCopy = new Piece(piece.color, x, y);
                    if (piece.isKing) {
                        pieceCopy.makeKing();
                    }
                    boardCopy.squares[y][x] = pieceCopy;
                }
            }
        }

        // Copy necessary methods and properties
        boardCopy.element = this.element;
        boardCopy.getSquareElement = this.getSquareElement;
        boardCopy.getPiece = this.getPiece;
        
        return boardCopy;
    }

    highlightPiecesWithJumps(jumps) {
        this.clearPieceHighlights();

        // Create a Set of piece positions that have jumps
        const jumpingPieces = new Set();
        jumps.forEach(jump => {
            jumpingPieces.add(`${jump.fromX},${jump.fromY}`);
        });

        // Highlight each piece that has a jump
        jumpingPieces.forEach(pos => {
            const [x, y] = pos.split(',').map(Number);
            const piece = this.getPiece(x, y);
            if (piece && piece.element) {
                piece.element.classList.add('must-jump');
                console.log(`Adding must-jump class to piece at ${x},${y}`);
            }
        });
    }

    clearPieceHighlights() {
        const highlightedPieces = this.element.querySelectorAll('.must-jump');
        highlightedPieces.forEach(piece => {
            piece.classList.remove('must-jump');
        });
    }

    getPieceCount(color) {
        let count = 0;
        for (let y = 0; y < 8; y++) {
            for (let x = 0; x < 8; x++) {
                const piece = this.squares[y][x];
                if (piece && piece.color === color) {
                    count++;
                }
            }
        }
        return count;
    }

    // Optional: Add a method to get all pieces of a color
    getPieces(color) {
        const pieces = [];
        for (let y = 0; y < 8; y++) {
            for (let x = 0; x < 8; x++) {
                const piece = this.squares[y][x];
                if (piece && piece.color === color) {
                    pieces.push(piece);
                }
            }
        }
        return pieces;
    }
} 