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

        // Add movement animation
        if (piece.element) {
            piece.element.classList.add('moving');
            setTimeout(() => {
                piece.element.classList.remove('moving');
            }, 500);
        }

        // Move the piece in the data structure
        this.squares[fromY][fromX] = null;
        this.squares[toY][toX] = piece;
        piece.x = toX;
        piece.y = toY;

        // Update the DOM
        const fromSquare = this.getSquareElement(fromX, fromY);
        const toSquare = this.getSquareElement(toX, toY);
        if (piece.element && fromSquare && toSquare) {
            toSquare.appendChild(piece.element);
        }

        // Check for king promotion
        if ((piece.color === 'red' && toY === 0) || 
            (piece.color === 'black' && toY === 7)) {
            this.createKingPromotionEffect(piece);
        }

        return piece;
    }

    createKingPromotionEffect(piece) {
        const numParticles = 20;
        const colors = ['#f6cd4c', '#ff4444', '#44ff44'];
        
        for (let i = 0; i < numParticles; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            particle.style.width = '10px';
            particle.style.height = '10px';
            particle.style.background = colors[Math.floor(Math.random() * colors.length)];
            particle.style.left = `${piece.element.offsetLeft + piece.element.offsetWidth / 2}px`;
            particle.style.top = `${piece.element.offsetTop + piece.element.offsetHeight / 2}px`;
            
            // Random starting angle and distance
            const angle = (Math.random() * Math.PI * 2);
            const distance = Math.random() * 50 + 20;
            
            particle.style.transform = `
                translate(${Math.cos(angle) * distance}px, 
                         ${Math.sin(angle) * distance}px)
                scale(0)
            `;
            
            this.element.appendChild(particle);
            
            // Remove particle after animation
            setTimeout(() => particle.remove(), 1000);
        }

        // Make the piece a king with animation
        piece.makeKing();
    }

    // Add method to create capture effect
    createCaptureEffect(x, y) {
        const square = this.getSquareElement(x, y);
        if (!square) return;

        const effect = document.createElement('div');
        effect.className = 'capture-effect';
        effect.style.cssText = `
            position: absolute;
            width: 100%;
            height: 100%;
            background: radial-gradient(circle, rgba(255,0,0,0.5) 0%, rgba(255,0,0,0) 70%);
            animation: captureExpand 0.5s ease-out forwards;
        `;

        square.appendChild(effect);
        setTimeout(() => effect.remove(), 500);
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