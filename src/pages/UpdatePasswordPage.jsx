import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Form, Input, Button, Typography, App as AntApp, Layout, Progress, theme, ConfigProvider } from 'antd';
import { LockOutlined } from '@ant-design/icons';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { useNavigate, Link } from 'react-router-dom';
import { lightThemeTokens } from '../theme/themeConfig';

const { Title, Text } = Typography;
const { Content } = Layout;

const UpdatePasswordPage = () => {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const { message } = AntApp.useApp();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState('');
  const [strength, setStrength] = useState(0);
  const [strengthColor, setStrengthColor] = useState('#ff4d4f');

  const checkPasswordStrength = (pass) => {
    let score = 0;
    if (pass.length > 7) score += 25; // Length ke points
    if (pass.match(/[a-z]/)) score += 15; // Chotay haroof (lowercase)
    if (pass.match(/[A-Z]/)) score += 20; // Barray haroof (uppercase)
    if (pass.match(/\d/)) score += 20;    // Numbers ke points
    if (pass.match(/[^a-zA-Z\d]/)) score += 20; // Special characters ke points

    // Score ko 100 tak mehdood rakhein
    const finalScore = Math.min(score, 100);
    setStrength(finalScore);

    // Rang tabdeel karein
    if (finalScore < 40) {
      setStrengthColor('#ff4d4f'); // Red
    } else if (finalScore < 75) {
      setStrengthColor('#faad14'); // Orange/Yellow
    } else {
      setStrengthColor('#52c41a'); // Green
    }
  };


  // Yeh function tab chalta hai jab user naya password daal kar form submit karta hai
  const handleUpdatePassword = async (values) => {
    // Check karte hain ke dono password fields match karti hain
    if (values.password !== values.confirmPassword) {
      message.error("Passwords do not match!");
      return;
    }

    try {
      setLoading(true);
      // Supabase ko naya password bhejte hain
      const { error } = await supabase.auth.updateUser({ password: values.password });
      if (error) throw error;
      
      message.success('Your password has been updated successfully! You can now log in with your new password.');
      // Kamyabi ke baad user ko login page par bhej dete hain
      navigate('/'); 
    } catch (error) {
      message.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ConfigProvider theme={{ algorithm: theme.defaultAlgorithm, token: lightThemeTokens }}>
      <Layout style={{ minHeight: '100vh', background: lightThemeTokens.colorBgLayout, overflowY: 'auto' }}>
        <Content style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', padding: isMobile ? '16px 8px' : '24px 20px' }}>
          <div style={{ 
            width: 420, 
            maxWidth: '100%', 
            background: lightThemeTokens.colorBgLayout, 
            borderRadius: '16px',
            padding: isMobile ? '24px 16px' : '32px 28px',
            textAlign: 'center'
          }}>
            {/* Official 4-Square Brand Logo */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '16px' }}>
              <svg width="28" height="28" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4 5C4 4.44772 4.44772 4 5 4H13C13.5523 4 14 4.44772 14 5V13C14 13.5523 13.5523 14 13 14H5C4.44772 14 4 13.5523 4 13V5Z" fill={lightThemeTokens.colorPrimary} />
                <path d="M18 5C18 4.44772 18.4477 4 19 4H27C27.5523 4 28 4.44772 28 5V13C28 13.5523 27.5523 14 27 14H19C18.4477 14 18 13.5523 18 13V5Z" fill={lightThemeTokens.colorPrimary} fillOpacity="0.6" />
                <path d="M4 19C4 18.4477 4.44772 18 5 18H13C13.5523 18 14 18.4477 14 19V27C14 27.5523 13.5523 28 13 28H5C4.44772 28 4 27.5523 4 27V19Z" fill={lightThemeTokens.colorPrimary} fillOpacity="0.6" />
                <path d="M18 19C18 18.4477 18.4477 18 19 18H27C27.5523 18 28 18.4477 28 19V27C28 27.5523 27.5523 28 27 28H19C18.4477 28 18 27.5523 18 27V19Z" fill={lightThemeTokens.colorPrimary} />
              </svg>
              <span style={{ fontSize: '22px', fontWeight: '800', color: lightThemeTokens.colorTextHeading }}>
                Sada<span style={{ color: lightThemeTokens.colorPrimary }}> POS</span>
              </span>
            </div>

            <Title level={3} style={{ color: lightThemeTokens.colorTextHeading, margin: '0 0 6px 0', fontSize: '22px', fontWeight: 800, letterSpacing: '-0.3px' }}>
              Set a New Password
            </Title>
            <p style={{ color: lightThemeTokens.colorTextSecondary, fontSize: '13px', margin: '0 0 20px 0' }}>
              Please enter your new secure password below.
            </p>

            <Form onFinish={handleUpdatePassword} layout="vertical" style={{ textAlign: 'left' }}>
              <Form.Item 
                name="password" 
                label={<Text strong style={{ fontSize: '12.5px', color: lightThemeTokens.colorTextHeading }}>New Password</Text>} 
                rules={[{ required: true, min: 6, message: 'Password must be at least 6 characters long!' }]}
                style={{ marginBottom: password ? '8px' : '14px' }}
              >
                <Input.Password 
                  prefix={<LockOutlined style={{ color: lightThemeTokens.colorTextSecondary }} />} 
                  placeholder="Enter new password (6+ chars)" 
                  size="middle"
                  style={{ borderRadius: '8px', height: '40px', background: '#FFFFFF', borderColor: lightThemeTokens.colorBorder }}
                  onChange={(e) => {
                    const pass = e.target.value;
                    setPassword(pass);
                    checkPasswordStrength(pass);
                  }}
                />
              </Form.Item>

              {password && (
                <Progress 
                  percent={strength} 
                  strokeColor={strengthColor}
                  showInfo={false} 
                  style={{ marginBottom: '14px' }}
                />
              )}

              <Form.Item 
                name="confirmPassword" 
                label={<Text strong style={{ fontSize: '12.5px', color: lightThemeTokens.colorTextHeading }}>Confirm New Password</Text>} 
                dependencies={['password']}
                style={{ marginBottom: '20px' }}
                rules={[
                  { required: true, message: 'Please confirm your new password!' },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue('password') === value) {
                        return Promise.resolve();
                      }
                      return Promise.reject(new Error('The two passwords do not match!'));
                    },
                  }),
                ]}
              >
                <Input.Password 
                  prefix={<LockOutlined style={{ color: lightThemeTokens.colorTextSecondary }} />} 
                  placeholder="Confirm new password" 
                  size="middle"
                  style={{ borderRadius: '8px', height: '40px', background: '#FFFFFF', borderColor: lightThemeTokens.colorBorder }}
                />
              </Form.Item>

              <Form.Item style={{ marginBottom: '0' }}>
                <Button 
                  type="primary" 
                  htmlType="submit" 
                  loading={loading} 
                  block 
                  size="middle"
                  style={{ 
                    height: '42px', 
                    borderRadius: '8px', 
                    fontSize: '14.5px', 
                    fontWeight: 700,
                    background: lightThemeTokens.colorPrimary,
                    borderColor: lightThemeTokens.colorPrimary,
                    boxShadow: `0 4px 12px ${lightThemeTokens.colorPrimary}40`
                  }}
                >
                  Update Password
                </Button>
              </Form.Item>

              <div style={{ textAlign: 'center', marginTop: '16px' }}>
                <Link to="/" style={{ fontSize: '13px', color: lightThemeTokens.colorPrimary, fontWeight: 500 }}>
                  Back to Login
                </Link>
              </div>
            </Form>
          </div>
        </Content>
      </Layout>
    </ConfigProvider>
  );
};

export default UpdatePasswordPage;