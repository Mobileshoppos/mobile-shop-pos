import React, { useState } from 'react';
import { Card, Row, Col, Typography, Button, List, Tag, Modal, Steps, Divider, Tooltip, Radio, theme, Badge, Alert } from 'antd';
import { 
  CheckCircleOutlined, 
  RocketOutlined, 
  BankOutlined, 
  WhatsAppOutlined, 
  InfoCircleOutlined, 
  CreditCardOutlined,
  ThunderboltOutlined,
  CrownOutlined,
  StarOutlined
} from '@ant-design/icons';
import { useAuth } from '../context/AuthContext';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { formatCurrency } from '../utils/currencyFormatter';

const { Title, Text, Paragraph } = Typography;

const SubscriptionPage = () => {
  const { token } = theme.useToken();
  const isMobile = useMediaQuery('(max-width: 768px)');
  const { profile } = useAuth();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [selectedPlan, setSelectedPlan] = useState(null);

  // --- PLANS CONFIGURATION ---
  const plans = [
    {
      key: 'free',
      title: 'Free Plan',
      icon: <StarOutlined style={{ fontSize: '24px', color: '#8c8c8c' }} />,
      priceMonthly: 0,
      priceYearly: 0,
      description: 'Perfect for new or very small shops.',
      features: [
        'Up to 50 Stock Items',
        '0 Staff Members (Owner only)',
        'Basic POS & Sales',
        'PDF & Thermal Receipts',
        'Customer Management'
      ],
      color: '#8c8c8c'
    },
    {
      key: 'growth',
      title: 'Growth Plan',
      icon: <ThunderboltOutlined style={{ fontSize: '24px', color: token.colorPrimary }} />,
      priceMonthly: 999,
      priceYearly: 9500,
      description: 'Best for growing shops with a salesman.',
      features: [
        'Up to 500 Stock Items',
        '1 Staff Member (PIN System)',
        'Supplier Ledger & Business',
        'Expense Tracking',
        'Unlimited Sales History'
      ],
      color: token.colorPrimary,
      popular: true
    },
    {
      key: 'pro',
      title: 'Pro Plan',
      icon: <CrownOutlined style={{ fontSize: '24px', color: '#faad14' }} />,
      priceMonthly: 1799,
      priceYearly: 17500,
      description: 'Ultimate power for professional shops.',
      features: [
        'Unlimited Stock Items',
        'Up to 3 Staff Members',
        'Warranty & Claims System',
        'Advanced Profit/Loss Reports',
        'Priority WhatsApp Support'
      ],
      color: '#faad14'
    }
  ];

  const currentTier = profile?.subscription_tier?.toLowerCase() || 'free';

  const handleUpgradeClick = (plan) => {
    setSelectedPlan(plan);
    setIsModalVisible(true);
  };

  return (
    <div style={{ padding: isMobile ? '12px 4px' : '24px' }}>
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <Title level={isMobile ? 3 : 1}>
          <CreditCardOutlined /> Choose the Right Plan for Your Business
        </Title>
        <Paragraph type="secondary" style={{ fontSize: '16px' }}>
          No setup fees. No hidden charges. Upgrade or downgrade anytime.
        </Paragraph>

        <Radio.Group 
          value={billingCycle} 
          onChange={(e) => setBillingCycle(e.target.value)}
          optionType="button"
          buttonStyle="solid"
          size="large"
          style={{ marginTop: '10px' }}
        >
          <Radio.Button value="monthly">Monthly</Radio.Button>
          <Radio.Button value="yearly">Yearly (Save ~20%)</Radio.Button>
        </Radio.Group>
      </div>

      <Row gutter={[24, 32]} justify="center" align="bottom">
        {plans.map((plan) => {
          const isCurrent = currentTier === plan.key;
          const price = billingCycle === 'monthly' ? plan.priceMonthly : plan.priceYearly;
          
          return (
            <Col xs={24} lg={plan.popular ? 8 : 7} key={plan.key}>
              <Badge.Ribbon text="Best Value" color="volcano" style={{ display: plan.popular ? 'block' : 'none' }}>
                <Card
                  hoverable
                  style={{
                    borderRadius: '16px',
                    border: isCurrent ? `2px solid ${plan.color}` : `1px solid ${token.colorBorderSecondary}`,
                    boxShadow: plan.popular ? '0 10px 30px rgba(0,0,0,0.15)' : '0 4px 12px rgba(0,0,0,0.05)',
                    transform: !isMobile && plan.popular ? 'scale(1.05)' : 'none',
                    transition: 'all 0.3s ease',
                    zIndex: plan.popular ? 2 : 1
                  }}
                >
                  <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                    {plan.icon}
                    <Title level={3} style={{ margin: '10px 0 0 0' }}>{plan.title}</Title>
                    {isCurrent && <Tag color="green" style={{ marginTop: '5px' }}>Current Plan</Tag>}
                  </div>

                  <div style={{ textAlign: 'center', marginBottom: '20px', minHeight: '80px' }}>
                    <Title level={2} style={{ margin: 0 }}>
                      {price === 0 ? 'FREE' : `PKR ${price.toLocaleString()}`}
                    </Title>
                    <Text type="secondary">per {billingCycle === 'monthly' ? 'month' : 'year'}</Text>
                  </div>

                  <Divider style={{ margin: '12px 0' }} />
                  
                  <Text strong style={{ display: 'block', marginBottom: '15px', textAlign: 'center' }}>
                    {plan.description}
                  </Text>

                  <List
                    dataSource={plan.features}
                    renderItem={(item) => (
                      <List.Item style={{ border: 'none', padding: '6px 0' }}>
                        <CheckCircleOutlined style={{ color: token.colorSuccess, marginRight: '10px' }} />
                        <Text>{item}</Text>
                      </List.Item>
                    )}
                  />

                  <Button 
                    type={plan.popular ? 'primary' : 'default'} 
                    size="large" 
                    block 
                    style={{ 
                      marginTop: '30px', 
                      height: '50px', 
                      borderRadius: '8px',
                      fontWeight: 'bold',
                      backgroundColor: plan.popular ? plan.color : 'transparent',
                      borderColor: plan.color,
                      color: plan.popular ? '#fff' : plan.color
                    }}
                    disabled={isCurrent || plan.key === 'free'}
                    onClick={() => handleUpgradeClick(plan)}
                  >
                    {isCurrent ? 'Active Now' : plan.key === 'free' ? 'Basic Features' : `Upgrade to ${plan.key.toUpperCase()}`}
                  </Button>
                </Card>
              </Badge.Ribbon>
            </Col>
          );
        })}
      </Row>

      {/* --- PAYMENT MODAL --- */}
      <Modal
        title={<Title level={4}>Upgrade to {selectedPlan?.title}</Title>}
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={[
          <Button key="close" type="primary" onClick={() => setIsModalVisible(false)}>
            I have made the payment
          </Button>,
        ]}
      >
        <Paragraph>
          To activate your <strong>{selectedPlan?.title}</strong>, please follow these steps:
        </Paragraph>
        <Divider />
        <Steps direction="vertical" current={0} size="small">
          <Steps.Step 
            title="Transfer Payment" 
            icon={<BankOutlined />}
            description={
              <div style={{ marginTop: '8px' }}>
                <Text>
                  Amount: <Text strong style={{ fontSize: '16px', color: token.colorError }}>
                    PKR {(billingCycle === 'monthly' ? selectedPlan?.priceMonthly : selectedPlan?.priceYearly)?.toLocaleString()}
                  </Text>
                </Text>
                <Card size="small" style={{ marginTop: '10px', backgroundColor: token.colorFillAlter }}>
                  <Text strong>Account Title:</Text> Rashid Ali<br/>
                  <Text strong>EasyPaisa/Raast ID:</Text> 0326 2324446<br/>
                  <Text type="secondary" style={{ fontSize: '12px' }}>* Please mention your shop name in payment notes.</Text>
                </Card>
              </div>
            } 
          />
          <Steps.Step 
            title="Send Receipt" 
            icon={<WhatsAppOutlined />}
            description={
              <Text>
                Send payment screenshot to: <br/>
                <a href="https://wa.me/923262324446" target="_blank" rel="noreferrer">
                  <strong>+92 326 2324446</strong>
                </a>
              </Text>
            } 
          />
          <Steps.Step 
            title="Enjoy Premium Features" 
            icon={<RocketOutlined />}
            description="Your account will be upgraded within 1-2 hours after verification." 
          />
        </Steps>
      </Modal>

      {/* --- EXPIRY INFO (If Pro/Growth) --- */}
      {(currentTier !== 'free') && profile?.subscription_expires_at && (
        <div style={{ textAlign: 'center', marginTop: '40px' }}>
          <Alert
            message={
              <Text>
                Your current subscription is valid until: <strong>
                {new Date(profile.subscription_expires_at).toLocaleDateString('en-PK', { year: 'numeric', month: 'long', day: 'numeric' })}
                </strong>
              </Text>
            }
            type="info"
            showIcon
            style={{ display: 'inline-block', borderRadius: '10px' }}
          />
        </div>
      )}
    </div>
  );
};

export default SubscriptionPage;