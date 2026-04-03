import React from 'react';
import { Card, Typography, List, Button, Divider, theme, Timeline, Tag, Badge, Space, Row, Col } from 'antd';
import {
  SafetyCertificateOutlined,
  FileProtectOutlined,
  DollarCircleOutlined,
  GlobalOutlined,
  RightOutlined,
  HistoryOutlined,
  CheckCircleOutlined,
  RocketOutlined,
  SyncOutlined,
  ThunderboltOutlined,
  CloudServerOutlined,
  SafetyOutlined
} from '@ant-design/icons';
import { useTheme } from '../context/ThemeContext';
import dayjs from 'dayjs';

const { Title, Text, Paragraph } = Typography;

const About = () => {
  const { token } = theme.useToken();
  const { isDarkMode } = useTheme();

  const changelog = [
    {
      version: '1.3.0',
      date: 'April 2026',
      status: 'Latest',
      changes: [
        { type: 'added', text: 'Hardware-Linked Counters: Pair specific PCs/Browsers to physical cash drawers permanently.' },
        { type: 'added', text: 'Professional Shift Management: Track Opening Float, Expected Cash, and Closing Balances.' },
        { type: 'added', text: 'Unified Workflow: Owners now follow the same shift-based cash discipline as staff for accurate audits.' },
        { type: 'improved', text: 'Global Terminology: Standardized English (Opening Float, Cash Drawer, Payments) for international SaaS compliance.' },
        { type: 'improved', text: 'Advanced Cash Flow: Track internal transfers between counters and bank accounts with auto-validation.' },
        { type: 'security', text: 'Mandatory Master PIN setup integrated into onboarding for immediate terminal protection.' },
        { type: 'fix', text: 'Ghost Session Auto-Healer: Automatically detects and closes orphaned shifts from browser crashes or cache clears.' },
        { type: 'fix', text: 'Cross-Table Integrity: Synced register_id across Sales, Returns, Payouts, and Supplier Refunds.' }
      ]
    },
    {
      version: '1.2.0',
      date: 'March 2026',
      status: 'Old',
      changes: [
        { type: 'added', text: 'Cloud-Synced Draft & Quotation System with unique IDs.' },
        { type: 'added', text: 'Admin Security: Staff Discount Limits with Master PIN override.' },
        { type: 'added', text: 'Conflict Resolution Center: Add missing purchases directly from Sync Center.' },
        { type: 'improved', text: 'Cart Persistence: Active bills now auto-save and restore on page refresh.' },
        { type: 'improved', text: 'Professional PDF/Thermal Quotations with custom policy and validity.' },
        { type: 'security', text: 'Role-based access for sensitive POS actions (Discard/Resolve).' },
        { type: 'fix', text: 'Database Integrity: Strict inventory constraints to prevent negative stock.' }
      ]
    },
    {
      version: '1.1.2',
      date: 'February 2026',
      status: 'Old',
      changes: [
        { type: 'added', text: 'Initial release with Inventory and Sales management.' },
        { type: 'added', text: 'Support for PDF and Thermal receipts.' }
      ]
    }
  ];

  const legalLinks = [
    {
      title: 'Privacy Policy',
      icon: <SafetyCertificateOutlined style={{ fontSize: '20px', color: token.colorPrimary }} />,
      url: 'https://www.sadapos.com/p/privacy-policy.html'
    },
    {
      title: 'Terms of Service',
      icon: <FileProtectOutlined style={{ fontSize: '20px', color: token.colorWarning }} />,
      url: 'https://www.sadapos.com/p/terms-of-service.html'
    },
    {
      title: 'Refund Policy',
      icon: <DollarCircleOutlined style={{ fontSize: '20px', color: token.colorSuccess }} />,
      url: 'https://www.sadapos.com/p/refund-policy.html'
    }
  ];

  const getTagColor = (type) => {
    switch (type) {
      case 'added': return 'green';
      case 'improved': return 'blue';
      case 'security': return 'purple';
      case 'fix': return 'orange';
      default: return 'default';
    }
  };

  return (
    <div style={{ background: token.colorBgLayout, minHeight: '100vh' }}>
      
      {/* --- FULL WIDTH HERO HEADER --- */}
      <div style={{ 
        width: '100%', 
        background: isDarkMode 
          ? `linear-gradient(180deg, ${token.colorBgContainer} 0%, ${token.colorBgLayout} 100%)` 
          : `linear-gradient(180deg, #ffffff 0%, ${token.colorBgLayout} 100%)`,
        padding: isDarkMode ? '60px 24px' : '60px 24px',
        borderBottom: `1px solid ${token.colorBorderSecondary}`,
        textAlign: 'center'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <Badge count="PRO" offset={[10, 0]} color={token.colorPrimary}>
            <RocketOutlined style={{ fontSize: '54px', color: token.colorPrimary, marginBottom: 20 }} />
          </Badge>
          
          <Title level={1} style={{ fontSize: '48px', margin: 0, fontWeight: 800, letterSpacing: '-1.5px' }}>
            Sada<span style={{ color: token.colorPrimary }}>POS</span>
          </Title>
          
          <Paragraph style={{ fontSize: '18px', color: token.colorTextSecondary, marginTop: 12, maxWidth: '600px', margin: '12px auto 32px auto' }}>
            The smartest all-in-one retail management ecosystem. Built for speed, designed for reliability, and synced for growth.
          </Paragraph>

          <Row gutter={[24, 24]} justify="center" style={{ marginTop: 40 }}>
            <Col xs={24} sm={8} md={6}>
              <Card variant="borderless" style={{ background: token.colorFillQuaternary, borderRadius: 12 }}>
                <SyncOutlined style={{ fontSize: '24px', color: token.colorInfo, marginBottom: 12 }} />
                <Title level={5} style={{ margin: 0 }}>Real-time Sync</Title>
                <Text type="secondary" style={{ fontSize: '12px' }}>Multi-terminal cloud synchronization</Text>
              </Card>
            </Col>
            <Col xs={24} sm={8} md={6}>
              <Card variant="borderless" style={{ background: token.colorFillQuaternary, borderRadius: 12 }}>
                <ThunderboltOutlined style={{ fontSize: '24px', color: token.colorSuccess, marginBottom: 12 }} />
                <Title level={5} style={{ margin: 0 }}>Offline First</Title>
                <Text type="secondary" style={{ fontSize: '12px' }}>Works without internet, syncs later</Text>
              </Card>
            </Col>
            <Col xs={24} sm={8} md={6}>
              <Card variant="borderless" style={{ background: token.colorFillQuaternary, borderRadius: 12 }}>
                <SafetyOutlined style={{ fontSize: '24px', color: token.colorWarning, marginBottom: 12 }} />
                <Title level={5} style={{ margin: 0 }}>Bank-Grade</Title>
                <Text type="secondary" style={{ fontSize: '12px' }}>Secure Master PIN & Data Encryption</Text>
              </Card>
            </Col>
          </Row>
        </div>
      </div>

      {/* --- CONTENT SECTION (Centered) --- */}
      <div style={{ padding: '40px 24px', maxWidth: '900px', margin: '0 auto' }}>
        
        <Row gutter={[24, 24]}>
          {/* Release Notes */}
          <Col span={24}>
            <Card 
              title={<Space><HistoryOutlined /> System Evolution & Release Notes</Space>} 
              variant="borderless"
              style={{ borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
            >
              <Timeline
                items={changelog.map((release) => ({
                  color: release.status === 'Latest' ? token.colorPrimary : 'gray',
                  children: (
                    <div style={{ paddingBottom: 20 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                        <Text strong style={{ fontSize: '18px' }}>v{release.version}</Text>
                        <Text type="secondary">({release.date})</Text>
                        {release.status === 'Latest' && <Tag color="processing">Latest Deployment</Tag>}
                      </div>
                      <List
                        size="small"
                        dataSource={release.changes}
                        renderItem={change => (
                          <List.Item style={{ padding: '6px 0', border: 'none' }}>
                            <Space align="start">
                              <Tag color={getTagColor(change.type)} style={{ minWidth: '80px', textAlign: 'center', fontSize: '10px', borderRadius: 4 }}>
                                {change.type.toUpperCase()}
                              </Tag>
                              <Text style={{ fontSize: '14px' }}>{change.text}</Text>
                            </Space>
                          </List.Item>
                        )}
                      />
                      {release.status !== 'Old' && <Divider style={{ margin: '20px 0 0 0' }} />}
                    </div>
                  )
                }))}
              />
            </Card>
          </Col>

          {/* Legal Section */}
          <Col span={24}>
            <Card 
              title="Legal Compliance & Support" 
              variant="borderless"
              style={{ borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
            >
              <List
                itemLayout="horizontal"
                dataSource={legalLinks}
                renderItem={item => (
                  <List.Item
                    actions={[
                      <Button type="link" icon={<RightOutlined />} href={item.url} target="_blank">View</Button>
                    ]}
                  >
                    <List.Item.Meta
                      avatar={<div style={{ padding: '8px', background: token.colorFillAlter, borderRadius: 8 }}>{item.icon}</div>}
                      title={<a href={item.url} target="_blank" style={{ color: token.colorText }}>{item.title}</a>}
                      description="Official documentation and legal terms."
                    />
                  </List.Item>
                )}
              />
            </Card>
          </Col>
        </Row>

        <div style={{ textAlign: 'center', marginTop: 48, paddingBottom: 40 }}>
          <Divider />
          <Text type="secondary" style={{ fontSize: '13px' }}>
            © {dayjs().format('YYYY')} SadaPOS Global. All rights reserved. <br/>
            Engineered for excellence in retail management.
          </Text>
        </div>
      </div>
    </div>
  );
};

export default About;