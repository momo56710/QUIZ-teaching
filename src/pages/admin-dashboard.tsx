import { useState, useEffect } from 'react';
import { Card, Button, Typography, Space, Alert, Avatar,Table, Tag, Modal, Select, Divider, Badge } from 'antd';
import { 
  UserOutlined, 
  PlayCircleOutlined, 
  StopOutlined,
  ReloadOutlined,
  SettingOutlined,
  TrophyOutlined,
  TeamOutlined,
  HourglassOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router';
import { ref, onValue, set, update, remove } from 'firebase/database';
import { database } from '../config/firebase';
import { toast } from 'react-toastify';
import { getAvailableQuizzes, getTotalQuestions, getMaxPoints } from '../services/quizService';
import 'react-toastify/dist/ReactToastify.css';
import 'antd/dist/reset.css';

const { Title, Text } = Typography;
const { Option } = Select;

interface WaitlistUser {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  joinedAt: number;
}

interface PlayerScore {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  score: number;
  currentQuestion: number;
  totalQuestions: number;
  answers: any[];
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

export default function AdminDashboard() {
  const [currentQuiz, setCurrentQuiz] = useState<QuizSession | null>(null);
  const [playerScores, setPlayerScores] = useState<PlayerScore[]>([]);
  const [waitlistUsers, setWaitlistUsers] = useState<WaitlistUser[]>([]);
  const [allPlayersFinished, setAllPlayersFinished] = useState(false);
  const [isChangeQuizModalVisible, setIsChangeQuizModalVisible] = useState(false);
  const [selectedQuizId, setSelectedQuizId] = useState<string>('');
  const [selectedLanguage, setSelectedLanguage] = useState<'en' | 'fr' | 'ar'>('en');
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [maxPoints, setMaxPoints] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const navigate = useNavigate();

  // Check if user is admin
  useEffect(() => {
    const adminSession = localStorage.getItem('adminSession');
    if (!adminSession) {
      navigate('/admin/login');
      return;
    }

    try {
      const session = JSON.parse(adminSession);
      if (!session.isAdmin || Date.now() - session.timestamp > 24 * 60 * 60 * 1000) {
        localStorage.removeItem('adminSession');
        navigate('/admin/login');
        return;
      }
      setIsAdmin(true);
    } catch (error) {
      localStorage.removeItem('adminSession');
      navigate('/admin/login');
    }
  }, [navigate]);

  // Listen to admin session in Firebase
  useEffect(() => {
    if (!isAdmin) return;

    const adminSessionRef = ref(database, 'adminSession');
    const adminData = {
      isAdmin: true,
      email: 'admin@quiz.com',
      lastSeen: Date.now()
    };
    set(adminSessionRef, adminData);

    // Update lastSeen every 30 seconds
    const interval = setInterval(() => {
      update(adminSessionRef, { lastSeen: Date.now() });
    }, 30000);

    return () => {
      clearInterval(interval);
      remove(adminSessionRef);
    };
  }, [isAdmin]);

  // Listen to current quiz
  useEffect(() => {
    const quizRef = ref(database, 'currentQuiz');
    const unsubscribe = onValue(quizRef, (snapshot) => {
      const quizData = snapshot.val();
      setCurrentQuiz(quizData);
      
      if (quizData) {
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
      }
    });

    return () => unsubscribe();
  }, []);

  // Listen to waitlist
  useEffect(() => {
    if (!currentQuiz?.id) {
      setWaitlistUsers([]);
      return;
    }

    const waitlistRef = ref(database, `waitlist/${currentQuiz.id}`);
    const unsubscribe = onValue(waitlistRef, (snapshot) => {
      const waitlist: WaitlistUser[] = [];
      snapshot.forEach((childSnapshot) => {
        waitlist.push({
          uid: childSnapshot.key!,
          ...childSnapshot.val()
        });
      });
      setWaitlistUsers(waitlist);
    });

    return () => unsubscribe();
  }, [currentQuiz?.id]);

  // Listen to player scores
  useEffect(() => {
    if (!currentQuiz?.id) {
      setPlayerScores([]);
      setAllPlayersFinished(false);
      return;
    }

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
      
      // Check if all players have finished
      const allFinished = scores.length > 0 && scores.every(player => 
        player.isFinished || player.currentQuestion > totalQuestions
      );
      setAllPlayersFinished(allFinished);
    });

    return () => unsubscribe();
  }, [currentQuiz?.id, totalQuestions]);

  const handleLogout = () => {
    localStorage.removeItem('adminSession');
    navigate('/admin/login');
  };

  const handleCreateQuiz = async () => {
    const quizId = 'web-development'; // Default quiz
    const language = 'en'; // Default language
    
    const quizData = {
      id: `quiz_${Date.now()}`,
      quizId,
      language,
      createdAt: Date.now(),
      currentQuestion: 1,
      players: {},
      isStarted: false,
      isFinished: false
    };

    await set(ref(database, 'currentQuiz'), quizData);
    toast.success('Quiz created successfully!');
  };

  const handleStartQuiz = async () => {
    if (!currentQuiz) return;

    await update(ref(database, 'currentQuiz'), {
      currentQuestion: 1,
      isStarted: true
    });

    // Move all waitlist users to players
    if (waitlistUsers.length > 0) {
      const updates: any = {};
      waitlistUsers.forEach(waitlistUser => {
        updates[`currentQuiz/players/${waitlistUser.uid}`] = {
          uid: waitlistUser.uid,
          displayName: waitlistUser.displayName,
          email: waitlistUser.email,
          photoURL: waitlistUser.photoURL,
          joinedAt: Date.now(),
          currentQuestion: 1,
          score: 0,
          usedPoints: []
        };
      });
      await update(ref(database), updates);
      
      // Clear waitlist
      await remove(ref(database, `waitlist/${currentQuiz.id}`));
    }

    toast.success('Quiz started! All waitlist users have been added to the quiz.');
  };

  const handleStopQuiz = async () => {
    if (!currentQuiz) return;

    await update(ref(database, 'currentQuiz'), {
      isFinished: true
    });

    toast.success('Quiz stopped!');
  };

  const handleRestartQuiz = async () => {
    if (!currentQuiz) return;

    // Clear all quiz data
    await remove(ref(database, 'currentQuiz'));
    await remove(ref(database, `quizScores/${currentQuiz.id}`));
    await remove(ref(database, `waitlist/${currentQuiz.id}`));

    toast.success('Quiz restarted! All players have been removed.');
  };

  const handleChangeQuiz = async () => {
    if (!currentQuiz || !selectedQuizId || !selectedLanguage) return;

    await update(ref(database, 'currentQuiz'), {
      quizId: selectedQuizId,
      language: selectedLanguage,
      currentQuestion: 1,
      isStarted: false,
      isFinished: false
    });

    // Clear players, scores, and waitlist
    await remove(ref(database, `currentQuiz/players`));
    await remove(ref(database, `quizScores/${currentQuiz.id}`));
    await remove(ref(database, `waitlist/${currentQuiz.id}`));

    setIsChangeQuizModalVisible(false);
    setSelectedQuizId('');
    setSelectedLanguage('en');
    toast.success('Quiz changed successfully!');
  };

  const handleAddFromWaitlist = async (waitlistUser: WaitlistUser) => {
    if (!currentQuiz) return;

    // Add to players
    await set(ref(database, `currentQuiz/players/${waitlistUser.uid}`), {
      uid: waitlistUser.uid,
      displayName: waitlistUser.displayName,
      email: waitlistUser.email,
      photoURL: waitlistUser.photoURL,
      joinedAt: Date.now(),
      currentQuestion: currentQuiz.currentQuestion,
      score: 0,
      usedPoints: []
    });

    // Remove from waitlist
    await remove(ref(database, `waitlist/${currentQuiz.id}/${waitlistUser.uid}`));

    toast.success(`${waitlistUser.displayName} added to the quiz!`);
  };

  const availableQuizzes = getAvailableQuizzes();

  const scoreColumns = [
    {
      title: 'Rank',
      key: 'rank',
      render: (_: any, __: any, index: number) => index + 1,
    },
    {
      title: 'Player',
      key: 'player',
      render: (player: PlayerScore) => (
        <Space>
          <Avatar src={player.photoURL} icon={<UserOutlined />} />
          <div>
            <div>{player.displayName}</div>
            <Text type="secondary">{player.email}</Text>
          </div>
        </Space>
      ),
    },
    {
      title: 'Score',
      key: 'score',
      render: (player: PlayerScore) => (
        <Text strong style={{ color: '#52c41a' }}>
          {player.score} pts
        </Text>
      ),
    },
    {
      title: 'Progress',
      key: 'progress',
      render: (player: PlayerScore) => (
        <Space direction="vertical" style={{ width: '100%' }}>
          <Text>
            Question {player.currentQuestion} of {totalQuestions}
          </Text>
          <div style={{ width: '100px' }}>
            <div style={{ 
              width: `${(player.currentQuestion / totalQuestions) * 100}%`, 
              height: '4px', 
              background: '#52c41a',
              borderRadius: '2px'
            }} />
          </div>
        </Space>
      ),
    },
    {
      title: 'Status',
      key: 'status',
      render: (player: PlayerScore) => (
        <Tag color={player.isFinished ? 'green' : 'blue'}>
          {player.isFinished ? 'Finished' : 'Playing'}
        </Tag>
      ),
    },
  ];

  const waitlistColumns = [
    {
      title: 'Player',
      key: 'player',
      render: (waitlistUser: WaitlistUser) => (
        <Space>
          <Avatar src={waitlistUser.photoURL} icon={<UserOutlined />} />
          <div>
            <div>{waitlistUser.displayName}</div>
            <Text type="secondary">{waitlistUser.email}</Text>
          </div>
        </Space>
      ),
    },
    {
      title: 'Waiting Since',
      key: 'joinedAt',
      render: (waitlistUser: WaitlistUser) => (
        <Text>{new Date(waitlistUser.joinedAt).toLocaleTimeString()}</Text>
      ),
    },
    {
      title: 'Action',
      key: 'action',
      render: (waitlistUser: WaitlistUser) => (
        <Button 
          type="primary" 
          size="small"
          onClick={() => handleAddFromWaitlist(waitlistUser)}
        >
          Add to Quiz
        </Button>
      ),
    },
  ];

  if (!isAdmin) {
    return null;
  }

  return (
    <div style={{ padding: '24px', background: '#f0f2f5', minHeight: '100vh' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <Card style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <Title level={2} style={{ margin: 0 }}>
                <TrophyOutlined style={{ marginRight: '8px', color: '#faad14' }} />
                Admin Dashboard
              </Title>
              <Text type="secondary">Welcome, Administrator</Text>
            </div>
            <Button onClick={handleLogout}>
              Logout
            </Button>
          </div>
        </Card>

        {/* Quiz Management */}
        <Card 
          title="Quiz Management" 
          style={{ marginBottom: '24px' }}
          extra={
            <Space>
              {currentQuiz && (
                <Tag color={currentQuiz.isFinished ? 'red' : currentQuiz.isStarted ? 'green' : 'blue'}>
                  {currentQuiz.isFinished ? 'Finished' : currentQuiz.isStarted ? 'Started' : 'Waiting'}
                </Tag>
              )}
            </Space>
          }
        >
          {currentQuiz ? (
            <Space direction="vertical" style={{ width: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <Text strong>Quiz ID: </Text>
                  <Text code>{currentQuiz.id}</Text>
                </div>
                <div>
                  <Text strong>Language: </Text>
                  <Text code>{currentQuiz.language.toUpperCase()}</Text>
                </div>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <Text strong>Current Question: </Text>
                  <Text>{currentQuiz.currentQuestion}</Text>
                </div>
                <div>
                  <Text strong>Total Questions: </Text>
                  <Text>{totalQuestions}</Text>
                </div>
                <div>
                  <Text strong>Max Points: </Text>
                  <Text>{maxPoints}</Text>
                </div>
              </div>

              <Divider />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <Badge count={Object.keys(currentQuiz.players || {}).length} showZero>
                    <Button icon={<TeamOutlined />} size="large">
                      Active Players
                    </Button>
                  </Badge>
                </div>
                <div>
                  <Badge count={waitlistUsers.length} showZero>
                    <Button icon={<HourglassOutlined />} size="large">
                      Waitlist
                    </Button>
                  </Badge>
                </div>
              </div>

              <Divider />

              <Space size="large">
                {currentQuiz.currentQuestion === 1 && !currentQuiz.isStarted && (
                  <Button 
                    type="primary" 
                    icon={<PlayCircleOutlined />} 
                    size="large"
                    onClick={handleStartQuiz}
                  >
                    Start Quiz
                  </Button>
                )}
                
                {currentQuiz.isStarted && !currentQuiz.isFinished && (
                  <Button 
                    danger 
                    icon={<StopOutlined />} 
                    size="large"
                    onClick={handleStopQuiz}
                  >
                    Stop Quiz
                  </Button>
                )}
                
                <Button 
                  icon={<SettingOutlined />} 
                  size="large"
                  onClick={() => setIsChangeQuizModalVisible(true)}
                >
                  Change Quiz
                </Button>
                
                <Button 
                  icon={<ReloadOutlined />} 
                  size="large"
                  onClick={handleRestartQuiz}
                >
                  Restart Quiz
                </Button>
              </Space>
            </Space>
          ) : (
            <div style={{ textAlign: 'center' }}>
              <Text type="secondary">No active quiz</Text>
              <div style={{ marginTop: '16px' }}>
                <Button type="primary" onClick={handleCreateQuiz}>
                  Create Quiz
                </Button>
              </div>
            </div>
          )}
        </Card>

        {/* Quiz Players */}
        {currentQuiz && Object.keys(currentQuiz.players || {}).length > 0 && (
          <Card title="Quiz Players" style={{ marginBottom: '24px' }}>
            <Table 
              dataSource={playerScores} 
              columns={scoreColumns} 
              rowKey="uid"
              pagination={false}
            />
          </Card>
        )}

        {/* Waitlist */}
        {currentQuiz?.isStarted && waitlistUsers.length > 0 && (
          <Card title="Waitlist" style={{ marginBottom: '24px' }}>
            <Table 
              dataSource={waitlistUsers} 
              columns={waitlistColumns} 
              rowKey="uid"
              pagination={false}
            />
          </Card>
        )}

        {/* Final Results */}
        {allPlayersFinished && (
          <Alert
            message="All players have finished the quiz!"
            description="The quiz is complete. Click 'Restart Quiz' to start a new session."
            type="success"
            showIcon
            action={
              <Button size="small" type="primary" onClick={handleRestartQuiz}>
                Restart Quiz
              </Button>
            }
            style={{ marginBottom: '24px' }}
          />
        )}

        {/* Change Quiz Modal */}
        <Modal
          title="Change Quiz"
          open={isChangeQuizModalVisible}
          onOk={handleChangeQuiz}
          onCancel={() => {
            setIsChangeQuizModalVisible(false);
            setSelectedQuizId('');
            setSelectedLanguage('en');
          }}
          okText="Change Quiz"
          cancelText="Cancel"
        >
          <Space direction="vertical" style={{ width: '100%' }}>
            <div>
              <Text strong>Quiz Type:</Text>
              <Select
                style={{ width: '100%', marginTop: '8px' }}
                placeholder="Select quiz type"
                value={selectedQuizId}
                onChange={setSelectedQuizId}
              >
                {availableQuizzes.map(quiz => (
                  <Option key={quiz.id} value={quiz.id}>
                    {quiz.title}
                  </Option>
                ))}
              </Select>
            </div>
            
            <div>
              <Text strong>Language:</Text>
              <Select
                style={{ width: '100%', marginTop: '8px' }}
                placeholder="Select language"
                value={selectedLanguage}
                onChange={setSelectedLanguage}
              >
                <Option value="en">English</Option>
                <Option value="fr">Français</Option>
                <Option value="ar">العربية</Option>
              </Select>
            </div>
            
            <Alert
              message="Warning"
              description="Changing the quiz will clear all current players, scores, and waitlist data."
              type="warning"
              showIcon
            />
          </Space>
        </Modal>
      </div>
    </div>
  );
}