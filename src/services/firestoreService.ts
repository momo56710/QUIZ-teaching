import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  orderBy, 
  limit, 
  updateDoc, 
  where,
  addDoc,
  serverTimestamp
} from 'firebase/firestore';
import { firestore } from '../config/firebase';

export interface UserStats {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  totalPoints: number;
  quizCount: number;
  averageScore: number;
  lastQuizDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface QuizResult {
  id: string;
  quizId: string;
  userId: string;
  displayName: string;
  email: string;
  photoURL?: string;
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  timeSpent: number;
  completedAt: Date;
  createdAt: Date;
}

export interface LeaderboardEntry {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  totalPoints: number;
  quizCount: number;
  averageScore: number;
  rank: number;
}

// Save quiz result and update user stats
export const saveQuizResult = async (
  quizId: string,
  userId: string,
  displayName: string,
  email: string,
  photoURL: string | undefined,
  score: number,
  totalQuestions: number,
  correctAnswers: number,
  timeSpent: number
): Promise<void> => {
  try {
    const quizResult: Omit<QuizResult, 'id' | 'createdAt'> = {
      quizId,
      userId,
      displayName,
      email,
      photoURL,
      score,
      totalQuestions,
      correctAnswers,
      timeSpent,
      completedAt: new Date(),
    };

    // Save quiz result
    await addDoc(collection(firestore, 'quizResults'), {
      ...quizResult,
      createdAt: serverTimestamp(),
    });

    // Update or create user stats
    await updateUserStats(userId, displayName, email, photoURL, score);

    console.log('Quiz result saved and user stats updated successfully');
  } catch (error) {
    console.error('Error saving quiz result:', error);
    throw error;
  }
};

// Update user stats (create if doesn't exist)
export const updateUserStats = async (
  userId: string,
  displayName: string,
  email: string,
  photoURL: string | undefined,
  newScore: number
): Promise<void> => {
  try {
    const userRef = doc(firestore, 'users', userId);
    const userDoc = await getDoc(userRef);

    if (userDoc.exists()) {
      // Update existing user
      const currentData = userDoc.data() as UserStats;
      const newQuizCount = currentData.quizCount + 1;
      const newTotalPoints = currentData.totalPoints + newScore;
      const newAverageScore = Math.round(newTotalPoints / newQuizCount);

      await updateDoc(userRef, {
        totalPoints: newTotalPoints,
        quizCount: newQuizCount,
        averageScore: newAverageScore,
        lastQuizDate: new Date(),
        updatedAt: new Date(),
      });
    } else {
      // Create new user
      const newUser: Omit<UserStats, 'createdAt' | 'updatedAt'> = {
        uid: userId,
        displayName,
        email,
        photoURL,
        totalPoints: newScore,
        quizCount: 1,
        averageScore: newScore,
        lastQuizDate: new Date(),
      };

      await setDoc(userRef, {
        ...newUser,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
  } catch (error) {
    console.error('Error updating user stats:', error);
    throw error;
  }
};

// Get top 3 leaderboard
export const getTopLeaderboard = async (): Promise<LeaderboardEntry[]> => {
  try {
    const usersRef = collection(firestore, 'users');
    const q = query(usersRef, orderBy('totalPoints', 'desc'), limit(3));
    const querySnapshot = await getDocs(q);

    const leaderboard: LeaderboardEntry[] = [];
    let rank = 1;

    querySnapshot.forEach((doc) => {
      const data = doc.data() as UserStats;
      leaderboard.push({
        uid: data.uid,
        displayName: data.displayName,
        email: data.email,
        photoURL: data.photoURL,
        totalPoints: data.totalPoints,
        quizCount: data.quizCount,
        averageScore: data.averageScore,
        rank,
      });
      rank++;
    });

    return leaderboard;
  } catch (error) {
    console.error('Error getting leaderboard:', error);
    throw error;
  }
};

// Get user stats
export const getUserStats = async (userId: string): Promise<UserStats | null> => {
  try {
    const userRef = doc(firestore, 'users', userId);
    const userDoc = await getDoc(userRef);

    if (userDoc.exists()) {
      return userDoc.data() as UserStats;
    }

    return null;
  } catch (error) {
    console.error('Error getting user stats:', error);
    throw error;
  }
};

// Get user's quiz history
export const getUserQuizHistory = async (userId: string): Promise<QuizResult[]> => {
  try {
    const quizResultsRef = collection(firestore, 'quizResults');
    const q = query(
      quizResultsRef,
      where('userId', '==', userId),
      orderBy('completedAt', 'desc')
    );
    const querySnapshot = await getDocs(q);

    const history: QuizResult[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      history.push({
        id: doc.id,
        ...data,
        completedAt: data.completedAt.toDate(),
        createdAt: data.createdAt.toDate(),
      } as QuizResult);
    });

    return history;
  } catch (error) {
    console.error('Error getting user quiz history:', error);
    throw error;
  }
}; 