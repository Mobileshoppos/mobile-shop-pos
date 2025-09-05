import React from 'react';
import { ConfigProvider, theme, Layout, Menu, App as AntApp } from 'antd';
import { BrowserRouter, Routes, Route, Link, Outlet, useLocation, Navigate } from 'react-router-dom';
import { 
  HomeOutlined, 
  ShoppingCartOutlined, 
  PieChartOutlined, 
  UserOutlined, 
  LogoutOutlined, 
  AppstoreOutlined,
  DollarCircleOutlined // Yeh icon hum ne naya shamil kiya hai
} from '@ant-design/icons';

// Apne components import karein
import Inventory from './components/Inventory';
import POS from './components/POS';
import Reports from './components/Reports';
import Customers from './components/Customers';
import Categories from './components/Categories';

// Naye Auth features import karein
import AuthPage from './pages/AuthPage'; 
import { AuthProvider, useAuth } from './context/AuthContext';
import { supabase } from './supabaseClient';

// Humare naye Expense pages
import Expenses from './components/Expenses';
import ExpenseCategories from './components/ExpenseCategories';

const { Sider, Content } = Layout;

// Menu ko hum ne update kar diya hai
const menuItems = [
  { key: '/', icon: <HomeOutlined />, label: <Link to="/">Inventory</Link> },
  { key: '/pos', icon: <ShoppingCartOutlined />, label: <Link to="/pos">Point of Sale</Link> },
  { key: '/reports', icon: <PieChartOutlined />, label: <Link to="/reports">Reports</Link> },
  { key: '/customers', icon: <UserOutlined />, label: <Link to="/customers">Customers</Link> },
  { key: '/categories', icon: <AppstoreOutlined />, label: <Link to="/categories">Product Categories</Link> },
  { type: 'divider' }, // Ek line daal di hai
  { key: '/expenses', icon: <DollarCircleOutlined />, label: <Link to="/expenses">Expenses</Link> },
  { key: '/expense-categories', icon: <AppstoreOutlined />, label: <Link to="/expense-categories">Expense Categories</Link> },
];

const MainLayout = () => {
  const location = useLocation();
  
  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const menuItemsWithLogout = [
    ...menuItems,
    { type: 'divider' }, 
    { 
      key: 'logout', 
      icon: <LogoutOutlined />, 
      danger: true, 
      label: 'Logout', 
      onClick: handleLogout 
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider breakpoint="lg" collapsedWidth="0" theme="dark">
        <div className="logo" style={{ height: '32px', margin: '16px', background: 'rgba(255, 255, 255, 0.2)', borderRadius: '6px' }} />
        <Menu theme="dark" mode="inline" selectedKeys={[location.pathname]} items={menuItemsWithLogout} />
      </Sider>
      <Layout>
        <Content style={{ margin: '24px 16px 0' }}>
          <div style={{ padding: 24, minHeight: 'calc(100vh - 88px)', background: '#1f1f1f', borderRadius: '8px' }}>
            <Outlet />
          </div>
        </Content>
      </Layout>
    </Layout>
  );
};

const AppRoutes = () => {
  const { session } = useAuth();

  if (!session) {
    return (
      <Routes>
        <Route path="*" element={<AuthPage />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<MainLayout />}>
        <Route index element={<Inventory />} />
        <Route path="pos" element={<POS />} />
        <Route path="reports" element={<Reports />} />
        <Route path="customers" element={<Customers />} />
        <Route path="categories" element={<Categories />} />
        
        {/* Yahan naye routes shamil kiye hain */}
        <Route path="expenses" element={<Expenses />} />
        <Route path="expense-categories" element={<ExpenseCategories />} />

        <Route path="*" element={<Navigate to="/" />} />
      </Route>
    </Routes>
  );
};


function App() {
  return (
    <ConfigProvider
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          colorPrimary: '#1677ff',
          colorBgBase: '#141414',
          colorBgContainer: '#1f1f1f',
          fontFamily: "'Poppins', 'Montserrat', sans-serif",
        },
      }}
    >
      <AntApp>
        <BrowserRouter>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </BrowserRouter>
      </AntApp>
    </ConfigProvider>
  );
}

export default App;