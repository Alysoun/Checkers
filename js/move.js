class Move {
    constructor(fromX, fromY, toX, toY, jumpedPieces = []) {
        this.fromX = fromX;
        this.fromY = fromY;
        this.toX = toX;
        this.toY = toY;
        this.jumpedPieces = jumpedPieces;
    }

    static getMultiJumps(piece, board, startX = null, startY = null) {
        if (!piece) return [];

        const jumps = [];
        const visited = new Set();

        const explore = (x, y, sequence = []) => {
            const key = `${x},${y}`;
            if (visited.has(key)) return;
            visited.add(key);

            try {
                const currentPiece = sequence.length === 0 ? piece : board.getPiece(x, y);
                if (!currentPiece) return;

                const possibleJumps = Move.getJumpsForPiece(currentPiece, board, x, y);
                
                possibleJumps.forEach(jump => {
                    jumps.push(jump);
                    explore(jump.toX, jump.toY, [...sequence, jump]);
                });
            } catch (error) {
                console.error('Error exploring jumps:', error);
            }
        };

        explore(startX ?? piece.x, startY ?? piece.y);
        return jumps;
    }

    static getJumpsForPiece(piece, board, currentX = null, currentY = null) {
        const x = currentX ?? piece.x;
        const y = currentY ?? piece.y;
        const jumps = [];
        const directions = piece.isKing ? [-1, 1] : piece.color === 'red' ? [-1] : [1];

        directions.forEach(dy => {
            [-1, 1].forEach(dx => {
                const midX = x + dx;
                const midY = y + dy;
                const endX = x + 2 * dx;
                const endY = y + 2 * dy;

                if (endX >= 0 && endX < 8 && endY >= 0 && endY < 8) {
                    const jumpedPiece = board.getPiece(midX, midY);
                    const endSquare = board.getPiece(endX, endY);

                    if (jumpedPiece && 
                        jumpedPiece.color !== piece.color && 
                        !endSquare) {
                        jumps.push(new Move(x, y, endX, endY, [jumpedPiece]));
                    }
                }
            });
        });

        return jumps;
    }

    static getRegularMoves(piece, board) {
        const moves = [];
        const directions = piece.isKing ? [-1, 1] : piece.color === 'red' ? [-1] : [1];

        directions.forEach(dy => {
            [-1, 1].forEach(dx => {
                const newX = piece.x + dx;
                const newY = piece.y + dy;

                if (newX >= 0 && newX < 8 && newY >= 0 && newY < 8) {
                    if (!board.getPiece(newX, newY)) {
                        moves.push(new Move(piece.x, piece.y, newX, newY));
                    }
                }
            });
        });

        return moves;
    }

    static getImmediateJumps(piece, board, x, y) {
        const jumps = [];
        const directions = piece.isKing ? [-1, 1] : piece.color === 'red' ? [-1] : [1];

        directions.forEach(dy => {
            [-1, 1].forEach(dx => {
                const midX = x + dx;
                const midY = y + dy;
                const jumpX = midX + dx;
                const jumpY = midY + dy;

                if (this.isValidPosition(jumpX, jumpY)) {
                    const jumpedPiece = board.getPiece(midX, midY);
                    const landingSquare = board.getPiece(jumpX, jumpY);

                    if (jumpedPiece && 
                        jumpedPiece.color !== piece.color && 
                        !landingSquare) {
                        jumps.push(new Move(x, y, jumpX, jumpY, [jumpedPiece]));
                    }
                }
            });
        });

        return jumps;
    }

    static simulateJump(board, piece, jumpedPiece, newX, newY) {
        // Create a shallow copy of the board state
        const tempBoard = {
            squares: board.squares.map(row => [...row]),
            getPiece: (x, y) => tempBoard.squares[y][x]
        };
        
        // Remove the jumped piece and move the jumping piece
        tempBoard.squares[jumpedPiece.y][jumpedPiece.x] = null;
        tempBoard.squares[piece.y][piece.x] = null;
        tempBoard.squares[newY][newX] = piece;
        
        return tempBoard;
    }

    static isValidPosition(x, y) {
        return x >= 0 && x < 8 && y >= 0 && y < 8;
    }

    static isPieceInPath(piece, currentJump) {
        if (!currentJump) return false;
        return currentJump.jumpedPieces.includes(piece);
    }

    static getValidMoves(piece, board) {
        // First check for mandatory jumps
        const jumps = this.getMultiJumps(piece, board);
        if (jumps.length > 0) {
            return jumps;
        }

        // If no jumps are available, return regular moves
        return this.getRegularMoves(piece, board);
    }
} 