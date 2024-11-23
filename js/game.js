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
        this.playerColor = 'red';

        this.setupSplashScreen();
    }

    setupSplashScreen() {
        const splashScreen = document.getElementById('splashScreen');
        const colorButtons = splashScreen.querySelectorAll('.color-button');
        const modeButtons = splashScreen.querySelectorAll('.splash-button');

        // Color selection handling
        colorButtons.forEach(button => {
            button.addEventListener('click', () => {
                // Remove active class from all buttons
                colorButtons.forEach(btn => btn.classList.remove('active'));
                // Add active class to clicked button
                button.classList.add('active');
                this.playerColor = button.dataset.color;
            });
        });

        // Game mode selection
        modeButtons.forEach(button => {
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
        this.currentPlayer = 'red';
        this.gameOver = false;
        this.selectedPiece = null;
        this.isPlayerTurnComplete = false;
        this.boardStates = [];
        this.capturedPieces = [];

        // Initialize board first in all cases
        this.board.initialize();
        this.board.clear();

        if (mode.startsWith('ai-')) {
            this.ai = new AI(mode.replace('ai-', ''));
            this.isAIGame = true;
        } else {
            this.ai = null;
            this.isAIGame = false;
        }

        // Place pieces based on player color
        if (this.playerColor === 'black') {
            // Black perspective: black pieces at bottom (rows 5-7)
            this.placePieces('black', 5, 8);
            this.placePieces('red', 0, 3);
            
            // Apply rotation for black's perspective
            const board = document.getElementById('board');
            if (board) {
                board.style.transform = 
                    'perspective(1200px) rotateX(var(--board-angle)) rotateZ(180deg) scale(var(--board-scale))';
                
                document.querySelectorAll('.piece').forEach(piece => {
                    let transform = 'translate(-50%, -50%) translateZ(var(--piece-height))';
                    if (piece.classList.contains('king')) {
                        transform += ' rotateZ(180deg)';
                    }
                    piece.style.transform = transform;
                });
            }
        } else {
            // Red perspective: red pieces at bottom (rows 5-7)
            this.placePieces('red', 5, 8);
            this.placePieces('black', 0, 3);
        }

        if (this.isAIGame && this.playerColor === 'black') {
            setTimeout(() => this.ai.makeMove(this), 500);
        }
    }

    async initialize() {
        // Load 3D models first
        await Piece.loadModels();
        
        // Then initialize the game
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

        // Check for mandatory jumps at game start
        const mandatoryJumps = this.getAllAvailableJumps();
        if (mandatoryJumps.length > 0) {
            this.board.highlightPiecesWithJumps(mandatoryJumps);
        }

        // Place pieces based on player's color
        if (this.playerColor === 'black') {
            // Place pieces from black's perspective
            this.placePieces('black', 0, 3);  // Black pieces in first 3 rows
            this.placePieces('red', 5, 8);    // Red pieces in last 3 rows
        } else {
            // Standard red perspective
            this.placePieces('red', 0, 3);    // Red pieces in first 3 rows
            this.placePieces('black', 5, 8);  // Black pieces in last 3 rows
        }
    }

    setupEventListeners() {
        document.getElementById('newGame').addEventListener('click', () => this.newGame());
        document.getElementById('undo').addEventListener('click', () => this.undoMove());
    }

    handleSquareClick(x, y) {
        console.log('Square clicked:', {x, y});
        console.log('Current game state:', {
            currentPlayer: this.currentPlayer,
            isAIGame: this.isAIGame,
            gameOver: this.gameOver,
            selectedPiece: this.selectedPiece,
            isPlayerTurnComplete: this.isPlayerTurnComplete,
            playerColor: this.playerColor
        });

        if (this.gameOver || (this.isAIGame && this.currentPlayer !== this.playerColor)) {
            console.log('Turn blocked because:', {
                gameOver: this.gameOver,
                isAITurn: (this.isAIGame && this.currentPlayer !== this.playerColor)
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
        const previousState = this.captureCurrentBoardState();
        this.boardStates.push(previousState);

        console.log('Executing move:', move);
        console.log('Game state before move:', {
            currentPlayer: this.currentPlayer,
            isPlayerTurnComplete: this.isPlayerTurnComplete
        });

        // Execute the move
        const movedPiece = this.board.getPiece(move.fromX, move.fromY);
        this.board.movePiece(move.fromX, move.fromY, move.toX, move.toY);

        // Handle captures
        move.jumpedPieces.forEach(piece => {
            this.board.removePiece(piece.x, piece.y);
            this.capturedPieces.push(piece);
        });

        // Check for king promotion
        if ((movedPiece.color === 'black' && move.toY === 7) ||
            (movedPiece.color === 'red' && move.toY === 0)) {
            movedPiece.makeKing();
        }

        // Check for additional jumps
        const additionalJumps = Move.getMultiJumps(movedPiece, this.board, move.toX, move.toY);
        console.log('Additional jumps available:', additionalJumps);

        if (additionalJumps.length > 0 && move.jumpedPieces.length > 0) {
            if (!this.isAIGame || (this.isAIGame && this.currentPlayer === this.playerColor)) {
                this.selectedPiece = movedPiece;
                this.board.highlightValidMoves(additionalJumps);
                return;
            }
        }

        // Switch turns
        this.currentPlayer = this.currentPlayer === 'red' ? 'black' : 'red';
        this.selectedPiece = null;
        this.board.clearHighlights();
        this.updateGameInfo();

        // Check for mandatory jumps immediately after turn switch
        const mandatoryJumps = this.getAllAvailableJumps();
        if (mandatoryJumps.length > 0) {
            this.board.highlightPiecesWithJumps(mandatoryJumps);
        }

        // Check for game over
        if (this.checkGameOver()) {
            return;
        }

        // Handle AI turn
        if (this.isAIGame && !this.gameOver && this.currentPlayer !== this.playerColor) {
            console.log('Starting AI turn');
            await new Promise(resolve => setTimeout(resolve, 500));
            try {
                await this.ai.makeMove(this);
            } catch (error) {
                console.error('Error during AI move:', error);
            }
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
        const playerTurn = document.querySelector('.player-turn');
        playerTurn.textContent = 
            `Current Turn: ${this.currentPlayer.charAt(0).toUpperCase() + this.currentPlayer.slice(1)}`;
        
        const redCount = this.countPieces('red');
        const blackCount = this.countPieces('black');
        
        const redScore = document.querySelector('.red-score');
        const blackScore = document.querySelector('.black-score');
        redScore.textContent = `Red: ${redCount}`;
        blackScore.textContent = `Black: ${blackCount}`;
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
        // Hide the victory modal if it's showing
        const modal = document.getElementById('victoryModal');
        modal.style.display = 'none';

        // Clear the board
        this.board.clear();
        
        // Reset game state
        this.currentPlayer = 'red';
        this.gameOver = false;
        this.selectedPiece = null;
        this.isPlayerTurnComplete = false;
        this.boardStates = [];
        this.capturedPieces = [];
        
        // Reinitialize the game
        this.initialize();
        
        // Show splash screen for new game setup
        const splashScreen = document.getElementById('splashScreen');
        splashScreen.style.display = 'flex';
        splashScreen.style.opacity = '1';
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
        
        // If playing as black, rotate the message to be readable
        if (this.playerColor === 'black') {
            messageElement.style.transform = 'translate(-50%, -50%) rotateZ(180deg)';
        } else {
            messageElement.style.transform = 'translate(-50%, -50%)';
        }
        
        this.board.element.appendChild(messageElement);
        setTimeout(() => messageElement.remove(), 2000);
    }

    showVictoryModal(winner, reason = '') {
        const modal = document.getElementById('victoryModal');
        const message = document.getElementById('victoryMessage');
        
        // Get piece counts for the message
        const redPieces = this.board.getPieceCount('red');
        const blackPieces = this.board.getPieceCount('black');
        
        let victoryMessage = '';
        
        if (blackPieces === 0 || redPieces === 0) {
            victoryMessage = `${winner} Wins!\n` +
                `All opponent's pieces have been captured!\n` +
                `Final Score - Red: ${redPieces}, Black: ${blackPieces}`;
        } else {
            const stuckColor = winner === 'Red' ? 'Black' : 'Red';
            victoryMessage = `${winner} Wins!\n` +
                `${stuckColor} has no valid moves available.\n` +
                `This is known as a "blockade" victory.\n` +
                `Pieces Remaining - Red: ${redPieces}, Black: ${blackPieces}`;
        }
        
        message.innerHTML = victoryMessage.split('\n').join('<br>');
        modal.style.display = 'block';

        // Add event listener to the New Game button in the modal
        const newGameButton = document.getElementById('newGameButton');
        newGameButton.onclick = () => {
            modal.style.display = 'none';
            this.newGame();
        };
    }

    // Helper method to place pieces
    placePieces(color, startRow, endRow) {
        for (let row = startRow; row < endRow; row++) {
            for (let col = 0; col < 8; col++) {
                if ((row + col) % 2 === 1) {
                    const piece = new Piece(color, col, row);
                    piece.createDOMElement();
                    this.board.addPiece(piece);
                }
            }
        }
    }
}

window.addEventListener('DOMContentLoaded', () => {
    new Game();
});