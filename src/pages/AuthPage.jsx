import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Form, Input, Button, Card, Typography, App as AntApp, Tabs, Layout, Modal, Space, Divider, Checkbox, theme, ConfigProvider, Row, Col } from 'antd';
import { LockOutlined, MailOutlined, AppstoreOutlined, KeyOutlined, UserOutlined } from '@ant-design/icons';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { lightThemeTokens } from '../theme/themeConfig';

const { Title, Text } = Typography;
const { Content } = Layout;

// Multicolored Google SVG Icon
const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" style={{ verticalAlign: 'middle', marginRight: '10px' }}>
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
  </svg>
);

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

  // --- NAYA IZAFA: Dedicated Email Verification Screen States ---
  const [isVerificationSent, setIsVerificationSent] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [resendLoading, setResetLoadingState] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Resend Timer countdown effect
  useEffect(() => {
    let timer;
    if (resendCooldown > 0) {
      timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  // Direct Webmail Inbox URL Helper
  const getMailProviderUrl = (email) => {
    if (!email) return null;
    const lower = email.toLowerCase();
    if (lower.includes('@gmail.com')) return 'https://mail.google.com';
    if (lower.includes('@outlook.com') || lower.includes('@hotmail.com') || lower.includes('@live.com')) return 'https://outlook.live.com';
    if (lower.includes('@yahoo.com')) return 'https://mail.yahoo.com';
    if (lower.includes('@icloud.com')) return 'https://www.icloud.com/mail';
    return null;
  };

  // Direct Webmail Button Name Helper
  const getMailProviderName = (email) => {
    if (!email) return 'Open Email App';
    const lower = email.toLowerCase();
    if (lower.includes('@gmail.com')) return 'Open Gmail Inbox';
    if (lower.includes('@outlook.com') || lower.includes('@hotmail.com') || lower.includes('@live.com')) return 'Open Outlook Inbox';
    if (lower.includes('@yahoo.com')) return 'Open Yahoo Mail';
    return 'Open Email App';
  };

  // Resend Verification Email Function
  const handleResendVerification = async () => {
    if (!registeredEmail || resendCooldown > 0) return;
    try {
      setResetLoadingState(true);
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: registeredEmail
      });
      if (error) throw error;
      message.success('Verification link re-sent! Please check your inbox.');
      setResendCooldown(60); // 60 seconds cooldown
    } catch (err) {
      message.error(err.message || 'Failed to resend email.');
    } finally {
      setResetLoadingState(false);
    }
  };

  // --- NAYA IZAFA: 1-Click Google OAuth Login ---
  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`
        }
      });
      if (error) throw error;
    } catch (error) {
      console.error("Google Auth Error:", error);
      message.error(error.message || "Failed to connect with Google.");
      setLoading(false);
    }
  };

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
      
      // FIX: Toast message ke bajaye screen ko Dedicated Verification View par shift karein
      setRegisteredEmail(values.email);
      setIsVerificationSent(true);
      setResendCooldown(60); // 60 seconds timer
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
    <Form onFinish={handleLogin} layout="vertical" style={{ marginTop: '12px' }}>
      <Form.Item name="email" label={<Text strong style={{ fontSize: '13px', color: '#202124' }}>Email Address</Text>} rules={[{ required: true, type: 'email', message: 'Please enter a valid email!' }]}>
        <Input prefix={<MailOutlined style={{ color: '#5F6368' }} />} placeholder="your@email.com" size="large" style={{ borderRadius: '8px' }} />
      </Form.Item>
      
      <Form.Item name="password" label={<Text strong style={{ fontSize: '13px', color: '#202124' }}>Password</Text>} rules={[{ required: true, message: 'Please enter your password!' }]}>
        <Input.Password prefix={<LockOutlined style={{ color: '#5F6368' }} />} placeholder="Enter your password" size="large" style={{ borderRadius: '8px' }} />
      </Form.Item>
      
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px', marginTop: '-4px' }}>
        <Button type="link" onClick={() => setIsModalVisible(true)} style={{ padding: 0, fontSize: '13px', color: '#1A73E8', fontWeight: 500 }}>
          Forgot Password?
        </Button>
      </div>

      <Form.Item style={{ marginBottom: '16px' }}>
        <Button 
          type="primary" 
          htmlType="submit" 
          loading={loading} 
          block 
          size="large"
          style={{ 
            height: '46px', 
            borderRadius: '8px', 
            fontSize: '15px', 
            fontWeight: 700,
            background: '#1A73E8',
            boxShadow: '0 4px 12px rgba(26, 115, 232, 0.3)'
          }}
        >
          Sign In
        </Button>
      </Form.Item>

      <Divider style={{ margin: '16px 0', fontSize: '12px', color: '#5F6368' }}>Secondary Options</Divider>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <Button 
          block 
          icon={<KeyOutlined style={{ color: '#5F6368' }} />} 
          onClick={() => { setIsTokenModalVisible(true); setOtpStep(false); }}
          style={{ height: '40px', borderRadius: '8px', fontWeight: 500, borderColor: '#DADCE0' }}
        >
          Login with Terminal Token
        </Button>
        
        <Button 
          block 
          icon={<MailOutlined style={{ color: '#5F6368' }} />} 
          onClick={() => { setIsMagicLinkModalVisible(true); setMagicLinkOtpStep(false); }}
          style={{ height: '40px', borderRadius: '8px', fontWeight: 500, borderColor: '#DADCE0' }}
        >
          Login with Email OTP
        </Button>
      </div>
    </Form>
  );

  const signupForm = (
    <Form onFinish={handleSignup} layout="vertical" style={{ marginTop: '12px' }}>
      <Form.Item name="fullName" label={<Text strong style={{ fontSize: '13px', color: '#202124' }}>Full Name</Text>} rules={[{ required: true, message: 'Please enter your full name!' }]}>
        <Input prefix={<UserOutlined style={{ color: '#5F6368' }} />} placeholder="e.g. Ali Raza" size="large" style={{ borderRadius: '8px' }} />
      </Form.Item>
      
      <Form.Item name="email" label={<Text strong style={{ fontSize: '13px', color: '#202124' }}>Email Address</Text>} rules={[{ required: true, type: 'email', message: 'Please enter a valid email!' }]}>
        <Input prefix={<MailOutlined style={{ color: '#5F6368' }} />} placeholder="your@email.com" size="large" style={{ borderRadius: '8px' }} />
      </Form.Item>
      
      <Form.Item name="password" label={<Text strong style={{ fontSize: '13px', color: '#202124' }}>Password</Text>} rules={[{ required: true, min: 6, message: 'Password must be at least 6 characters long!' }]}>
        <Input.Password prefix={<LockOutlined style={{ color: '#5F6368' }} />} placeholder="Create a strong password (6+ chars)" size="large" style={{ borderRadius: '8px' }} />
      </Form.Item>
      
      <Form.Item
        name="agreement"
        valuePropName="checked"
        rules={[
          {
            validator: (_, value) =>
              value ? Promise.resolve() : Promise.reject(new Error('Please accept the agreement to continue')),
          },
        ]}
      >
        <Checkbox style={{ fontSize: '12px', color: '#5F6368' }}>
          I agree to SadaPOS <a href="https://www.sadapos.com/terms-of-service" target="_blank" rel="noopener noreferrer" style={{ color: '#1A73E8' }}>Terms</a> & <a href="https://www.sadapos.com/privacy-policy" target="_blank" rel="noopener noreferrer" style={{ color: '#1A73E8' }}>Privacy Policy</a>
        </Checkbox>
      </Form.Item>
      
      <Form.Item>
        <Button 
          type="primary" 
          htmlType="submit" 
          loading={loading} 
          block 
          size="large"
          style={{ 
            height: '46px', 
            borderRadius: '8px', 
            fontSize: '15px', 
            fontWeight: 700,
            background: '#1A73E8',
            boxShadow: '0 4px 12px rgba(26, 115, 232, 0.3)'
          }}
        >
          Create Free Account
        </Button>
      </Form.Item>
    </Form>
  );

  return (
    <ConfigProvider theme={{ algorithm: theme.defaultAlgorithm, token: lightThemeTokens }}>
      <Layout style={{ minHeight: '100vh', background: lightThemeTokens.colorBgLayout }}>
        <Content style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: isMobile ? '12px 8px' : '30px 20px' }}>
          {/* --- NAYA IZAFA: 2-Column Split Layout (Left: Marketing, Right: Auth Form) --- */}
          <div style={{ 
            display: 'flex', 
            flexDirection: isMobile ? 'column' : 'row', 
            width: isMobile ? '100%' : '92%', 
            maxWidth: '1160px', 
            background: '#FFFFFF', 
            borderRadius: '20px', 
            overflow: 'hidden', 
            border: `1px solid ${lightThemeTokens.colorBorder}`,
            boxShadow: '0 12px 40px rgba(0,0,0,0.06)'
          }}>

            {/* LEFT SIDE - Brand Showcase Banner */}
            {!isMobile && (
              <div style={{ 
                flex: 1.1, 
                padding: '48px 40px', 
                display: 'flex', 
                flexDirection: 'column', 
                justifyContent: 'space-between',
                background: `linear-gradient(145deg, #FFFFFF 0%, #F8FAFC 50%, ${lightThemeTokens.colorBgLayout} 100%)`,
                borderRight: `1px solid ${lightThemeTokens.colorBorder}`
              }}>
                <div>
                  {/* Official 4-Square Brand Logo */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
                    <svg width="34" height="34" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M4 5C4 4.44772 4.44772 4 5 4H13C13.5523 4 14 4.44772 14 5V13C14 13.5523 13.5523 14 13 14H5C4.44772 14 4 13.5523 4 13V5Z" fill="#1A73E8" />
                      <path d="M18 5C18 4.44772 18.4477 4 19 4H27C27.5523 4 28 4.44772 28 5V13C28 13.5523 27.5523 14 27 14H19C18.4477 14 18 13.5523 18 13V5Z" fill="#1A73E8" fillOpacity="0.6" />
                      <path d="M4 19C4 18.4477 4.44772 18 5 18H13C13.5523 18 14 18.4477 14 19V27C14 27.5523 13.5523 28 13 28H5C4.44772 28 4 27.5523 4 27V19Z" fill="#1A73E8" fillOpacity="0.6" />
                      <path d="M18 19C18 18.4477 18.4477 18 19 18H27C27.5523 18 28 18.4477 28 19V27C28 27.5523 27.5523 28 27 28H19C18.4477 28 18 27.5523 18 27V19Z" fill="#1A73E8" />
                    </svg>
                    <span style={{ fontSize: '26px', fontWeight: '800', color: '#202124', letterSpacing: '-0.5px' }}>
                      Sada<span style={{ color: '#1A73E8' }}> POS</span>
                    </span>
                  </div>

                  <div>
                    <span style={{ 
                      fontSize: '11px', 
                      fontWeight: 700, 
                      letterSpacing: '1.2px', 
                      textTransform: 'uppercase', 
                      color: '#1A73E8',
                      background: 'rgba(26, 115, 232, 0.08)',
                      padding: '4px 10px',
                      borderRadius: '12px'
                    }}>
                      Complete Retail Operating System
                    </span>

                    <Title level={2} style={{ color: '#202124', marginTop: '14px', marginBottom: '14px', fontWeight: 800, fontSize: '32px', lineHeight: 1.25 }}>
                      Manage your shop with confidence & speed.
                    </Title>
                    
                    <Text style={{ color: '#5F6368', fontSize: '15px', lineHeight: '1.6', display: 'block', maxWidth: '440px' }}>
                      Fast point of sale, intelligent inventory tracking, customer khata ledgers, and profit reporting — fully offline-first.
                    </Text>
                  </div>

                  {/* Modern Feature Pills */}
                  <div style={{ marginTop: '32px' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {['⚡ Point of Sale', '📦 Smart Inventory', '🧾 Thermal Invoicing', '👥 Customer Ledgers', '📈 Profit Analytics', '🏢 Multi-Counter', '📡 Offline-First'].map(tag => (
                        <div key={tag} style={{ 
                          padding: '6px 14px', 
                          borderRadius: '16px', 
                          border: `1px solid ${lightThemeTokens.colorBorder}`,
                          background: '#FFFFFF',
                          color: '#202124',
                          fontWeight: 500,
                          fontSize: '12.5px',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                        }}>
                          {tag}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 3 Metric Trust Cards */}
                <div style={{ marginTop: '36px', paddingTop: '24px', borderTop: `1px solid ${lightThemeTokens.colorBorder}` }}>
                  <Row gutter={12}>
                    <Col span={8}>
                      <div style={{ background: '#FFFFFF', padding: '12px 10px', borderRadius: '10px', border: `1px solid ${lightThemeTokens.colorBorder}`, textAlign: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
                        <div style={{ fontSize: '20px', fontWeight: '800', color: '#1A73E8' }}>5,000+</div>
                        <div style={{ fontSize: '11px', fontWeight: 600, color: '#5F6368', textTransform: 'uppercase', marginTop: '2px' }}>Shops</div>
                      </div>
                    </Col>
                    <Col span={8}>
                      <div style={{ background: '#FFFFFF', padding: '12px 10px', borderRadius: '10px', border: `1px solid ${lightThemeTokens.colorBorder}`, textAlign: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
                        <div style={{ fontSize: '20px', fontWeight: '800', color: '#1A73E8' }}>99.9%</div>
                        <div style={{ fontSize: '11px', fontWeight: 600, color: '#5F6368', textTransform: 'uppercase', marginTop: '2px' }}>Uptime</div>
                      </div>
                    </Col>
                    <Col span={8}>
                      <div style={{ background: '#FFFFFF', padding: '12px 10px', borderRadius: '10px', border: `1px solid ${lightThemeTokens.colorBorder}`, textAlign: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
                        <div style={{ fontSize: '20px', fontWeight: '800', color: '#1A73E8' }}>24/7</div>
                        <div style={{ fontSize: '11px', fontWeight: 600, color: '#5F6368', textTransform: 'uppercase', marginTop: '2px' }}>Offline Sync</div>
                      </div>
                    </Col>
                  </Row>
                </div>
              </div>
            )}

            {/* RIGHT SIDE - Auth Form Box */}
            <div style={{ 
              flex: 1, 
              padding: isMobile ? '28px 20px' : '48px 44px 28px 44px', 
              display: 'flex', 
              flexDirection: 'column', 
              justifyContent: isVerificationSent ? 'center' : 'flex-start' 
            }}>
              
              {/* Mobile Brand Logo */}
              {isMobile && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '24px' }}>
                  <svg width="28" height="28" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M4 5C4 4.44772 4.44772 4 5 4H13C13.5523 4 14 4.44772 14 5V13C14 13.5523 13.5523 14 13 14H5C4.44772 14 4 13.5523 4 13V5Z" fill="#1A73E8" />
                    <path d="M18 5C18 4.44772 18.4477 4 19 4H27C27.5523 4 28 4.44772 28 5V13C28 13.5523 27.5523 14 27 14H19C18.4477 14 18 13.5523 18 13V5Z" fill="#1A73E8" fillOpacity="0.6" />
                    <path d="M4 19C4 18.4477 4.44772 18 5 18H13C13.5523 18 14 18.4477 14 19V27C14 27.5523 13.5523 28 13 28H5C4.44772 28 4 27.5523 4 27V19Z" fill="#1A73E8" fillOpacity="0.6" />
                    <path d="M18 19C18 18.4477 18.4477 18 19 18H27C27.5523 18 28 18.4477 28 19V27C28 27.5523 27.5523 28 27 28H19C18.4477 28 18 27.5523 18 27V19Z" fill="#1A73E8" />
                  </svg>
                  <span style={{ fontSize: '22px', fontWeight: '800', color: '#202124' }}>
                    Sada<span style={{ color: '#1A73E8' }}> POS</span>
                  </span>
                </div>
              )}

              {!isVerificationSent ? (
                <>
                  {/* Authentic 1-Click Google OAuth Button */}
                  <Button 
                    size="large" 
                    block 
                    onClick={handleGoogleLogin}
                    loading={loading}
                    style={{ 
                      height: '48px', 
                      fontSize: '15px', 
                      fontWeight: 600, 
                      borderRadius: '8px',
                      background: '#FFFFFF',
                      borderColor: '#DADCE0',
                      color: '#3C4043',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                      marginBottom: '18px'
                    }}
                  >
                    <GoogleIcon /> Continue with Google
                  </Button>

                  <Divider style={{ margin: '8px 0 16px 0', fontSize: '12px', color: '#5F6368' }}>
                    OR CONTINUE WITH EMAIL
                  </Divider>

                  <Tabs 
                    activeKey={activeTab}
                    onChange={(key) => {
                      setActiveTab(key);
                      setSearchParams({ tab: key === '2' ? 'signup' : 'login' });
                    }} 
                    centered
                    items={[
                      {
                        label: <span style={{ fontSize: '15px', fontWeight: 600 }}>Sign In</span>,
                        key: '1',
                        children: loginForm,
                      },
                      {
                        label: <span style={{ fontSize: '15px', fontWeight: 600 }}>Create Account</span>,
                        key: '2',
                        children: signupForm,
                      },
                    ]}
                  />
                </>
              ) : (
                /* --- NAYA IZAFA: Dedicated 'Check Your Inbox' Enterprise View --- */
                <div style={{ textAlign: 'center', padding: '10px 0' }}>
                  {/* Glowing Envelope Icon */}
                  <div style={{ 
                    width: '72px', 
                    height: '72px', 
                    borderRadius: '50%', 
                    background: 'rgba(9, 99, 126, 0.1)', 
                    border: `1px solid ${lightThemeTokens.colorMenuSelectedText || '#09637E'}`,
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    margin: '0 auto 20px auto' 
                  }}>
                    <MailOutlined style={{ fontSize: '32px', color: lightThemeTokens.colorMenuSelectedText || '#09637E' }} />
                  </div>

                  <Title level={2} style={{ color: lightThemeTokens.colorTextHeading, margin: '0 0 8px 0', fontSize: '26px', fontWeight: 700 }}>
                    Check Your Inbox
                  </Title>

                  <Text style={{ color: lightThemeTokens.colorTextSecondary, fontSize: '14px', display: 'block' }}>
                    We've sent a verification link to:
                  </Text>

                  {/* Highlighted Registered Email Tag */}
                  <div style={{ margin: '12px 0 16px 0' }}>
                    <span style={{ 
                      display: 'inline-block',
                      background: lightThemeTokens.colorBgLayout, 
                      color: lightThemeTokens.colorMenuSelectedText || '#09637E', 
                      padding: '6px 16px', 
                      borderRadius: '8px', 
                      border: `1px solid ${lightThemeTokens.colorBorder}`,
                      fontWeight: 600,
                      fontSize: '15px'
                    }}>
                      {registeredEmail}
                    </span>
                  </div>

                  <Text style={{ color: lightThemeTokens.colorTextSecondary, fontSize: '13px', lineHeight: '1.5', display: 'block', maxWidth: '380px', margin: '0 auto 20px auto' }}>
                    Please click the confirmation link in the email to activate your account and start setting up your shop.
                  </Text>

                  {/* 1-Click Webmail Direct Button */}
                  {getMailProviderUrl(registeredEmail) ? (
                    <Button 
                      type="primary" 
                      size="large" 
                      block 
                      icon={<MailOutlined />}
                      href={getMailProviderUrl(registeredEmail)}
                      target="_blank"
                      style={{ 
                        height: '46px', 
                        fontSize: '15px', 
                        fontWeight: 700, 
                        borderRadius: '8px',
                        background: lightThemeTokens.colorMenuSelectedText || '#09637E',
                        borderColor: lightThemeTokens.colorMenuSelectedText || '#09637E',
                        color: '#FFFFFF'
                      }}
                    >
                      {getMailProviderName(registeredEmail)}
                    </Button>
                  ) : (
                    <Button 
                      type="primary" 
                      size="large" 
                      block 
                      icon={<MailOutlined />}
                      href={`mailto:${registeredEmail}`}
                      style={{ 
                        height: '46px', 
                        fontSize: '15px', 
                        fontWeight: 700, 
                        borderRadius: '8px',
                        background: lightThemeTokens.colorMenuSelectedText || '#09637E',
                        borderColor: lightThemeTokens.colorMenuSelectedText || '#09637E',
                        color: '#FFFFFF'
                      }}
                    >
                      Open Email App
                    </Button>
                  )}

                  {/* Secondary Action: Already Verified (Direct Login) */}
                  <Button 
                    type="default" 
                    size="large" 
                    block 
                    onClick={() => { 
                      setIsVerificationSent(false); 
                      setActiveTab('1'); 
                      setSearchParams({ tab: 'login' }); 
                    }}
                    style={{ 
                      height: '42px', 
                      fontSize: '14px', 
                      fontWeight: 600, 
                      borderRadius: '8px',
                      marginTop: '10px',
                      background: '#FFFFFF',
                      borderColor: lightThemeTokens.colorBorder,
                      color: lightThemeTokens.colorText
                    }}
                  >
                    Already verified? Proceed to Login
                  </Button>

                  {/* Troubleshooting Hint */}
                  <Text style={{ fontSize: '12px', color: lightThemeTokens.colorTextSecondary, display: 'block', marginTop: '16px' }}>
                    Can't find the email? Check your <b>Spam</b> or <b>Promotions</b> folder.
                  </Text>

                  <Divider style={{ margin: '18px 0 14px 0' }} />

                  {/* Resend Action */}
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                    <Text style={{ color: lightThemeTokens.colorTextSecondary }}>Didn't receive the email?</Text>
                    <Button 
                      type="link" 
                      disabled={resendCooldown > 0} 
                      loading={resendLoading} 
                      onClick={handleResendVerification}
                      style={{ padding: 0, fontSize: '13px', fontWeight: 600, color: lightThemeTokens.colorMenuSelectedText || '#09637E' }}
                    >
                      {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Email'}
                    </Button>
                  </div>

                  {/* Back to Sign Up / Change Email */}
                  <div style={{ marginTop: '6px' }}>
                    <Button 
                      type="link" 
                      onClick={() => { setIsVerificationSent(false); setActiveTab('2'); }} 
                      style={{ color: lightThemeTokens.colorTextSecondary, fontSize: '12px', padding: 0 }}
                    >
                      Wrong email address? Back to Sign Up
                    </Button>
                  </div>
                </div>
              )}
              <Divider style={{ margin: '12px 0' }} />
              <div style={{ textAlign: 'center' }}>
                <Space size="small" split={<Divider type="vertical" />}>
                  <Typography.Link href="https://www.sadapos.com/privacy-policy" target="_blank" style={{ fontSize: '12px', color: lightThemeTokens.colorTextSecondary }}>
                    Privacy
                  </Typography.Link>
                  <Typography.Link href="https://www.sadapos.com/terms-of-service" target="_blank" style={{ fontSize: '12px', color: lightThemeTokens.colorTextSecondary }}>
                    Terms
                  </Typography.Link>
                  <Typography.Link href="https://www.sadapos.com/refunds-policy" target="_blank" style={{ fontSize: '12px', color: lightThemeTokens.colorTextSecondary }}>
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