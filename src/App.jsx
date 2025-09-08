// src/App.jsx (Menu header ke baghair)

import React, { useState, useEffect } from 'react';
import { ConfigProvider, theme, Layout, Menu, App as AntApp, Typography } from 'antd';
import { BrowserRouter, Routes, Route, Link, Outlet, useLocation, Navigate } from 'react-router-dom';
import { 
  HomeOutlined, 
  ShoppingCartOutlined, 
  PieChartOutlined, 
  UserOutlined, 
  LogoutOutlined, 
  AppstoreOutlined,
  DollarCircleOutlined
} from '@ant-design/icons';

// Components
import Inventory from './components/Inventory';
import POS from './components/POS';
import Reports from './components/Reports';
import Customers from './components/Customers';
import Categories from './components/Categories';
import Expenses from './components/Expenses';
import ExpenseCategories from './components/ExpenseCategories';
import AppHeader from './components/Header';

// Auth
import AuthPage from './pages/AuthPage'; 
import { AuthProvider, useAuth } from './context/AuthContext';
import { supabase } from './supabaseClient';

const { Sider, Content } = Layout;
const { Title } = Typography;

const menuItems = [
  { key: '/', icon: <HomeOutlined />, label: <Link to="/">Inventory</Link> },
  { key: '/pos', icon: <ShoppingCartOutlined />, label: <Link to="/pos">Point of Sale</Link> },
  { key: '/reports', icon: <PieChartOutlined />, label: <Link to="/reports">Reports</Link> },
  { key: '/customers', icon: <UserOutlined />, label: <Link to="/customers">Customers</Link> },
  { key: '/categories', icon: <AppstoreOutlined />, label: <Link to="/categories">Product Categories</Link> },
  { type: 'divider' },
  { key: '/expenses', icon: <DollarCircleOutlined />, label: <Link to="/expenses">Expenses</Link> },
  { key: '/expense-categories', icon: <AppstoreOutlined />, label: <Link to="/expense-categories">Expense Categories</Link> },
];

const MainLayout = ({ isDarkMode, toggleTheme }) => {
  const location = useLocation();
  const { token } = theme.useToken();
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 992);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 992;
      setIsMobile(mobile);
      if (!mobile) {
        setCollapsed(false);
      }
    };
    window.addEventListener('resize', handleResize);
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

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider 
        breakpoint="lg" 
        collapsedWidth={isMobile ? "0" : "80"}
        theme="dark"
        collapsible
        collapsed={collapsed}
        onCollapse={(value) => setCollapsed(value)}
      >
        {/* --- TABDEELI: Hum ne yahan se menu ka header (QPOS logo) hata diya hai --- */}
        <Menu 
          theme="dark" 
          mode="inline" 
          selectedKeys={[location.pathname]} 
          items={menuItemsWithLogout} 
          // Thora sa margin add kiya hai taake menu behtar dikhe
          style={{ marginTop: '16px' }} 
        />
      </Sider>
      <Layout style={{ background: token.colorBgLayout }}>
        <Content style={{ padding: '24px 16px 0' }}>
          <div style={{
            background: token.colorBgContainer,
            borderRadius: token.borderRadiusLG,
            minHeight: 'calc(100vh - 24px)',
          }}>
            <AppHeader isDarkMode={isDarkMode} toggleTheme={toggleTheme} />
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

  const lightTheme = {
    colorPrimary: '#1677ff',
    colorBgLayout: '#f5f5f5',
    colorBgContainer: '#ffffff',
    borderRadiusLG: 12,
    fontFamily: "'Poppins', 'Montserrat', sans-serif",
    components: { Card: { colorBgContainer: '#fafafa' }, Table: { colorBgContainer: '#fafafa' } }
  };

  const darkTheme = {
    colorPrimary: '#1677ff',
    borderRadiusLG: 12,
    fontFamily: "'Poppins', 'Montserrat', sans-serif",
  };

  return (
    <ConfigProvider
      theme={{
        algorithm: isDarkMode ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: isDarkMode ? darkTheme : lightTheme,
        components: isDarkMode ? darkTheme.components : lightTheme.components,
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