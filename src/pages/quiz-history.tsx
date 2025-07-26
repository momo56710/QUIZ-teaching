import { useState, useEffect } from 'react';
import { Card, Typography, Space, Table, Tag, Button, Progress } from 'antd';
import { 
  TrophyOutlined, 
  HistoryOutlined, 
  ArrowLeftOutlined,
  CalendarOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router';
import { ref, onValue } from 'firebase/database';
import { database } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import 'antd/dist/reset.css';

const { Title, Text } = Typography;

interface QuizHistoryEntry {
  quizId: string;
  language: 'en' | 'fr' | 'ar';
  score: number;
  totalQuestions: number;
  completedAt: number;
  answers: any[];
}

export default function QuizHistory() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [quizHistory, setQuizHistory] = useState<QuizHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    const historyRef = ref(database, `quizHistory/${user.uid}`);
    const unsubscribe = onValue(historyRef, (snapshot) => {
      const history: QuizHistoryEntry[] = [];
      snapshot.forEach((childSnapshot) => {
        history.push({
          quizId: childSnapshot.key!,
          ...childSnapshot.val()
        });
      });
      setQuizHistory(history.sort((a, b) => b.completedAt - a.completedAt));
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, navigate]);

  const getLanguageName = (lang: string) => {
    switch (lang) {
      case 'en': return 'English';
      case 'fr': return 'Français';
      case 'ar': return 'العربية';
      default: return lang;
    }
  };

  const getScoreColor = (score: number, total: number) => {
    const percentage = (score / total) * 100;
    if (percentage >= 80) return '#52c41a';
    if (percentage >= 60) return '#faad14';
    return '#ff4d4f';
  };

  const columns = [
    {
      title: 'Quiz ID',
      key: 'quizId',
      render: (entry: QuizHistoryEntry) => (
        <Text code>{entry.quizId.slice(-8)}</Text>
      ),
    },
    {
      title: 'Language',
      key: 'language',
      render: (entry: QuizHistoryEntry) => (
        <Tag color="blue">{getLanguageName(entry.language)}</Tag>
      ),
    },
    {
      title: 'Score',
      key: 'score',
      render: (entry: QuizHistoryEntry) => (
        <div>
          <div style={{ 
            fontSize: '18px', 
            fontWeight: 'bold', 
            color: getScoreColor(entry.score, entry.totalQuestions * 30)
          }}>
            {entry.score} pts
          </div>
          <Text type="secondary">
            out of {entry.totalQuestions * 30} possible
          </Text>
        </div>
      ),
    },
    {
      title: 'Performance',
      key: 'performance',
      render: (entry: QuizHistoryEntry) => {
        const percentage = (entry.score / (entry.totalQuestions * 30)) * 100;
        return (
          <div>
            <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
              {percentage.toFixed(1)}%
            </div>
            <Progress 
              percent={percentage} 
              size="small"
              strokeColor={getScoreColor(entry.score, entry.totalQuestions * 30)}
            />
          </div>
        );
      },
    },
    {
      title: 'Completed',
      key: 'completedAt',
      render: (entry: QuizHistoryEntry) => (
        <div>
          <div style={{ fontWeight: 'bold' }}>
            {new Date(entry.completedAt).toLocaleDateString()}
          </div>
          <Text type="secondary">
            {new Date(entry.completedAt).toLocaleTimeString()}
          </Text>
        </div>
      ),
    },
  ];

  const totalQuizzes = quizHistory.length;
  const averageScore = totalQuizzes > 0 
    ? quizHistory.reduce((sum, entry) => sum + entry.score, 0) / totalQuizzes 
    : 0;
  const bestScore = totalQuizzes > 0 
    ? Math.max(...quizHistory.map(entry => entry.score))
    : 0;

  return (
    <div style={{ padding: '16px', background: '#f0f2f5', minHeight: '100vh' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {/* Header */}
          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <Title level={2} style={{ margin: 0 }}>
                  <HistoryOutlined /> Quiz History
                </Title>
                <Text type="secondary">Your past quiz performances</Text>
              </div>
              <Button 
                type="primary" 
                icon={<ArrowLeftOutlined />}
                onClick={() => navigate('/')}
              >
                Back to Home
              </Button>
            </div>
          </Card>

          {/* Statistics */}
          {totalQuizzes > 0 && (
            <Card title="Statistics">
              <Space size="large">
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1890ff' }}>
                    {totalQuizzes}
                  </div>
                  <Text type="secondary">Total Quizzes</Text>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#52c41a' }}>
                    {averageScore.toFixed(0)}
                  </div>
                  <Text type="secondary">Average Score</Text>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#faad14' }}>
                    {bestScore}
                  </div>
                  <Text type="secondary">Best Score</Text>
                </div>
              </Space>
            </Card>
          )}

          {/* Quiz History Table */}
          <Card 
            title={`Quiz History (${totalQuizzes} quizzes)`}
            extra={<CalendarOutlined />}
          >
            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <Text>Loading quiz history...</Text>
              </div>
            ) : totalQuizzes === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <TrophyOutlined style={{ fontSize: '48px', color: '#d9d9d9', marginBottom: '16px' }} />
                <Title level={4} style={{ color: '#666' }}>No Quiz History</Title>
                <Text type="secondary">Complete your first quiz to see your history here!</Text>
              </div>
            ) : (
              <Table 
                dataSource={quizHistory}
                columns={columns}
                rowKey="quizId"
                pagination={{ pageSize: 10 }}
                size="small"
              />
            )}
          </Card>
        </Space>
      </div>
    </div>
  );
} 