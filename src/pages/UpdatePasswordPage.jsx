import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Form, Input, Button, Card, Typography, App as AntApp, Layout, Progress } from 'antd'; // Progress ko shamil kiya
import { LockOutlined } from '@ant-design/icons';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { useNavigate, Link } from 'react-router-dom'; // Link ko shamil kiya

const { Title } = Typography;
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
    <Layout style={{ minHeight: '100vh' }}>
      <Content style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: isMobile ? '12px 8px' : '20px' }}>
        <Card style={{ width: 400, maxWidth: '100%' }}>
          <Title level={3} style={{ textAlign: 'center' }}>Set a New Password</Title>
          <p style={{ textAlign: 'center', marginBottom: '24px' }}>Please enter your new password below.</p>
          <Form onFinish={handleUpdatePassword} layout="vertical">
            <Form.Item 
              name="password" 
              label="New Password" 
              rules={[{ required: true, min: 6, message: 'Password must be at least 6 characters long!' }]}
            >
              <Input.Password 
                prefix={<LockOutlined />} 
                placeholder="Enter new password" 
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
            style={{ marginBottom: '24px' }}
          />
        )}
            <Form.Item 
              name="confirmPassword" 
              label="Confirm New Password" 
              dependencies={['password']}
              rules={[
                { required: true, message: 'Please confirm your new password!' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('password') === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error('The two passwords that you entered do not match!'));
                  },
                }),
              ]}
            >
              <Input.Password prefix={<LockOutlined />} placeholder="Confirm new password" />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" loading={loading} block size="large">
                Update Password
              </Button>
            </Form.Item>
            <div style={{ textAlign: 'center', marginTop: '16px' }}>
          <Link to="/">Back to Login</Link>
        </div>
          </Form>
        </Card>
      </Content>
    </Layout>
  );
};

export default UpdatePasswordPage;