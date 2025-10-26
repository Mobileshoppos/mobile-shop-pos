import React from 'react';
import { Layout, Tag, theme } from 'antd';
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
  const { token } = theme.useToken();

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
    </Header>
  );
};

export default AppHeader;