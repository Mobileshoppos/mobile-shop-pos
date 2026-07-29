import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Form, Input, Button, Card, Typography, App as AntApp, Tabs, Layout, Modal, Space, Divider, Checkbox, theme, ConfigProvider } from 'antd';
import { LockOutlined, MailOutlined, AppstoreOutlined, KeyOutlined, UserOutlined } from '@ant-design/icons';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { darkThemeTokens } from '../theme/themeConfig';

const { Title, Text } = Typography;
const { Content } = Layout;

const AuthPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  // Agar URL mein ?tab=signup ho to Tab 2 (Sign Up) khulega, warna Tab 1 (Login)
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') === 'signup' ? '2' : '1');
  
  // Jab bhi URL badle to Tab bhi khud badal jaye
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab');
    if (tabFromUrl === 'signup') setActiveTab('2');
    else if (tabFromUrl === 'login') setActiveTab('1');
  }, [searchParams]);

  const { token } = theme.useToken(); // Control Center Connection
  const isMobile = useMediaQuery('(max-width: 768px)');
  const { message } = AntApp.useApp();
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [isTokenModalVisible, setIsTokenModalVisible] = useState(false);
  const [otpStep, setOtpStep] = useState(false); 
  const [tokenEmail, setTokenEmail] = useState('');
  // --- NAYA IZAFA: Magic Link States ---
  const [isMagicLinkModalVisible, setIsMagicLinkModalVisible] = useState(false);
  const [magicLinkOtpStep, setMagicLinkOtpStep] = useState(false);
  const [magicLinkEmail, setMagicLinkEmail] = useState('');

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
        options: {
          data: {
            full_name: values.fullName // NAYA IZAFA: User ka naam Supabase ko bhejna
          }
        }
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

  // --- NAYA FUNCTION: Magic Link (Email OTP) Request ---
  const handleMagicLinkRequest = async (values) => {
    try {
      setLoading(true);
      setMagicLinkEmail(values.email);
      
      const { error } = await supabase.auth.signInWithOtp({ 
        email: values.email,
        options: {
          shouldCreateUser: false // Sirf mojooda user login ho sake
        }
      });
      
      if (error) throw error;

      message.success(`A 6-digit code has been sent to ${values.email}`);
      setMagicLinkOtpStep(true);
    } catch (error) {
      console.error("Magic Link Request Error:", error);
      message.error(error.message || "Failed to send code.");
    } finally {
      setLoading(false);
    }
  };

  // --- NAYA FUNCTION: Magic Link OTP Verify ---
  const handleVerifyMagicLinkOtp = async (values) => {
    try {
      setLoading(true);

      const { error } = await supabase.auth.verifyOtp({
        email: magicLinkEmail,
        token: values.otp,
        type: 'email' 
      });

      if (error) throw error;

      message.success("Login successful!");
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
        style={{ marginBottom: '8px' }}
      >
        Login with Terminal Token
      </Button>
      {/* NAYA IZAFA: Magic Link Button */}
      <Button 
        block 
        icon={<MailOutlined />} 
        onClick={() => { setIsMagicLinkModalVisible(true); setMagicLinkOtpStep(false); }}
      >
        Login with Email OTP
      </Button>
    </Form>
  );

  const signupForm = (
     <Form onFinish={handleSignup} layout="vertical">
      {/* NAYA IZAFA: Full Name Input */}
      <Form.Item name="fullName" label="Full Name" rules={[{ required: true, message: 'Please enter your full name!' }]}>
        <Input prefix={<UserOutlined />} placeholder="e.g. Ali Raza" />
      </Form.Item>
      
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
          I agree to SadaPOS <a href="https://www.sadapos.com/terms-of-service" target="_blank" rel="noopener noreferrer">Terms of Service</a> and <a href="https://www.sadapos.com/privacy-policy" target="_blank" rel="noopener noreferrer">Privacy Policy</a>
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
    <ConfigProvider theme={{ algorithm: theme.darkAlgorithm, token: darkThemeTokens }}>
      <Layout style={{ minHeight: '100vh', background: darkThemeTokens.colorBgLayout }}>
        <Content style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: isMobile ? '12px 8px' : '20px' }}>
          {/* --- NAYA IZAFA: 2-Column Split Layout (Left: Marketing, Right: Auth Form) --- */}
          <div style={{ 
            display: 'flex', 
            flexDirection: isMobile ? 'column' : 'row', 
            width: isMobile ? '100%' : '90%', 
            maxWidth: '1200px', 
            background: darkThemeTokens.colorBgContainer, 
            borderRadius: '16px', 
            overflow: 'hidden', 
            border: `1px solid ${darkThemeTokens.colorBorderSecondary}`,
            boxShadow: '0 8px 24px rgba(0,0,0,0.2)'
          }}>

            {/* LEFT SIDE - Marketing Banner (Sirf bari screen par nazar aayega) */}
            {!isMobile && (
              <div style={{ 
                flex: 1, 
                padding: '40px', 
                display: 'flex', 
                flexDirection: 'column', 
                justifyContent: 'space-between',
                background: `linear-gradient(135deg, ${darkThemeTokens.colorBgElevated} 0%, ${darkThemeTokens.colorBgLayout} 100%)`,
                borderRight: `1px solid ${darkThemeTokens.colorBorderSecondary}`
              }}>
                <div>
                  <Title level={1} style={{ color: darkThemeTokens.colorPrimary, margin: 0, fontWeight: 900, fontSize: '42px', letterSpacing: '1px' }}>
                    SadaPOS
                  </Title>
                  <div style={{ marginTop: '24px' }}>
                    <Text style={{ color: darkThemeTokens.colorTextSecondary, fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                      Complete Shop Management
                    </Text>
                    <Title level={2} style={{ color: darkThemeTokens.colorTextHeading, marginTop: '8px', marginBottom: '16px', fontWeight: 700 }}>
                      POS & Inventory Software
                    </Title>
                    <Text style={{ color: darkThemeTokens.colorTextSecondary, fontSize: '16px', lineHeight: '1.6', display: 'block' }}>
                      All-in-one solution for point of sale, inventory tracking, invoicing, and reporting — built specifically for Pakistani businesses.
                    </Text>
                  </div>

                  <div style={{ marginTop: '40px' }}>
                    <Text style={{ color: darkThemeTokens.colorTextSecondary, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>
                      Everything you need in one place
                    </Text>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '16px' }}>
                      {['Point of Sale', 'Inventory Management', 'Invoicing', 'Customer Ledger', 'Profit Reports', 'Multi-Counter', 'Offline-First'].map(tag => (
                        <div key={tag} style={{ 
                          padding: '6px 16px', 
                          borderRadius: '20px', 
                          border: `1px solid ${darkThemeTokens.colorBorderSecondary}`,
                          background: 'rgba(255,255,255,0.03)',
                          color: darkThemeTokens.colorTextHeading,
                          fontSize: '13px'
                        }}>
                          {tag}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '40px', paddingTop: '24px', borderTop: `1px solid ${darkThemeTokens.colorBorderSecondary}` }}>
                  <div>
                    <Title level={3} style={{ margin: 0, color: darkThemeTokens.colorTextHeading }}>500+</Title>
                    <Text style={{ color: darkThemeTokens.colorTextSecondary, fontSize: '12px', textTransform: 'uppercase' }}>Shops</Text>
                  </div>
                  <div>
                    <Title level={3} style={{ margin: 0, color: darkThemeTokens.colorTextHeading }}>99.9%</Title>
                    <Text style={{ color: darkThemeTokens.colorTextSecondary, fontSize: '12px', textTransform: 'uppercase' }}>Uptime</Text>
                  </div>
                  <div>
                    <Title level={3} style={{ margin: 0, color: darkThemeTokens.colorTextHeading }}>24/7</Title>
                    <Text style={{ color: darkThemeTokens.colorTextSecondary, fontSize: '12px', textTransform: 'uppercase' }}>Offline Sync</Text>
                  </div>
                </div>
              </div>
            )}

            {/* RIGHT SIDE - Auth Form (Login/Signup) */}
            <div style={{ flex: 1, padding: isMobile ? '24px 16px' : '40px 40px 20px 40px', display: 'flex', flexDirection: 'column' }}>
              {/* Mobile par title dikhane ke liye */}
              {isMobile && (
                <Title level={3} style={{ textAlign: 'center', color: darkThemeTokens.colorTextHeading, marginBottom: '24px' }}>
                  <AppstoreOutlined style={{ marginRight: '8px', color: darkThemeTokens.colorPrimary }} /> SadaPOS
                </Title>
              )}
              <Tabs 
                activeKey={activeTab}
                onChange={(key) => {
                  setActiveTab(key);
                  // URL ko tab ke hisaab se update karein
                  setSearchParams({ tab: key === '2' ? 'signup' : 'login' });
                }} 
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
                  <Typography.Link href="https://www.sadapos.com/privacy-policy" target="_blank" style={{ fontSize: '12px', color: token.colorTextSecondary }}>
                    Privacy
                  </Typography.Link>
                  <Typography.Link href="https://www.sadapos.com/terms-of-service" target="_blank" style={{ fontSize: '12px', color: token.colorTextSecondary }}>
                    Terms
                  </Typography.Link>
                  <Typography.Link href="https://www.sadapos.com/refunds-policy" target="_blank" style={{ fontSize: '12px', color: token.colorTextSecondary }}>
                    Refund
                  </Typography.Link>
                </Space>
              </div>
            </div>
          </div>
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

        {/* --- NAYA IZAFA: Magic Link Modal --- */}
        <Modal
          title="Login with Email OTP"
          open={isMagicLinkModalVisible}
          onCancel={() => setIsMagicLinkModalVisible(false)}
          footer={null}
          destroyOnHidden
        >
          {!magicLinkOtpStep ? (
            <Form onFinish={handleMagicLinkRequest} layout="vertical">
              <p style={{ fontSize: '13px', color: token.colorTextSecondary }}>
                Enter your registered email address. We will send you a 6-digit code to securely log in without a password.
              </p>
              <Form.Item 
                name="email" 
                label="Email Address" 
                rules={[{ required: true, type: 'email', message: 'Please enter a valid email!' }]}
              >
                <Input prefix={<MailOutlined />} placeholder="your@email.com" />
              </Form.Item>
              <Button type="primary" htmlType="submit" loading={loading} block>
                Send Code
              </Button>
            </Form>
          ) : (
            <Form onFinish={handleVerifyMagicLinkOtp} layout="vertical">
              <p style={{ fontSize: '13px' }}>
                Enter the <b>6-digit code</b> sent to {magicLinkEmail}.
              </p>
              <Form.Item name="otp" label="Verification Code" rules={[{ required: true, len: 6, message: 'Must be 6 digits' }]}>
                <Input 
                  placeholder="123456" 
                  maxLength={6} 
                  style={{ textAlign: 'center', fontSize: '24px', letterSpacing: '8px', fontWeight: 'bold' }} 
                />
              </Form.Item>
              <Button type="primary" htmlType="submit" loading={loading} block size="large">
                Verify & Login
              </Button>
              <Button type="link" onClick={() => setMagicLinkOtpStep(false)} block style={{ marginTop: '8px' }}>
                Back to Email
              </Button>
            </Form>
          )}
        </Modal>
      </Content>
    </Layout>
    </ConfigProvider>
  );
};

export default AuthPage;