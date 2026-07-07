import React, { useState, useEffect } from 'react';
import { Layout, Typography, theme } from 'antd';
import dayjs from 'dayjs';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { BulbOutlined, ShopOutlined, WifiOutlined, DisconnectOutlined } from '@ant-design/icons';
import { useAuth } from '../context/AuthContext';
import { useSync } from '../context/SyncContext';

const { Footer } = Layout;
const { Text } = Typography;

const AppFooter = () => {
  const { token } = theme.useToken();
  const [currentTime, setCurrentTime] = useState(dayjs());
  const { profile } = useAuth();
  const { isOnline } = useSync();

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(dayjs()), 60000);
    return () => clearInterval(timer);
  }, []);

  const isMobile = useMediaQuery('(max-width: 992px)'); 
  const currentYear = new Date().getFullYear();

  // Mobile par humein footer nahi dikhana kyunke wahan pehle hi BottomNav mojood hai
  if (isMobile) return null;

  return (
    <Footer style={{
      textAlign: 'center',
      padding: '6px 24px', 
      background: token.colorHeaderBg, 
      borderTop: `1px solid ${token.colorPrimary}33`, 
      boxShadow: `0 -2px 8px ${token.colorPrimary}15`, 
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      fontSize: '13px',
      marginTop: 'auto',
      position: 'sticky', 
      bottom: 0,          
      zIndex: 10          
    }}>
      {/* Left Side: Shop Name & Financial Year (Busy Software Style) */}
      <div style={{ flex: 1, textAlign: 'left', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <Text style={{ color: token.colorText, fontWeight: '500' }}>
          <ShopOutlined style={{ marginRight: '6px', color: token.colorPrimary }} />
          {profile?.shop_name || 'SadaPOS'}
        </Text>
        <span style={{ color: token.colorBorderSecondary }}>|</span>
        <Text style={{ color: token.colorText, fontSize: '12px' }}>
          FY: {currentYear}-{currentYear + 1}
        </Text>
      </div>

      {/* Center: Keyboard Shortcut Hint */}
      <div style={{ flex: 1, textAlign: 'center' }}>
        <Text style={{ color: token.colorText }}>
          <BulbOutlined style={{ color: token.colorWarning, marginRight: '4px' }} /> 
          Tip: Press <Text keyboard style={{ fontSize: '11px', color: token.colorText, borderColor: token.colorBorderSecondary }}>Alt+X</Text> for Global Search
        </Text>
      </div>

      {/* Right Side: Network Status + Clock */}
      <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '16px' }}>
        
        {/* Network Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {isOnline ? (
            <WifiOutlined style={{ color: token.colorSuccess }} />
          ) : (
            <DisconnectOutlined style={{ color: token.colorError }} />
          )}
          <Text style={{ color: isOnline ? token.colorSuccess : token.colorError, fontSize: '12px', fontWeight: '500' }}>
            {isOnline ? 'Online' : 'Offline'}
          </Text>
        </div>
        
        {/* Clock */}
        <div style={{ borderLeft: `1px solid ${token.colorBorderSecondary}`, paddingLeft: '16px', display: 'flex', gap: '8px', alignItems: 'center' }}>
          <Text strong style={{ color: token.colorPrimary, fontSize: '13px' }}>{currentTime.format('hh:mm A')}</Text>
          <Text style={{ color: token.colorText, fontSize: '11px', letterSpacing: '0.5px', textTransform: 'uppercase' }}>{currentTime.format('ddd, DD MMM')}</Text>
        </div>
      </div>
    </Footer>
  );
};

export default AppFooter;