class Game {
    static instance = null;

    constructor() {
        if (Game.instance) {
            return Game.instance;
        }
        Game.instance = this;

        this.board = new Board();
        this.currentPlayer = 'red';
        this.selectedPiece = null;
        this.moveHistory = [];
        this.gameOver = false;
        this.ai = null;
        this.isAIGame = false;
        this.isPlayerTurnComplete = false;
        this.capturedPieces = [];
        this.mandatoryJumps = [];
        this.boardStates = [];

        this.setupSplashScreen();
    }

    setupSplashScreen() {
        const splashScreen = document.getElementById('splashScreen');
        const buttons = splashScreen.querySelectorAll('.splash-button');

        buttons.forEach(button => {
            button.addEventListener('click', () => {
                const mode = button.dataset.mode;
                this.startGame(mode);
                splashScreen.style.opacity = '0';
                setTimeout(() => {
                    splashScreen.style.display = 'none';
                }, 500);
            });
        });
    }

    startGame(mode) {
        // Set up AI based on mode
        if (mode.startsWith('ai-')) {
            this.ai = new AI(mode.replace('ai-', ''));
            this.isAIGame = true;
        } else {
            this.ai = null;
            this.isAIGame = false;
        }

        // Initialize the game
        this.initialize();
    }

    initialize() {
        this.board.initialize();
        this.currentPlayer = 'red';
        this.selectedPiece = null;
        this.gameOver = false;
        this.moveHistory = [];
        this.mandatoryJumps = [];
        this.isPlayerTurnComplete = true;
        this.boardStates = [this.captureCurrentBoardState()];
        this.setupEventListeners();
        this.updateGameInfo();
    }

    setupEventListeners() {
        document.getElementById('newGame').addEventListener('click', () => this.newGame());
        document.getElementById('undo').addEventListener('click', () => this.undoMove());
    }

    handleSquareClick(x, y) {
        console.log('Square clicked:', { x, y });
        console.log('Current game state:', {
            currentPlayer: this.currentPlayer,
            isAIGame: this.isAIGame,
            gameOver: this.gameOver,
            selectedPiece: this.selectedPiece,
            isPlayerTurnComplete: this.isPlayerTurnComplete
        });

        if (this.gameOver || (this.isAIGame && this.currentPlayer === 'black')) {
            console.log('Turn blocked because:', {
                gameOver: this.gameOver,
                isAITurn: (this.isAIGame && this.currentPlayer === 'black')
            });
            return;
        }

        const clickedPiece = this.board.getPiece(x, y);
        console.log('Clicked piece:', clickedPiece);

        const allJumps = this.getAllAvailableJumps();
        
        if (allJumps.length > 0) {
            console.log('Mandatory jumps available:', allJumps);
            this.board.highlightPiecesWithJumps(allJumps);
            
            if (clickedPiece && clickedPiece.color === this.currentPlayer) {
                const hasJump = allJumps.some(jump => 
                    jump.fromX === x && jump.fromY === y
                );
                if (!hasJump) {
                    this.showMessage('This piece must take an available jump!');
                    return;
                }
            }
        }

        if (this.selectedPiece) {
            console.log('Currently selected piece:', this.selectedPiece);
            const validMoves = this.board.validMoves;
            console.log('Valid moves:', validMoves);

            const validMove = validMoves.find(move => 
                move.toX === x && move.toY === y
            );

            if (validMove) {
                if (allJumps.length > 0 && validMove.jumpedPieces.length === 0) {
                    console.log('Must take mandatory jump');
                    return;
                }
                
                console.log('Found valid move:', validMove);
                this.executeMove(validMove);
            } else if (clickedPiece && clickedPiece.color === this.currentPlayer) {
                this.selectPiece(clickedPiece, allJumps);
            } else {
                this.board.clearHighlights();
                this.selectedPiece = null;
            }
        } else if (clickedPiece && clickedPiece.color === this.currentPlayer) {
            this.selectPiece(clickedPiece, allJumps);
        }
    }

    getAllAvailableJumps() {
        const jumps = [];
        for (let y = 0; y < 8; y++) {
            for (let x = 0; x < 8; x++) {
                const piece = this.board.getPiece(x, y);
                if (piece && piece.color === this.currentPlayer) {
                    const pieceJumps = Move.getMultiJumps(piece, this.board);
                    jumps.push(...pieceJumps);
                }
            }
        }
        return jumps;
    }

    selectPiece(piece) {
        console.log('Selecting piece:', piece);
        this.selectedPiece = piece;
        
        // Get valid moves using the static method
        const validMoves = Move.getValidMoves(piece, this.board);
        
        // Store valid moves and highlight them
        this.board.validMoves = validMoves;
        this.board.highlightValidMoves(validMoves);
        
        if (validMoves.length === 0) {
            console.log('No valid moves available for selected piece');
            this.selectedPiece = null;
            return false;
        }
        
        return true;
    }

