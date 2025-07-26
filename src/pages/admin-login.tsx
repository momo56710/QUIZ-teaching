import { useState } from 'react';
import { Card, Button, Typography, Space, Input, Alert } from 'antd';
import { LockOutlined, UserOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router';
import { checkAdminAccess } from '../config/admin';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import 'antd/dist/reset.css';

const { Title, Text } = Typography;
const { Password } = Input;

export default function AdminLogin() {
  const [secretKey, setSecretKey] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleAdminLogin = async () => {
    setLoading(true);
    try {
      if (checkAdminAccess(secretKey)) {
        // Store admin session
        localStorage.setItem('adminSession', JSON.stringify({
          isAdmin: true,
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
                description="This area is restricted to administrators only. Please enter the secret key to continue."
                type="warning"
                showIcon
              />
              
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