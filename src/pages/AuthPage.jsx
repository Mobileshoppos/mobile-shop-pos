import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Form, Input, Button, Card, Typography, App as AntApp, Tabs, Layout, Modal } from 'antd';
import { LockOutlined, MailOutlined, AppstoreOutlined } from '@ant-design/icons';

const { Title } = Typography;
const { Content } = Layout;

const AuthPage = () => {
  const { message } = AntApp.useApp();
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

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
      <Form.Item>
        <Button type="primary" htmlType="submit" loading={loading} block size="large">
          Sign Up
        </Button>
      </Form.Item>
    </Form>
  );

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Content style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
        {/* --- TABDEELI: Card se saari hardcoded styles hata di hain --- */}
        <Card style={{ width: 400, maxWidth: '100%' }}>
          {/* --- TABDEELI: Title se hardcoded color hata diya hai --- */}
          <Title level={3} style={{ textAlign: 'center' }}>
            <AppstoreOutlined style={{ marginRight: '8px', color: '#1890ff' }} /> SadaPos
          </Title>
          <Tabs defaultActiveKey="1" centered>
            <Tabs.TabPane tab="Login" key="1">{loginForm}</Tabs.TabPane>
            <Tabs.TabPane tab="Sign Up" key="2">{signupForm}</Tabs.TabPane>
          </Tabs>
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
      </Content>
    </Layout>
  );
};

export default AuthPage;