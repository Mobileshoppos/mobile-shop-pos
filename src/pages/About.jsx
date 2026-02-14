import React from 'react';
import { Card, Typography, List, Button, Divider } from 'antd';
import {
  SafetyCertificateOutlined,
  FileProtectOutlined,
  DollarCircleOutlined,
  GlobalOutlined,
  RightOutlined
} from '@ant-design/icons';
import { useTheme } from '../context/ThemeContext';

const { Title, Text } = Typography;

const About = () => {
  const { isDarkMode } = useTheme();

  const legalLinks = [
    {
      title: 'Privacy Policy',
      icon: <SafetyCertificateOutlined style={{ fontSize: '20px', color: '#1890ff' }} />,
      url: 'https://www.sadapos.com/p/privacy-policy.html'
    },
    {
      title: 'Terms of Service',
      icon: <FileProtectOutlined style={{ fontSize: '20px', color: '#faad14' }} />,
      url: 'https://www.sadapos.com/p/terms-of-service.html'
    },
    {
      title: 'Refund Policy',
      icon: <DollarCircleOutlined style={{ fontSize: '20px', color: '#52c41a' }} />,
      url: 'https://www.sadapos.com/p/refund-policy.html'
    }
  ];

  return (
    <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
      
      {/* App Info Section */}
      <Card 
        bordered={false} 
        style={{ 
          textAlign: 'center', 
          marginBottom: 24,
          background: isDarkMode ? '#1f1f1f' : '#ffffff',
          borderRadius: 8
        }}
      >
        <GlobalOutlined style={{ fontSize: '48px', color: '#1890ff', marginBottom: 16 }} />
        <Title level={2} style={{ margin: 0 }}>SadaPOS</Title>
        <Text type="secondary">Version 1.1.2</Text>
        <br />
        <br />
        <Text>The smartest offline-first POS for mobile shops.</Text>
      </Card>

      {/* Legal Links Section */}
      <Card 
        title="Legal & Support" 
        bordered={false}
        style={{ 
          background: isDarkMode ? '#1f1f1f' : '#ffffff',
          borderRadius: 8
        }}
      >
        <List
          itemLayout="horizontal"
          dataSource={legalLinks}
          renderItem={item => (
            <List.Item
              actions={[
                <Button
                  type="link"
                  icon={<RightOutlined />}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View
                </Button>
              ]}
            >
              <List.Item.Meta
                avatar={item.icon}
                title={
                  <a 
                    href={item.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{ color: isDarkMode ? '#fff' : '#000' }}
                  >
                    {item.title}
                  </a>
                }
                description={<Text type="secondary" style={{ fontSize: '12px' }}>Read on sadapos.com</Text>}
              />
            </List.Item>
          )}
        />
      </Card>
      
      <div style={{ textAlign: 'center', marginTop: 24 }}>
        <Text type="secondary" style={{ fontSize: '12px' }}>
          © 2026 SadaPOS. All rights reserved.
        </Text>
      </div>
    </div>
  );
};

export default About;