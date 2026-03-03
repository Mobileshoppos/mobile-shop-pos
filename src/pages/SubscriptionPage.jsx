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
import { useNavigate } from 'react-router-dom';

const { Title, Text, Paragraph } = Typography;

const SubscriptionPage = () => {
  const { token } = theme.useToken();
  const isMobile = useMediaQuery('(max-width: 768px)');
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [selectedPlan, setSelectedPlan] = useState(null);

  // --- PLANS CONFIGURATION (Marketing Optimized) ---
  const plans = [
    {
      key: 'free',
      title: 'Free Plan',
      icon: <StarOutlined style={{ fontSize: '24px', color: '#8c8c8c' }} />,
      priceMonthly: 0,
      priceYearly: 0,
      description: 'Foundational suite for nano-retailers.',
      features: [
        '200 Active Inventory Slots (SKUs)',
        '100 Master Product Profiles',
        '50 Intelligent Customer Directories',
        '10 Strategic Supplier Profiles',
        'Owner-Only Master Access',
        'Standard POS Execution Terminal',
        'PDF & Thermal Receipt Engine',
        'Real-time Cloud Data Redundancy',
        'Basic Inventory Threshold Alerts'
      ],
      color: '#8c8c8c'
    },
    {
      key: 'growth',
      title: 'Growth Plan',
      icon: <ThunderboltOutlined style={{ fontSize: '24px', color: token.colorPrimary }} />,
      priceMonthly: 999,
      priceYearly: 9500,
      description: 'High-performance engine for rising shops.',
      features: [
        '2,500 High-Capacity Inventory Slots',
        '1,000 Master Product Profiles',
        '1,000 Advanced Customer Ledgers',
        '100 Strategic Vendor Profiles',
        '2 Secure Staff Execution Seats',
        'Multi-Level Access Security (MAS)',
        'Full Expense & Overhead Tracking',
        'Automated Supplier Payment Ledger',
        'Dynamic Sales Forecasting (7 Days)',
        'Comprehensive Business Audit Trail',
        'Global Data Synchronization'
      ],
      color: token.colorPrimary
    },
    {
      key: 'pro',
      title: 'Pro Plan',
      icon: <CrownOutlined style={{ fontSize: '24px', color: '#faad14' }} />,
      priceMonthly: 1799,
      priceYearly: 17500,
      description: 'Enterprise-grade suite for power users.',
      features: [
        '50,000 Industrial-Grade Stock Slots',
        '5,000 Master Product Profiles',
        '5,000 Premium Customer Accounts',
        '500 Strategic Supplier Partnerships',
        '5 Concurrent User Terminals (Staff)',
        'End-to-End Warranty Lifecycle (RMA)',
        'Enterprise Profit/Loss Analytics',
        'Custom Low-Stock Intelligence',
        'Archived History Management (500)',
        'Priority 24/7 Technical Support',
        'Advanced Data Export & Backup Suite',
        'Early Access to New Modules'
      ],
      color: '#faad14',
      popular: true // User ki request par Pro ko popular kiya
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
          <CreditCardOutlined /> Elevate Your Business Intelligence
        </Title>
        <Paragraph type="secondary" style={{ fontSize: '16px' }}>
          Select a scalable architecture that aligns with your operational volume.
        </Paragraph>

        <Radio.Group 
          value={billingCycle} 
          onChange={(e) => setBillingCycle(e.target.value)}
          optionType="button"
          buttonStyle="solid"
          size="large"
          style={{ marginTop: '10px' }}
        >
          <Radio.Button value="monthly">Monthly Billing</Radio.Button>
          <Radio.Button value="yearly">Yearly (Loyalty Discount ~20%)</Radio.Button>
        </Radio.Group>
      </div>

      <Row gutter={[24, 32]} justify="center" align="bottom">
        {plans.map((plan) => {
          const isCurrent = currentTier === plan.key;
          const price = billingCycle === 'monthly' ? plan.priceMonthly : plan.priceYearly;
          
          return (
            <Col xs={24} lg={plan.popular ? 8 : 7} key={plan.key}>
              <Badge.Ribbon 
                text="Most Popular" 
                color="gold" 
                style={{ display: plan.popular ? 'block' : 'none' }}
              >
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
                    {isCurrent && <Tag color="green" style={{ marginTop: '5px' }}>Active Subscription</Tag>}
                  </div>

                  <div style={{ textAlign: 'center', marginBottom: '20px', minHeight: '80px' }}>
                    <Title level={2} style={{ margin: 0 }}>
                      {price === 0 ? 'FREE' : `PKR ${price.toLocaleString()}`}
                    </Title>
                    <Text type="secondary">per {billingCycle === 'monthly' ? 'month' : 'annum'}</Text>
                  </div>

                  <Divider style={{ margin: '12px 0' }} />
                  
                  <Text strong style={{ display: 'block', marginBottom: '15px', textAlign: 'center', minHeight: '40px' }}>
                    {plan.description}
                  </Text>

                  <List
                    dataSource={plan.features}
                    renderItem={(item) => (
                      <List.Item style={{ border: 'none', padding: '6px 0' }}>
                        <CheckCircleOutlined style={{ color: token.colorSuccess, marginRight: '10px', fontSize: '12px' }} />
                        <Text style={{ fontSize: '13px' }}>{item}</Text>
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
                    {isCurrent ? 'Current Plan' : plan.key === 'free' ? 'Standard Access' : `Deploy ${plan.title}`}
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
            I have completed the transfer
          </Button>,
        ]}
      >
        <Paragraph>
          To initialize your <strong>{selectedPlan?.title}</strong> architecture, please complete the following verification steps:
        </Paragraph>
        <Divider />
        <Steps direction="vertical" current={0} size="small">
          <Steps.Step 
            title="Secure Asset Transfer" 
            icon={<BankOutlined />}
            description={
              <div style={{ marginTop: '8px' }}>
                <Text>
                  Settlement Amount: <Text strong style={{ fontSize: '16px', color: token.colorError }}>
                    PKR {(billingCycle === 'monthly' ? selectedPlan?.priceMonthly : selectedPlan?.priceYearly)?.toLocaleString()}
                  </Text>
                </Text>
                <Card size="small" style={{ marginTop: '10px', backgroundColor: token.colorFillAlter }}>
                  <Text strong>Beneficiary Name:</Text> Rashid Ali<br/>
                  <Text strong>Digital Wallet/Raast:</Text> 0326 2324446<br/>
                  <Text type="secondary" style={{ fontSize: '12px' }}>* Attach shop identifier in transaction notes for expedited sync.</Text>
                </Card>
              </div>
            } 
          />
          <Steps.Step 
            title="Authentication & Proof" 
            icon={<WhatsAppOutlined />}
            description={
              <Text>
                Dispatch digital receipt to our verification node: <br/>
                <a href="https://wa.me/923262324446" target="_blank" rel="noreferrer">
                  <strong>+92 326 2324446</strong>
                </a>
              </Text>
            } 
          />
          <Steps.Step 
            title="Module Activation" 
            icon={<RocketOutlined />}
            description="Enterprise modules will be provisioned within 60-120 minutes post-verification." 
          />
        </Steps>
      </Modal>

      {/* --- EXPIRY INFO --- */}
      {(currentTier !== 'free') && profile?.subscription_expires_at && (
        <div style={{ textAlign: 'center', marginTop: '40px' }}>
          <Alert
            message={
              <Text>
                Your enterprise license is active until: <strong>
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