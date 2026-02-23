import React, { useState } from 'react'; // useState add kiya hai
import { Layout, Menu, Switch, ConfigProvider } from 'antd'; // ConfigProvider add kiya
import { Link, useLocation } from 'react-router-dom';
import { 
  HomeOutlined, 
  ShoppingCartOutlined, 
  PieChartOutlined, 
  LogoutOutlined, 
  AppstoreOutlined,
  DollarCircleOutlined,
  SettingOutlined,
  TeamOutlined,
  HistoryOutlined,
  CreditCardOutlined,
  TagsOutlined,       
  FileTextOutlined,   
  ShopOutlined,       
  UserSwitchOutlined, 
  FileProtectOutlined,
  SafetyCertificateOutlined,
  ProfileOutlined,    
  ToolOutlined,
  DatabaseOutlined,
  AlertOutlined,
  InfoCircleOutlined,
  MenuUnfoldOutlined,
  MenuFoldOutlined
} from '@ant-design/icons';
import { theme } from 'antd'; // Control Center connection
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';

const { Sider } = Layout;

const menuItems = [
    // 1. Main Dashboard
    { key: '/', icon: <HomeOutlined />, label: <Link to="/">Dashboard</Link> },
    
    // 2. Inventory (Naya Button)
    { key: '/inventory', icon: <DatabaseOutlined />, label: <Link to="/inventory">Inventory</Link> },

    // 3. POS
    { key: '/pos', icon: <ShoppingCartOutlined />, label: <Link to="/pos">Point of Sale</Link> },

    // 4. Warranty & Claims (Naya Button)
    { key: '/warranty', icon: <SafetyCertificateOutlined />, label: <Link to="/warranty">Warranty & Claims</Link> },

    // 5. Product Management Group
    {
      key: 'products',
      icon: <AppstoreOutlined />,
      label: 'Product Mgmt',
      children: [
        { key: '/categories', icon: <TagsOutlined />, label: <Link to="/categories">Categories</Link> },
        { key: '/purchases', icon: <FileTextOutlined />, label: <Link to="/purchases">Purchase Orders</Link> },
      ]
    },

    // 3. People Group
    {
      key: 'people',
      icon: <TeamOutlined />,
      label: 'Partners',
      children: [
        { key: '/customers', icon: <UserSwitchOutlined />, label: <Link to="/customers">Customers</Link> },
        { key: '/suppliers', icon: <ShopOutlined />, label: <Link to="/suppliers">Suppliers</Link> },
      ]
    },

    // 4. Finance Group
    {
      key: 'finance',
      icon: <DollarCircleOutlined />,
      label: 'Finance',
      children: [
        { key: '/sales-history', icon: <HistoryOutlined />, label: <Link to="/sales-history">Sales History</Link> },
        { key: '/expenses', icon: <DollarCircleOutlined />, label: <Link to="/expenses">Expenses</Link> },
        { key: '/expense-categories', icon: <FileProtectOutlined />, label: <Link to="/expense-categories">Exp. Categories</Link> },
        { key: '/damaged-stock', icon: <AlertOutlined />, label: <Link to="/damaged-stock">Damaged Stock</Link> },
      ]
    },

    // 5. Reports
    // { key: '/reports', icon: <PieChartOutlined />, label: <Link to="/reports">Reports</Link> },

    { type: 'divider' },

    // 6. Settings Group
    {
      key: 'settings_group',
      icon: <SettingOutlined />,
      label: 'Settings',
      children: [
        { key: '/profile', icon: <ProfileOutlined />, label: <Link to="/profile">Profile</Link> },
        { key: '/subscription', icon: <CreditCardOutlined />, label: <Link to="/subscription">Subscription</Link> },
        { key: '/settings', icon: <ToolOutlined />, label: <Link to="/settings">App Settings</Link> },
        { key: '/about', icon: <InfoCircleOutlined />, label: <Link to="/about">About</Link> },
      ]
    },
];

// Yeh wo keys hain jo Groups hain (Jinhein humein control karna hai)
const rootSubmenuKeys = ['products', 'people', 'finance', 'settings_group'];

