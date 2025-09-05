import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Form, Input, Button, Card, Typography, App as AntApp, Tabs } from 'antd';
import { LockOutlined, MailOutlined } from '@ant-design/icons';

const { Title } = Typography;

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
      message.success('Signup successful! Please login now.');
    } catch (error) {
      message.error(error.message);
    } finally {
      setLoading(false);
    }
  };
  
  const loginForm = (
    <Form onFinish={handleLogin}>
      <Form.Item name="email" rules={[{ required: true, type: 'email', message: 'Please enter a valid email!' }]}><Input prefix={<MailOutlined />} placeholder="Email" /></Form.Item>
      <Form.Item name="password" rules={[{ required: true, message: 'Please enter your password!' }]}><Input.Password prefix={<LockOutlined />} placeholder="Password" /></Form.Item>
      <Form.Item><Button type="primary" htmlType="submit" loading={loading} block>Log In</Button></Form.Item>
    </Form>
  );

  const signupForm = (
     <Form onFinish={handleSignup}>
      <Form.Item name="email" rules={[{ required: true, type: 'email', message: 'Please enter a valid email!' }]}><Input prefix={<MailOutlined />} placeholder="Email" /></Form.Item>
      <Form.Item name="password" rules={[{ required: true, min: 6, message: 'Password must be at least 6 characters long!' }]}><Input.Password prefix={<LockOutlined />} placeholder="Password (min. 6 characters)" /></Form.Item>
      <Form.Item><Button type="primary" htmlType="submit" loading={loading} block>Sign Up</Button></Form.Item>
    </Form>
  );

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#141414' }}>
      <Card style={{ width: 400, background: '#1f1f1f', border: '1px solid #303030' }}>
        <Title level={3} style={{ textAlign: 'center', color: 'white' }}>Mobile Shop POS</Title>
        <Tabs defaultActiveKey="1" centered>
          <Tabs.TabPane tab="Login" key="1">{loginForm}</Tabs.TabPane>
          <Tabs.TabPane tab="Sign Up" key="2">{signupForm}</Tabs.TabPane>
        </Tabs>
      </Card>
    </div>
  );
};

export default AuthPage;