    async executeMove(move) {
        console.log('Executing move:', move);
        console.log('Game state before move:', {
            currentPlayer: this.currentPlayer,
            isPlayerTurnComplete: this.isPlayerTurnComplete
        });

        // Store the jumped piece before removing it (for undo)
        const jumpedPieces = move.jumpedPieces.map(piece => ({
            ...piece,
            element: piece.element
        }));

        // Remove jumped pieces
        move.jumpedPieces.forEach(jumpedPiece => {
            if (jumpedPiece) {  // Add null check
                console.log('Removing jumped piece:', jumpedPiece);
                this.board.removePiece(jumpedPiece.x, jumpedPiece.y);
            }
        });

        const movedPiece = this.board.movePiece(move.fromX, move.fromY, move.toX, move.toY);
        if (!movedPiece) {
            console.error('Failed to move piece');
            return;
        }
        
        this.moveHistory.push({
            move,
            jumpedPieces
        });
        this.boardStates.push(this.captureCurrentBoardState());

        // Check for additional jumps from the NEW position only
        let additionalJumps = [];
        try {
            additionalJumps = Move.getMultiJumps(movedPiece, this.board, move.toX, move.toY);
            console.log('Additional jumps available:', additionalJumps);
        } catch (error) {
            console.error('Error checking for additional jumps:', error);
            additionalJumps = [];
        }

        if (additionalJumps.length > 0 && move.jumpedPieces.length > 0) {
            if (this.currentPlayer === 'red') {
                this.selectedPiece = movedPiece;
                this.board.highlightValidMoves(additionalJumps);
                return;
            }
            if (this.currentPlayer === 'black' && this.isAIGame) {
                return;
            }
        }

        // Complete the turn
        this.currentPlayer = this.currentPlayer === 'red' ? 'black' : 'red';
        this.board.clearHighlights();
        this.selectedPiece = null;
        
        this.updateGameInfo();
        this.checkGameOver();

        // Start AI turn if game isn't over
        if (this.isAIGame && 
            !this.gameOver && 
            this.currentPlayer === 'black') {
            console.log('Starting AI turn');
            await new Promise(resolve => setTimeout(resolve, 500));
            try {
                await this.ai.makeMove(this);
            } catch (error) {
                console.error('Error during AI move:', error);
            }
        }

        // Check for new mandatory jumps for the next player
        try {
            const newJumps = this.getAllAvailableJumps();
            if (newJumps.length > 0) {
                this.board.highlightPiecesWithJumps(newJumps);
            }
        } catch (error) {
            console.error('Error checking for new jumps:', error);
        }
    }

    undoMove() {
        if (this.boardStates.length <= 1) return;

        // Track if we're undoing from a mandatory jump situation
        const currentJumps = this.getAllAvailableJumps();
        const hasMandatoryJumps = currentJumps.length > 0;

        if (this.isAIGame) {
            // Always undo both moves in AI game to maintain turn consistency
            if (this.boardStates.length >= 3) {
                // Undo both AI and player moves
                this.boardStates.pop(); // Remove AI move
                this.moveHistory.pop();
                this.boardStates.pop(); // Remove player move
                this.moveHistory.pop();
            } else {
                // Just undo the last move if we don't have enough history
                this.boardStates.pop();
                this.moveHistory.pop();
            }
        } else {
            // Regular two-player game
            this.boardStates.pop();
            this.moveHistory.pop();
        }

        // Restore the previous state
        const previousState = this.boardStates[this.boardStates.length - 1];
        this.restoreBoardState(previousState);

        // Force turn to red if in AI game
        if (this.isAIGame) {
            this.currentPlayer = 'red';
        }

        // Clear current game state
        this.selectedPiece = null;
        this.board.clearHighlights();
        
        // Immediately check for mandatory jumps in the restored state
        const newJumps = this.getAllAvailableJumps();
        if (newJumps.length > 0) {
            this.board.highlightPiecesWithJumps(newJumps);
            this.mandatoryJumps = newJumps;
        } else {
            this.mandatoryJumps = [];
        }

        this.isPlayerTurnComplete = true;
        this.updateGameInfo();
    }

    // Helper method to restore board state
    restoreBoardState(state) {
        this.board.clear();

        for (let y = 0; y < 8; y++) {
            for (let x = 0; x < 8; x++) {
                const pieceData = state.squares[y][x];
                if (pieceData) {
                    const piece = new Piece(pieceData.color, x, y);
                    if (pieceData.isKing) {
                        piece.makeKing();
                    }
                    this.board.squares[y][x] = piece;
                    piece.createDOMElement();
                    const square = this.board.getSquareElement(x, y);
                    if (square) {
                        square.appendChild(piece.element);
                    }
                }
            }
        }

        this.currentPlayer = state.currentPlayer;
        
        // Immediately check for mandatory jumps after restoring
        const jumps = this.getAllAvailableJumps();
        if (jumps.length > 0) {
            this.board.highlightPiecesWithJumps(jumps);
            this.mandatoryJumps = jumps;
        }
    }

