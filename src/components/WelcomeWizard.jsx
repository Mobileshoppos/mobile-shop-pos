import React, { useState } from 'react';
import { Modal, Form, Input, Select, Button, Typography, Space, App } from 'antd';
import { ShopOutlined, GlobalOutlined, PhoneOutlined, HomeOutlined, LockOutlined } from '@ant-design/icons';
import { useAuth } from '../context/AuthContext';
import bcrypt from 'bcryptjs';
import DataService from '../DataService'; // <--- NAYA IZAFA

const { Title, Text } = Typography;

const WelcomeWizard = () => {
  const { profile, updateProfile } = useAuth();
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);

  // Agar setup pehle hi ho chuka hai ya profile nahi hai, to kuch na dikhayein
  if (!profile || profile.is_setup_completed) return null;

  const handleSave = async (values) => {
    setLoading(true);
    try {
      // PIN ko encrypt (hash) karein
      const hashedPin = bcrypt.hashSync(values.master_pin, 10);
      
      // LocalStorage mein bhi save karein taake lock screen foran kaam kare
      localStorage.setItem('device_master_pin', hashedPin);

      const updates = {
        ...values,
        master_pin: hashedPin, // Hashed PIN save ho raha hai
        is_setup_completed: true,
        updated_at: new Date().toISOString(),
      };
      const { success, error } = await updateProfile(updates);
      if (success) {
        // NAYA IZAFA: User ke business ke hisaab se categories banayein
        await DataService.initializeUserCategories(profile.user_id, values.business_type);
        message.success('Welcome! Your shop is ready. Please open a shift to start selling.');
      } else {
        throw error;
      }
    } catch (error) {
      message.error('Failed to save settings: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={true}
      closable={false}
      maskClosable={false}
      footer={null}
      centered
      width={500}
    >
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0 }}>Welcome to Your Shop! 🎉</Title>
        <Text type="secondary">Let's quickly set up your basic shop details.</Text>
      </div>

      {/* NAYA IZAFA: initialValues mein business_type shamil kiya */}
      <Form layout="vertical" onFinish={handleSave} initialValues={{ currency: 'PKR', business_type: 'Mobile Shop' }}>
        
        {/* NAYA IZAFA: Business Type ka sawal */}
        <Form.Item name="business_type" label="Business Type" rules={[{ required: true }]}>
          <Select prefix={<ShopOutlined />}>
            <Select.Option value="Mobile Shop">Mobile & Electronics</Select.Option>
            <Select.Option value="Crockery">Crockery & Glassware</Select.Option>
          </Select>
        </Form.Item>

        <Form.Item 
          name="shop_name" 
          label="Shop Name" 
          rules={[{ required: true, message: 'Please enter your shop name' }]}
        >
          <Input prefix={<ShopOutlined />} placeholder="e.g., My Mobile Store" />
        </Form.Item>

        <Form.Item name="phone_number" label="Phone Number">
          <Input prefix={<PhoneOutlined />} placeholder="e.g., 0300-1234567" />
        </Form.Item>

        <Form.Item name="address" label="Shop Address">
          <Input.TextArea prefix={<HomeOutlined />} placeholder="Enter shop location" rows={2} />
        </Form.Item>

        <Form.Item name="currency" label="Default Currency" rules={[{ required: true }]}>
          <Select prefix={<GlobalOutlined />}>
            <Select.Option value="PKR">PKR - Pakistani Rupee</Select.Option>
            <Select.Option value="USD">USD - US Dollar</Select.Option>
            <Select.Option value="AED">AED - UAE Dirham</Select.Option>
            <Select.Option value="SAR">SAR - Saudi Riyal</Select.Option>
          </Select>
        </Form.Item>

        <Form.Item 
          name="master_pin" 
          label="Create Master PIN (6 Digits)" 
          rules={[
            { required: true, message: 'Please create a 6-digit security PIN' },
            { pattern: /^\d{6}$/, message: 'PIN must be exactly 6 digits' }
          ]}
          tooltip="This PIN will be used to unlock your terminal and approve discounts."
        >
          <Input.Password 
            prefix={<LockOutlined />} 
            placeholder="e.g. 123456" 
            maxLength={6} 
          />
        </Form.Item>

        <Space direction="vertical" style={{ width: '100%', marginTop: 16 }}>
          <Button type="primary" htmlType="submit" block size="large" loading={loading}>
            Save & Get Started
          </Button>
        </Space>
      </Form>
    </Modal>
  );
};

export default WelcomeWizard;