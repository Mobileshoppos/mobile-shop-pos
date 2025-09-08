// src/pages/AuthPage.jsx (Mukammal naya aur aakhri theek kiya hua code)

import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Form, Input, Button, Card, Typography, App as AntApp, Tabs, Layout } from 'antd';
import { LockOutlined, MailOutlined } from '@ant-design/icons';

const { Title } = Typography;
const { Content } = Layout;

const AuthPage = () => {
  const { message } = AntApp.useApp();
  const [loading, setLoading] = useState(false);

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
  
  const loginForm = (
    <Form onFinish={handleLogin} layout="vertical">
      <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email', message: 'Please enter a valid email!' }]}>
        <Input prefix={<MailOutlined />} placeholder="your@email.com" />
      </Form.Item>
      <Form.Item name="password" label="Password" rules={[{ required: true, message: 'Please enter your password!' }]}>
        <Input.Password prefix={<LockOutlined />} placeholder="Password" />
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
    // --- TABDEELI: Hum ne Layout component istemal kiya hai jo theme se background khud le lega ---
    <Layout style={{ minHeight: '100vh' }}>
      <Content style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
        {/* --- TABDEELI: Card se saari hardcoded styles hata di hain --- */}
        <Card style={{ width: 400, maxWidth: '100%' }}>
          {/* --- TABDEELI: Title se hardcoded color hata diya hai --- */}
          <Title level={3} style={{ textAlign: 'center' }}>Mobile Shop POS</Title>
          <Tabs defaultActiveKey="1" centered>
            <Tabs.TabPane tab="Login" key="1">{loginForm}</Tabs.TabPane>
            <Tabs.TabPane tab="Sign Up" key="2">{signupForm}</Tabs.TabPane>
          </Tabs>
        </Card>
      </Content>
    </Layout>
  );
};

export default AuthPage;