    updateGameInfo() {
        document.querySelector('.player-turn').textContent = 
            `Current Turn: ${this.currentPlayer.charAt(0).toUpperCase() + this.currentPlayer.slice(1)}`;
        
        const redCount = this.countPieces('red');
        const blackCount = this.countPieces('black');
        
        document.querySelector('.red-score').textContent = `Red: ${redCount}`;
        document.querySelector('.black-score').textContent = `Black: ${blackCount}`;
    }

    countPieces(color) {
        let count = 0;
        for (let y = 0; y < 8; y++) {
            for (let x = 0; x < 8; x++) {
                const piece = this.board.getPiece(x, y);
                if (piece && piece.color === color) count++;
            }
        }
        return count;
    }

    checkGameOver() {
        const redPieces = this.board.getPieceCount('red');
        const blackPieces = this.board.getPieceCount('black');
        
        let winner = null;
        if (redPieces === 0) {
            winner = 'Black';
        } else if (blackPieces === 0) {
            winner = 'Red';
        } else {
            // Check if current player has no valid moves
            const currentColor = this.currentPlayer;
            let hasValidMoves = false;
            
            for (let y = 0; y < 8; y++) {
                for (let x = 0; x < 8; x++) {
                    const piece = this.board.getPiece(x, y);
                    if (piece && piece.color === currentColor) {
                        const moves = Move.getValidMoves(piece, this.board);
                        if (moves.length > 0) {
                            hasValidMoves = true;
                            break;
                        }
                    }
                }
                if (hasValidMoves) break;
            }
            
            if (!hasValidMoves) {
                winner = currentColor === 'red' ? 'Black' : 'Red';
            }
        }

        if (winner) {
            this.gameOver = true;
            this.showVictoryModal(winner);
        }
    }

    newGame() {
        this.board.clear();
        this.initialize();
        const modal = document.getElementById('victoryModal');
        modal.style.display = 'none';
    }

    createAIControls() {
        const controls = document.querySelector('.controls');
        
        const aiContainer = document.createElement('div');
        aiContainer.className = 'ai-controls';
        aiContainer.style.marginTop = '10px';

        const aiSelect = document.createElement('select');
        aiSelect.innerHTML = `
            <option value="">Two Players</option>
            <option value="easy">AI: Easy</option>
            <option value="medium">AI: Medium</option>
            <option value="hard">AI: Hard</option>
        `;
        aiSelect.addEventListener('change', (e) => {
            const difficulty = e.target.value;
            if (difficulty) {
                this.ai = new AI(difficulty);
                this.isAIGame = true;
            } else {
                this.ai = null;
                this.isAIGame = false;
            }
            this.newGame();
        });

        aiContainer.appendChild(aiSelect);
        controls.appendChild(aiContainer);
    }

    checkForMandatoryJumps() {
        const jumps = [];
        for (let y = 0; y < 8; y++) {
            for (let x = 0; x < 8; x++) {
                const piece = this.board.getPiece(x, y);
                if (piece && piece.color === this.currentPlayer) {
                    const pieceJumps = Move.getMultiJumps(piece, this.board);
                    if (pieceJumps.length > 0) {
                        jumps.push(...pieceJumps);
                    }
                }
            }
        }
        this.mandatoryJumps = jumps;
        return jumps.length > 0;
    }

    captureCurrentBoardState() {
        const state = {
            squares: Array(8).fill().map(() => Array(8).fill(null)),
            currentPlayer: this.currentPlayer,
            pieceCount: { red: 0, black: 0 }
        };

        for (let y = 0; y < 8; y++) {
            for (let x = 0; x < 8; x++) {
                const piece = this.board.getPiece(x, y);
                if (piece) {
                    state.squares[y][x] = {
                        color: piece.color,
                        isKing: piece.isKing,
                        x: x,
                        y: y
                    };
                    state.pieceCount[piece.color]++;
                }
            }
        }

        return state;
    }

    showMessage(text) {
        console.log(text);
        const messageElement = document.createElement('div');
        messageElement.className = 'game-message';
        messageElement.textContent = text;
        this.board.element.appendChild(messageElement);
        setTimeout(() => messageElement.remove(), 2000);
    }

    showVictoryModal(winner) {
        const modal = document.getElementById('victoryModal');
        const message = document.getElementById('victoryMessage');
        message.textContent = `${winner} Wins!`;
        modal.style.display = 'block';

        // Handle new game button click
        const newGameButton = document.getElementById('newGameButton');
        newGameButton.onclick = () => {
            modal.style.display = 'none';
            this.newGame();
        };

        // Close modal when clicking outside
        modal.onclick = (event) => {
            if (event.target === modal) {
                modal.style.display = 'none';
                this.newGame();
            }
        };
    }
}

window.addEventListener('DOMContentLoaded', () => {
    new Game();
});