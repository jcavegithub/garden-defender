// Firebase configuration and initialization
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, getDoc, getDocs, updateDoc, deleteDoc, orderBy, limit, query, serverTimestamp } from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { firebaseConfig } from './firebase-config.js';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

class FirebaseManager {
  constructor() {
    this.user = null;
    this.isInitialized = false;
    this.initializationPromise = this.initializeAuth();
  }

  async initializeAuth() {
    try {
      console.log('Starting Firebase authentication...');
      
      // Sign in anonymously to allow data storage without requiring user accounts
      const userCredential = await signInAnonymously(auth);
      this.user = userCredential.user;
      this.isInitialized = true;
      
      // Set up auth state listener for future changes
      onAuthStateChanged(auth, (user) => {
        if (user && user.uid !== this.user?.uid) {
          this.user = user;
          console.log('Firebase auth state changed:', user.uid);
        } else if (!user) {
          this.user = null;
          this.isInitialized = false;
          console.log('Firebase user signed out');
        }
      });
      
      return true;
    } catch (error) {
      console.error('Firebase initialization error:', error);
      this.isInitialized = false;
      return false;
    }
  }

  async waitForInitialization() {
    return await this.initializationPromise;
  }

  // High Scores Management
  async saveHighScore(score, round, playerName = 'Anonymous') {
    try {
      await this.waitForInitialization();
      if (!this.isInitialized) {
        console.log('Firebase not initialized, cannot save high score');
        return false;
      }

      const timestamp = new Date();
      const scoreData = {
        score: score,
        round: round,
        playerName: playerName,
        userId: this.user.uid,
        timestamp: serverTimestamp(),
        date: timestamp.toISOString()
      };

      // Create a unique document ID based on timestamp and user ID
      const docId = `${timestamp.getTime()}_${this.user.uid}`;
      await setDoc(doc(db, 'highScores', docId), scoreData);
      
      return true;
    } catch (error) {
      console.error('Error saving high score:', error);
      return false;
    }
  }

  async getTopHighScores(limit_count = 10) {
    try {
      await this.waitForInitialization();
      if (!this.isInitialized) {
        console.log('Firebase not initialized, returning empty high scores');
        return [];
      }

      const scoresQuery = query(
        collection(db, 'highScores'),
        orderBy('score', 'desc'),
        limit(limit_count)
      );
      
      const querySnapshot = await getDocs(scoresQuery);
      const scores = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        scores.push({
          id: doc.id,
          score: data.score,
          round: data.round,
          playerName: data.playerName || 'Anonymous',
          date: data.date,
          userId: data.userId
        });
      });
      
