import React, { useState } from 'react';
import { Modal, Form, Input, Select, Button, Typography, Space, App, Row, Col } from 'antd';
import { ShopOutlined, GlobalOutlined, PhoneOutlined, HomeOutlined, LockOutlined } from '@ant-design/icons';
import { useAuth } from '../context/AuthContext';
import bcrypt from 'bcryptjs';
import DataService from '../DataService';

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
      width="70%" // NAYA IZAFA: Width 500 se 70% kar di gayi hai
    >
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0 }}>Welcome to Your Shop! 🎉</Title>
        <Text type="secondary">Let's quickly set up your basic shop details.</Text>
      </div>

      <Form layout="vertical" onFinish={handleSave} initialValues={{ currency: 'PKR', business_type: 'Mobile Shop' }}>
        
        {/* NAYA IZAFA: 2-Column Layout (Row aur Col ka istemal) */}
        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item name="business_type" label="Business Type" rules={[{ required: true }]}>
              <Select prefix={<ShopOutlined />}>
                <Select.Option value="Mobile Shop">Mobile & Electronics</Select.Option>
                <Select.Option value="Crockery">Crockery & Glassware</Select.Option>
                <Select.Option value="Grocery & Minimart">Grocery & Supermarket</Select.Option>
                <Select.Option value="Pharmacy & Medical">Pharmacy & Medical Store</Select.Option>
                <Select.Option value="Garments & Boutique">Garments & Boutique</Select.Option>
                <Select.Option value="Footwear & Shoes">Footwear & Shoes</Select.Option>
                <Select.Option value="Hardware & Sanitary">Hardware & Sanitary</Select.Option>
                <Select.Option value="Cosmetics & Beauty">Cosmetics & Beauty</Select.Option>
                <Select.Option value="Auto Parts & Accessories">Auto Parts & Accessories</Select.Option>
                <Select.Option value="Power Tools & Machinery">Power Tools & Machinery</Select.Option>
                <Select.Option value="Books & Stationery">Books & Stationery</Select.Option>
                <Select.Option value="Toys & Games">Toys & Games</Select.Option>
                <Select.Option value="Sports & Outdoors">Sports & Outdoors</Select.Option>
                <Select.Option value="Furniture & Home Decor">Furniture & Home Decor</Select.Option>
                <Select.Option value="Jewelry & Watches">Jewelry & Watches</Select.Option>
                <Select.Option value="Pet Supplies">Pet Supplies</Select.Option>
              </Select>
            </Form.Item>
          </Col>

          <Col xs={24} sm={12}>
            <Form.Item name="shop_name" label="Shop Name" rules={[{ required: true, message: 'Please enter your shop name' }]}>
              <Input prefix={<ShopOutlined />} placeholder="e.g., My Mobile Store" />
            </Form.Item>
          </Col>

          <Col xs={24} sm={12}>
            <Form.Item name="phone_number" label="Phone Number">
              <Input prefix={<PhoneOutlined />} placeholder="e.g., 0300-1234567" />
            </Form.Item>
          </Col>

          <Col xs={24} sm={12}>
            <Form.Item name="currency" label="Default Currency" rules={[{ required: true }]}>
              <Select prefix={<GlobalOutlined />}>
                <Select.Option value="PKR">PKR - Pakistani Rupee</Select.Option>
                <Select.Option value="USD">USD - US Dollar</Select.Option>
                <Select.Option value="AED">AED - UAE Dirham</Select.Option>
                <Select.Option value="SAR">SAR - Saudi Riyal</Select.Option>
              </Select>
            </Form.Item>
          </Col>

          <Col xs={24} sm={12}>
            {/* Note: Address ko Input.TextArea se Input mein badal diya taake PIN wale dabbe ke barabar rahe */}
            <Form.Item name="address" label="Shop Address">
              <Input prefix={<HomeOutlined />} placeholder="Enter shop location" />
            </Form.Item>
          </Col>

          <Col xs={24} sm={12}>
            <Form.Item 
              name="master_pin" 
              label="Create Master PIN (6 Digits)" 
              rules={[
                { required: true, message: 'Please create a 6-digit security PIN' },
                { pattern: /^\d{6}$/, message: 'PIN must be exactly 6 digits' }
              ]}
              tooltip="This PIN will be used to unlock your terminal and approve discounts."
            >
              <Input.Password prefix={<LockOutlined />} placeholder="e.g. 123456" maxLength={6} />
            </Form.Item>
          </Col>
        </Row>

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