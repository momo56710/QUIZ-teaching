import { useState, useEffect, useCallback } from 'react';
import { Card, Button, Typography, Space, Alert, Avatar, List } from 'antd';
import { 
  UserOutlined, 
  PlayCircleOutlined, 
  ArrowLeftOutlined,
  TeamOutlined,
  ClockCircleOutlined,
  HourglassOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router';
import { ref, onValue, set } from 'firebase/database';
import { database } from '../config/firebase';
import { toast } from 'react-toastify';
import { useAuth } from '../contexts/AuthContext';
import { getTotalQuestions, getMaxPoints } from '../services/quizService';
import 'react-toastify/dist/ReactToastify.css';
import 'antd/dist/reset.css';

const { Title, Text } = Typography;

interface ActiveUser {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  joinedAt: number;
}

interface WaitlistUser {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  joinedAt: number;
}

interface QuizSession {
  id: string;
  quizId: string;
  language: 'en' | 'fr' | 'ar';
  createdAt: number;
  currentQuestion: number;
  players: Record<string, any>;
  isStarted: boolean;
}

export default function QuizWaiting() {
  const [currentQuiz, setCurrentQuiz] = useState<QuizSession | null>(null);
  const [waitlistUsers, setWaitlistUsers] = useState<WaitlistUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [isJoined, setIsJoined] = useState(false);
  const [isInWaitlist, setIsInWaitlist] = useState(false);
  const [adminOnline, setAdminOnline] = useState(false);
  const [hasShownRestartMessage, setHasShownRestartMessage] = useState(false);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [maxPoints, setMaxPoints] = useState(0);
  const navigate = useNavigate();
  const { user } = useAuth();

  // Check if user is authenticated
  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
  }, [user, navigate]);

  // Listen to current quiz
  useEffect(() => {
    const quizRef = ref(database, 'currentQuiz');
    const quizUnsubscribe = onValue(quizRef, (snapshot) => {
      const quizData = snapshot.val();
      
      if (!quizData) {
        setCurrentQuiz(null);
        setIsJoined(false);
        setIsInWaitlist(false);
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
      
      // Check if user is already joined
      const isUserJoined = quizData.players && user?.uid && quizData.players[user.uid];
      setIsJoined(isUserJoined);
      
      if (isUserJoined && quizData.isStarted) {
        navigate('/quiz/play');
        return;
      }
      
      setLoading(false);
    });

    return () => quizUnsubscribe();
  }, [user, navigate]);

  // Listen to waitlist
  useEffect(() => {
    if (!currentQuiz?.id) {
      setWaitlistUsers([]);
      setIsInWaitlist(false);
      return;
    }

    const waitlistRef = ref(database, `waitlist/${currentQuiz.id}`);
    const waitlistUnsubscribe = onValue(waitlistRef, (snapshot) => {
      const waitlist: WaitlistUser[] = [];
      snapshot.forEach((childSnapshot) => {
        waitlist.push({
          uid: childSnapshot.key!,
          ...childSnapshot.val()
        });
      });
      setWaitlistUsers(waitlist);
      
      // Check if current user is in waitlist
      const isUserInWaitlist = Boolean(user?.uid && waitlist.some(w => w.uid === user.uid));
      setIsInWaitlist(isUserInWaitlist);
    });

    return () => waitlistUnsubscribe();
  }, [currentQuiz?.id, user?.uid]);

  // Check if admin is online
  useEffect(() => {
    const adminSessionRef = ref(database, 'adminSession');
    const adminUnsubscribe = onValue(adminSessionRef, (snapshot) => {
      const adminData = snapshot.val();
      // Admin is considered online if they've been seen in the last 2 minutes
      const isOnline = adminData && adminData.isAdmin && Date.now() - adminData.lastSeen < 2 * 60 * 1000;
      setAdminOnline(isOnline);
    });

    return () => adminUnsubscribe();
  }, []);

  // Handle quiz restart detection
  useEffect(() => {
    if (currentQuiz && currentQuiz.currentQuestion === 1 && isJoined && !hasShownRestartMessage) {
      setIsJoined(false);
      setIsInWaitlist(false);
      setHasShownRestartMessage(true);
      toast.success('Quiz has been restarted! You can join the new session.');
    }
  }, [currentQuiz?.currentQuestion, isJoined, hasShownRestartMessage]);

  const joinQuiz = useCallback(async () => {
    if (!currentQuiz || !user) return;

    // Check if admin is online
    if (!adminOnline) {
      toast.error('Admin is not online. Please wait for the admin to come online.');
      return;
    }

    setJoining(true);
    try {
      // If quiz hasn't started yet, join directly
      if (!currentQuiz.isStarted) {
        const playerRef = ref(database, `currentQuiz/players/${user.uid}`);
        await set(playerRef, {
          uid: user.uid,
          displayName: user.displayName,
          email: user.email,
          photoURL: user.photoURL,
          joinedAt: Date.now(),
          currentQuestion: 1,
          score: 0,
          usedPoints: []
        });

        setIsJoined(true);
        toast.success('Successfully joined the quiz!');
      } else {
        // If quiz has started, add to waitlist
        const waitlistRef = ref(database, `waitlist/${currentQuiz.id}/${user.uid}`);
        await set(waitlistRef, {
          uid: user.uid,
          displayName: user.displayName,
          email: user.email,
          photoURL: user.photoURL,
          joinedAt: Date.now()
        });

        setIsInWaitlist(true);
        toast.info('Quiz has already started. You have been added to the waitlist. The admin may add you to the quiz.');
      }
    } catch (error) {
      console.error('Error joining quiz:', error);
      toast.error('Failed to join quiz. Please try again.');
    } finally {
      setJoining(false);
    }
  }, [currentQuiz, user, adminOnline]);

  const handleLeaveQuiz = useCallback(() => {
    navigate('/');
  }, [navigate]);

  // Loading state
  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        padding: '24px'
      }}>
        <Card style={{ textAlign: 'center', maxWidth: '400px' }}>
          <Title level={3}>Loading...</Title>
          <Text type="secondary">Please wait while we check for available quizzes.</Text>
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
        padding: '24px'
      }}>
        <Card style={{ textAlign: 'center', maxWidth: '400px' }}>
          <Title level={3}>No Quiz Available</Title>
          <Text type="secondary">
            There is no active quiz at the moment. Please wait for the administrator to create a quiz.
          </Text>
          <div style={{ marginTop: '16px' }}>
            <Button 
              type="primary" 
              icon={<ArrowLeftOutlined />} 
              onClick={handleLeaveQuiz}
            >
              Back to Home
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const playersArray = Object.entries(currentQuiz.players || {}).map(([uid, playerData]) => ({
    uid,
    ...playerData
  }));

  return (
    <div style={{ 
      padding: window.innerWidth <= 768 ? '16px' : '24px', 
      maxWidth: '800px', 
      margin: '0 auto',
      minHeight: '100vh',
      background: '#f0f2f5'
    }}>
      <Card>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <Title level={2}>
            <PlayCircleOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
            Quiz Waiting Room
          </Title>
          <Text type="secondary">
            {currentQuiz.isStarted ? 'Quiz is in progress...' : 'Waiting for the quiz to begin...'}
          </Text>
        </div>

        {/* Quiz Info */}
        <Card 
          title="Quiz Information" 
          style={{ marginBottom: '16px' }}
          extra={<ClockCircleOutlined />}
        >
          <Space direction="vertical" style={{ width: '100%' }}>
            <div>
              <Text strong>Quiz ID: </Text>
              <Text code>{currentQuiz.id}</Text>
            </div>
            <div>
              <Text strong>Language: </Text>
              <Text code>{currentQuiz.language.toUpperCase()}</Text>
            </div>
            <div>
              <Text strong>Created: </Text>
              <Text>{new Date(currentQuiz.createdAt).toLocaleString()}</Text>
            </div>
            <div>
              <Text strong>Status: </Text>
              <Text code>{currentQuiz.isStarted ? 'Started' : 'Waiting'}</Text>
            </div>
            <div>
              <Text strong>Total Questions: </Text>
              <Text>{totalQuestions}</Text>
            </div>
            <div>
              <Text strong>Max Points per Question: </Text>
              <Text>{maxPoints}</Text>
            </div>
          </Space>
        </Card>

        {/* Admin Status */}
        {!adminOnline && (
          <Alert
            message="Admin Offline"
            description="The admin is not currently online. You cannot join the quiz until the admin comes online."
            type="warning"
            showIcon
            style={{ marginBottom: '24px' }}
          />
        )}

        {/* Join Quiz Section */}
        {!isJoined && !isInWaitlist && adminOnline && (
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <Button 
              type="primary" 
              size="large"
              icon={<PlayCircleOutlined />} 
              onClick={joinQuiz}
              loading={joining}
              style={{ marginBottom: '16px' }}
            >
              {currentQuiz.isStarted ? 'Join Waitlist' : 'Join Quiz'}
            </Button>
            <div>
              <Text type="secondary">
                {currentQuiz.isStarted 
                  ? 'Quiz has started. Join the waitlist to be added by the admin.'
                  : 'Click to join the quiz and start answering questions!'
                }
              </Text>
            </div>
          </div>
        )}

        {/* Join Quiz Section - Admin Offline */}
        {!isJoined && !isInWaitlist && !adminOnline && (
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <Button 
              type="primary" 
              size="large"
              icon={<PlayCircleOutlined />} 
              disabled
              style={{ marginBottom: '16px' }}
            >
              {currentQuiz.isStarted ? 'Join Waitlist' : 'Join Quiz'}
            </Button>
            <div>
              <Text type="secondary">
                Admin is offline. Please wait for the admin to come online.
              </Text>
            </div>
          </div>
        )}

        {/* Quiz Started Alert */}
        {currentQuiz.isStarted && !isJoined && !isInWaitlist && (
          <Alert
            message="Quiz Already Started"
            description="The quiz has already begun. You can join the waitlist and the admin may add you to the quiz."
            type="warning"
            showIcon
            style={{ marginBottom: '24px' }}
          />
        )}

        {/* Already Joined Message */}
        {isJoined && (
          <Alert
            message="You have joined this quiz!"
            description="Please wait for the administrator to start the quiz."
            type="success"
            showIcon
            style={{ marginBottom: '24px' }}
          />
        )}

        {/* In Waitlist Message */}
        {isInWaitlist && (
          <Alert
            message="You are on the waitlist!"
            description="The quiz has already started. Please wait for the administrator to add you to the quiz."
            type="warning"
            showIcon
            style={{ marginBottom: '24px' }}
          />
        )}

        {/* Instructions */}
        <Alert
          message="How it works"
          description={
            <ul style={{ margin: 0, paddingLeft: '20px' }}>
              <li>Each question has 4 multiple choice options</li>
              <li>You can choose points (1-{maxPoints}) for each question</li>
              <li>Once a point value is used, it cannot be chosen again</li>
              <li>You have 20 seconds to answer each question</li>
              <li>If time runs out, you lose the minimum available points</li>
              <li>Correct answers earn points, wrong answers lose points</li>
              <li>Total questions: {totalQuestions}</li>
            </ul>
          }
          type="info"
          showIcon
          style={{ marginBottom: '24px' }}
        />

        {/* Connected Players */}
        <Card 
          title={
            <Space>
              <TeamOutlined />
              Connected Players ({playersArray.length})
            </Space>
          }
        >
          {playersArray.length > 0 ? (
            <List
              dataSource={playersArray}
              renderItem={(player) => (
                <List.Item>
                  <List.Item.Meta
                    avatar={
                      <Avatar 
                        src={player.photoURL} 
                        icon={<UserOutlined />}
                        size="large"
                      />
                    }
                    title={player.displayName}
                    description={player.email}
                  />
                  <Text type="secondary">
                    Joined {new Date(player.joinedAt).toLocaleTimeString()}
                  </Text>
                </List.Item>
              )}
            />
          ) : (
            <Text type="secondary">No players have joined yet.</Text>
          )}
        </Card>

        {/* Waitlist */}
        {currentQuiz.isStarted && waitlistUsers.length > 0 && (
          <Card 
            title={
              <Space>
                <HourglassOutlined />
                Waitlist ({waitlistUsers.length})
              </Space>
            }
          >
            <List
              dataSource={waitlistUsers}
              renderItem={(user) => (
                <List.Item>
                  <List.Item.Meta
                    avatar={
                      <Avatar 
                        src={user.photoURL} 
                        icon={<UserOutlined />}
                        size="large"
                      />
                    }
                    title={user.displayName}
                    description={user.email}
                  />
                  <Text type="secondary">
                    Waiting since {new Date(user.joinedAt).toLocaleTimeString()}
                  </Text>
                </List.Item>
              )}
            />
          </Card>
        )}

        {/* Back Button */}
        <div style={{ textAlign: 'center', marginTop: '24px' }}>
          <Button 
            icon={<ArrowLeftOutlined />} 
            onClick={handleLeaveQuiz}
          >
            Back to Home
          </Button>
        </div>
      </Card>
    </div>
  );
} 