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
import StaffManagement from './pages/StaffManagement';
import SubscriptionPage from './pages/SubscriptionPage';
import UpdatePasswordPage from './pages/UpdatePasswordPage';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SyncProvider, useSync } from './context/SyncContext';
import { StaffProvider } from './context/StaffContext';
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
import { useStaff } from './context/StaffContext';
import LockScreen from './components/LockScreen';

// NAYA SECURITY GUARD: Sirf Owner ko aane dega
const OwnerOnly = ({ children }) => {
  const { activeStaff } = useStaff();
  // Agar koi Staff member in pages par aane ki koshish kare, to usay wapis Dashboard (/) par bhej do
  if (activeStaff) {
    return <Navigate to="/" replace />;
  }
  return children;
};

// NAYA PERMISSION GUARD: Staff ki ijazat check karega
const PermissionGuard = ({ permission, children }) => {
  const { activeStaff, can } = useStaff();
  
  // 1. Agar Owner hai (activeStaff null), to sab ijazat hai.
  // 2. Agar Staff hai, to check karo ke kya uske paas 'permission' hai?
  if (!activeStaff || can(permission)) {
    return children;
  }
  
  // Agar ijazat nahi, to wapis Dashboard bhej do
  return <Navigate to="/" replace />;
};

const { Content } = Layout;

const MainLayout = ({ isDarkMode, toggleTheme }) => {
  const { syncAllData } = useSync();
  const { profile } = useAuth();
  const { isAppLocked } = useStaff(); // Nayi line

  // Agar app lock hai, to baqi sab kuch chupa kar sirf Lock Screen dikhao
  if (isAppLocked) {
    return <LockScreen />;
  }
  
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
            paddingTop: 0,
           }}>
            {profile && !profile.is_setup_completed && <WelcomeWizard />}
            <AppHeader collapsed={collapsed} setCollapsed={setCollapsed} isMobile={isMobile} />
            <div style={{ padding: isMobile ? '0 8px 60px' : '0 12px 24px' }}>
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
        <Route path="/damaged-stock" element={
          <PermissionGuard permission="can_edit_inventory">
            <DamagedStock />
          </PermissionGuard>
        } />
        <Route path="pos" element={<POS />} />
        <Route path="reports" element={<Reports />} />
        <Route path="customers" element={
          <PermissionGuard permission="can_manage_people">
            <Customers />
          </PermissionGuard>
        } />
        <Route path="suppliers" element={
          <PermissionGuard permission="can_manage_suppliers">
            <SupplierDashboard />
          </PermissionGuard>
        } />
        <Route path="purchases" element={
          <PermissionGuard permission="can_manage_purchases">
            <Purchases />
          </PermissionGuard>
        } />
        <Route path="purchases/:id" element={
          <PermissionGuard permission="can_manage_purchases">
            <PurchaseDetails />
          </PermissionGuard>
        } />
        <Route path="categories" element={
          <PermissionGuard permission="can_manage_categories">
            <Categories />
          </PermissionGuard>
        } />
        {/* IN PAGES PAR SECURITY GUARD LAGA DIYA */}
        <Route path="profile" element={
          <PermissionGuard permission="can_manage_profile">
            <Profile />
          </PermissionGuard>
        } />
        <Route path="expenses" element={
         <PermissionGuard permission="can_manage_expenses">
            <Expenses />
          </PermissionGuard>
        } />
        <Route path="expense-categories" element={
         <PermissionGuard permission="can_manage_expense_categories">
            <ExpenseCategories />
          </PermissionGuard>
        } />
        <Route path="sales-history" element={
          <PermissionGuard permission="can_view_sales_history">
            <SalesHistory />
          </PermissionGuard>
        } />
        {/* IN PAGES PAR SECURITY GUARD LAGA DIYA */}
        <Route path="settings" element={<OwnerOnly><SettingsPage /></OwnerOnly>} />
        <Route path="staff" element={<OwnerOnly><StaffManagement /></OwnerOnly>} />
        <Route path="subscription" element={<OwnerOnly><SubscriptionPage /></OwnerOnly>} />
        <Route path="*" element={<Navigate to="/" />} />
        {/* LOGS BHI SIRF OWNER DEKH SAKTA HAI */}
        <Route path="/logs" element={<OwnerOnly><SystemLogs /></OwnerOnly>} />
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
        <StaffProvider>
          <AppRoutes isDarkMode={isDarkMode} toggleTheme={toggleTheme} />
        </StaffProvider>
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