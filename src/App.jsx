// src/App.jsx - MUKAMMAL UPDATED CODE

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
  MoonOutlined,
  TeamOutlined,
  HistoryOutlined,
  CreditCardOutlined
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
import Purchases from './components/Purchases';
import PurchaseDetails from './components/PurchaseDetails';
import SupplierDashboard from './components/SupplierDashboard';
import SalesHistory from './components/SalesHistory';
import SettingsPage from './pages/SettingsPage';
import SubscriptionPage from './pages/SubscriptionPage';
import UpdatePasswordPage from './pages/UpdatePasswordPage';

import { AuthProvider, useAuth } from './context/AuthContext';
import { CustomThemeProvider, useTheme } from './context/ThemeContext';
import { supabase } from './supabaseClient';
import { darkThemeTokens, lightThemeTokens } from './theme/themeConfig';

const { Sider, Content } = Layout;

const menuItems = [
    { key: '/', icon: <HomeOutlined />, label: <Link to="/">Inventory</Link> },
    { key: '/pos', icon: <ShoppingCartOutlined />, label: <Link to="/pos">Point of Sale</Link> },
    { key: '/reports', icon: <PieChartOutlined />, label: <Link to="/reports">Reports</Link> },
    { key: '/sales-history', icon: <HistoryOutlined />, label: <Link to="/sales-history">Sales History</Link> },
    { key: '/customers', icon: <UserOutlined />, label: <Link to="/customers">Customers</Link> },
    { key: '/suppliers', icon: <TeamOutlined />, label: <Link to="/suppliers">Suppliers</Link> },
    { key: '/purchases', icon: <DollarCircleOutlined />, label: <Link to="/purchases">Purchases</Link> },
    { key: '/categories', icon: <AppstoreOutlined />, label: <Link to="/categories">Product Categories</Link> },
    { key: '/profile', icon: <SettingOutlined />, label: <Link to="/profile">Profile Settings</Link> },
    { type: 'divider' },
    { key: '/expenses', icon: <DollarCircleOutlined />, label: <Link to="/expenses">Expenses</Link> },
    { key: '/expense-categories', icon: <AppstoreOutlined />, label: <Link to="/expense-categories">Expense Categories</Link> },
    { key: '/subscription', icon: <CreditCardOutlined />, label: <Link to="/subscription">Subscription</Link> },
    { key: '/settings', icon: <SettingOutlined />, label: <Link to="/settings">App Settings</Link> },
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
  const { session, isPasswordRecovery } = useAuth();

  // Agar user login nahi hai, to use sirf Auth aur Password Update page tak rasai dein
  if (!session || isPasswordRecovery) {
    return (
      <Routes>
        <Route path="/update-password" element={<UpdatePasswordPage />} />
        {/* Agar user /update-password ke alawa kisi aur page par jane ki koshish kare, to use AuthPage par bhej dein */}
        <Route path="*" element={<AuthPage />} />
      </Routes>
    );
  }

  // Agar user login hai, to use poori application dikhayein
  return (
    <Routes>
      {/* Hum ne /update-password route yahan bhi shamil kiya hai taake agar session ban'ne mein thori der ho to bhi page sahi kaam kare */}
      <Route path="/update-password" element={<UpdatePasswordPage />} />
      
      <Route path="/" element={<MainLayout isDarkMode={isDarkMode} toggleTheme={toggleTheme} />}>
        <Route index element={<Inventory />} />
        <Route path="pos" element={<POS />} />
        <Route path="reports" element={<Reports />} />
        <Route path="customers" element={<Customers />} />
        <Route path="suppliers" element={<SupplierDashboard />} />
        <Route path="purchases" element={<Purchases />} />
        <Route path="purchases/:id" element={<PurchaseDetails />} />
        <Route path="categories" element={<Categories />} />
        <Route path="profile" element={<Profile />} />
        <Route path="expenses" element={<Expenses />} />
        <Route path="expense-categories" element={<ExpenseCategories />} />
        <Route path="sales-history" element={<SalesHistory />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="subscription" element={<SubscriptionPage />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Route>
    </Routes>
  );
};

const ThemeAppliedLayout = () => {
  const { themeConfig, lightTheme, darkTheme, isDarkMode, toggleTheme } = useTheme(); 

  return (
    <ConfigProvider
      theme={{
        algorithm: isDarkMode ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: {
          ...themeConfig.token,
          ...(isDarkMode ? darkTheme : lightTheme),
        },
        components: themeConfig.components,
      }}
    >
      <AntApp>
        {/* isDarkMode aur toggleTheme ab context se pass ho rahe hain */}
        <AppRoutes isDarkMode={isDarkMode} toggleTheme={toggleTheme} />
      </AntApp>
    </ConfigProvider>
  );
};

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CustomThemeProvider>
          <ThemeAppliedLayout />
        </CustomThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;