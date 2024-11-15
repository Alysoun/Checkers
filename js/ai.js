class AI {
    constructor(difficulty = 'easy') {
        this.difficulty = difficulty;
        this.maxDepth = difficulty === 'easy' ? 1 : 
                       difficulty === 'medium' ? 3 : 5;
    }

    async makeMove(game) {
        console.log('AI starting move');
        let move = this.getBestMove(game);
        
        if (move) {
            await new Promise(resolve => setTimeout(resolve, 500));
            await game.executeMove(move);

            // Only check for additional jumps if the last move was a jump
            if (move.jumpedPieces.length > 0) {
                let currentPiece = game.board.getPiece(move.toX, move.toY);
                let additionalJumps = Move.getMultiJumps(currentPiece, game.board, move.toX, move.toY);
                
                // Only continue if there are additional jumps for the SAME piece
                while (additionalJumps.length > 0) {
                    console.log('AI has additional jumps for same piece:', additionalJumps);
                    move = additionalJumps[0]; // Take the first available jump
                    await new Promise(resolve => setTimeout(resolve, 500));
                    await game.executeMove(move);
                    currentPiece = game.board.getPiece(move.toX, move.toY);
                    additionalJumps = Move.getMultiJumps(currentPiece, game.board, move.toX, move.toY);
                }
            }
            return true;
        }
        
        console.log('AI could not find a valid move');
        return false;
    }

    getBestMove(game) {
        // First check for any mandatory jumps
        const jumps = this.getAllPossibleJumps(game);
        if (jumps.length > 0) {
            console.log('AI found mandatory jumps:', jumps);
            return jumps[Math.floor(Math.random() * jumps.length)];
        }

        // Get all possible moves if no jumps
        const moves = this.getAllPossibleMoves(game);
        if (moves.length === 0) return null;

        console.log('AI found regular moves:', moves);
        return moves[Math.floor(Math.random() * moves.length)];
    }

    evaluateBestMove(game, moves) {
        let bestMove = null;
        let bestScore = -Infinity;

        for (const move of moves) {
            // Simulate the move
            const boardCopy = this.copyBoard(game.board);
            this.simulateMove(boardCopy, move);
            
            // Evaluate position using minimax
            const score = this.minimax(
                boardCopy, 
                this.maxDepth - 1, 
                -Infinity, 
                Infinity, 
                false
            );
            
            if (score > bestScore) {
                bestScore = score;
                bestMove = move;
            }
        }

        return bestMove;
    }

    minimax(board, depth, alpha, beta, isMaximizing) {
        if (depth === 0) {
            return this.evaluatePosition(board);
        }

        if (isMaximizing) {
            let maxScore = -Infinity;
            const moves = this.getAllPossibleMoves({ board });
            
            for (const move of moves) {
                const boardCopy = this.copyBoard(board);
                this.simulateMove(boardCopy, move);
                const score = this.minimax(boardCopy, depth - 1, alpha, beta, false);
                maxScore = Math.max(maxScore, score);
                alpha = Math.max(alpha, score);
                if (beta <= alpha) break;
            }
            return maxScore;
        } else {
            let minScore = Infinity;
            const moves = this.getAllPossibleMoves({ board });
            
            for (const move of moves) {
                const boardCopy = this.copyBoard(board);
                this.simulateMove(boardCopy, move);
                const score = this.minimax(boardCopy, depth - 1, alpha, beta, true);
                minScore = Math.min(minScore, score);
                beta = Math.min(beta, score);
                if (beta <= alpha) break;
            }
            return minScore;
        }
    }

    evaluatePosition(board) {
        let score = 0;
        
        for (let y = 0; y < 8; y++) {
            for (let x = 0; x < 8; x++) {
                const piece = board.getPiece(x, y);
                if (piece) {
                    // Base piece values
                    const baseValue = piece.isKing ? 3 : 1;
                    
                    // Position-based bonus
                    let positionBonus = 0;
                    if (piece.color === 'black') {
                        // Encourage black pieces to move forward
                        positionBonus = (7 - y) * 0.1;
                        // Extra bonus for back row control
                        if (y === 7) positionBonus += 0.5;
                    } else {
                        // Encourage red pieces to move forward
                        positionBonus = y * 0.1;
                        // Extra bonus for back row control
                        if (y === 0) positionBonus += 0.5;
                    }
                    
                    // Edge and center control bonus
                    const edgeBonus = (x === 0 || x === 7) ? 0.2 : 
                                    (x === 3 || x === 4) ? 0.15 : 0;
                    
                    const totalValue = baseValue + positionBonus + edgeBonus;
                    
                    if (piece.color === 'black') {
                        score += totalValue;
                    } else {
                        score -= totalValue;
                    }
                }
            }
        }
        
        return score;
    }

    simulateMove(board, move) {
        // Remove jumped pieces
        move.jumpedPieces.forEach(piece => {
            board.squares[piece.y][piece.x] = null;
        });

        // Move the piece
        const piece = board.squares[move.fromY][move.fromX];
        board.squares[move.fromY][move.fromX] = null;
        board.squares[move.toY][move.toX] = piece;

        // Update piece position
        piece.x = move.toX;
        piece.y = move.toY;

        // Check for king promotion
        if ((piece.color === 'black' && move.toY === 7) || 
            (piece.color === 'red' && move.toY === 0)) {
            piece.isKing = true;
        }
    }

    copyBoard(board) {
        const copy = {
            squares: Array(8).fill().map(() => Array(8).fill(null)),
            getPiece: board.getPiece
        };

        for (let y = 0; y < 8; y++) {
            for (let x = 0; x < 8; x++) {
                const piece = board.getPiece(x, y);
                if (piece) {
                    copy.squares[y][x] = {
                        ...piece,
                        element: null // Don't copy DOM elements
                    };
                }
            }
        }

        return copy;
    }

    getAllPossibleMoves(game) {
        const moves = [];
        for (let y = 0; y < 8; y++) {
            for (let x = 0; x < 8; x++) {
                const piece = game.board.getPiece(x, y);
                if (piece && piece.color === 'black') {
                    const regularMoves = Move.getValidMoves(piece, game.board);
                    moves.push(...regularMoves);
                }
            }
        }
        return moves;
    }

    getAllPossibleJumps(game) {
        const jumps = [];
        for (let y = 0; y < 8; y++) {
            for (let x = 0; x < 8; x++) {
                const piece = game.board.getPiece(x, y);
                if (piece && piece.color === 'black') {
                    const pieceJumps = Move.getMultiJumps(piece, game.board);
                    if (pieceJumps.length > 0) {
                        console.log(`Found jumps for piece at ${x},${y}:`, pieceJumps);
                        jumps.push(...pieceJumps);
                    }
                }
            }
        }
        return jumps;
    }
} 