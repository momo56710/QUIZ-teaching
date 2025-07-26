import { useState, useEffect, useCallback } from 'react';
import { Card, Button, Typography, Space, Radio, Progress } from 'antd';
import { 
  ClockCircleOutlined, 
  TrophyOutlined, 
  CheckCircleOutlined,
  CloseCircleOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router';
import { ref, onValue, set, update } from 'firebase/database';
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

export default function QuizPlay() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [currentQuiz, setCurrentQuiz] = useState<QuizSession | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [selectedPoints, setSelectedPoints] = useState<number | null>(null);
  const [usedPoints, setUsedPoints] = useState<number[]>([]);
  const [timeLeft, setTimeLeft] = useState(20);
  const [answers, setAnswers] = useState<QuizAnswer[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [playerScores, setPlayerScores] = useState<PlayerScore[]>([]);
  const [showAnswer, setShowAnswer] = useState(false);
  const [currentScore, setCurrentScore] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isRedirecting] = useState(false);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [maxPoints, setMaxPoints] = useState(0);

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
      
      // Set question index (currentQuestion 1 = index 0)
      if (quizData.currentQuestion >= 1) {
        setCurrentQuestionIndex(quizData.currentQuestion - 1);
      }
      
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
    if (isRedirecting || loading) return;

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
  }, [currentQuiz, user, loading, isRedirecting, navigate]);

  // Timer countdown
  useEffect(() => {
    if (!currentQuiz || timeLeft <= 0 || showAnswer || showResults) return;

    const timer = setTimeout(() => {
      setTimeLeft(timeLeft - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [timeLeft, currentQuiz, showAnswer, showResults]);

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

  const handleSubmitAnswer = useCallback(async () => {
    if (!user || selectedAnswer === null || !selectedPoints || !currentQuiz) return;

    const currentQuestion = getQuestion(currentQuiz.quizId, currentQuiz.language, currentQuestionIndex + 1);
    if (!currentQuestion) return;

    const isCorrect = selectedAnswer === currentQuestion.correctAnswer;
    const timeSpent = 20 - timeLeft;

    const answer: QuizAnswer = {
      questionId: currentQuestion.id,
      selectedAnswer,
      selectedPoints,
      isCorrect,
      timeSpent,
      timestamp: Date.now()
    };

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
      currentQuestion: currentQuestionIndex + 2,
      totalQuestions: totalQuestions,
      answers: newAnswers
    });

    setShowAnswer(true);
    
    setTimeout(async () => {
      setShowAnswer(false);
      
      if (currentQuestionIndex < totalQuestions - 1) {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
        setSelectedAnswer(null);
        setSelectedPoints(null);
        setTimeLeft(20);
      } else {
        const quizHistoryRef = ref(database, `quizHistory/${user.uid}/${currentQuiz.id}`);
        set(quizHistoryRef, {
          quizId: currentQuiz.id,
          language: currentQuiz.language,
          score: newScore,
          totalQuestions: totalQuestions,
          completedAt: Date.now(),
          answers: newAnswers
        });

        await update(playerScoreRef, {
          isFinished: true
        });
        
        setShowResults(true);
      }
    }, 3000);
  }, [user, selectedAnswer, selectedPoints, currentQuiz, currentQuestionIndex, timeLeft, answers, usedPoints, totalQuestions]);

  const handleTimeout = useCallback(async () => {
    if (!user || !currentQuiz) return;

    const currentQuestion = getQuestion(currentQuiz.quizId, currentQuiz.language, currentQuestionIndex + 1);
    if (!currentQuestion) return;

    const availablePoints = Array.from({ length: maxPoints }, (_, i) => i + 1).filter(p => !usedPoints.includes(p));
    const minPoints = availablePoints.length > 0 ? Math.min(...availablePoints) : 1;

    const answer: QuizAnswer = {
      questionId: currentQuestion.id,
      selectedAnswer: selectedAnswer || 0,
      selectedPoints: minPoints,
      isCorrect: false,
      timeSpent: 20,
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
      currentQuestion: currentQuestionIndex + 2,
      totalQuestions: totalQuestions,
      answers: newAnswers
    });

    setShowAnswer(true);
    
    setTimeout(async () => {
      setShowAnswer(false);
      
      if (currentQuestionIndex < totalQuestions - 1) {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
        setSelectedAnswer(null);
        setSelectedPoints(null);
        setTimeLeft(20);
      } else {
        const quizHistoryRef = ref(database, `quizHistory/${user.uid}/${currentQuiz.id}`);
        set(quizHistoryRef, {
          quizId: currentQuiz.id,
          language: currentQuiz.language,
          score: newScore,
          totalQuestions: totalQuestions,
          completedAt: Date.now(),
          answers: newAnswers
        });

        await update(playerScoreRef, {
          isFinished: true
        });
        
        setShowResults(true);
      }
    }, 3000);
  }, [user, currentQuiz, currentQuestionIndex, selectedAnswer, answers, usedPoints, maxPoints, totalQuestions]);

  const handlePointSelection = useCallback((points: number) => {
    if (!usedPoints.includes(points)) {
      setSelectedPoints(points);
    }
  }, [usedPoints]);

  const getAvailablePoints = useCallback(() => {
    return Array.from({ length: maxPoints }, (_, i) => i + 1).filter(p => !usedPoints.includes(p));
  }, [usedPoints, maxPoints]);

  const getLanguageName = useCallback((lang: string) => {
    switch (lang) {
      case 'en': return 'English';
      case 'fr': return 'Français';
      case 'ar': return 'العربية';
      default: return lang;
    }
  }, []);

  // Loading state
  if (loading) {
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

  const currentQuestion = getQuestion(currentQuiz.quizId, currentQuiz.language, currentQuestionIndex + 1);
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

  const progress = ((currentQuestionIndex + 1) / totalQuestions) * 100;

  // Show answer display
  if (showAnswer) {
    const lastAnswer = answers[answers.length - 1];
    const isCorrect = lastAnswer?.isCorrect;
    const isTimeout = lastAnswer?.timeSpent === 20 && !isCorrect;
    const correctAnswerText = currentQuestion.options[currentQuestion.correctAnswer];
    const selectedAnswerText = currentQuestion.options[lastAnswer?.selectedAnswer || 0];
    
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
                <Text>
                  {currentQuestion.explanation[currentQuiz.language]}
                </Text>
              </div>
            </Space>
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
                Question {currentQuestionIndex + 1} of {totalQuestions}
              </Title>
              <Text type="secondary">
                Language: {getLanguageName(currentQuiz.language)}
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
          <Title level={4} style={{ marginBottom: '16px' }}>
            {currentQuestion.question[currentQuiz.language]}
          </Title>

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