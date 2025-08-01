import webDevelopment from '../data/quizzes/web-development-en.json';
import tst from '../data/quizzes/tst.json';
import expressBackend from '../data/quizzes/express-backend-quiz.json';
import mongooseMongoDB from '../data/quizzes/mongoose-mongodb-quiz.json';
import expressMongoose from '../data/quizzes/express-mongoose-quiz.json';
import jwtAuthentication from '../data/quizzes/JWT-token-quiz.json';
import backendTechnologies from '../data/quizzes/backend-technologies-quiz.json';
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
    id: 'web-development',
    title: 'Web Development Quiz',
    description: 'Test your knowledge of HTML, CSS, JavaScript, and modern web technologies',
    category: 'Programming',
    difficulty: 'Medium' as const,
    languages: ['en', 'fr', 'ar']
  },
  {
    id: 'tst',
    title: 'TST',
    description: 'Test your knowledge of TST',
    category: 'Programming',
    difficulty: 'Medium' as const,
    languages: ['en', 'fr', 'ar']
  },
  {
    id: 'express-backend-development',
    title: 'Express.js Backend Development Quiz',
    description: 'Test your knowledge of Express.js, Node.js, API development, and backend file structure',
    category: 'Backend Development',
    difficulty: 'Medium' as const,
    languages: ['en', 'fr', 'ar']
  },
  {
    id: 'mongoose-mongodb-development',
    title: 'Mongoose & MongoDB Development Quiz',
    description: 'Test your knowledge of Mongoose ODM, MongoDB, database modeling, and NoSQL development',
    category: 'Database Development',
    difficulty: 'Medium' as const,
    languages: ['en', 'fr', 'ar']
  },
  {
    id: 'express-mongoose-development',
    title: 'Express.js & Mongoose Development Quiz',
    description: 'Test your knowledge of Express.js, Mongoose, and e-commerce API development',
    category: 'Backend Development',
    difficulty: 'Medium' as const,
    languages: ['en', 'fr', 'ar']
  },
  {
    id: 'jwt-authentication',
    title: 'JWT Authentication Quiz',
    description: 'Test your knowledge of JWT authentication and authorization concepts',
    category: 'Authentication & Authorization',
    difficulty: 'Medium' as const,
    languages: ['en', 'fr', 'ar']
  },
  {
    id: 'backend-technologies',
    title: 'Backend Technologies Quiz',
    description: 'Test your knowledge of Multer, JWT, Mongoose, and Express',
    category: 'Backend Development',
    difficulty: 'Medium' as const,
    languages: ['en', 'fr', 'ar']
  }
];

// Quiz data mapping - simplified to only track user answers
const quizData: Record<string, QuizData> = {
  'web-development': {
    ...webDevelopment,
    difficulty: 'Medium' as const
  },
  'tst': {
    ...tst,
    difficulty: 'Medium' as const
  },
  'express-backend-development': {
    ...expressBackend,
    difficulty: 'Medium' as const
  },
  'mongoose-mongodb-development': {
    ...mongooseMongoDB,
    difficulty: 'Medium' as const
  },
  'express-mongoose-development': {
    ...expressMongoose,
    difficulty: 'Medium' as const
  },
  'jwt-authentication': {
    ...jwtAuthentication,
    difficulty: 'Medium' as const
  },
  'backend-technologies': {
    ...backendTechnologies,
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