// src/components/Header.jsx - MODIFIED WITH "CHIP" (TAG) DESIGN

import React from 'react';
import { Layout, Typography, Switch, Space, Tag } from 'antd'; // NAYA IZAFA: Tag import kiya
import { SunOutlined, MoonOutlined, ShopOutlined } from '@ant-design/icons';
import { useAuth } from '../context/AuthContext';

const { Header } = Layout;

// Container ke styles abhi bhi zaroori hain lambe text ko handle karne ke liye
const titleContainerStyle = {
  display: 'flex',
  alignItems: 'center',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  minWidth: 0, 
};

const AppHeader = ({ isDarkMode, toggleTheme }) => {
  const { profile } = useAuth();
  
  // NAYA IZAFA: Chip/Tag ke liye khaas styles
  const chipStyle = {
    display: 'flex',
    alignItems: 'center',
    // Padding taake chip thori bari aur numayan lage
    padding: '8px 16px',
    // Border radius taake yeh "pill" shape mein aaye
    borderRadius: '16px',
    // Font size ko responsive banaya gaya hai
    fontSize: 'clamp(0.9rem, 2.5vw, 1.2rem)',
    lineHeight: '1.2',
    border: 'none', // Koi extra border nahi chahiye
    // Transition effect taake size smoothly change ho
    transition: 'all 0.2s ease-in-out',
  };

  return (
    <Header style={{ padding: '0 24px', background: 'none' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '100%' }}>
        
        <div 
          style={titleContainerStyle}
          // Title attribute taake agar naam cut jaye to mouse le jaane par poora naam dikhe
          title={profile?.shop_name || 'My Shop'}
        >
          {/* NAYA IZAFA: Title ko Ant Design ke <Tag> (Chip) se replace kiya gaya hai */}
          <Tag 
            color="blue" 
            icon={<ShopOutlined />} 
            style={chipStyle}
          >
            {profile?.shop_name || 'My Shop'}
          </Tag>
        </div>

        <Space>
          <Switch
            checkedChildren={<MoonOutlined />}
            unCheckedChildren={<SunOutlined />}
            checked={isDarkMode}
            onChange={toggleTheme}
          />
        </Space>
      </div>
    </Header>
  );
};

export default AppHeader;