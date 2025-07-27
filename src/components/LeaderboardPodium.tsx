import React, { useState, useEffect } from 'react';
import { Card, Avatar, Typography, Space, Spin, Alert } from 'antd';
import { FaTrophy, FaCrown, FaMedal } from 'react-icons/fa';
import { getTopLeaderboard } from '../services/firestoreService';
import type { LeaderboardEntry } from '../services/firestoreService';

const { Title, Text } = Typography;

const LeaderboardPodium: React.FC = () => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadLeaderboard();
  }, []);

  const loadLeaderboard = async () => {
    try {
      setLoading(true);
      const data = await getTopLeaderboard();
      setLeaderboard(data);
    } catch (err) {
      setError('Failed to load leaderboard');
      console.error('Error loading leaderboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const getPodiumPosition = (rank: number) => {
    switch (rank) {
      case 1:
        return {
          height: '120px',
          backgroundColor: '#FFD700',
          borderColor: '#FFA500',
          icon: <FaCrown style={{ fontSize: '24px', color: '#FF6B35' }} />,
          title: '🥇 1st Place',
          titleColor: '#FF6B35'
        };
      case 2:
        return {
          height: '100px',
          backgroundColor: '#C0C0C0',
          borderColor: '#A0A0A0',
          icon: <FaCrown style={{ fontSize: '20px', color: '#666' }} />,
          title: '🥈 2nd Place',
          titleColor: '#666'
        };
      case 3:
        return {
          height: '80px',
          backgroundColor: '#CD7F32',
          borderColor: '#B8860B',
          icon: <FaMedal style={{ fontSize: '18px', color: '#8B4513' }} />,
          title: '🥉 3rd Place',
          titleColor: '#8B4513'
        };
      default:
        return {
          height: '60px',
          backgroundColor: '#f0f0f0',
          borderColor: '#d0d0d0',
          icon: null,
          title: `${rank}th Place`,
          titleColor: '#666'
        };
    }
  };

  if (loading) {
    return (
      <Card style={{ textAlign: 'center', padding: '40px' }}>
        <Spin size="large" />
        <div style={{ marginTop: '16px' }}>
          <Text>Loading leaderboard...</Text>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <Alert
          message="Error"
          description={error}
          type="error"
          showIcon
          action={
            <button onClick={loadLeaderboard} style={{ background: 'none', border: 'none', color: '#1890ff', cursor: 'pointer' }}>
              Retry
            </button>
          }
        />
      </Card>
    );
  }

  if (leaderboard.length === 0) {
    return (
      <Card style={{ textAlign: 'center', padding: '40px' }}>
        <FaTrophy style={{ fontSize: '48px', color: '#d9d9d9', marginBottom: '16px' }} />
        <Title level={4} style={{ color: '#999' }}>
          No players yet
        </Title>
        <Text type="secondary">Complete your first quiz to appear on the leaderboard!</Text>
      </Card>
    );
  }

  return (
    <Card 
      title={
        <Space>
          <FaTrophy style={{ color: '#FFD700' }} />
          <span>🏆 Top Players</span>
        </Space>
      }
      style={{ marginBottom: '24px' }}
    >
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'flex-end', 
        gap: '20px',
        padding: '20px 0',
        minHeight: '200px'
      }}>
        {/* 2nd Place */}
        {leaderboard.find(p => p.rank === 2) && (
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center',
            order: 1
          }}>
            <div style={{
              width: '80px',
              height: getPodiumPosition(2).height,
              backgroundColor: getPodiumPosition(2).backgroundColor,
              border: `3px solid ${getPodiumPosition(2).borderColor}`,
              borderRadius: '8px 8px 0 0',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '8px',
              boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
            }}>
              {getPodiumPosition(2).icon}
            </div>
            <Avatar 
              size={50} 
              src={leaderboard.find(p => p.rank === 2)?.photoURL}
              style={{ marginBottom: '8px' }}
            >
              {leaderboard.find(p => p.rank === 2)?.displayName?.charAt(0)}
            </Avatar>
            <Text strong style={{ fontSize: '12px', textAlign: 'center', maxWidth: '80px' }}>
              {leaderboard.find(p => p.rank === 2)?.displayName}
            </Text>
            <Text type="secondary" style={{ fontSize: '10px' }}>
              {leaderboard.find(p => p.rank === 2)?.totalPoints} pts
            </Text>
          </div>
        )}

        {/* 1st Place */}
        {leaderboard.find(p => p.rank === 1) && (
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center',
            order: 2
          }}>
            <div style={{
              width: '100px',
              height: getPodiumPosition(1).height,
              backgroundColor: getPodiumPosition(1).backgroundColor,
              border: `4px solid ${getPodiumPosition(1).borderColor}`,
              borderRadius: '10px 10px 0 0',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '8px',
              boxShadow: '0 6px 12px rgba(0,0,0,0.15)'
            }}>
              {getPodiumPosition(1).icon}
            </div>
            <Avatar 
              size={60} 
              src={leaderboard.find(p => p.rank === 1)?.photoURL}
              style={{ marginBottom: '8px' }}
            >
              {leaderboard.find(p => p.rank === 1)?.displayName?.charAt(0)}
            </Avatar>
            <Text strong style={{ fontSize: '14px', textAlign: 'center', maxWidth: '100px', color: getPodiumPosition(1).titleColor }}>
              {leaderboard.find(p => p.rank === 1)?.displayName}
            </Text>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {leaderboard.find(p => p.rank === 1)?.totalPoints} pts
            </Text>
          </div>
        )}

        {/* 3rd Place */}
        {leaderboard.find(p => p.rank === 3) && (
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center',
            order: 3
          }}>
            <div style={{
              width: '80px',
              height: getPodiumPosition(3).height,
              backgroundColor: getPodiumPosition(3).backgroundColor,
              border: `3px solid ${getPodiumPosition(3).borderColor}`,
              borderRadius: '8px 8px 0 0',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '8px',
              boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
            }}>
              {getPodiumPosition(3).icon}
            </div>
            <Avatar 
              size={50} 
              src={leaderboard.find(p => p.rank === 3)?.photoURL}
              style={{ marginBottom: '8px' }}
            >
              {leaderboard.find(p => p.rank === 3)?.displayName?.charAt(0)}
            </Avatar>
            <Text strong style={{ fontSize: '12px', textAlign: 'center', maxWidth: '80px' }}>
              {leaderboard.find(p => p.rank === 3)?.displayName}
            </Text>
            <Text type="secondary" style={{ fontSize: '10px' }}>
              {leaderboard.find(p => p.rank === 3)?.totalPoints} pts
            </Text>
          </div>
        )}
      </div>

      {/* Additional Stats */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-around', 
        marginTop: '20px',
        padding: '16px',
        backgroundColor: '#f8f9fa',
        borderRadius: '8px'
      }}>
        {leaderboard.map((player) => (
          <div key={player.uid} style={{ textAlign: 'center' }}>
            <Text type="secondary" style={{ fontSize: '12px' }}>Quizzes</Text>
            <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#1890ff' }}>
              {player.quizCount}
            </div>
            <Text type="secondary" style={{ fontSize: '12px' }}>Avg Score</Text>
            <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#52c41a' }}>
              {player.averageScore}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};

export default LeaderboardPodium; 