import React, { useState } from 'react';
import { Card, Button, Typography, Spin, Space, Avatar } from 'antd';
import { FcGoogle } from 'react-icons/fc';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { auth, googleProvider } from '../config/firebase';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useNavigate } from 'react-router';
import 'antd/dist/reset.css';

export default function Login() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { Title, Text } = Typography;

  // Listen for auth state changes
  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
    });

    return () => unsubscribe();
  }, []);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      toast.success(`Welcome, ${result.user.displayName}!`, {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
      // Redirect to home page after successful login
      setTimeout(() => {
        navigate('/');
      }, 1000);
    } catch (error: any) {
      toast.error(error.message || 'Failed to sign in with Google', {
        position: "top-right",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    setLoading(true);
    try {
      await signOut(auth);
      toast.info('You have been successfully signed out', {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    } catch (error: any) {
      toast.error(error.message || 'Failed to sign out', {
        position: "top-right",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      minHeight: '100vh',
      padding: '20px',
      background: '#f0f2f5'
    }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div style={{ textAlign: 'center' }}>
            <Title level={1} style={{ marginBottom: '8px' }}>
              Welcome to Quiz App
            </Title>
            <Text type="secondary">
              Sign in to start your learning journey
            </Text>
          </div>

          <Card>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <Title level={3}>Authentication</Title>
            </div>
            
            {user ? (
              <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                <div style={{ textAlign: 'center' }}>
                  <Avatar 
                    size={64} 
                    src={user.photoURL || undefined}
                    style={{ marginBottom: '16px' }}
                  >
                    {user.displayName?.[0] || user.email?.[0]}
                  </Avatar>
                  <Title level={4} style={{ marginBottom: '8px' }}>
                    Welcome back!
                  </Title>
                  <Text type="secondary">{user.email}</Text>
                </div>
                <Button 
                  type="primary" 
                  danger 
                  size="large"
                  onClick={handleSignOut}
                  loading={loading}
                  block
                >
                  Sign Out
                </Button>
              </Space>
            ) : (
              <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                <div style={{ textAlign: 'center' }}>
                  <Text type="secondary">
                    Choose your sign-in method
                  </Text>
                </div>
                <Button 
                  size="large"
                  icon={<FcGoogle />}
                  onClick={handleGoogleSignIn}
                  loading={loading}
                  block
                  style={{ height: '48px' }}
                >
                  Continue with Google
                </Button>
              </Space>
            )}
          </Card>

          {loading && (
            <div style={{ textAlign: 'center' }}>
              <Spin size="large" />
            </div>
          )}
        </Space>
      </div>
    </div>
  );
} 