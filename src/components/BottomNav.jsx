import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  HomeOutlined, ShoppingCartOutlined, DatabaseOutlined, 
  HistoryOutlined, MenuOutlined, SettingOutlined,
  PieChartOutlined, TeamOutlined, SafetyCertificateOutlined
} from '@ant-design/icons';
import { theme } from 'antd';
import { useAuth } from '../context/AuthContext';

const iconMap = {
  '/': <HomeOutlined />,
  '/pos': <ShoppingCartOutlined />,
  '/inventory': <DatabaseOutlined />,
  '/sales-history': <HistoryOutlined />,
  '/reports': <PieChartOutlined />,
  '/customers': <TeamOutlined />,
  '/warranty': <SafetyCertificateOutlined />,
  '/settings': <SettingOutlined />,
};

const BottomNav = ({ setCollapsed }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { token } = theme.useToken();
  const { profile } = useAuth();
  
  const [visible, setVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (Math.abs(currentScrollY - lastScrollY) < 10) return;
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setVisible(false);
      } else {
        setVisible(true);
      }
      setLastScrollY(currentScrollY);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  const defaultShortcuts = ["/", "/pos", "/inventory", "/sales-history"];
  const userShortcuts = profile?.mobile_nav_items || defaultShortcuts;

  const containerStyle = {
    position: 'fixed',
    bottom: visible ? '0' : '-70px', 
    left: 0,
    right: 0,
    height: '50px', // Height mazeed kam kar di (Labels hatne ki wajah se)
    backgroundColor: token.colorBgContainer, // Control Center ka background
    backdropFilter: 'blur(4px)',
    WebkitBackdropFilter: 'blur(4px)',
    display: 'flex',
    justifyContent: 'space-around',
    alignItems: 'center',
    borderTop: `1px solid ${token.colorBorder}`, // Control Center ka border
    zIndex: 1000,
    boxShadow: token.boxShadowSecondary, // Control Center ki shadow
    transition: 'bottom 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
    paddingBottom: 'env(safe-area-inset-bottom)',
  };

  const itemStyle = (path) => ({
    display: 'flex', 
    flexDirection: 'column', 
    alignItems: 'center', 
    justifyContent: 'center',
    flex: 1,
    height: '100%',
    color: location.pathname === path ? token.colorPrimary : token.colorTextSecondary,
    cursor: 'pointer',
    transition: 'all 0.3s'
  });

  return (
    <div style={containerStyle}>
      {userShortcuts.map((path) => (
        <div 
          key={path} 
          style={itemStyle(path)}
          onClick={() => navigate(path)}
        >
          <div style={{ 
            fontSize: '18px', // Icon size mazeed chhota kar diya
            transform: location.pathname === path ? 'scale(1.15)' : 'scale(1)',
            transition: 'transform 0.2s'
          }}>
            {iconMap[path] || <HomeOutlined />}
          </div>
          {/* Labels (span) yahan se hata diye gaye hain */}
        </div>
      ))}
      
      <div 
        style={{ ...itemStyle('more'), color: token.colorTextSecondary }}
        onClick={() => setCollapsed(false)}
      >
        <div style={{ fontSize: '18px' }}><MenuOutlined /></div>
      </div>
    </div>
  );
};

export default BottomNav;