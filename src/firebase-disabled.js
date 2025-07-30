// Disabled Firebase Manager for testing
// This is a mock implementation that doesn't connect to Firebase

class MockFirebaseManager {
  constructor() {
    this.user = { uid: 'mock-user' };
    this.isInitialized = true;
    console.log('Mock Firebase Manager initialized (no real Firebase connection)');
  }

  async initializeAuth() {
    // Mock auth - always ready
    return Promise.resolve();
  }

  async saveGameState(gameData, saveName = 'default') {
    console.log('Mock Firebase: Game state would be saved:', gameData, 'with name:', saveName);
    // Save to localStorage with named save
    try {
      const saves = JSON.parse(localStorage.getItem('garden-defender-saves') || '{}');
      saves[saveName] = {
        ...gameData,
        saveName: saveName,
        timestamp: new Date().toISOString()
      };
      localStorage.setItem('garden-defender-saves', JSON.stringify(saves));
      console.log('Game state saved to localStorage with name:', saveName);
      return true;
    } catch (error) {
      console.error('Error saving to localStorage:', error);
      return false;
    }
  }

  async loadGameState(saveName = 'default') {
    console.log('Mock Firebase: Loading game state from localStorage with name:', saveName);
    try {
      const saves = JSON.parse(localStorage.getItem('garden-defender-saves') || '{}');
      if (saves[saveName]) {
        const data = saves[saveName];
        console.log('Game state loaded from localStorage:', data);
        return data;
      } else {
        console.log('No saved game state found in localStorage for:', saveName);
        return null;
      }
    } catch (error) {
      console.error('Error loading from localStorage:', error);
      return null;
    }
  }

  async getSavedGames() {
    console.log('Mock Firebase: Getting all saved games from localStorage');
    try {
      const saves = JSON.parse(localStorage.getItem('garden-defender-saves') || '{}');
      return Object.entries(saves)
        .filter(([name, data]) => name !== 'autosave') // Filter out autosave from user selection
        .map(([name, data]) => ({
          name,
          timestamp: data.timestamp,
          score: data.score || 0,
          round: data.round || 1,
          timeLeft: data.timeLeft || 60
        }));
    } catch (error) {
      console.error('Error getting saved games from localStorage:', error);
      return [];
    }
  }

  async deleteSavedGame(saveName) {
    console.log('Mock Firebase: Deleting saved game:', saveName);
    try {
      const saves = JSON.parse(localStorage.getItem('garden-defender-saves') || '{}');
      delete saves[saveName];
      localStorage.setItem('garden-defender-saves', JSON.stringify(saves));
      return true;
    } catch (error) {
      console.error('Error deleting saved game from localStorage:', error);
      return false;
    }
  }

  async clearGameState(saveName = 'default') {
    console.log('Mock Firebase: Clearing game state for:', saveName);
    if (saveName === 'all') {
      localStorage.removeItem('garden-defender-saves');
    } else {
      return this.deleteSavedGame(saveName);
    }
    return true;
  }

  async saveHighScore(score, round, playerName = 'Anonymous') {
    console.log('Mock Firebase: High score would be saved:', { score, round, playerName });
    // Save to localStorage
    try {
      const scores = JSON.parse(localStorage.getItem('garden-defender-scores') || '[]');
      scores.push({
        score,
        round,
        playerName,
        timestamp: new Date().toISOString(),
        userId: this.user.uid
      });
      // Keep only top 10 scores
      scores.sort((a, b) => b.score - a.score);
      scores.splice(10);
      localStorage.setItem('garden-defender-scores', JSON.stringify(scores));
      return true;
    } catch (error) {
      console.error('Error saving high score to localStorage:', error);
      return false;
    }
  }

  async getTopHighScores(limit = 3) {
    console.log('Mock Firebase: Getting top high scores from localStorage');
    try {
      const scores = JSON.parse(localStorage.getItem('garden-defender-scores') || '[]');
      return scores.slice(0, limit);
    } catch (error) {
      console.error('Error loading high scores from localStorage:', error);
      return [];
    }
  }

  async isTopScore(score) {
    try {
      const scores = JSON.parse(localStorage.getItem('garden-defender-scores') || '[]');
      return scores.length < 10 || score > (scores[scores.length - 1]?.score || 0);
    } catch (error) {
      console.error('Error checking if top score:', error);
      return true;
    }
  }
}

// Export mock Firebase manager
export { MockFirebaseManager as FirebaseManager };
export const firebaseManager = new MockFirebaseManager();
export default firebaseManager;
