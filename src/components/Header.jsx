import React from 'react';
import { Layout, Tag, theme, Tooltip, Button, Badge, Space } from 'antd';
import { 
  ShopOutlined, 
  CrownOutlined, 
  BellOutlined,
  MenuUnfoldOutlined, // Naya Icon (Menu kholne ke liye)
  MenuFoldOutlined    // Naya Icon (Menu band karne ke liye)
} from '@ant-design/icons';
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

// Hum ne yahan 'collapsed' aur 'setCollapsed' receive kiya hai App.jsx se
const AppHeader = ({ collapsed, setCollapsed }) => {
  const { profile, isPro, stockCount, lowStockCount } = useAuth();
  
  const { token } = theme.useToken();
  const navigate = useNavigate();

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
    <Header style={{ padding: '0 16px', background: 'none' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '100%' }}>
        
        {/* Left Side: Menu Button + Shop Name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
            
            {/* YEH HAI WO NAYA BUTTON */}
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              style={{
                fontSize: '16px',
                width: 40,
                height: 40,
                color: token.colorText
              }}
            />

            {/* Shop Name */}
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
        </div>

        {/* Right Side: Icons & Subscription Button */}
        <Space align="center" size="small">

          <Tooltip title="Manage Subscription" placement="bottom">
            <Button 
              type={isPro ? 'primary' : 'default'} 
              ghost={isPro}
              icon={isPro ? <CrownOutlined /> : null}
              onClick={() => navigate('/subscription')}
              danger={!isPro && stockCount >= 50}
              size="middle"
            >
              {isPro ? 'PRO' : `Stock: ${stockCount}/50`}
            </Button>
          </Tooltip>
        </Space>

      </div>
    </Header>
  );
};

export default AppHeader;