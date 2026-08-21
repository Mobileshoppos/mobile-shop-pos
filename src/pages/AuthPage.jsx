import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Form, Input, Button, Card, Typography, App as AntApp, Tabs, Layout, Modal, Space, Divider, Checkbox, theme, ConfigProvider } from 'antd';
import { LockOutlined, MailOutlined, AppstoreOutlined, KeyOutlined, UserOutlined } from '@ant-design/icons';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { darkThemeTokens } from '../theme/themeConfig';

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

            {/* RIGHT SIDE - Auth Form (Login/Signup / Check Inbox Screen) */}
            <div style={{ flex: 1, padding: isMobile ? '24px 16px' : '40px 40px 20px 40px', display: 'flex', flexDirection: 'column', justifyContent: isVerificationSent ? 'center' : 'flex-start' }}>
              {/* Mobile par title dikhane ke liye */}
              {isMobile && (
                <Title level={3} style={{ textAlign: 'center', color: darkThemeTokens.colorTextHeading, marginBottom: '24px' }}>
                  <AppstoreOutlined style={{ marginRight: '8px', color: darkThemeTokens.colorPrimary }} /> SadaPOS
                </Title>
              )}

              {!isVerificationSent ? (
                <>
                  {/* --- NAYA IZAFA: Prominent 1-Click Google Button --- */}
                  <Button 
                    size="large" 
                    block 
                    onClick={handleGoogleLogin}
                    loading={loading}
                    style={{ 
                      height: '46px', 
                      fontSize: '15px', 
                      fontWeight: 600, 
                      borderRadius: '8px',
                      background: 'rgba(255,255,255,0.06)',
                      borderColor: darkThemeTokens.colorBorderSecondary,
                      color: darkThemeTokens.colorTextHeading,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: '16px'
                    }}
                  >
                    <GoogleIcon /> Continue with Google
                  </Button>

                  <Divider style={{ margin: '8px 0 16px 0', fontSize: '12px', color: darkThemeTokens.colorTextSecondary }}>
                    OR
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
                </>
              ) : (
                /* --- NAYA IZAFA: Dedicated 'Check Your Inbox' Enterprise View --- */
                <div style={{ textAlign: 'center', padding: '10px 0' }}>
                  {/* Glowing Envelope Icon */}
                  <div style={{ 
                    width: '72px', 
                    height: '72px', 
                    borderRadius: '50%', 
                    background: 'rgba(26, 182, 201, 0.12)', 
                    border: `1px solid ${darkThemeTokens.colorPrimary}`,
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    margin: '0 auto 20px auto' 
                  }}>
                    <MailOutlined style={{ fontSize: '32px', color: darkThemeTokens.colorPrimary }} />
                  </div>

                  <Title level={2} style={{ color: darkThemeTokens.colorTextHeading, margin: '0 0 8px 0', fontSize: '26px', fontWeight: 700 }}>
                    Check Your Inbox
                  </Title>

                  <Text style={{ color: darkThemeTokens.colorTextSecondary, fontSize: '14px', display: 'block' }}>
                    We've sent a verification link to:
                  </Text>

                  {/* Highlighted Registered Email Tag */}
                  <div style={{ margin: '12px 0 16px 0' }}>
                    <span style={{ 
                      display: 'inline-block',
                      background: 'rgba(255,255,255,0.06)', 
                      color: darkThemeTokens.colorPrimary, 
                      padding: '6px 16px', 
                      borderRadius: '8px', 
                      border: `1px solid ${darkThemeTokens.colorBorderSecondary}`,
                      fontWeight: 600,
                      fontSize: '15px'
                    }}>
                      {registeredEmail}
                    </span>
                  </div>

                  <Text style={{ color: darkThemeTokens.colorTextSecondary, fontSize: '13px', lineHeight: '1.5', display: 'block', maxWidth: '380px', margin: '0 auto 20px auto' }}>
                    Please click the confirmation link in the email to activate your account and start setting up your shop.
                  </Text>

                  {/* 1-Click Webmail Direct Button (Vibrant Brand Color) */}
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
                        background: darkThemeTokens.colorPrimary,
                        borderColor: darkThemeTokens.colorPrimary,
                        color: '#121212'
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
                        background: darkThemeTokens.colorPrimary,
                        borderColor: darkThemeTokens.colorPrimary,
                        color: '#121212'
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
                      background: 'rgba(255,255,255,0.04)',
                      borderColor: darkThemeTokens.colorBorderSecondary,
                      color: darkThemeTokens.colorTextHeading
                    }}
                  >
                    Already verified? Proceed to Login
                  </Button>

                  {/* Troubleshooting Hint */}
                  <Text style={{ fontSize: '12px', color: darkThemeTokens.colorTextSecondary, display: 'block', marginTop: '16px' }}>
                    Can't find the email? Check your <b>Spam</b> or <b>Promotions</b> folder.
                  </Text>

                  <Divider style={{ margin: '18px 0 14px 0' }} />

                  {/* Resend Action */}
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                    <Text style={{ color: darkThemeTokens.colorTextSecondary }}>Didn't receive the email?</Text>
                    <Button 
                      type="link" 
                      disabled={resendCooldown > 0} 
                      loading={resendLoading} 
                      onClick={handleResendVerification}
                      style={{ padding: 0, fontSize: '13px', fontWeight: 600, color: darkThemeTokens.colorPrimary }}
                    >
                      {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Email'}
                    </Button>
                  </div>

                  {/* Back to Sign Up / Change Email */}
                  <div style={{ marginTop: '6px' }}>
                    <Button 
                      type="link" 
                      onClick={() => { setIsVerificationSent(false); setActiveTab('2'); }} 
                      style={{ color: darkThemeTokens.colorTextSecondary, fontSize: '12px', padding: 0 }}
                    >
                      Wrong email address? Back to Sign Up
                    </Button>
                  </div>
                </div>
              )}
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