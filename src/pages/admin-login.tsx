import { useState } from 'react';
import { Card, Button, Typography, Space, Input, Alert, Avatar } from 'antd';
import { FcGoogle } from 'react-icons/fc';
import { LockOutlined, UserOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router';
import { signInWithPopup, signOut } from 'firebase/auth';
import { auth, googleProvider } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { checkAdminAccess, isAdminEmail } from '../config/admin';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import 'antd/dist/reset.css';

const { Title, Text } = Typography;
const { Password } = Input;

export default function AdminLogin() {
  const [secretKey, setSecretKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const isAuthorizedEmail = isAdminEmail(user?.email);

  const handleGoogleSignIn = async () => {
    setSigningIn(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      toast.error('Failed to sign in with Google. Please try again.', {
        position: "top-right",
        autoClose: 3000,
      });
    } finally {
      setSigningIn(false);
    }
  };

  const handleAdminLogin = async () => {
    setLoading(true);
    try {
      if (checkAdminAccess(secretKey, user?.email)) {
        // Store admin session, tied to the verified admin email
        localStorage.setItem('adminSession', JSON.stringify({
          isAdmin: true,
          email: user?.email,
          timestamp: Date.now()
        }));

        toast.success('Admin access granted!', {
          position: "top-right",
          autoClose: 2000,
        });

        setTimeout(() => {
          navigate('/admin/dashboard');
        }, 1000);
      } else {
        toast.error('Invalid admin secret key!', {
          position: "top-right",
          autoClose: 3000,
        });
      }
    } catch (error) {
      toast.error('Login failed. Please try again.', {
        position: "top-right",
        autoClose: 3000,
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
              Admin Access
            </Title>
            <Text type="secondary">
              Enter admin secret key to access dashboard
            </Text>
          </div>

          <Card>
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <Alert
                message="Admin Access Required"
                description="This area is restricted to a single authorized Google account. Sign in first, then enter the secret key to continue."
                type="warning"
                showIcon
              />

              {!authLoading && !user && (
                <Button
                  size="large"
                  icon={<FcGoogle />}
                  onClick={handleGoogleSignIn}
                  loading={signingIn}
                  block
                  style={{ height: '48px' }}
                >
                  Sign in with Google
                </Button>
              )}

              {user && (
                <Space direction="vertical" size="small" style={{ width: '100%' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Avatar src={user.photoURL || undefined}>
                      {user.displayName?.[0] || user.email?.[0]}
                    </Avatar>
                    <div>
                      <div>{user.displayName}</div>
                      <Text type="secondary">{user.email}</Text>
                    </div>
                  </div>

                  {!isAuthorizedEmail && (
                    <Alert
                      message="Not Authorized"
                      description="This Google account is not permitted to access the admin dashboard."
                      type="error"
                      showIcon
                    />
                  )}
                </Space>
              )}

              {user && isAuthorizedEmail && (
                <>
                  <div>
                    <Text strong>Secret Key:</Text>
                    <Password
                      size="large"
                      placeholder="Enter admin secret key"
                      prefix={<LockOutlined />}
                      value={secretKey}
                      onChange={(e) => setSecretKey(e.target.value)}
                      onPressEnter={handleAdminLogin}
                      style={{ marginTop: '8px' }}
                    />
                  </div>

                  <Button
                    type="primary"
                    size="large"
                    icon={<UserOutlined />}
                    onClick={handleAdminLogin}
                    loading={loading}
                    block
                    disabled={!secretKey.trim()}
                  >
                    Access Admin Dashboard
                  </Button>
                </>
              )}

              {user && !isAuthorizedEmail && (
                <Button block onClick={() => signOut(auth)}>
                  Sign Out
                </Button>
              )}

              <div style={{ textAlign: 'center' }}>
                <Button
                  type="link"
                  onClick={() => navigate('/login')}
                >
                  Back to User Login
                </Button>
              </div>
            </Space>
          </Card>
        </Space>
      </div>
    </div>
  );
} 