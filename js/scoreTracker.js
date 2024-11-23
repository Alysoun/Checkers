class ScoreTracker {
    constructor() {
        console.log('ScoreTracker initialized');
        this.loadScores();
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        console.log('Setting up event listeners');
        const viewStatsButton = document.getElementById('viewStats');
        const resetStatsButton = document.getElementById('resetStats');
        const closeStatsButton = document.getElementById('closeStats');
        
        if (viewStatsButton) {
            viewStatsButton.addEventListener('click', () => {
                console.log('View Stats button clicked');
                this.showScoreModal();
            });
        }
        
        if (resetStatsButton) {
            resetStatsButton.addEventListener('click', () => {
                console.log('Reset Stats button clicked');
                this.resetScores();
                this.showScoreModal(); // Refresh the display after reset
            });
        }
        
        if (closeStatsButton) {
            closeStatsButton.addEventListener('click', () => {
                console.log('Close Stats button clicked');
                this.hideScoreModal();
            });
        }
    }

    loadScores() {
        const savedScores = localStorage.getItem('checkerScores');
        this.scores = savedScores ? JSON.parse(savedScores) : {
            easy: { wins: 0, losses: 0 },
            medium: { wins: 0, losses: 0 },
            hard: { wins: 0, losses: 0 }
        };
    }

    updateScore(difficulty, isWin) {
        if (isWin) {
            this.scores[difficulty].wins++;
        } else {
            this.scores[difficulty].losses++;
        }
        this.saveScores();
    }

    saveScores() {
        localStorage.setItem('checkerScores', JSON.stringify(this.scores));
    }

    resetScores() {
        console.log('Resetting scores');
        this.scores = {
            easy: { wins: 0, losses: 0 },
            medium: { wins: 0, losses: 0 },
            hard: { wins: 0, losses: 0 }
        };
        this.saveScores();
        // Show feedback to user
        const container = document.getElementById('statsContainer');
        if (container) {
            container.innerHTML = '<div class="reset-message">Statistics have been reset!</div>';
            setTimeout(() => this.showScoreModal(), 1000); // Refresh the display after 1 second
        }
    }

    showScoreModal() {
        console.log('Attempting to show score modal');
        const modal = document.getElementById('scoreModal');
        console.log('Score modal element:', modal);
        
        const container = document.getElementById('statsContainer');
        console.log('Stats container element:', container);

        if (!modal || !container) {
            console.error('Required elements not found');
            return;
        }

        console.log('Current scores:', this.scores);
        container.innerHTML = Object.entries(this.scores)
            .map(([diff, score]) => `
                <div class="difficulty-stats">
                    <h3>${diff.charAt(0).toUpperCase() + diff.slice(1)}</h3>
                    <p>Wins: ${score.wins}</p>
                    <p>Losses: ${score.losses}</p>
                    <p>Win Rate: ${this.calculateWinRate(score)}%</p>
                </div>
            `).join('');

        modal.style.display = 'flex';
        console.log('Modal display style set to:', modal.style.display);
    }

    hideScoreModal() {
        console.log('Hiding score modal');
        const modal = document.getElementById('scoreModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    calculateWinRate(score) {
        const total = score.wins + score.losses;
        return total === 0 ? 0 : Math.round((score.wins / total) * 100);
    }
} 