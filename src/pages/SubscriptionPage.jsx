import React, { useState } from 'react';
import { Card, Row, Col, Typography, Button, List, Modal, Steps, Divider, Radio, theme, Badge, Tag } from 'antd';
import { 
  CheckOutlined, 
  BankOutlined, 
  WhatsAppOutlined, 
  RocketOutlined,
  ThunderboltOutlined,
  WifiOutlined,
  SafetyCertificateOutlined
} from '@ant-design/icons';
import { useAuth } from '../context/AuthContext';
import { useMediaQuery } from '../hooks/useMediaQuery';
import dayjs from 'dayjs';

const { Title, Text, Paragraph } = Typography;

const SubscriptionPage = () => {
  const { token } = theme.useToken();
  const isMobile = useMediaQuery('(max-width: 768px)');
  const { profile } = useAuth();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [selectedPlan, setSelectedPlan] = useState(null);

  const currentTier = profile?.subscription_tier?.toLowerCase() || 'free';

  // --- CORE HIGHLIGHTS (Supabase Style Top Banner) ---
  const coreHighlights = [
    { icon: <WifiOutlined />, title: "Offline First", desc: "Works without internet" },
    { icon: <ThunderboltOutlined />, title: "Delta Sync", desc: "Super fast data backup" },
    { icon: <SafetyCertificateOutlined />, title: "No Setup Charges", desc: "Free onboarding & support" },
  ];

  // --- PLANS CONFIGURATION (Website Content) ---
  const freePlan = {
    key: 'free',
    title: 'Free',
    priceMonthly: 0,
    priceYearly: 0,
    description: 'Perfect for starting out with all basic features.',
    features: [
      '50,000 Active stock items',
      '10,000 Product models',
      'Walk-in customer only',
      'Cash purchase supplier only',
      '1 Billing Counter',
      '0 Staff Seats (Owner only)'
    ],
    buttonText: 'Start for Free',
  };

  const plans = [
    {
      key: 'growth',
      title: 'Growth',
      priceMonthly: 1199,
      priceYearly: 12950,
      description: 'Perfect for growing shops. More items, more staff, more sales.',
      features: [
        'Offline-First Technology',
        'Point of Sale (POS)',
        'Customer & Supplier management',
        '1 Staff Account (Encrypted PIN)',
        'Reports & analytics',
        'Warranty system',
        '1 Billing Counter',
        'Bank & Wallet Accounts'
      ],
      buttonText: 'Go to Growth',
      isPopular: false
    },
    {
      key: 'pro',
      title: 'Pro',
      priceMonthly: 2399,
      priceYearly: 25999,
      description: 'Advanced tools for growing businesses that require more staff and dedicated support.',
      features: [
        '2 Staff Accounts (Encrypted PIN)',
        'Priority support & Custom reports',
        'Warranty system',
        '3 Billing Counters',
        'Wholesale & Retail Pricing',
        'Rack & Shelf Location'
      ],
      buttonText: 'Get Pro Power',
      isPopular: true,
      highlightColor: '#3ecf8e'
    },
    {
      key: 'scale',
      title: 'Scale',
      priceMonthly: 4599,
      priceYearly: 49999,
      description: 'Unrestricted resources for large-scale operations requiring maximum capacity and speed.',
      features: [
        '4 Staff Accounts (Encrypted PIN)',
        'Priority support & free setup',
        'All features unlocked',
        'Up to 10 Billing Counters',
        'Batch & Expiry Tracking',
        'FBR POS Integration',
        'Financial Balance Sheet',
        'Stock Flow Audit Logs',
        'Master Data Export'
      ],
      buttonText: 'Get Scale Power',
      isPopular: false
    }
  ];

  const handleUpgradeClick = (plan) => {
    setSelectedPlan(plan);
    setIsModalVisible(true);
  };

  return (
    <div style={{ padding: isMobile ? '12px' : '40px', maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* 1. HEADER SECTION */}
      <div style={{ textAlign: 'center', marginBottom: '50px' }}>
        <Title level={isMobile ? 2 : 1} style={{ marginBottom: '10px' }}>
          Affordable, and scalable pricing
        </Title>
        <Paragraph type="secondary" style={{ fontSize: '18px' }}>
          Choose the plan that fits your business. Upgrade or downgrade anytime.
        </Paragraph>

        {/* 2. CORE FEATURES BANNER (Highlights) */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          gap: isMobile ? '10px' : '40px', 
          flexWrap: 'wrap',
          margin: '30px 0' 
        }}>
          {coreHighlights.map((item, index) => (
            <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '10px', background: token.colorFillQuaternary, padding: '8px 16px', borderRadius: '50px' }}>
              <span style={{ color: token.colorPrimary, fontSize: '18px' }}>{item.icon}</span>
              <div>
                <Text strong style={{ display: 'block', lineHeight: 1 }}>{item.title}</Text>
                <Text type="secondary" style={{ fontSize: '11px' }}>{item.desc}</Text>
              </div>
            </div>
          ))}
        </div>

        {/* BILLING TOGGLE */}
        <Radio.Group 
          value={billingCycle} 
          onChange={(e) => setBillingCycle(e.target.value)}
          optionType="button"
          buttonStyle="solid"
          size="large"
        >
          <Radio.Button value="monthly">Monthly</Radio.Button>
          <Radio.Button value="yearly">Yearly <Tag color="success" style={{ marginLeft: 5, fontSize: 10 }}>-10%</Tag></Radio.Button>
        </Radio.Group>
      </div>

      {/* 3. PRICING CARDS ROW */}
      <Row gutter={[24, 24]} justify="center" align="stretch">
        {plans.map((plan) => {
          const isCurrent = currentTier === plan.key;
          const price = billingCycle === 'monthly' ? plan.priceMonthly : plan.priceYearly;
          const isPopular = plan.isPopular; 

          return (
            <Col xs={24} md={8} key={plan.key}>
              <Card
                hoverable
                style={{
                  height: '100%',
                  borderRadius: '12px',
                  // Popular plan (Pro) ko highlight karein
                  border: isPopular ? `2px solid ${plan.highlightColor || token.colorPrimary}` : `1px solid ${token.colorBorder}`,
                  background: token.colorBgContainer,
                  position: 'relative',
                  overflow: 'hidden',
                  transform: isPopular && !isMobile ? 'scale(1.05)' : 'none',
                  zIndex: isPopular ? 2 : 1,
                  textAlign: 'left' // AAP KI HIDAYAT: Text Left Aligned hoga
                }}
                styles={{ body: { padding: '32px 24px' } }}
              >
                {/* POPULAR BADGE - Sirf Pro Plan par */}
                {isPopular && (
                  <div style={{
                    position: 'absolute', top: 12, right: 12,
                    background: plan.highlightColor || token.colorPrimary, color: '#fff',
                    padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                  }}>
                    Most Popular
                  </div>
                )}

                {/* PLAN TITLE */}
                <Title level={3} style={{ margin: 0, color: isPopular ? (plan.highlightColor || token.colorPrimary) : 'inherit' }}>
                  {plan.title}
                </Title>
                <Paragraph type="secondary" style={{ marginBottom: '24px', minHeight: '44px', fontSize: '14px' }}>
                  {plan.description}
                </Paragraph>

                {/* PRICE */}
                <div style={{ marginBottom: '24px' }}>
                  <Text style={{ fontSize: '14px', verticalAlign: 'top', marginRight: 2 }}>PKR</Text>
                  <Title level={1} style={{ margin: 0, display: 'inline-block' }}>
                    {price.toLocaleString()}
                  </Title>
                  <Text type="secondary">/{billingCycle === 'monthly' ? 'month' : 'year'}</Text>
                  {/* Discount Tag */}
                  {billingCycle === 'yearly' && price > 0 && (
                    <Tag color="green" style={{ marginLeft: 10, verticalAlign: 'middle' }}>UPTO 10% OFF</Tag>
                  )}
                </div>

                {/* ACTION BUTTON */}
                <div style={{ marginBottom: '24px' }}>
                  <Button 
                    type={isPopular ? 'primary' : 'default'}
                    block 
                    size="large"
                    style={{ 
                      height: '48px', 
                      fontWeight: 600,
                      backgroundColor: isPopular ? (plan.highlightColor || token.colorPrimary) : 'transparent',
                      borderColor: isPopular ? (plan.highlightColor || token.colorPrimary) : undefined,
                      color: isPopular ? '#fff' : undefined,
                      marginBottom: (isCurrent && profile?.subscription_expires_at) ? '6px' : '0'
                    }}
                    disabled={isCurrent || (plan.key === 'free')}
                    onClick={() => handleUpgradeClick(plan)}
                  >
                    {isCurrent ? 'Current Plan' : plan.buttonText}
                  </Button>
                  
                  {/* NAYA IZAFA: Expiry Date Display */}
                  {isCurrent && profile?.subscription_expires_at && (
                    <div style={{ textAlign: 'center' }}>
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        ⏳ Expires on: <Text strong style={{ color: token.colorText }}>{dayjs(profile.subscription_expires_at).format('DD MMM YYYY')}</Text>
                      </Text>
                    </div>
                  )}
                </div>

                {(plan.key === 'pro' || plan.key === 'scale') && (
                  <Text strong style={{ display: 'block', marginBottom: '10px', fontSize: '21px' }}>
                    {plan.key === 'pro' ? 'Everything in Growth, Plus:' : 'Everything in Pro, Plus:'}
                  </Text>
                )}


                {/* FEATURES LIST */}
                <List
                  dataSource={plan.features}
                  split={false}
                  renderItem={(item) => (
                    <List.Item style={{ padding: '8px 0', border: 'none', justifyContent: 'flex-start' }}>
                      <div style={{ display: 'flex', alignItems: 'start', gap: '10px' }}>
                        <CheckOutlined style={{ color: token.colorSuccess, marginTop: '2px', fontSize: '18px' }} />
                        <Text style={{ fontSize: '16px' }}>
                          {/* Khaas features ko Bold karein */}
                          {(item.includes('Offline-First') || item.includes('Delta Sync') || item.includes('No Setup')) 
                            ? <strong>{item}</strong> 
                            : item}
                        </Text>
                      </div>
                    </List.Item>
                  )}
                />
              </Card>
            </Col>
          );
        })}
      </Row>

      {/* --- FREE PLAN BANNER (NEW) --- */}
      <Card
        style={{
          marginTop: '30px',
          borderRadius: '12px',
          border: `1px solid ${token.colorBorder}`,
          background: token.colorBgContainer,
          textAlign: 'left'
        }}
        styles={{ body: { padding: '24px' } }}
      >
        <Row align="middle" justify="space-between" gutter={[24, 24]}>
          <Col xs={24} md={16}>
            <Title level={3} style={{ margin: 0 }}>{freePlan.title}</Title>
            <Paragraph type="secondary" style={{ marginBottom: '16px' }}>
              {freePlan.description}
            </Paragraph>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
              {freePlan.features.map((item, index) => (
                <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckOutlined style={{ color: token.colorSuccess }} />
                  <Text style={{ fontSize: '14px' }}>{item}</Text>
                </div>
              ))}
            </div>
          </Col>
          <Col xs={24} md={8} style={{ textAlign: isMobile ? 'left' : 'right' }}>
            <div style={{ marginBottom: '16px' }}>
              <Text style={{ fontSize: '14px', verticalAlign: 'top', marginRight: 2 }}>PKR</Text>
              <Title level={2} style={{ margin: 0, display: 'inline-block' }}>0</Title>
              <Text type="secondary">/forever</Text>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: isMobile ? 'flex-start' : 'flex-end' }}>
              <Button 
                size="large"
                disabled={currentTier === 'free'}
                style={{ width: '100%', maxWidth: isMobile ? '100%' : '200px', marginBottom: (currentTier === 'free' && profile?.subscription_expires_at) ? '6px' : '0' }}
              >
                {currentTier === 'free' ? 'Current Plan' : freePlan.buttonText}
              </Button>
              
              {/* NAYA IZAFA: Expiry Date Display for Free Plan */}
              {currentTier === 'free' && profile?.subscription_expires_at && (
                <div style={{ width: '100%', maxWidth: isMobile ? '100%' : '200px', textAlign: 'center' }}>
                  <Text type="secondary" style={{ fontSize: '11px' }}>
                    ⏳ Valid till: <Text strong>{dayjs(profile.subscription_expires_at).format('DD MMM YYYY')}</Text>
                  </Text>
                </div>
              )}
            </div>
          </Col>
        </Row>
      </Card>

      {/* --- PAYMENT MODAL (UNCHANGED LOGIC) --- */}
      <Modal
        title={<Title level={4}>Upgrade to {selectedPlan?.title}</Title>}
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={[
          <Button key="close" type="primary" onClick={() => setIsModalVisible(false)}>
            I have completed the transfer
          </Button>,
        ]}
      >
        <Paragraph>
          To activate your <strong>{selectedPlan?.title}</strong> plan, please complete the transfer:
        </Paragraph>
        <Divider />
        <Steps direction="vertical" current={0} size="small">
          <Steps.Step 
            title="Transfer Amount" 
            icon={<BankOutlined />}
            description={
              <div style={{ marginTop: '8px' }}>
                <Text>
                  Total: <Text strong style={{ fontSize: '16px', color: token.colorError }}>
                    PKR {(billingCycle === 'monthly' ? selectedPlan?.priceMonthly : selectedPlan?.priceYearly)?.toLocaleString()}
                  </Text>
                </Text>
                <Card size="small" style={{ marginTop: '10px', background: token.colorFillAlter }}>
                  <Text strong>Bank/Wallet:</Text> Raast / EasyPaisa<br/>
                  <Text strong>Account:</Text> 0326 2324446<br/>
                  <Text strong>Name:</Text> Rashid Ali
                </Card>
              </div>
            } 
          />
          <Steps.Step 
            title="Send Proof" 
            icon={<WhatsAppOutlined />}
            description={
              <Text>
                WhatsApp the payment screenshot to: <br/>
                <a href="https://wa.me/923262324446" target="_blank" rel="noreferrer">
                  <strong>+92 326 2324446</strong>
                </a>
              </Text>
            } 
          />
          <Steps.Step 
            title="Activation" 
            icon={<RocketOutlined />}
            description="Your plan will be active within few minutes." 
          />
        </Steps>
      </Modal>
    </div>
  );
};

export default SubscriptionPage;