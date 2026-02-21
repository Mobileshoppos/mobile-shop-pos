import React from 'react';
import { Button, Tooltip, Space } from 'antd';
import { 
  HomeOutlined, ShoppingCartOutlined, DatabaseOutlined, 
  SafetyCertificateOutlined, TagsOutlined, FileTextOutlined,
  UserSwitchOutlined, ShopOutlined, HistoryOutlined,
  DollarCircleOutlined, PieChartOutlined, ToolOutlined,
  SettingOutlined, AlertOutlined
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { theme } from 'antd';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { useAuth } from '../context/AuthContext';

const FloatingNav = () => {
  const { token } = theme.useToken(); // Control Center Connection
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [isHovered, setIsHovered] = React.useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { profile } = useAuth();

  // 1. Tamam mumkinah shortcuts ka rasta, unke icons aur colors ka map
  // Ab yeh bahar se andar aa gaya hai taake 'token' ko use kar sake
  const iconConfig = {
    '/': { title: 'Dashboard', icon: <HomeOutlined />, color: token.colorPrimary },
    '/inventory': { title: 'Inventory', icon: <DatabaseOutlined />, color: token.colorSuccess },
    '/pos': { title: 'Point of Sale', icon: <ShoppingCartOutlined />, color: token.colorInfo },
    '/warranty': { title: 'Warranty', icon: <SafetyCertificateOutlined />, color: token.colorWarning },
    '/categories': { title: 'Categories', icon: <TagsOutlined />, color: token.colorPrimary },
    '/purchases': { title: 'Purchases', icon: <FileTextOutlined />, color: token.colorInfo },
    '/customers': { title: 'Customers', icon: <UserSwitchOutlined />, color: token.colorPrimary },
    '/suppliers': { title: 'Suppliers', icon: <ShopOutlined />, color: token.colorWarning },
    '/sales-history': { title: 'Sales History', icon: <HistoryOutlined />, color: token.colorPrimary },
    '/expenses': { title: 'Expenses', icon: <DollarCircleOutlined />, color: token.colorError },
    '/damaged-stock': { title: 'Damaged Stock', icon: <AlertOutlined />, color: token.colorError },
    '/reports': { title: 'Reports', icon: <PieChartOutlined />, color: token.colorWarning },
    '/settings': { title: 'Settings', icon: <ToolOutlined />, color: token.colorTextSecondary },
  };

  // Agar mobile screen hai to kuch na dikhao
  if (isMobile) return null;

  // 2. Position Logic (Default: bottom)
  // Left option khatam kar diya gaya hai kyunke wahan pehle se menu maujood hai
  let pos = profile?.desktop_nav_position || 'bottom';
  if (pos === 'left') pos = 'bottom'; 

  const positionStyles = {
    bottom: { bottom: '25px', left: '50%', transform: 'translateX(-50%)', flexDirection: 'row' },
    right: { right: '20px', top: '50%', transform: 'translateY(-50%)', flexDirection: 'column' },
  };
  const currentStyle = positionStyles[pos] || positionStyles.bottom;

  // 3. User ke chune hue shortcuts (Default agar khali ho)
  const defaultShortcuts = ['/pos', '/inventory', '/warranty', '/customers', '/expenses'];
  const userShortcuts = profile?.desktop_nav_items || defaultShortcuts;

  return (
    <div style={{
      position: 'fixed',
      ...currentStyle,
      zIndex: 1000,
      padding: '4px 10px',
      borderRadius: '30px',
      backgroundColor: token.colorBgElevated, // Control Center Background
      backdropFilter: 'blur(12px)',
      boxShadow: token.boxShadowSecondary, // Control Center Shadow
      border: `1px solid ${token.colorBorderSecondary}`, // Control Center Border
      display: 'flex',
      alignItems: 'center',
      transition: 'all 0.3s ease'
    }}>
      <Space direction={currentStyle.flexDirection === 'column' ? 'vertical' : 'horizontal'} size={4}>
        {userShortcuts.map((path) => {
          const config = iconConfig[path];
          if (!config) return null;
          
          const isActive = location.pathname === path;

          return (
            <Tooltip key={path} title={config.title} placement={pos === 'right' ? 'left' : 'top'}>
              <Button
                type={isActive ? 'primary' : 'text'}
                shape="circle"
                icon={React.cloneElement(config.icon, { 
                  style: { fontSize: '16px', color: isActive ? '#fff' : config.color } 
                })}
                onClick={() => navigate(path)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '36px',
                  height: '36px',
                  transition: 'all 0.2s',
                  backgroundColor: isActive ? config.color : 'transparent'
                }}
              />
            </Tooltip>
          );
        })}
        
        {/* Divider Line */}
        <div style={{ 
          width: currentStyle.flexDirection === 'column' ? '20px' : '1px', 
          height: currentStyle.flexDirection === 'column' ? '1px' : '20px', 
          background: token.colorBorder, 
          margin: '4px auto' 
        }} />
        
        <Tooltip title="Customize Bar" placement={pos === 'right' ? 'left' : 'top'}>
          <Button 
            type="text" 
            shape="circle" 
            icon={<SettingOutlined style={{ fontSize: '15px', color: token.colorTextSecondary }} />} 
            // Seedha Settings ke Navigation tab (4) par le jayega
            onClick={() => navigate('/settings?tab=4')} 
          />
        </Tooltip>
      </Space>
    </div>
  );
};

export default FloatingNav;