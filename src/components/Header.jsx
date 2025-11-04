import React from 'react';
import { Layout, Tag, theme, Tooltip, Button } from 'antd';
import { ShopOutlined, CrownOutlined } from '@ant-design/icons';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

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
  // Qadam 3.2: Hum ab tamam data AuthContext se le rahe hain.
  // Stock count ab yahan se aayega, is liye live update hoga.
  const { profile, isPro, stockCount } = useAuth();
  
  const { token } = theme.useToken();
  const navigate = useNavigate(); // Page tabdeel karne ke liye

  const chipStyle = {
    display: 'flex',
    alignItems: 'center',
    padding: '8px 16px',
    borderRadius: '16px',
    fontSize: 'clamp(0.9rem, 2.5vw, 1.2rem)',
    lineHeight: '1.2',
    border: 'none',
    transition: 'all 0.2s ease-in-out',
    backgroundColor: token.colorPrimary,
    color: token.colorTextLightSolid,
  };

  return (
    <Header style={{ padding: '0 24px', background: 'none' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '100%' }}>
        
        {/* Shop Name - Is mein koi tabdeeli nahi */}
        <div 
          style={titleContainerStyle}
          title={profile?.shop_name || 'My Shop'}
        >
          <Tag 
            icon={<ShopOutlined />} 
            style={chipStyle}
          >
            {profile?.shop_name || 'My Shop'}
          </Tag>
        </div>

        {/* Subscription Status - Yeh naya aur behtar button hai */}
        <Tooltip title="Manage Subscription" placement="bottom">
          <Button 
            type={isPro ? 'primary' : 'default'} 
            ghost={isPro}
            icon={isPro ? <CrownOutlined /> : null}
            onClick={() => navigate('/subscription')} // Click karne par page tabdeel hoga
            danger={!isPro && stockCount >= 50} // Limit poori hone par laal (red) ho jayega
          >
            {isPro ? 'PRO PLAN' : `Stock: ${stockCount} / 50`}
          </Button>
        </Tooltip>

      </div>
    </Header>
  );
};

export default AppHeader;