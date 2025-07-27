import { useState, useEffect, useCallback } from 'react';
import { Card, Button, Typography, Space, Radio, Progress, Divider } from 'antd';
import { 
  ClockCircleOutlined, 
  TrophyOutlined, 
  CheckCircleOutlined,
  CloseCircleOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router';
import { ref, onValue, update } from 'firebase/database';
import { database } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { getQuestion, getTotalQuestions, getMaxPoints } from '../services/quizService';
import 'react-toastify/dist/ReactToastify.css';
import 'antd/dist/reset.css';

const { Title, Text } = Typography;

interface QuizAnswer {
  questionId: number;
  selectedAnswer: number;
  selectedPoints: number;
  isCorrect: boolean;
  timeSpent: number;
  timestamp: number;
}

interface PlayerScore {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  score: number;
  currentQuestion: number;
  totalQuestions: number;
  answers: QuizAnswer[];
  isFinished?: boolean;
}

interface QuizSession {
  id: string;
  quizId: string;
  language: 'en' | 'fr' | 'ar';
  createdAt: number;
  currentQuestion: number;
  players: Record<string, any>;
  isStarted?: boolean;
  isFinished?: boolean;
}

const LANG_LABELS: Record<'en' | 'fr' | 'ar', string> = {
  en: 'English',
  fr: 'Français',
  ar: 'العربية'
};

export default function QuizPlay() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [currentQuiz, setCurrentQuiz] = useState<QuizSession | null>(null);
  const [currentQuestionNumber, setCurrentQuestionNumber] = useState(1); // Use question numbers (1, 2, 3...)
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [selectedPoints, setSelectedPoints] = useState<number | null>(null);
  const [usedPoints, setUsedPoints] = useState<number[]>([]);
  const [timeLeft, setTimeLeft] = useState(60);
  const [answers, setAnswers] = useState<QuizAnswer[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [playerScores, setPlayerScores] = useState<PlayerScore[]>([]);
  const [showAnswer, setShowAnswer] = useState(false);
  const [currentScore, setCurrentScore] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isRedirecting] = useState(false);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [maxPoints, setMaxPoints] = useState(0);
  const [stateRestored, setStateRestored] = useState(false);

  // Simplified quiz listener
  useEffect(() => {
    const quizRef = ref(database, 'currentQuiz');
    const unsubscribe = onValue(quizRef, (snapshot) => {
      const quizData = snapshot.val();
      
      if (!quizData) {
        setCurrentQuiz(null);
        setLoading(false);
        return;
      }

      setCurrentQuiz(quizData);
      
      // Get dynamic total questions and max points
      try {
        const total = getTotalQuestions(quizData.quizId, quizData.language);
        const max = getMaxPoints(quizData.quizId, quizData.language);
        setTotalQuestions(total);
        setMaxPoints(max);
      } catch (error) {
        console.error('Error getting quiz data:', error);
        setTotalQuestions(30); // fallback
        setMaxPoints(30); // fallback
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Simplified navigation logic
  useEffect(() => {
    if (isRedirecting || loading || !stateRestored) return;

    if (!currentQuiz) {
      navigate('/quiz/waiting');
      return;
    }

    if (!user) {
      navigate('/login');
      return;
    }

    // Check if user is joined to the quiz
    const isUserJoined = currentQuiz.players && currentQuiz.players[user.uid];
    
    if (!isUserJoined) {
      navigate('/quiz/waiting');
      return;
    }

    // Check if quiz is finished
    if (currentQuiz.isFinished) {
      setShowResults(true);
      return;
    }

    // Check if quiz was restarted (reset to question 1 and no players)
    if (currentQuiz.currentQuestion === 1 && 
        (!currentQuiz.players || Object.keys(currentQuiz.players).length === 0)) {
      navigate('/quiz/waiting');
      return;
    }

    // Don't navigate away if user is in the middle of an answer or results
    if (showAnswer || showResults) {
      return;
    }
  }, [currentQuiz, user, loading, isRedirecting, navigate, showAnswer, showResults]);

  // Timer countdown
  useEffect(() => {
    if (!currentQuiz || timeLeft <= 0 || showAnswer || showResults) return;

    const timer = setTimeout(() => {
      setTimeLeft(timeLeft - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [timeLeft, currentQuiz, showAnswer, showResults]);

  // Initialize timer when question changes
  useEffect(() => {
    if (!currentQuiz || showAnswer || showResults) return;
    
    // Reset timer when question changes (but not during state restoration)
    if (!showAnswer && stateRestored) {
      setTimeLeft(60);
    }
  }, [currentQuestionNumber, currentQuiz, showAnswer, showResults, stateRestored]);

  // Handle timeout
  useEffect(() => {
    if (timeLeft === 0 && !showAnswer && !showResults) {
      handleTimeout();
    }
  }, [timeLeft, showAnswer, showResults]);

  // Listen to player scores
  useEffect(() => {
    if (!currentQuiz?.id) return;

    const scoresRef = ref(database, `quizScores/${currentQuiz.id}`);
    const unsubscribe = onValue(scoresRef, (snapshot) => {
      const scores: PlayerScore[] = [];
      snapshot.forEach((childSnapshot) => {
        scores.push({
          uid: childSnapshot.key!,
          ...childSnapshot.val()
        });
      });
      setPlayerScores(scores.sort((a, b) => b.score - a.score));
    });

    return () => unsubscribe();
  }, [currentQuiz?.id]);

  // Restore user state on page refresh
  useEffect(() => {
    if (!currentQuiz?.id || !user?.uid) return;

    const playerScoreRef = ref(database, `quizScores/${currentQuiz.id}/${user.uid}`);
    const unsubscribe = onValue(playerScoreRef, (snapshot) => {
      const playerData = snapshot.val();
      
      if (playerData) {
        // Restore user's progress
        setCurrentScore(playerData.score || 0);
        setAnswers(playerData.answers || []);
        setUsedPoints(playerData.answers?.map((ans: QuizAnswer) => ans.selectedPoints) || []);
        
        // Check if user has finished the quiz
        if (playerData.isFinished) {
          setShowResults(true);
          setStateRestored(true);
          return;
        }
        
        // Restore current question number
        const userCurrentQuestion = playerData.currentQuestion || 1;
        setCurrentQuestionNumber(userCurrentQuestion);
        
        // Reset timer for the current question
        setTimeLeft(60);
        
        // If user is on a question that should show answer, restore that state
        if (playerData.answers && playerData.answers.length > 0) {
          const lastAnswer = playerData.answers[playerData.answers.length - 1];
          
          // Check if we should show answer state
          // If the last answer is for the current question, show the answer
          if (lastAnswer.questionId === userCurrentQuestion) {
            setShowAnswer(true);
          }
        }
        
        // Reset selected answer and points for current question
        setSelectedAnswer(null);
        setSelectedPoints(null);
        
        setStateRestored(true);
      } else {
        // No existing data, user is starting fresh - start from quiz's current question
        const quizCurrentQuestion = currentQuiz.currentQuestion || 1;
        setCurrentQuestionNumber(quizCurrentQuestion);
        setTimeLeft(60);
        setStateRestored(true);
      }
    });

    return () => unsubscribe();
  }, [currentQuiz?.id, user?.uid, currentQuiz?.currentQuestion]);

  // Fallback: Set stateRestored to true if no quiz data after a delay
  useEffect(() => {
    if (!currentQuiz?.id || !user?.uid) {
      // If no quiz or user, set stateRestored to true after a short delay
      const timer = setTimeout(() => {
        setStateRestored(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [currentQuiz?.id, user?.uid]);

  // Additional fallback: Set stateRestored to true after a maximum delay
  useEffect(() => {
    const maxDelayTimer = setTimeout(() => {
      setStateRestored(true);
    }, 3000); // 3 seconds maximum wait time

    return () => clearTimeout(maxDelayTimer);
  }, []);

  // Debug: Log state changes for troubleshooting
  useEffect(() => {
    if (stateRestored && currentQuiz && user) {
      console.log('Quiz State:', {
        currentQuestionNumber,
        totalQuestions,
        showAnswer,
        showResults,
        answersCount: answers.length,
        lastAnswerId: answers.length > 0 ? answers[answers.length - 1]?.questionId : null
      });
    }
  }, [stateRestored, currentQuestionNumber, totalQuestions, showAnswer, showResults, answers.length, currentQuiz, user]);

  const handleSubmitAnswer = useCallback(async () => {
    if (!user || selectedAnswer === null || !selectedPoints || !currentQuiz) return;

    const currentQuestion = getQuestion(currentQuiz.quizId, currentQuiz.language, currentQuestionNumber);
    if (!currentQuestion) return;

    const isCorrect = selectedAnswer === currentQuestion.correctAnswer;
    const timeSpent = 60 - timeLeft;

    const answer: QuizAnswer = {
      questionId: currentQuestionNumber, // Use question number directly
      selectedAnswer,
      selectedPoints,
      isCorrect,
      timeSpent,
      timestamp: Date.now()
    };

    console.log('Submitting answer:', {
      questionId: answer.questionId,
      currentQuestionNumber,
      stayingOnSameQuestion: true
    });

    const newAnswers = [...answers, answer];
    setAnswers(newAnswers);
    setUsedPoints([...usedPoints, selectedPoints]);

    const newScore = newAnswers.reduce((total, ans) => total + (ans.isCorrect ? ans.selectedPoints : 0), 0);
    setCurrentScore(newScore);

    const playerScoreRef = ref(database, `quizScores/${currentQuiz.id}/${user.uid}`);
    
    await update(playerScoreRef, {
      displayName: user.displayName,
      email: user.email,
      photoURL: user.photoURL,
      score: newScore,
      currentQuestion: currentQuestionNumber, // Keep same question number
      totalQuestions: totalQuestions,
      answers: newAnswers
    });

    setShowAnswer(true);
  }, [user, selectedAnswer, selectedPoints, currentQuiz, currentQuestionNumber, timeLeft, answers, usedPoints, totalQuestions]);

  const handleTimeout = useCallback(async () => {
    if (!user || !currentQuiz) return;

    const currentQuestion = getQuestion(currentQuiz.quizId, currentQuiz.language, currentQuestionNumber);
    if (!currentQuestion) return;

    const availablePoints = Array.from({ length: maxPoints }, (_, i) => i + 1).filter(p => !usedPoints.includes(p));
    const minPoints = availablePoints.length > 0 ? Math.min(...availablePoints) : 1;

    const answer: QuizAnswer = {
      questionId: currentQuestionNumber, // Use question number directly
      selectedAnswer: selectedAnswer || 0,
      selectedPoints: minPoints,
      isCorrect: false,
      timeSpent: 60,
      timestamp: Date.now()
    };

    const newAnswers = [...answers, answer];
    setAnswers(newAnswers);
    setUsedPoints([...usedPoints, minPoints]);

    const newScore = newAnswers.reduce((total, ans) => total + (ans.isCorrect ? ans.selectedPoints : 0), 0);
    setCurrentScore(newScore);

    const playerScoreRef = ref(database, `quizScores/${currentQuiz.id}/${user.uid}`);
    
    await update(playerScoreRef, {
      displayName: user.displayName,
      email: user.email,
      photoURL: user.photoURL,
      score: newScore,
      currentQuestion: currentQuestionNumber, // Keep same question number
      totalQuestions: totalQuestions,
      answers: newAnswers
    });

    setShowAnswer(true);
  }, [user, currentQuiz, currentQuestionNumber, selectedAnswer, answers, usedPoints, maxPoints, totalQuestions]);

  const handlePointSelection = useCallback((points: number) => {
    if (!usedPoints.includes(points)) {
      setSelectedPoints(points);
    }
  }, [usedPoints]);

  const getAvailablePoints = useCallback(() => {
    return Array.from({ length: maxPoints }, (_, i) => i + 1).filter(p => !usedPoints.includes(p));
  }, [usedPoints, maxPoints]);

  const handleNextQuestion = useCallback(async () => {
    if (!user || !currentQuiz) return;

    if (currentQuestionNumber < totalQuestions) {
      const nextQuestionNumber = currentQuestionNumber + 1;
      
      // Update local state
      setCurrentQuestionNumber(nextQuestionNumber);
      setSelectedAnswer(null);
      setSelectedPoints(null);
      setTimeLeft(60);
      setShowAnswer(false);
      
      // Update user's current question in Firebase
      const playerScoreRef = ref(database, `quizScores/${currentQuiz.id}/${user.uid}`);
      await update(playerScoreRef, {
        currentQuestion: nextQuestionNumber
      });
    } else {
      // Quiz completed
      const playerScoreRef = ref(database, `quizScores/${currentQuiz.id}/${user.uid}`);
      await update(playerScoreRef, {
        isFinished: true
      });
      
      setShowAnswer(false);
      setShowResults(true);
    }
  }, [user, currentQuiz, currentQuestionNumber, totalQuestions, currentScore, answers]);

  // Loading state
  if (loading || !stateRestored) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        background: '#f0f2f5'
      }}>
        <Card>
          <Space direction="vertical" align="center">
            <Title level={3}>Loading Quiz...</Title>
          </Space>
        </Card>
      </div>
    );
  }

  // No quiz available
  if (!currentQuiz) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        background: '#f0f2f5'
      }}>
        <Card>
          <Space direction="vertical" align="center">
            <Title level={3}>No Quiz Available</Title>
            <Button type="primary" onClick={() => navigate('/quiz/waiting')}>
              Back to Waiting Room
            </Button>
          </Space>
        </Card>
      </div>
    );
  }

  // User not joined
  const isUserJoined = currentQuiz.players && user?.uid && currentQuiz.players[user.uid];
  if (!isUserJoined) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        background: '#f0f2f5'
      }}>
        <Card>
          <Space direction="vertical" align="center">
            <Title level={3}>Not Joined to Quiz</Title>
            <Text type="secondary">You need to join the quiz first.</Text>
            <Button type="primary" onClick={() => navigate('/quiz/waiting')}>
              Back to Waiting Room
            </Button>
          </Space>
        </Card>
      </div>
    );
  }

  const currentQuestion = getQuestion(currentQuiz.quizId, currentQuiz.language, currentQuestionNumber);
  if (!currentQuestion) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        background: '#f0f2f5'
      }}>
        <Card>
          <Space direction="vertical" align="center">
            <Title level={3}>Question Not Found</Title>
            <Button type="primary" onClick={() => navigate('/quiz/waiting')}>
              Back to Waiting Room
            </Button>
          </Space>
        </Card>
      </div>
    );
  }

  const progress = (currentQuestionNumber / totalQuestions) * 100;

  // Show answer display
  if (showAnswer) {
    const lastAnswer = answers[answers.length - 1];
    const isCorrect = lastAnswer?.isCorrect;
    const isTimeout = lastAnswer?.timeSpent === 60 && !isCorrect;
    const correctAnswerText = currentQuestion.options[currentQuestion.correctAnswer];
    const selectedAnswerText = currentQuestion.options[lastAnswer?.selectedAnswer || 0];

    // Show explanation in all three languages, each on its own line, Arabic right-aligned
    const explanation = currentQuestion.explanation || {};

    return (
      <div style={{ padding: '16px', background: '#f0f2f5', minHeight: '100vh' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <Card>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              {isCorrect ? (
                <CheckCircleOutlined style={{ fontSize: '64px', color: '#52c41a', marginBottom: '16px' }} />
              ) : isTimeout ? (
                <ClockCircleOutlined style={{ fontSize: '64px', color: '#faad14', marginBottom: '16px' }} />
              ) : (
                <CloseCircleOutlined style={{ fontSize: '64px', color: '#ff4d4f', marginBottom: '16px' }} />
              )}
              <Title level={2}>
                {isCorrect ? 'Correct!' : isTimeout ? 'Time Out!' : 'Incorrect!'}
              </Title>
            </div>

            <Space direction="vertical" style={{ width: '100%' }}>
              {isTimeout ? (
                <div>
                  <Text strong>Status: </Text>
                  <Text style={{ color: '#faad14' }}>
                    Time ran out! You didn't answer in time.
                  </Text>
                </div>
              ) : (
                <div>
                  <Text strong>Your Answer: </Text>
                  <Text style={{ color: isCorrect ? '#52c41a' : '#ff4d4f' }}>
                    {selectedAnswerText}
                  </Text>
                </div>
              )}
              {!isCorrect && (
                <div>
                  <Text strong>Correct Answer: </Text>
                  <Text style={{ color: '#52c41a' }}>
                    {correctAnswerText}
                  </Text>
                </div>
              )}
              <div>
                <Text strong>Points: </Text>
                <Text style={{ color: isCorrect ? '#52c41a' : '#ff4d4f' }}>
                  {isCorrect ? `+${lastAnswer?.selectedPoints}` : `-${lastAnswer?.selectedPoints}`}
                </Text>
              </div>
              <div>
                <Text strong>Current Score: </Text>
                <Text strong style={{ color: '#52c41a' }}>
                  {currentScore} points
                </Text>
              </div>
              <div>
                <Text strong>Explanation: </Text>
                <div style={{ marginTop: 8 }}>
                  <div>
                    <Text strong style={{ fontSize: 14 }}>{explanation['en']}</Text>
                    <span style={{ marginLeft: 8, color: '#888' }}>({LANG_LABELS.en})</span>
                  </div>
                  <div>
                    <Text strong style={{ fontSize: 14 }}>{explanation['fr']}</Text>
                    <span style={{ marginLeft: 8, color: '#888' }}>({LANG_LABELS.fr})</span>
                  </div>
                  <div style={{ textAlign: 'right', direction: 'rtl' }}>
                    <Text strong style={{ fontSize: 14 }}>{explanation['ar']}</Text>
                    <span style={{ marginRight: 8, color: '#888', direction: 'ltr' }}>({LANG_LABELS.ar})</span>
                  </div>
                </div>
              </div>
            </Space>

            {/* Next Question Button */}
            <div style={{ textAlign: 'center', marginTop: '24px' }}>
              <Button 
                type="primary" 
                size="large"
                onClick={handleNextQuestion}
              >
                {currentQuestionNumber < totalQuestions ? 'Next Question' : 'Finish Quiz'}
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // Show results
  if (showResults) {
    return (
      <div style={{ padding: '16px', background: '#f0f2f5', minHeight: '100vh' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <Card>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <TrophyOutlined style={{ fontSize: '64px', color: '#faad14', marginBottom: '16px' }} />
              <Title level={2}>Quiz Completed!</Title>
              <Title level={3} style={{ color: '#52c41a' }}>
                Final Score: {currentScore} points
              </Title>
            </div>

            <Space direction="vertical" style={{ width: '100%' }}>
              <div>
                <Text strong>Performance: </Text>
                <Text>
                  {Math.round((currentScore / (totalQuestions * (maxPoints + 1) / 2)) * 100)}% 
                  ({currentScore} out of {totalQuestions * (maxPoints + 1) / 2} possible points)
                </Text>
              </div>
              
              {playerScores.length > 0 && (
                <div>
                  <Title level={4}>Leaderboard</Title>
                  <Space direction="vertical" style={{ width: '100%' }}>
                    {playerScores.slice(0, 5).map((player, index) => (
                      <div 
                        key={player.uid}
                        style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center',
                          padding: '8px',
                          background: player.uid === user?.uid ? '#f6ffed' : '#fafafa',
                          borderRadius: '4px'
                        }}
                      >
                        <Space>
                          <Text strong>#{index + 1}</Text>
                          <Text>{player.displayName}</Text>
                          {player.uid === user?.uid && <Text type="secondary">(You)</Text>}
                        </Space>
                        <Text strong style={{ color: '#52c41a' }}>
                          {player.score} pts
                        </Text>
                      </div>
                    ))}
                  </Space>
                </div>
              )}
            </Space>

            <div style={{ textAlign: 'center', marginTop: '24px' }}>
              <Text type="secondary">
                Waiting for admin to restart the quiz...
              </Text>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // Main quiz interface
  return (
    <div style={{ 
      padding: window.innerWidth <= 768 ? '8px' : '16px', 
      background: '#f0f2f5', 
      minHeight: '100vh' 
    }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        {/* Header */}
        <Card style={{ marginBottom: '16px' }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            flexDirection: window.innerWidth <= 768 ? 'column' : 'row',
            gap: window.innerWidth <= 768 ? '8px' : '0'
          }}>
            <div>
              <Title level={3} style={{ margin: 0 }}>
                Question {currentQuestionNumber} of {totalQuestions}
              </Title>
              <Text type="secondary">
                Language: {currentQuiz.language}
              </Text>
            </div>
            <div style={{ textAlign: window.innerWidth <= 768 ? 'center' : 'right' }}>
              <Title level={3} style={{ margin: 0, color: '#52c41a' }}>
                Score: {currentScore}
              </Title>
              <Space>
                <ClockCircleOutlined />
                <Text strong style={{ color: timeLeft <= 10 ? '#ff4d4f' : '#1890ff' }}>
                  {timeLeft}s
                </Text>
              </Space>
            </div>
          </div>
          
          <Progress 
            percent={progress} 
            status="active" 
            style={{ marginTop: '16px' }}
          />
        </Card>

        {/* Question Card */}
        <Card style={{ marginBottom: '16px' }}>
          <div>
            {/* Show the question in three languages, each on its own line, Arabic right-aligned */}
            <div style={{ marginBottom: 16 }}>
              <div>
                <Text strong style={{ fontSize: 16 }}>{currentQuestion.question['en']}</Text>
                <span style={{ marginLeft: 8, color: '#888' }}>({LANG_LABELS.en})</span>
              </div>
              <div>
                <Text strong style={{ fontSize: 16 }}>{currentQuestion.question['fr']}</Text>
                <span style={{ marginLeft: 8, color: '#888' }}>({LANG_LABELS.fr})</span>
              </div>
              <div style={{ textAlign: 'right', direction: 'rtl' }}>
                <Text strong style={{ fontSize: 16 }}>{currentQuestion.question['ar']}</Text>
                <span style={{ marginRight: 8, color: '#888', direction: 'ltr' }}>({LANG_LABELS.ar})</span>
              </div>
            </div>
            <Divider style={{ margin: '12px 0' }} />
            {/* Show the options only once, as a vertical radio group */}
            <Radio.Group 
              value={selectedAnswer} 
              onChange={(e) => setSelectedAnswer(e.target.value)}
              style={{ width: '100%' }}
            >
              <Space direction="vertical" style={{ width: '100%' }}>
                {currentQuestion.options.map((option, index) => (
                  <Radio 
                    key={index} 
                    value={index}
                    style={{ 
                      display: 'block',
                      padding: '12px',
                      border: '1px solid #d9d9d9',
                      borderRadius: '8px',
                      marginBottom: '8px',
                      width: '100%'
                    }}
                  >
                    {option}
                  </Radio>
                ))}
              </Space>
            </Radio.Group>
          </div>
        </Card>

        {/* Points Selection */}
        <Card style={{ marginBottom: '16px' }}>
          <Title level={4} style={{ marginBottom: '16px' }}>
            Select Points (1-{maxPoints})
          </Title>
          <Text type="secondary" style={{ display: 'block', marginBottom: '16px' }}>
            Choose how many points to wager on this question. Each point value can only be used once.
          </Text>
          
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {getAvailablePoints().map((points) => (
              <Button
                key={points}
                type={selectedPoints === points ? 'primary' : 'default'}
                onClick={() => handlePointSelection(points)}
                style={{ minWidth: '40px' }}
              >
                {points}
              </Button>
            ))}
          </div>
          
          {selectedPoints && (
            <div style={{ marginTop: '16px' }}>
              <Text strong>Selected Points: </Text>
              <Text style={{ color: '#1890ff' }}>{selectedPoints}</Text>
            </div>
          )}
        </Card>

        {/* Submit Button */}
        <Card>
          <Button 
            type="primary" 
            size="large"
            disabled={selectedAnswer === null || selectedPoints === null}
            onClick={handleSubmitAnswer}
            style={{ width: '100%' }}
          >
            Submit Answer
          </Button>
        </Card>
      </div>
    </div>
  );
}