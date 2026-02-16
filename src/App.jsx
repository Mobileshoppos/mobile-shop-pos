// src/App.jsx - MUKAMMAL UPDATED CODE

import React, { useState, useEffect } from 'react';
import { ConfigProvider, theme, Layout, App as AntApp } from 'antd';
import { BrowserRouter, Routes, Route, Link, Outlet, useLocation, Navigate } from 'react-router-dom';

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
import { SyncProvider, useSync } from './context/SyncContext';
import { CustomThemeProvider, useTheme } from './context/ThemeContext';
import { supabase } from './supabaseClient';
import { darkThemeTokens, lightThemeTokens } from './theme/themeConfig';
import SideMenu from './components/SideMenu';
import BottomNav from './components/BottomNav';
import Dashboard from './pages/Dashboard';
import WelcomeWizard from './components/WelcomeWizard';
import SystemLogs from './pages/SystemLogs';
import WarrantyClaims from './pages/WarrantyClaims';
import DamagedStock from './pages/DamagedStock';
import FloatingNav from './components/FloatingNav';
import KeyboardShortcuts from './components/KeyboardShortcuts';
import About from './pages/About';

const { Content } = Layout;

const MainLayout = ({ isDarkMode, toggleTheme }) => {
  const { syncAllData } = useSync();
  const { profile } = useAuth();
  
  useEffect(() => {
    syncAllData();
  }, []); 

  const location = useLocation();
  const { token } = theme.useToken();
  const [collapsed, setCollapsed] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 992);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 992;
      setIsMobile(mobile);
      
      // Agar mobile hai to menu band rakhein, 
      // lekin Desktop par zabardasti open na karein (initial state 'true' hi rahegi)
      if (mobile) {
        setCollapsed(true);
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <Layout style={{ minHeight: '100vh' }}>

     <SideMenu 
        collapsed={collapsed} 
        setCollapsed={setCollapsed} 
        isMobile={isMobile} 
      />

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
        <Content style={{ padding: 0 }}>
          <div style={{
            background: token.colorBgContainer,
            minHeight: '100vh',
            paddingTop: '12px',
           }}>
            {profile && !profile.is_setup_completed && <WelcomeWizard />}
            <AppHeader collapsed={collapsed} setCollapsed={setCollapsed} isMobile={isMobile} />
            <div style={{ padding: isMobile ? '0 8px 60px' : '0 24px 24px' }}>
              <Outlet />
            </div>
            {isMobile && profile?.mobile_nav_enabled !== false && (
              <BottomNav setCollapsed={setCollapsed} />
            )}

            {/* Global Floating Nav for Desktop - Setting ke mutabiq dikhayein */}
            {!isMobile && profile?.desktop_nav_enabled !== false && <FloatingNav />}

            {/* Headless Keyboard Shortcuts Listener */}
            <KeyboardShortcuts />
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
        <Route index element={<Dashboard />} />
        <Route path="inventory" element={<Inventory />} />
        <Route path="warranty" element={<WarrantyClaims />} />
        <Route path="/damaged-stock" element={<DamagedStock />} />
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
        <Route path="/logs" element={<SystemLogs />} />
        <Route path="about" element={<About />} />
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
        <SyncProvider>
          <CustomThemeProvider>
            <ThemeAppliedLayout />
          </CustomThemeProvider>
        </SyncProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;