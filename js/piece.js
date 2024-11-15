class Piece {
    constructor(color, x, y) {
        this.color = color;
        this.x = x;
        this.y = y;
        this.isKing = false;
        this.element = null;
    }

    makeKing() {
        this.isKing = true;
        if (this.element) {
            try {
                this.element.classList.add('king');
            } catch (error) {
                console.error('Error making piece king:', error);
                // Recreate element if it's missing
                this.createDOMElement();
                this.element.classList.add('king');
            }
        } else {
            // Create element if it doesn't exist
            this.createDOMElement();
            this.element.classList.add('king');
        }
    }

    createDOMElement() {
        if (!this.element) {
            this.element = document.createElement('div');
            this.element.className = `piece ${this.color}`;
            if (this.isKing) {
                this.element.classList.add('king');
            }
        }
        return this.element;
    }

    canMove(board, newX, newY) {
        // Implementation of movement rules
        const dx = newX - this.x;
        const dy = newY - this.y;
        
        if (!this.isKing) {
            if (this.color === 'red' && dy >= 0) return false;
            if (this.color === 'black' && dy <= 0) return false;
        }

        return Math.abs(dx) === 1 && Math.abs(dy) === 1;
    }

    canJump(board, newX, newY) {
        // Implementation of jumping rules
        const dx = newX - this.x;
        const dy = newY - this.y;
        
        if (!this.isKing) {
            if (this.color === 'red' && dy >= 0) return false;
            if (this.color === 'black' && dy <= 0) return false;
        }

        if (Math.abs(dx) !== 2 || Math.abs(dy) !== 2) return false;

        const jumpedX = this.x + dx/2;
        const jumpedY = this.y + dy/2;
        const jumpedPiece = board.getPiece(jumpedX, jumpedY);

        return jumpedPiece && jumpedPiece.color !== this.color;
    }
} 