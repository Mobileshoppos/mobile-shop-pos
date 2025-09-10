// src/App.jsx - FONT SIZE CONTROL CORRECTLY ADDED

import React, { useState, useEffect } from 'react';
import { ConfigProvider, theme, Layout, Menu, App as AntApp, Switch } from 'antd';
import { BrowserRouter, Routes, Route, Link, Outlet, useLocation, Navigate } from 'react-router-dom';
import { 
  HomeOutlined, 
  ShoppingCartOutlined, 
  PieChartOutlined, 
  UserOutlined, 
  LogoutOutlined, 
  AppstoreOutlined,
  DollarCircleOutlined,
  SettingOutlined,
  SunOutlined,
  MoonOutlined
} from '@ant-design/icons';

// Components & Pages
import Inventory from './components/Inventory';
import POS from './components/POS';
import Reports from './components/Reports';
import Customers from './components/Customers';
import Categories from './components/Categories';
import Expenses from './components/Expenses';
import ExpenseCategories from './components/ExpenseCategories';
import AppHeader from './components/Header';
import Profile from './pages/Profile'; 
import AuthPage from './pages/AuthPage'; 

// Auth
import { AuthProvider, useAuth } from './context/AuthContext';
import { supabase } from './supabaseClient';

const { Sider, Content } = Layout;

const menuItems = [
    { key: '/', icon: <HomeOutlined />, label: <Link to="/">Inventory</Link> },
    { key: '/pos', icon: <ShoppingCartOutlined />, label: <Link to="/pos">Point of Sale</Link> },
    { key: '/reports', icon: <PieChartOutlined />, label: <Link to="/reports">Reports</Link> },
    { key: '/customers', icon: <UserOutlined />, label: <Link to="/customers">Customers</Link> },
    { key: '/categories', icon: <AppstoreOutlined />, label: <Link to="/categories">Product Categories</Link> },
    { key: '/profile', icon: <SettingOutlined />, label: <Link to="/profile">Profile Settings</Link> },
    { type: 'divider' },
    { key: '/expenses', icon: <DollarCircleOutlined />, label: <Link to="/expenses">Expenses</Link> },
    { key: '/expense-categories', icon: <AppstoreOutlined />, label: <Link to="/expense-categories">Expense Categories</Link> },
];

const MainLayout = ({ isDarkMode, toggleTheme }) => {
  const location = useLocation();
  const { token } = theme.useToken();
  const [collapsed, setCollapsed] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 992);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 992;
      setIsMobile(mobile);
      setCollapsed(mobile); 
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
    <Layout style={{ minHeight: '100vh' }}>
      <Sider 
        breakpoint="lg" 
        collapsedWidth={isMobile ? "0" : "80"}
        theme="dark"
        collapsible
        collapsed={collapsed}
        onCollapse={(value) => setCollapsed(value)}
        style={siderStyle}
      >
        <div>
            <Menu 
              theme="dark" 
              mode="inline" 
              selectedKeys={[location.pathname]} 
              items={menuItemsWithLogout} 
              style={{ 
                marginTop: '16px',
                background: 'transparent',
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

      {isMobile && !collapsed && (
        <div 
          onClick={() => setCollapsed(true)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 999,
          }}
        />
      )}

      <Layout style={{ background: token.colorBgLayout }}>
        <Content style={{ padding: '24px 16px 0' }}>
          <div style={{
            background: token.colorBgContainer,
            borderRadius: token.borderRadiusLG,
            minHeight: 'calc(100vh - 24px)',
          }}>
            <AppHeader />
            <div style={{ padding: '0 24px 24px' }}>
              <Outlet />
            </div>
          </div>
        </Content>
      </Layout>
    </Layout>
  );
};

const AppRoutes = ({ isDarkMode, toggleTheme }) => {
  const { session } = useAuth();
  if (!session) return <Routes><Route path="*" element={<AuthPage />} /></Routes>;

  return (
    <Routes>
      <Route path="/" element={<MainLayout isDarkMode={isDarkMode} toggleTheme={toggleTheme} />}>
        <Route index element={<Inventory />} />
        <Route path="pos" element={<POS />} />
        <Route path="reports" element={<Reports />} />
        <Route path="customers" element={<Customers />} />
        <Route path="categories" element={<Categories />} />
        <Route path="profile" element={<Profile />} />
        <Route path="expenses" element={<Expenses />} />
        <Route path="expense-categories" element={<ExpenseCategories />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Route>
    </Routes>
  );
};

function App() {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) return savedTheme === 'dark';
    return window.matchMedia && window.matchMedia('(pre-color-scheme: dark)').matches;
  });

  useEffect(() => {
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  const toggleTheme = () => setIsDarkMode(prevMode => !prevMode);

  const sharedComponents = {
    Layout: {
        siderBg: '#1F1F1F',
        triggerBg: '#282828',
        triggerColor: '#FFFFFF',
    },
    Menu: {
        itemSelectedBg: '#3A3A3A',
        itemSelectedColor: '#FFFFFF',
        colorText: 'rgba(255, 255, 255, 0.65)',
        darkItemBg: '#1F1F1F',
        // YAHAN SIRF MENU KA FONT SIZE CONTROL HOGA
        fontSize: 15,
    }
  };

  return (
    <ConfigProvider
      theme={{
        algorithm: isDarkMode ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: {
            fontFamily: "'Poppins', 'Montserrat', sans-serif",
            borderRadiusLG: 12,
            // YAHAN POORI APP KA FONT SIZE CONTROL HOGA
            fontSize: 15,
            ...(isDarkMode 
                ? { 
                    colorPrimary: '#3A3A3A',
                    colorBgLayout: '#1F1F1F',
                    colorBgContainer: '#1F1F1F',
                } 
                : { 
                    colorPrimary: '#1677ff',
                    colorBgLayout: '#f5f5f5',
                    colorBgContainer: '#ffffff',
                }
            ),
        },
        components: sharedComponents,
      }}
    >
      <AntApp>
        <BrowserRouter>
          <AuthProvider>
            <AppRoutes isDarkMode={isDarkMode} toggleTheme={toggleTheme} />
          </AuthProvider>
        </BrowserRouter>
      </AntApp>
    </ConfigProvider>
  );
}

export default App;