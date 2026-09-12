import webFundamentals from '../data/quizzes/web-fundamentals.json';
import htmlCssBasics from '../data/quizzes/html-css-basics.json';

export interface QuizQuestion {
  id: number;
  question: {
    en: string;
    fr: string;
    ar: string;
  };
  options: string[];
  correctAnswer: number;
  explanation: {
    en: string;
    fr: string;
    ar: string;
  };
}

export interface QuizData {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  language: string;
  questions: QuizQuestion[];
}

export interface PlayerAnswer {
  playerId: string;
  playerName: string;
  questionId: number;
  selectedAnswer: number;
  selectedPoints: number;
  isCorrect: boolean;
  timeSpent: number;
  timestamp: number;
}

export interface QuizSession {
  id: string;
  quizId: string;
  language: 'en' | 'fr' | 'ar';
  createdAt: number;
  currentQuestion: number;
  players: Record<string, any>;
  answers: PlayerAnswer[];
}

// Available quiz configurations
export const availableQuizzes = [
  {
    id: 'web-fundamentals',
    title: 'Web Development Fundamentals Quiz',
    description: 'Internet vs web, front end vs back end, HTML, CSS, JavaScript, the DOM, APIs, databases and Git.',
    category: 'Programming',
    difficulty: 'Easy' as const,
    languages: ['en', 'fr', 'ar']
  },
  {
    id: 'html-css-basics',
    title: 'HTML & CSS Basics Quiz',
    description: 'Document structure, semantic tags, tables and forms, colours and units, the box model, backgrounds and positioning.',
    category: 'Programming',
    difficulty: 'Medium' as const,
    languages: ['en', 'fr', 'ar']
  }
];

// Quiz data mapping - simplified to only track user answers
const quizData: Record<string, QuizData> = {
  'web-fundamentals': {
    ...webFundamentals,
    difficulty: 'Easy' as const
  },
  'html-css-basics': {
    ...htmlCssBasics,
    difficulty: 'Medium' as const
  }
};

export const getQuizData = (quizId: string, language: 'en' | 'fr' | 'ar'): QuizData => {
  const baseQuiz = quizData[quizId];
  if (!baseQuiz) {
    throw new Error(`Quiz with ID ${quizId} not found`);
  }

  return {
    ...baseQuiz,
    language
  };
};

export const getQuestion = (quizId: string, language: 'en' | 'fr' | 'ar', questionId: number): QuizQuestion | null => {
  const quiz = getQuizData(quizId, language);
  return quiz.questions.find(q => q.id === questionId) || null;
};

export const getTotalQuestions = (quizId: string, language: 'en' | 'fr' | 'ar'): number => {
  const quiz = getQuizData(quizId, language);
  return quiz.questions.length;
};

export const getMaxPoints = (quizId: string, language: 'en' | 'fr' | 'ar'): number => {
  // Return the number of questions as the maximum points
  // This allows users to choose from 1 to number of questions points per question
  const quiz = getQuizData(quizId, language);
  return quiz.questions.length;
};

export const validateAnswer = (quizId: string, language: 'en' | 'fr' | 'ar', questionId: number, selectedAnswer: number): boolean => {
  const question = getQuestion(quizId, language, questionId);
  return question ? question.correctAnswer === selectedAnswer : false;
};

export const getQuizTitle = (quizId: string, _language: 'en' | 'fr' | 'ar'): string => {
  const quiz = quizData[quizId];
  if (quiz) {
    return quiz.title;
  }
  
  // Fallback to availableQuizzes
  const availableQuiz = availableQuizzes.find(q => q.id === quizId);
  return availableQuiz ? availableQuiz.title : 'Unknown Quiz';
};

export const getQuizDescription = (quizId: string, _language: 'en' | 'fr' | 'ar'): string => {
  const quiz = quizData[quizId];
  return quiz ? quiz.description : 'No description available';
};

export const getAvailableQuizzes = () => {
  return availableQuizzes;
}; 