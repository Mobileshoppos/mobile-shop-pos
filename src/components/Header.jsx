// src/components/Header.jsx - MUKAMMAL UPDATED CODE

import React from 'react';
import { Layout, Tag, theme } from 'antd'; // 1. 'theme' ko antd se import karein
import { ShopOutlined } from '@ant-design/icons';
import { useAuth } from '../context/AuthContext';

const { Header } = Layout;

const titleContainerStyle = {
  display: 'flex',
  alignItems: 'center',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  minWidth: 0, 
};

const AppHeader = () => {
  const { profile } = useAuth();
  const { token } = theme.useToken(); // 2. Theme ke colors hasil karne ke liye hook istemal karein

  const chipStyle = {
    display: 'flex',
    alignItems: 'center',
    padding: '8px 16px',
    borderRadius: '16px',
    fontSize: 'clamp(0.9rem, 2.5vw, 1.2rem)',
    lineHeight: '1.2',
    border: 'none',
    transition: 'all 0.2s ease-in-out',
    // 3. NAYI TABDEELI: Background color ab theme se aa raha hai
    backgroundColor: token.colorPrimary,
    color: token.colorTextLightSolid, // Text ka rang jo primary color par saaf nazar aaye
  };

  return (
    <Header style={{ padding: '0 24px', background: 'none' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '100%' }}>
        
        <div 
          style={titleContainerStyle}
          title={profile?.shop_name || 'My Shop'}
        >
          <Tag 
            // 4. Yahan se 'color="blue"' hata diya gaya hai
            icon={<ShopOutlined />} 
            style={chipStyle}
          >
            {profile?.shop_name || 'My Shop'}
          </Tag>
        </div>

      </div>
    </Header>
  );
};

export default AppHeader;