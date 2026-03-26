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

  // --- SIMPLIFIED PLANS ---
  // --- PLANS CONFIGURATION (Fixed per Instructions) ---
  const plans = [
    {
      key: 'free',
      title: 'Free',
      priceMonthly: 0,
      priceYearly: 0,
      description: 'Perfect for startups and nano-retailers just getting started.',
      features: [
        'Offline-First Architecture', // Khaas Feature
        'Delta Sync Engine',          // Khaas Feature
        '200 Stock Items (SKUs)',
        '100 Product Models',
        '10 Customers Directory',
        '10 Suppliers Directory',
        'Basic POS Terminal',
        'PDF & Thermal Receipts',
        'Real-time Cloud Backup',
        'No Setup Charges',           // Khaas Feature
        'No Hidden Fees'
      ],
      buttonText: 'Start for Free',
      isPopular: false
    },
    {
      key: 'growth',
      title: 'Growth',
      priceMonthly: 999,
      priceYearly: 10799, // 10% Discount
      description: 'For scaling shops that need advanced inventory and reporting.',
      previousPlan: 'Free', // Yeh line "Everything in Free..." show karegi
      features: [
        '2,500 Stock Items (SKUs)',
        '1,000 Product Models',
        '1,000 Customers Directory',
        '100 Suppliers Directory',
        '2 Staff/Salesman Accounts',
        'Supplier Ledger (Udhaar/Khata)',
        'Expense Tracking Module',
        'Profit & Loss Analytics',
        'Low Stock Alerts',
        'No Setup Charges'
      ],
      buttonText: 'Upgrade to Growth',
      isPopular: false, 
    },
    {
      key: 'pro',
      title: 'Pro',
      priceMonthly: 1799,
      priceYearly: 19429, // 10% Discount
      description: 'For large-scale enterprises requiring maximum power and control.',
      previousPlan: 'Growth', // Yeh line "Everything in Growth..." show karegi
      features: [
        '50,000 Industrial Stock Items',
        '5,000 Master Product Models',
        'Unlimited Customer Profiles',
        '500 Strategic Suppliers',
        '5 Concurrent Staff Terminals',
        'Complete Warranty System (RMA)',
        'Advanced Business Intelligence',
        'Priority 24/7 Support',
        'Data Export & Excel Reports',
        'No Setup Charges'
      ],
      buttonText: 'Get Pro Power',
      isPopular: true, // AAP KI HIDAYAT: Pro Plan ab Most Popular hai
      highlightColor: '#faad14' // Gold Color
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
          Predictable pricing, designed to scale
        </Title>
        <Paragraph type="secondary" style={{ fontSize: '18px' }}>
          Start building for free, then scale as your shop grows.
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
                    <Tag color="green" style={{ marginLeft: 10, verticalAlign: 'middle' }}>10% OFF</Tag>
                  )}
                </div>

                {/* ACTION BUTTON */}
                <Button 
                  type={isPopular ? 'primary' : 'default'}
                  block 
                  size="large"
                  style={{ 
                    marginBottom: '24px', 
                    height: '48px', 
                    fontWeight: 600,
                    backgroundColor: isPopular ? (plan.highlightColor || token.colorPrimary) : 'transparent',
                    borderColor: isPopular ? (plan.highlightColor || token.colorPrimary) : undefined,
                    color: isPopular ? '#fff' : undefined
                  }}
                  disabled={isCurrent || (plan.key === 'free')}
                  onClick={() => handleUpgradeClick(plan)}
                >
                  {isCurrent ? 'Current Plan' : plan.buttonText}
                </Button>

                <Divider />

                {/* "EVERYTHING IN..." LINE (AAP KI HIDAYAT) */}
                {plan.previousPlan && (
                  <div style={{ marginBottom: '12px', fontSize: '14px', fontWeight: 600, color: token.colorTextHeading }}>
                    Everything in {plan.previousPlan} Plan, plus:
                  </div>
                )}

                {/* FEATURES LIST */}
                <List
                  dataSource={plan.features}
                  split={false}
                  renderItem={(item) => (
                    <List.Item style={{ padding: '6px 0', border: 'none', justifyContent: 'flex-start' }}>
                      <div style={{ display: 'flex', alignItems: 'start', gap: '10px' }}>
                        <CheckOutlined style={{ color: token.colorSuccess, marginTop: '4px' }} />
                        <Text style={{ fontSize: '14px' }}>
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