      return scores;
    } catch (error) {
      console.error('Error getting high scores:', error);
      return [];
    }
  }

  async isTopScore(score, topCount = 3) {
    try {
      await this.waitForInitialization();
      if (!this.isInitialized) {
        console.log('Firebase not initialized, cannot check if top score');
        return false;
      }

      const scoresQuery = query(
        collection(db, 'highScores'),
        orderBy('score', 'desc'),
        limit(topCount)
      );
      
      const querySnapshot = await getDocs(scoresQuery);
      const scores = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        scores.push(data.score);
      });
      
      // If we have fewer than topCount scores, this is definitely a top score
      if (scores.length < topCount) {
        return true;
      }
      
      // Check if the new score is higher than the lowest top score
      const lowestTopScore = scores[scores.length - 1];
      return score > lowestTopScore;
    } catch (error) {
      console.error('Error checking if top score:', error);
      return false;
    }
  }

  async clearAllHighScores() {
    try {
      await this.waitForInitialization();
      if (!this.isInitialized) {
        console.log('Firebase not initialized, cannot clear high scores');
        return false;
      }

      console.log('Clearing all high scores...');
      
      // Get all high score documents
      const scoresQuery = query(collection(db, 'highScores'));
      const querySnapshot = await getDocs(scoresQuery);
      
      let deletedCount = 0;
      const deletePromises = [];
      
      querySnapshot.forEach((docSnapshot) => {
        deletePromises.push(deleteDoc(docSnapshot.ref));
        deletedCount++;
      });
      
      // Delete all documents in parallel
      await Promise.all(deletePromises);
      
      console.log(`Successfully cleared ${deletedCount} high scores`);
      return deletedCount;
    } catch (error) {
      console.error('Error clearing high scores:', error);
      return false;
    }
  }

  // Game State Management
  async saveGameState(gameState, saveName = 'autosave') {
    try {
      await this.waitForInitialization();
      if (!this.isInitialized) {
        console.log('Firebase not initialized, cannot save game state');
        return false;
      }

      const timestamp = new Date();
      const saveData = {
        ...gameState,
        saveName: saveName,
        userId: this.user.uid,
        timestamp: serverTimestamp(),
        date: timestamp.toISOString()
      };

      // Use a combination of user ID and save name as document ID
      const docId = `${this.user.uid}_${saveName}`;
      await setDoc(doc(db, 'savedGames', docId), saveData);
      
      console.log('Game state saved successfully:', saveData);
      return true;
    } catch (error) {
      console.error('Error saving game state:', error);
      return false;
    }
  }

  async loadGameState(saveName = 'autosave') {
    try {
      await this.waitForInitialization();
      if (!this.isInitialized) {
        console.log('Firebase not initialized, cannot load game state');
        return null;
      }

      const docId = `${this.user.uid}_${saveName}`;
      const docSnap = await getDoc(doc(db, 'savedGames', docId));
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        console.log('Game state loaded successfully:', data);
        return data;
      } else {
        console.log('No saved game found with name:', saveName);
        return null;
      }
    } catch (error) {
      console.error('Error loading game state:', error);
      return null;
    }
  }

  async getSavedGames() {
    try {
      await this.waitForInitialization();
      if (!this.isInitialized) {
        console.log('Firebase not initialized, returning empty saved games list');
        return [];
      }

      const gamesQuery = query(
        collection(db, 'savedGames'),
        orderBy('timestamp', 'desc')
      );
      
      const querySnapshot = await getDocs(gamesQuery);
      const savedGames = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        // Only return saves for the current user, excluding autosaves
        if (data.userId === this.user.uid && data.saveName !== 'autosave') {
          savedGames.push({
            id: doc.id,
            saveName: data.saveName,
            score: data.score,
            round: data.round,
            timeLeft: data.timeLeft,
            timestamp: data.timestamp,
            date: data.date
          });
        }
      });
      
      console.log('Retrieved saved games:', savedGames);
      return savedGames;
    } catch (error) {
      console.error('Error getting saved games:', error);
      return [];
    }
  }

  async deleteSavedGame(saveName) {
    try {
      await this.waitForInitialization();
      if (!this.isInitialized) {
        console.log('Firebase not initialized, cannot delete saved game');
        return false;
      }

      const docId = `${this.user.uid}_${saveName}`;
      await deleteDoc(doc(db, 'savedGames', docId));
      
      console.log('Saved game deleted successfully:', saveName);
      return true;
    } catch (error) {
      console.error('Error deleting saved game:', error);
      return false;
    }
  }

  // Timeline/History Management
  async saveTimelineHistory(gameEvents, sessionName = null) {
    try {
      await this.waitForInitialization();
      if (!this.isInitialized) {
        console.log('Firebase not initialized, cannot save timeline history');
        return false;
      }

      const timestamp = new Date();
      const timelineData = {
        events: gameEvents,
        sessionName: sessionName || `Session_${timestamp.getTime()}`,
        userId: this.user.uid,
        timestamp: serverTimestamp(),
        date: timestamp.toISOString()
      };

      // Create a unique document ID for the timeline
      const docId = `${this.user.uid}_${timestamp.getTime()}`;
      await setDoc(doc(db, 'timelineHistories', docId), timelineData);
      
      console.log('Timeline history saved successfully:', timelineData);
      return true;
    } catch (error) {
      console.error('Error saving timeline history:', error);
      return false;
    }
  }

  async getTimelineHistories(limit_count = 20) {
    try {
      await this.waitForInitialization();
      if (!this.isInitialized) {
        console.log('Firebase not initialized, returning empty timeline histories');
        return [];
      }

      const timelineQuery = query(
        collection(db, 'timelineHistories'),
        orderBy('timestamp', 'desc'),
        limit(limit_count)
      );
      
      const querySnapshot = await getDocs(timelineQuery);
      const histories = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        // Only return histories for the current user
        if (data.userId === this.user.uid) {
          histories.push({
            id: doc.id,
            sessionName: data.sessionName,
            events: data.events,
            date: data.date,
            userId: data.userId
          });
        }
      });
      
      console.log('Retrieved timeline histories:', histories);
      return histories;
    } catch (error) {
      console.error('Error getting timeline histories:', error);
      return [];
    }
  }
}

export default FirebaseManager;
