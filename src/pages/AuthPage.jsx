import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Form, Input, Button, Card, Typography, App as AntApp, Tabs, Layout, Modal, Space, Divider, Checkbox, theme } from 'antd';
import { LockOutlined, MailOutlined, AppstoreOutlined, KeyOutlined } from '@ant-design/icons';
import { useMediaQuery } from '../hooks/useMediaQuery';

const { Title } = Typography;
const { Content } = Layout;

const AuthPage = () => {
  const { token } = theme.useToken(); // Control Center Connection
  const isMobile = useMediaQuery('(max-width: 768px)');
  const { message } = AntApp.useApp();
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [isTokenModalVisible, setIsTokenModalVisible] = useState(false);
  const [otpStep, setOtpStep] = useState(false); 
  const [tokenEmail, setTokenEmail] = useState('');

  const handleLogin = async (values) => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });
      if (error) throw error;
    } catch (error) {
      message.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (values) => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
      });
      if (error) throw error;
      message.success('Signup successful! Please check your email to verify your account, then you can login.');
    } catch (error) {
      message.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordResetRequest = async (values) => {
    try {
      setResetLoading(true);
      const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
        redirectTo: `${window.location.origin}/update-password`,
      });
      if (error) throw error;
      message.success('Password reset link has been sent to your email.');
      setIsModalVisible(false);
    } catch (error) {
      message.error(error.message);
    } finally {
      setResetLoading(false);
    }
  };

  // --- NAYA FUNCTION: Token ko check karne ke liye ---
  const handleTokenLogin = async (values) => {
    try {
      setLoading(true);
      // 1. Token se extra spaces khatam karein aur decode karein
      const cleanToken = values.token.trim().replace(/\n/g, '');
      const decoded = atob(cleanToken);
      const parts = decoded.split('|');
      
      if (parts[0] !== 'TERMINAL_ACCESS' || !parts[1]) {
        throw new Error("Invalid Terminal Token Format");
      }

      const email = parts[1];
      setTokenEmail(email);

      // 2. Supabase se OTP mangwayein
      const { error } = await supabase.auth.signInWithOtp({ 
        email,
        options: {
          shouldCreateUser: false // Sirf mojooda user (Owner) login ho sake
        }
      });
      
      if (error) throw error;

      message.success(`Token Valid! A 6-digit code sent to Owner email.`);
      setOtpStep(true);
    } catch (error) {
      console.error("Token Login Error:", error);
      message.error(error.message || "Invalid or Expired Token");
    } finally {
      setLoading(false);
    }
  };

  // --- NAYA FUNCTION: OTP Code verify karne ke liye ---
  const handleVerifyOtp = async (values) => {
    try {
      setLoading(true);

      // [SECURITY FIX]: Login finalize hone se PEHLE hi lock laga dein
      // Taake app jab login ho kar khule, to wo pehle frame se hi Locked ho.
      localStorage.setItem('is_app_locked', 'true');

      const { error } = await supabase.auth.verifyOtp({
        email: tokenEmail,
        token: values.otp,
        type: 'email' 
      });

      if (error) {
        // Agar code ghalat ho jaye to lock wapis khol dein taake login screen nazar aati rahe
        localStorage.removeItem('is_app_locked');
        throw error;
      }

      message.success("Login successful! Secure Terminal Active.");

      // Fori tor par Home page par bhej dein taake koi purana URL (Settings waghera) baqi na rahe
      window.location.href = "/";
      
    } catch (error) {
      message.error("Invalid Code. Please try again.");
    } finally {
      setLoading(false);
    }
  };
  
  const loginForm = (
    <Form onFinish={handleLogin} layout="vertical">
      <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email', message: 'Please enter a valid email!' }]}>
        <Input prefix={<MailOutlined />} placeholder="your@email.com" />
      </Form.Item>
      <Form.Item name="password" label="Password" rules={[{ required: true, message: 'Please enter your password!' }]}>
        <Input.Password prefix={<LockOutlined />} placeholder="Password" />
      </Form.Item>
      <Form.Item>
        <Button type="link" onClick={() => setIsModalVisible(true)} style={{ float: 'right', padding: 0 }}>
          Forgot Password?
        </Button>
      </Form.Item>
      <Form.Item>
        <Button type="primary" htmlType="submit" loading={loading} block size="large">
          Log In
        </Button>
      </Form.Item>
      <Divider style={{ fontSize: '12px' }}>OR</Divider>
      <Button 
        block 
        icon={<KeyOutlined />} 
        onClick={() => { setIsTokenModalVisible(true); setOtpStep(false); }}
      >
        Login with Terminal Token
      </Button>
    </Form>
  );

  const signupForm = (
     <Form onFinish={handleSignup} layout="vertical">
      <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email', message: 'Please enter a valid email!' }]}>
        <Input prefix={<MailOutlined />} placeholder="your@email.com" />
      </Form.Item>
      <Form.Item name="password" label="Password" rules={[{ required: true, min: 6, message: 'Password must be at least 6 characters long!' }]}>
        <Input.Password prefix={<LockOutlined />} placeholder="Create a strong password" />
      </Form.Item>
      <Form.Item
        name="agreement"
        valuePropName="checked"
        rules={[
          {
            validator: (_, value) =>
              value ? Promise.resolve() : Promise.reject(new Error('Should accept agreement')),
          },
        ]}
      >
        <Checkbox style={{ fontSize: '12px' }}>
          I agree to SadaPOS <a href="https://www.sadapos.com/p/terms-of-service.html" target="_blank" rel="noopener noreferrer">Terms of Service</a> and <a href="https://www.sadapos.com/p/privacy-policy.html" target="_blank" rel="noopener noreferrer">Privacy Policy</a>
        </Checkbox>
      </Form.Item>
      <Form.Item>
        <Button type="primary" htmlType="submit" loading={loading} block size="large">
          Sign Up
        </Button>
      </Form.Item>
    </Form>
  );

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Content style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: isMobile ? '12px 8px' : '20px' }}>
        {/* --- TABDEELI: Card se saari hardcoded styles hata di hain --- */}
        <Card style={{ width: 400, maxWidth: '100%' }}>
          {/* --- TABDEELI: Title se hardcoded color hata diya hai --- */}
          <Title level={3} style={{ textAlign: 'center' }}>
            <AppstoreOutlined style={{ marginRight: '8px', color: token.colorPrimary }} /> SadaPos
          </Title>
          <Tabs 
            defaultActiveKey="1" 
            centered
            items={[
              {
                label: 'Login',
                key: '1',
                children: loginForm,
              },
              {
                label: 'Sign Up',
                key: '2',
                children: signupForm,
              },
            ]}
          />
          <Divider style={{ margin: '12px 0' }} />
          <div style={{ textAlign: 'center' }}>
            <Space size="small" split={<Divider type="vertical" />}>
              <Typography.Link href="https://www.sadapos.com/p/privacy-policy.html" target="_blank" style={{ fontSize: '12px', color: token.colorTextSecondary }}>
                Privacy
              </Typography.Link>
              <Typography.Link href="https://www.sadapos.com/p/terms-of-service.html" target="_blank" style={{ fontSize: '12px', color: token.colorTextSecondary }}>
                Terms
              </Typography.Link>
              <Typography.Link href="https://www.sadapos.com/p/refunds-policy.html" target="_blank" style={{ fontSize: '12px', color: token.colorTextSecondary }}>
                Refund
              </Typography.Link>
            </Space>
          </div>
        </Card>
        <Modal
          title="Reset Your Password"
          open={isModalVisible}
          onCancel={() => setIsModalVisible(false)}
          footer={null} // Hum form ka apna button istemal karenge
        >
          <p>Enter your email address below, and we'll send you a link to reset your password.</p>
          <Form onFinish={handlePasswordResetRequest} layout="vertical" style={{ marginTop: '20px' }}>
            <Form.Item 
              name="email" 
              label="Email" 
              rules={[{ required: true, type: 'email', message: 'Please enter a valid email!' }]}
            >
              <Input prefix={<MailOutlined />} placeholder="your@email.com" />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" loading={resetLoading} block>
                Send Reset Link
              </Button>
            </Form.Item>
          </Form>
        </Modal>

        <Modal
          title="Terminal Token Login"
          open={isTokenModalVisible}
          onCancel={() => setIsTokenModalVisible(false)}
          footer={null}
          destroyOnHidden
        >
          {!otpStep ? (
            <Form onFinish={handleTokenLogin} layout="vertical">
              <p style={{ fontSize: '13px', color: token.colorTextSecondary }}>
                Paste the Terminal Token provided by the Shop Owner to begin secure access.
              </p>
              <Form.Item name="token" label="Terminal Token" rules={[{ required: true, message: 'Please paste the token' }]}>
                <Input.TextArea rows={4} placeholder="Paste your token here..." />
              </Form.Item>
              <Button type="primary" htmlType="submit" loading={loading} block>
                Verify Token
              </Button>
            </Form>
          ) : (
            <Form onFinish={handleVerifyOtp} layout="vertical">
              <p style={{ fontSize: '13px' }}>
                Token verified. Enter the <b>6-digit code</b> sent to the Shop Owner's email.
              </p>
              <Form.Item name="otp" label="Verification Code" rules={[{ required: true, len: 6, message: 'Must be 6 digits' }]}>
                <Input 
                  placeholder="123456" 
                  maxLength={6} 
                  style={{ textAlign: 'center', fontSize: '24px', letterSpacing: '8px', fontWeight: 'bold' }} 
                />
              </Form.Item>
              <Button type="primary" htmlType="submit" loading={loading} block size="large">
                Complete Login
              </Button>
              <Button type="link" onClick={() => setOtpStep(false)} block style={{ marginTop: '8px' }}>
                Back to Token
              </Button>
            </Form>
          )}
        </Modal>
      </Content>
    </Layout>
  );
};

export default AuthPage;