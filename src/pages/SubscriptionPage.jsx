import React, { useState } from 'react';
import { Card, Row, Col, Typography, Button, List, Tag, Modal, Steps, Divider, Tooltip, Radio } from 'antd';
import { CheckCircleOutlined, RocketOutlined, BankOutlined, WhatsAppOutlined, InfoCircleOutlined, CreditCardOutlined } from '@ant-design/icons';
import { useAuth } from '../context/AuthContext';

const { Title, Text, Paragraph } = Typography;

const SubscriptionPage = () => {
  const { profile, isPro } = useAuth();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [billingCycle, setBillingCycle] = useState('monthly');

  const freeFeatures = [
    'Manage up to 50 stock items',
    'Basic inventory tracking',
    'Sales and purchase history',
    'Customer and supplier management',
  ];

  const proFeatures = [
    'Unlimited stock items',
    'All features from the Free plan',
    'Advanced sales reports (Coming Soon)',
    'Priority support (Coming Soon)',
  ];

  const handleUpgradeClick = () => {
    setIsModalVisible(true);
  };

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2} style={{ margin: 0, marginBottom: '24px', marginLeft: '48px' }}>
        <CreditCardOutlined /> Manage Your Subscription
      </Title>
      
      <Row gutter={[24, 24]}>
        
        {/* Current Plan Card */}
        <Col xs={24} md={12}>
          <Card 
            title="Current Plan" 
            variant="borderless" 
            style={{ 
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)', 
              border: `2px solid ${isPro ? '#fadb14' : '#1890ff'}` 
            }}
          >
            <Tag 
              color={isPro ? 'gold' : 'blue'} 
              style={{ fontSize: '1.2rem', padding: '8px 16px', marginBottom: '20px' }}
            >
              {isPro ? 'PRO PLAN' : 'FREE PLAN'}
            </Tag>
            <Paragraph type="secondary">
              You are currently on the {isPro ? 'Pro' : 'Free'} plan.
              {isPro && profile?.subscription_expires_at && (
                <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center' }}>
                  <Text strong>Your plan is valid until: </Text>
                  <Text style={{ marginLeft: '5px' }}>
                    {new Date(profile.subscription_expires_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </Text>
                  {/* YEH NAYA TOOLTIP HAI */}
                  <Tooltip 
                    title="After this date, your plan will automatically revert to the Free plan. You will not lose any of your existing data."
                    placement="top"
                  >
                    <InfoCircleOutlined style={{ marginLeft: '8px', color: '#8c8c8c', cursor: 'pointer' }} />
                  </Tooltip>
                </div>
              )}
            </Paragraph>
            <List
              dataSource={isPro ? proFeatures : freeFeatures}
              renderItem={(item) => (
                <List.Item style={{ border: 'none', padding: '4px 0' }}>
                  <CheckCircleOutlined style={{ color: '#52c41a', marginRight: '10px' }} /> {item}
                </List.Item>
              )}
            />
          </Card>
        </Col>

        {/* Upgrade Plan Card */}
        {/* Upgrade Plan Card - MUKAMMAL NAYA CODE */}
        {!isPro && (
          <Col xs={24} md={12}>
            <Card 
              title="Upgrade to Pro" 
              variant="borderless"
              style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
            >
              {/* === NAYA SWITCH === */}
              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <Radio.Group 
                  value={billingCycle} 
                  onChange={(e) => setBillingCycle(e.target.value)}
                  optionType="button"
                  buttonStyle="solid"
                >
                  <Radio.Button value="monthly">Monthly</Radio.Button>
                  <Radio.Button value="yearly">Yearly</Radio.Button>
                </Radio.Group>
              </div>

              {/* === NAYI DYNAMIC PRICE === */}
              <div style={{ textAlign: 'center' }}>
                <Title level={3}>
                  {billingCycle === 'monthly' ? 'PKR 599' : `PKR 5,750`}
                  <Text type="secondary"> / {billingCycle === 'monthly' ? 'month' : 'year'}</Text>
                </Title>
                {billingCycle === 'yearly' && (
                  <Tag color="success" style={{ marginBottom: '10px' }}>
                    You save 20%!
                  </Tag>
                )}
              </div>
              
              <Paragraph type="secondary" style={{ textAlign: 'center' }}>
                Unlock all features and remove all limits to grow your business.
              </Paragraph>

              <List
                dataSource={proFeatures}
                renderItem={(item) => (
                  <List.Item style={{ border: 'none', padding: '4px 0' }}>
                    <CheckCircleOutlined style={{ color: '#52c41a', marginRight: '10px' }} /> {item}
                  </List.Item>
                )}
              />
              <Button 
                type="primary" 
                size="large" 
                block 
                icon={<RocketOutlined />}
                onClick={handleUpgradeClick}
                style={{ marginTop: '20px' }}
              >
                Upgrade to Pro
              </Button>
            </Card>
          </Col>
        )}

      </Row>
      <Modal
        title={<Title level={4}>Upgrade to Pro - Manual Payment</Title>}
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={[
          <Button key="close" type="primary" onClick={() => setIsModalVisible(false)}>
            Got It!
          </Button>,
        ]}
      >
        <Paragraph type="secondary">
          To upgrade your account, please follow these 3 simple steps.
        </Paragraph>
        <Divider />
        <Steps direction="vertical" current={3}>
          <Steps.Step 
            title="Make Payment" 
            icon={<BankOutlined />}
            description={
              <div>
                <Text>
                  Transfer the subscription fee of{' '}
                  <strong>
                    {billingCycle === 'monthly' ? 'PKR 599 (for one month)' : 'PKR 5,750 (for one year)'}
                  </strong>
                  {' '}to any of the following:
                </Text>
                <Card size="small" style={{ marginTop: '10px' }}>
                  <Text strong>Account Title:</Text> Rashid Ali<br/>
                  <Text strong>EasyPaisa/Raast ID:</Text> 0326 2324446<br/>
                  <Text strong>Bank Account (Optional):</Text> []
                </Card>
              </div>
            } 
          />
          <Steps.Step 
            title="Send Confirmation" 
            icon={<WhatsAppOutlined />}
            description={
              <Text>
                After payment, send a screenshot of the receipt to our WhatsApp number:{' '}
                <a 
                  href="https://wa.me/923262324446" 
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  <strong>+923262324446</strong>
                </a>
              </Text>
            } 
          />
          <Steps.Step 
            title="Account Activation" 
            icon={<CheckCircleOutlined />}
            description="We will verify your payment and upgrade your account within a few hours. You will be notified on WhatsApp once it's done!" 
          />
        </Steps>
        <Divider />
        <Paragraph strong style={{ textAlign: 'center' }}>
          Thank you for choosing to upgrade!
        </Paragraph>
      </Modal>
    </div>
  );
};

export default SubscriptionPage;