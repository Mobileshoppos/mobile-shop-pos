// src/pages/Profile.jsx - MODIFIED (Sirf chand lines tabdeel hui hain)

import React, { useEffect, useState } from 'react';
import { Form, Input, Button, Card, Typography, Spin, App as AntApp, Divider } from 'antd';
import { SaveOutlined, LockOutlined } from '@ant-design/icons';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';

const { Title, Text } = Typography;

const ProfileForm = ({ initialValues, onSave, saving }) => (
  <Form initialValues={initialValues} layout="vertical" onFinish={onSave}>
    <Form.Item name="full_name" label="Your Full Name" rules={[{ required: true, message: 'Please enter your full name!' }]}>
      <Input placeholder="e.g., Ali Khan" />
    </Form.Item>
    <Form.Item name="shop_name" label="Shop Name" rules={[{ required: true, message: 'Please enter your shop name!' }]}>
      <Input placeholder="e.g., Ali Mobile Shop" />
    </Form.Item>
    <Form.Item name="phone_number" label="Phone Number">
      <Input placeholder="e.g., 0300-1234567" />
    </Form.Item>
    <Form.Item name="address" label="Shop Address">
      <Input.TextArea rows={3} placeholder="Enter your full shop address" />
    </Form.Item>
    <Form.Item>
      <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={saving}>
        Save Changes
      </Button>
    </Form.Item>
  </Form>
);

const ChangePasswordForm = () => {
  const [form] = Form.useForm();
  const { message } = AntApp.useApp();
  const [updating, setUpdating] = useState(false);
  const handlePasswordChange = async (values) => {
    setUpdating(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: values.new_password });
      if (error) throw error;
      message.success('Password updated successfully! Please use the new password to log in next time.');
      form.resetFields();
    } catch (error) {
      message.error('Error updating password: ' + error.message);
    } finally {
      setUpdating(false);
    }
  };
  return (
    <>
      <Divider />
      <Title level={4}>Change Password</Title>
      <Text type="secondary">For security, you will be logged out of other sessions after changing your password.</Text>
      <Form form={form} layout="vertical" onFinish={handlePasswordChange} style={{ marginTop: '16px' }}>
        <Form.Item name="new_password" label="New Password" rules={[{ required: true, message: 'Please enter your new password!' }, { min: 6, message: 'Password must be at least 6 characters long.' }]} hasFeedback>
          <Input.Password placeholder="Enter new password" />
        </Form.Item>
        <Form.Item name="confirm_password" label="Confirm New Password" dependencies={['new_password']} hasFeedback rules={[{ required: true, message: 'Please confirm your new password!' }, ({ getFieldValue }) => ({ validator(_, value) { if (!value || getFieldValue('new_password') === value) { return Promise.resolve(); } return Promise.reject(new Error('The two passwords that you entered do not match!')); }, }),]}>
          <Input.Password placeholder="Confirm new password" />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit" icon={<LockOutlined />} loading={updating}>
            Update Password
          </Button>
        </Form.Item>
      </Form>
    </>
  );
};

const Profile = () => {
  const { user, profile, updateProfile } = useAuth();
  const [saving, setSaving] = useState(false);
  const { message } = AntApp.useApp();

  const handleUpdateProfile = async (values) => {
    setSaving(true);
    try {
      // Hum ab direct AuthContext ka function use karenge
      const { success, error } = await updateProfile(values);
      
      if (!success) throw error;
      
      message.success('Profile updated successfully!');
    } catch (error) {
      console.error("Profile update failed:", error);
      message.error('Error updating profile: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <Title level={3}>Profile and Shop Information</Title>
      <p>Keep your shop and personal details up to date.</p>
      
      {/* Agar profile abhi load nahi hua to Spin dikhayein */}
      {!profile ? (
        <div style={{ textAlign: 'center', padding: '50px' }}><Spin size="large" /></div>
      ) : (
        <>
          <ProfileForm 
            initialValues={profile} 
            onSave={handleUpdateProfile} 
            saving={saving} 
            key={JSON.stringify(profile)} 
          />
          <ChangePasswordForm />
        </>
      )}
    </Card>
  );
};

export default Profile;