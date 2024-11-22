class AI {
    constructor(difficulty = 'easy') {
        this.difficulty = difficulty;
        this.maxDepth = difficulty === 'easy' ? 1 : 
                       difficulty === 'medium' ? 3 : 5;
    }

    async makeMove(game) {
        console.log('AI starting move');
        // Get AI's color (opposite of player's color)
        const aiColor = game.playerColor === 'red' ? 'black' : 'red';
        console.log('AI is playing as:', aiColor);

        // First check for available jumps
        const jumps = this.getAllPossibleJumps(game, aiColor);
        console.log('Available jumps:', jumps);

        let move;
        if (jumps.length > 0) {
            move = jumps[Math.floor(Math.random() * jumps.length)];
        } else {
            // If no jumps, look for regular moves
            const moves = this.getAllPossibleMoves(game, aiColor);
            console.log('Available regular moves:', moves);
            
            if (moves.length === 0) {
                console.log('AI could not find a valid move');
                return false;
            }

            move = moves[Math.floor(Math.random() * moves.length)];
        }

        if (move) {
            await new Promise(resolve => setTimeout(resolve, 500));
            await game.executeMove(move);
            return true;
        }
        
        return false;
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