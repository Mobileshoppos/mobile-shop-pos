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
import { useMediaQuery } from '../hooks/useMediaQuery';
import { useAuth } from '../context/AuthContext';

// 1. Tamam mumkinah shortcuts ka rasta, unke icons aur colors ka map
const iconConfig = {
  '/': { title: 'Dashboard', icon: <HomeOutlined />, color: '#1890ff' },
  '/inventory': { title: 'Inventory', icon: <DatabaseOutlined />, color: '#52c41a' },
  '/pos': { title: 'Point of Sale', icon: <ShoppingCartOutlined />, color: '#13c2c2' },
  '/warranty': { title: 'Warranty', icon: <SafetyCertificateOutlined />, color: '#faad14' },
  '/categories': { title: 'Categories', icon: <TagsOutlined />, color: '#eb2f96' },
  '/purchases': { title: 'Purchases', icon: <FileTextOutlined />, color: '#722ed1' },
  '/customers': { title: 'Customers', icon: <UserSwitchOutlined />, color: '#2f54eb' },
  '/suppliers': { title: 'Suppliers', icon: <ShopOutlined />, color: '#fa8c16' },
  '/sales-history': { title: 'Sales History', icon: <HistoryOutlined />, color: '#1890ff' },
  '/expenses': { title: 'Expenses', icon: <DollarCircleOutlined />, color: '#f5222d' },
  '/damaged-stock': { title: 'Damaged Stock', icon: <AlertOutlined />, color: '#ff4d4f' },
  '/reports': { title: 'Reports', icon: <PieChartOutlined />, color: '#faad14' },
  '/settings': { title: 'Settings', icon: <ToolOutlined />, color: '#8c8c8c' },
};

const FloatingNav = () => {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [isHovered, setIsHovered] = React.useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { isDarkMode } = useTheme();
  const { profile } = useAuth();

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
      padding: '6px 14px',
      borderRadius: '30px',
      backgroundColor: isDarkMode ? 'rgba(31, 31, 31, 0.85)' : 'rgba(255, 255, 255, 0.85)',
      backdropFilter: 'blur(12px)',
      boxShadow: isDarkMode ? '0 8px 32px rgba(0,0,0,0.6)' : '0 8px 32px rgba(0,0,0,0.12)',
      border: isDarkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.06)',
      display: 'flex',
      alignItems: 'center',
      transition: 'all 0.3s ease'
    }}>
      <Space direction={currentStyle.flexDirection === 'column' ? 'vertical' : 'horizontal'} size="small">
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
                  style: { fontSize: '19px', color: isActive ? '#fff' : config.color } 
                })}
                onClick={() => navigate(path)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '42px',
                  height: '42px',
                  transition: 'all 0.2s',
                  backgroundColor: isActive ? config.color : 'transparent'
                }}
              />
            </Tooltip>
          );
        })}
        
        {/* Divider Line */}
        <div style={{ 
          width: currentStyle.flexDirection === 'column' ? '24px' : '1px', 
          height: currentStyle.flexDirection === 'column' ? '1px' : '24px', 
          background: isDarkMode ? '#444' : '#eee', 
          margin: '4px auto' 
        }} />
        
        <Tooltip title="Customize Bar" placement={pos === 'right' ? 'left' : 'top'}>
          <Button 
            type="text" 
            shape="circle" 
            icon={<SettingOutlined style={{ fontSize: '18px', color: '#8c8c8c' }} />} 
            // Seedha Settings ke Navigation tab (4) par le jayega
            onClick={() => navigate('/settings?tab=4')} 
          />
        </Tooltip>
      </Space>
    </div>
  );
};

export default FloatingNav;