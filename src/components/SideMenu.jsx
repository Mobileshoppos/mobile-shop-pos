import React, { useState } from 'react'; // useState add kiya hai
import { Layout, Menu, Switch } from 'antd';
import { Link, useLocation } from 'react-router-dom';
import { 
  HomeOutlined, 
  ShoppingCartOutlined, 
  PieChartOutlined, 
  LogoutOutlined, 
  AppstoreOutlined,
  DollarCircleOutlined,
  SettingOutlined,
  SunOutlined,
  MoonOutlined,
  TeamOutlined,
  HistoryOutlined,
  CreditCardOutlined,
  TagsOutlined,       
  FileTextOutlined,   
  ShopOutlined,       
  UserSwitchOutlined, 
  FileProtectOutlined,
  ProfileOutlined,    
  ToolOutlined,
  DatabaseOutlined 
} from '@ant-design/icons';
import { supabase } from '../supabaseClient';

const { Sider } = Layout;

const menuItems = [
    // 1. Main Dashboard
    { key: '/', icon: <HomeOutlined />, label: <Link to="/">Dashboard</Link> },
    
    // 2. Inventory (Naya Button)
    { key: '/inventory', icon: <DatabaseOutlined />, label: <Link to="/inventory">Inventory</Link> },

    // 3. POS
    { key: '/pos', icon: <ShoppingCartOutlined />, label: <Link to="/pos">Point of Sale</Link> },

    // 4. Product Management Group
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
      ]
    },

    // 5. Reports
    { key: '/reports', icon: <PieChartOutlined />, label: <Link to="/reports">Reports</Link> },

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
      ]
    },
];

// Yeh wo keys hain jo Groups hain (Jinhein humein control karna hai)
const rootSubmenuKeys = ['products', 'people', 'finance', 'settings_group'];

const SideMenu = ({ collapsed, setCollapsed, isMobile, isDarkMode, toggleTheme }) => {
  const location = useLocation();
  
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

  const processedMenuItems = menuItems.map(item => {
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
  ];

  const siderStyle = {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    ...(isMobile && {
        position: 'fixed',
        height: '100vh',
        zIndex: 1000,
    }),
  };

  return (
    <Sider 
        collapsedWidth={isMobile ? "0" : "80"}
        theme="dark"
        collapsible
        collapsed={collapsed}
        onCollapse={(value) => setCollapsed(value)}
        trigger={null}
        style={siderStyle}
      >
        <div>
            {/* Logo Area */}
            <div style={{ 
                height: '32px', 
                margin: '16px', 
                background: 'rgba(255, 255, 255, 0.2)', 
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontWeight: 'bold',
                letterSpacing: '1px',
                overflow: 'hidden',
                whiteSpace: 'nowrap',
                cursor: 'default'
            }}>
                {collapsed ? 'SP' : 'SadaPos'}
            </div>
            
            <Menu 
              theme="dark" 
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
        </div>
        
        <div style={{ padding: '16px', textAlign: 'center' }}>
            <Switch
                checkedChildren={<MoonOutlined />}
                unCheckedChildren={<SunOutlined />}
                checked={isDarkMode}
                onChange={toggleTheme}
            />
        </div>
      </Sider>
  );
};

export default SideMenu;