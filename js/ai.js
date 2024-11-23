class AI {
    constructor(difficulty = 'easy') {
        this.difficulty = difficulty;
        this.maxDepth = difficulty === 'easy' ? 1 : 
                       difficulty === 'medium' ? 3 : 5;
    }

    async makeMove(game) {
        const aiColor = game.playerColor === 'red' ? 'black' : 'red';
        if (game.currentPlayer !== aiColor) {
            console.log('Not AI turn, skipping');
            return false;
        }

        console.log('AI starting move');
        console.log('AI is playing as:', aiColor);

        try {
            // First check for available jumps
            const jumps = this.getAllPossibleJumps(game, aiColor);
            console.log('Available jumps:', jumps);

            if (jumps.length > 0) {
                // Execute the first jump
                const jump = jumps[Math.floor(Math.random() * jumps.length)];
                await new Promise(resolve => setTimeout(resolve, 500));
                await game.executeMove(jump);
                let currentPiece = game.board.getPiece(jump.toX, jump.toY);

                // Continue jumping with the same piece if additional jumps are available
                while (currentPiece) {
                    const additionalJumps = Move.getMultiJumps(currentPiece, game.board);
                    if (additionalJumps.length === 0) break;

                    // Execute additional jump
                    const nextJump = additionalJumps[Math.floor(Math.random() * additionalJumps.length)];
                    await new Promise(resolve => setTimeout(resolve, 500));
                    await game.executeMove(nextJump);
                    currentPiece = game.board.getPiece(nextJump.toX, nextJump.toY);
                }

                // After jumps are complete, return without looking for additional moves
                return true;
            }

            // Only look for regular moves if no jumps were available
            const moves = this.getAllPossibleMoves(game, aiColor);
            console.log('Available regular moves:', moves);
            
            if (moves.length > 0) {
                const move = moves[Math.floor(Math.random() * moves.length)];
                await new Promise(resolve => setTimeout(resolve, 500));
                await game.executeMove(move);
                return true;
            }

            return false;
        } catch (error) {
            console.error('Error in AI move:', error);
            return false;
        }
    }

    getAllPossibleMoves(game, aiColor) {
        const moves = [];
        for (let y = 0; y < 8; y++) {
            for (let x = 0; x < 8; x++) {
                const piece = game.board.getPiece(x, y);
                if (piece && piece.color === aiColor) {
                    const validMoves = Move.getValidMoves(piece, game.board);
                    moves.push(...validMoves);
                }
            }
        }
        console.log(`Found ${moves.length} possible moves for ${aiColor}`);
        return moves;
    }

    getAllPossibleJumps(game, aiColor) {
        const jumps = [];
        for (let y = 0; y < 8; y++) {
            for (let x = 0; x < 8; x++) {
                const piece = game.board.getPiece(x, y);
                if (piece && piece.color === aiColor) {
                    const pieceJumps = Move.getMultiJumps(piece, game.board);
                    jumps.push(...pieceJumps);
                }
            }
        }
        console.log(`Found ${jumps.length} possible jumps for ${aiColor}`);
        return jumps;
    }
} 