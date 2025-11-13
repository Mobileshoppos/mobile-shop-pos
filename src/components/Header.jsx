import React from 'react';
import { Layout, Tag, theme, Tooltip, Button, Badge, Space } from 'antd';
import { ShopOutlined, CrownOutlined, BellOutlined } from '@ant-design/icons';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';

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
  const { profile, isPro, stockCount, lowStockCount } = useAuth();
  
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

        {/* Right side icons */}
        <Space align="center" size="middle">
          
          {lowStockCount > 0 && (
            <Tooltip title={`${lowStockCount} items are low in stock`} placement="bottom">
              <Link to="/?low_stock=true" style={{ padding: '5px' }}>
                <Badge count={lowStockCount} size="small">
                  <BellOutlined style={{ fontSize: '18px', color: token.colorText }} />
                </Badge>
              </Link>
            </Tooltip>
          )}

          {/* Subscription Status - YEH AAPKA PEHLE WALA BUTTON HAI */}
          <Tooltip title="Manage Subscription" placement="bottom">
            <Button 
              type={isPro ? 'primary' : 'default'} 
              ghost={isPro}
              icon={isPro ? <CrownOutlined /> : null}
              onClick={() => navigate('/subscription')}
              danger={!isPro && stockCount >= 50}
            >
              {isPro ? 'PRO PLAN' : `Stock: ${stockCount} / 50`}
            </Button>
          </Tooltip>
        </Space>

      </div>
    </Header>
  );
};

export default AppHeader;