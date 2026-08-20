import React, { useState } from 'react';
import { Modal, Form, Input, Select, Button, Typography, Space, App, Row, Col, Checkbox, theme } from 'antd';
import { ShopOutlined, GlobalOutlined, PhoneOutlined, HomeOutlined, LockOutlined } from '@ant-design/icons';
import { useAuth } from '../context/AuthContext';
import bcrypt from 'bcryptjs';
import DataService from '../DataService';
import { DemoDataHelper } from '../utils/DemoDataHelper';
import { useMediaQuery } from '../hooks/useMediaQuery';

const { Title, Text } = Typography;

// --- NAYA IZAFA: Auto-Detect Currency Logic ---
const guessUserCurrency = () => {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone; // Browser se location nikalna
    if (tz.includes('Karachi')) return 'PKR';
    if (tz.includes('Kolkata') || tz.includes('Calcutta')) return 'INR';
    if (tz.includes('Dhaka')) return 'BDT';
    if (tz.includes('Dubai') || tz.includes('Abu_Dhabi')) return 'AED';
    if (tz.includes('Riyadh') || tz.includes('Qatar') || tz.includes('Kuwait')) return 'SAR';
    if (tz.includes('London')) return 'GBP';
    if (tz.includes('Europe/')) return 'EUR';
    return 'USD'; // Agar samajh na aaye to default USD
  } catch (e) {
    return 'USD';
  }
};

const WelcomeWizard = () => {
  const { token } = theme.useToken(); // Control Center Theme Tokens
  const isMobile = useMediaQuery('(max-width: 768px)'); // Mobile Screen Detection
  const defaultCurrency = guessUserCurrency(); // Yahan hum ne check kiya ke user kahan se hai

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
      
      // FIX: Supabase ko bhejne se pehle isay list se nikaal dein taake error na aaye
      delete updates.load_demo_data;

      const { success, error } = await updateProfile(updates);
      if (success) {
        await DataService.initializeUserCategories(profile.user_id, values.business_type);
        
        if (values.load_demo_data) {
          message.loading({ content: 'Generating demo data...', key: 'demoData', duration: 0 });
          try {
            // FIX: values.business_type bhi pass kar diya taake business ke mutabiq items banein
            await DemoDataHelper.injectDemoData(profile.user_id, values.currency, values.business_type);
            message.success({ content: 'Demo data loaded successfully!', key: 'demoData', duration: 2 });
            message.success('Welcome! Your shop is ready.');
            // FIX: Zabardasti page reload nahi karenge taake browser ka warning pop-up na aaye
            window.dispatchEvent(new CustomEvent('local-db-updated'));
          } catch (demoErr) {
            message.error({ content: 'Demo data failed: ' + demoErr.message, key: 'demoData', duration: 5 });
          }
        } else {
          message.success('Welcome! Your shop is ready.');
          window.dispatchEvent(new CustomEvent('local-db-updated'));
        }
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
      width={isMobile ? '96%' : '650px'} // FIX: Mobile par 96% khula aur Desktop par 650px
      style={{ top: isMobile ? 12 : undefined }}
    >
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0 }}>Welcome to Your Shop! 🎉</Title>
        <Text type="secondary">Let's quickly set up your basic shop details.</Text>
      </div>

      {/* 'PKR' ki jagah hum ne 'defaultCurrency' laga diya jo oopar calculate hua hai */}
      {/* FIX: load_demo_data: true lazmi paas karna hai taake form ko pata ho */}
      <Form layout="vertical" onFinish={handleSave} initialValues={{ currency: defaultCurrency, business_type: 'Mobile Shop', load_demo_data: true }}>
        
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
              {/* showSearch lagane se user type kar ke bhi currency dhoond sakega */}
              <Select prefix={<GlobalOutlined />} showSearch optionFilterProp="children">
                <Select.Option value="PKR">PKR - Pakistani Rupee</Select.Option>
                <Select.Option value="INR">INR - Indian Rupee</Select.Option>
                <Select.Option value="BDT">BDT - Bangladeshi Taka</Select.Option>
                <Select.Option value="AED">AED - UAE Dirham</Select.Option>
                <Select.Option value="SAR">SAR - Saudi Riyal</Select.Option>
                <Select.Option value="USD">USD - US Dollar</Select.Option>
                <Select.Option value="GBP">GBP - British Pound</Select.Option>
                <Select.Option value="EUR">EUR - Euro</Select.Option>
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

          {/* --- NAYA IZAFA: Demo Data Checkbox (Theme-Aware & Aligned) --- */}
          <Col xs={24}>
            <div style={{ 
              background: token.colorFillAlter, 
              padding: '12px 16px', 
              borderRadius: token.borderRadiusLG, 
              border: `1px solid ${token.colorBorder}` 
            }}>
              <Form.Item name="load_demo_data" valuePropName="checked" style={{ marginBottom: 0 }}>
                <Checkbox style={{ alignItems: 'flex-start', width: '100%' }}>
                  <div style={{ marginLeft: '6px', marginTop: '-2px' }}>
                    <Text strong style={{ color: token.colorPrimary, display: 'block', fontSize: '14px' }}>
                      Load Demo Data (Recommended for new users)
                    </Text>
                    <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginTop: '3px', lineHeight: 1.4 }}>
                      Add sample products, inventory, and a demo sale so you can explore the app instantly. You can delete this data anytime with one click.
                    </Text>
                  </div>
                </Checkbox>
              </Form.Item>
            </div>
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