const SideMenu = ({ collapsed, setCollapsed, isMobile }) => {
  const { token } = theme.useToken(); // Control Center se colors mangwaye
  const location = useLocation();
  const { profile } = useAuth();
  
  // State: Kaunsa menu khula hai, shuru mein khali rakha hai (sab band)
  const [openKeys, setOpenKeys] = useState([]);

  // Logic: Ek waqt mein ek hi menu kholne ke liye
  const onOpenChange = (keys) => {
    const latestOpenKey = keys.find((key) => openKeys.indexOf(key) === -1);
    if (latestOpenKey && rootSubmenuKeys.indexOf(latestOpenKey) === -1) {
      setOpenKeys(keys);
    } else {
      setOpenKeys(latestOpenKey ? [latestOpenKey] : []);
    }
  };

  const handleMenuItemClick = () => {
    if (isMobile) {
      setCollapsed(true);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  // 1. Pehle menu items ko filter karein (Warranty ON/OFF ke mutabiq)
  const filteredMenuItems = menuItems.filter(item => {
    if (item.key === '/warranty' && profile?.warranty_system_enabled === false) {
      return false;
    }
    return true;
  });

  // 2. Phir filtered items par map chalayein (Mobile menu band karne ke liye)
  const processedMenuItems = filteredMenuItems.map(item => {
    if (item.type === 'divider') return item;
    if (item.children) {
        return {
            ...item,
            children: item.children.map(child => ({ ...child, onClick: handleMenuItemClick }))
        };
    }
    return { ...item, onClick: handleMenuItemClick };
  });

  const menuItemsWithLogout = [
    ...processedMenuItems,
    { type: 'divider' }, 
    { key: 'logout', icon: <LogoutOutlined />, danger: true, label: 'Logout', onClick: () => {
      handleLogout();
      handleMenuItemClick();
    }},
    { 
      key: 'toggle', 
      icon: collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />, 
      label: collapsed ? 'Expand Menu' : 'Collapse', 
      onClick: () => setCollapsed(!collapsed) 
    },
  ];

  const siderStyle = {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    // Yahan humne solid color aur fading line ko aapas mein jorr diya hai
    background: `linear-gradient(to bottom, ${token.colorBorder} 80%, transparent 100%) no-repeat right / 1px 100%, ${token.colorSiderBg}`,
    borderRight: 'none', // Purani line ko mukammal khatam kar diya
    ...(isMobile && {
        position: 'fixed',
        height: '100vh',
        zIndex: 1000,
    }),
  };

  return (
    <Sider 
        collapsedWidth={isMobile ? "0" : "64"}
        theme="light"
        collapsible
        collapsed={collapsed}
        onCollapse={(value) => setCollapsed(value)}
        trigger={null}
        style={siderStyle}
      >
        <div>
            {/* Logo Area */}
            <div style={{ 
                height: '64px', 
                display: 'flex',
                alignItems: 'center',
                padding: collapsed ? '0' : '0 24px', 
                justifyContent: collapsed ? 'center' : 'flex-start',
                cursor: 'pointer',
                background: 'transparent',
                borderBottom: `1px solid ${token.colorBorder}`, // Yeh line header ki line se mil jayegi
                marginBottom: '8px'
            }}>
                {/* Logo Icon */}
                <svg width="28" height="28" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ minWidth: '28px' }}>
                    <path d="M4 5C4 4.44772 4.44772 4 5 4H13C13.5523 4 14 4.44772 14 5V13C14 13.5523 13.5523 14 13 14H5C4.44772 14 4 13.5523 4 13V5Z" fill={token.colorPrimary} />
                    <path d="M18 5C18 4.44772 18.4477 4 19 4H27C27.5523 4 28 4.44772 28 5V13C28 13.5523 27.5523 14 27 14H19C18.4477 14 18 13.5523 18 13V5Z" fill={token.colorPrimary} fillOpacity="0.6" />
                    <path d="M4 19C4 18.4477 4.44772 18 5 18H13C13.5523 18 14 18.4477 14 19V27C14 27.5523 13.5523 28 13 28H5C4.44772 28 4 27.5523 4 27V19Z" fill={token.colorPrimary} fillOpacity="0.6" />
                    <path d="M18 19C18 18.4477 18.4477 18 19 18H27C27.5523 18 28 18.4477 28 19V27C28 27.5523 27.5523 28 27 28H19C18.4477 28 18 27.5523 18 27V19Z" fill={token.colorPrimary} />
                </svg>
                
                {/* Logo Text */}
                {!collapsed && (
                    <span style={{ 
                        marginLeft: '12px',
                        fontSize: '20px', 
                        fontWeight: '800', 
                        color: token.colorTextHeading,
                        letterSpacing: '-0.5px'
                    }}>
                        Sada<span style={{ color: token.colorPrimary }}>POS</span>
                    </span>
                )}
            </div>
            
            <ConfigProvider
              theme={{
                components: {
                  Menu: {
                    itemBg: 'transparent',              // Background transparent taake Sider ka rang nazar aaye
                    itemColor: token.colorMenuText,     // Text color
                    itemSelectedBg: token.colorMenuSelectedBg,   // Selected Background
                    itemSelectedColor: token.colorMenuSelectedText, // Selected Text
                    itemHoverBg: token.colorMenuHoverBg,         // Hover Background
                    itemHoverColor: token.colorMenuSelectedText, // Hover Text
                  }
                }
              }}
            >
              <Menu 
                mode="inline" 
                selectedKeys={[location.pathname]} 
                
                // YEH DO LINES NAYI HAIN (Jo magic karengi)
                openKeys={openKeys} 
                onOpenChange={onOpenChange}

                items={menuItemsWithLogout} 
                style={{ 
                  background: 'transparent',
                  borderRight: 0
                }} 
              />
            </ConfigProvider>
        </div>
      </Sider>
  );
};

export default SideMenu;