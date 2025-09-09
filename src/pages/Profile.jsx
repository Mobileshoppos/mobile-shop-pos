import React, { useEffect, useState } from 'react';
import { Form, Input, Button, Card, Typography, Spin, App as AntApp } from 'antd';
import { SaveOutlined } from '@ant-design/icons';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';

const { Title } = Typography;

const ProfileForm = ({ initialValues, onSave, saving }) => {
  return (
    <Form
      // Form ko initialValues prop se data diya ja raha hai
      initialValues={initialValues}
      layout="vertical"
      onFinish={onSave}
    >
      <Form.Item
        name="full_name"
        label="Your Full Name"
        rules={[{ required: true, message: 'Please enter your full name!' }]}
      >
        <Input placeholder="e.g., Ali Khan" />
      </Form.Item>

      <Form.Item
        name="shop_name"
        label="Shop Name"
        rules={[{ required: true, message: 'Please enter your shop name!' }]}
      >
        <Input placeholder="e.g., Ali Mobile Shop" />
      </Form.Item>

      <Form.Item
        name="phone_number"
        label="Phone Number"
      >
        <Input placeholder="e.g., 0300-1234567" />
      </Form.Item>

      <Form.Item
        name="address"
        label="Shop Address"
      >
        <Input.TextArea rows={3} placeholder="Enter your full shop address" />
      </Form.Item>

      <Form.Item>
        <Button 
          type="primary" 
          htmlType="submit" 
          icon={<SaveOutlined />}
          loading={saving}
        >
          Save Changes
        </Button>
      </Form.Item>
    </Form>
  );
};

const Profile = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  // Profile data ko store karne ke liye nayi state
  const [profileData, setProfileData] = useState(null);
  const { message } = AntApp.useApp();

  useEffect(() => {
    const getProfile = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('full_name, shop_name, phone_number, address')
          .eq('user_id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') {
          throw error;
        }
        
        // Agar data mil jaye to state mein set karein, warna empty object set karein
        setProfileData(data || { full_name: '', shop_name: '', phone_number: '', address: '' });

      } catch (error) {
        message.error('Error loading profile: ' + error.message);
      } finally {
        setLoading(false);
      }
    };

    getProfile();
  }, [user, message]);

  const handleUpdateProfile = async (values) => {
    setSaving(true);
    try {
      if (!user) {
        message.error("No user found to update profile.");
        return;
      }

      // Supabase ka 'upsert' function istemal karenge. 
      // Yeh khud check kar lega ke record update karna hai ya naya banana hai.
      const { error } = await supabase
        .from('profiles')
        .upsert({ ...values, user_id: user.id }, { onConflict: 'user_id' });

      if (error) {
        throw error;
      }
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
      
      {loading ? (
        // Jab tak data load ho raha hai, spinner dikhayein
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <Spin size="large" />
          <p style={{ marginTop: '16px' }}>Loading Profile...</p>
        </div>
      ) : (
        // Jab data aa jaye, tab hi Form component ko render karein
        <ProfileForm 
          initialValues={profileData} 
          onSave={handleUpdateProfile} 
          saving={saving} 
        />
      )}
    </Card>
  );
};

export default Profile;