import React from 'react';
import { Layout, Tag, theme, Tooltip, Button, Badge, Space, Modal, List, Typography } from 'antd';
import { 
  ShopOutlined, 
  CrownOutlined, 
  BellOutlined,
  MenuUnfoldOutlined, 
  MenuFoldOutlined,
  ShoppingCartOutlined,
  HomeOutlined,
  DatabaseOutlined,
  SafetyCertificateOutlined,
  TagsOutlined,
  FileTextOutlined,
  UserSwitchOutlined,
  HistoryOutlined,
  DollarCircleOutlined,
  FileProtectOutlined,
  AlertOutlined,
  ProfileOutlined,
  CreditCardOutlined,
  ToolOutlined,
  PieChartOutlined
} from '@ant-design/icons';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useSync } from '../context/SyncContext';
import { db } from '../db';

const { Header } = Layout;
const { Text } = Typography;

const titleContainerStyle = {
  display: 'flex',
  alignItems: 'center',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  minWidth: 0, 
};

// Hum ne yahan 'collapsed' aur 'setCollapsed' receive kiya hai App.jsx se
const AppHeader = ({ collapsed, setCollapsed, isMobile }) => {
  const { profile, isPro, stockCount, lowStockCount } = useAuth();
  const { pendingCount, stuckCount, retryAll } = useSync();
  const [isSyncModalOpen, setIsSyncModalOpen] = React.useState(false);
  const isSyncMenuOpen = isSyncModalOpen;
  const [stuckItems, setStuckItems] = React.useState([]);

  // Naya Logic: Jaise hi stuckCount badle, list khud refresh ho jaye
  React.useEffect(() => {
    const refreshStuckList = async () => {
      if (isSyncModalOpen) {
        const items = await db.sync_queue.filter(item => (item.retry_count || 0) >= 3).toArray();
        setStuckItems(items);
      }
    };
    refreshStuckList();
  }, [stuckCount, isSyncMenuOpen]); 

  const showSyncCenter = () => {
    setIsSyncModalOpen(true);
  };
  
  const { token } = theme.useToken();
  const navigate = useNavigate();
  const location = useLocation();

  const chipStyle = {
    display: 'flex',
    alignItems: 'center',
    padding: '8px 16px',
    borderRadius: '16px',
    fontSize: 'clamp(0.9rem, 2.5vw, 1.2rem)',
    lineHeight: '1.2',
    border: 'none',
    transition: 'all 0.2s ease-in-out',
    backgroundColor: token.colorPrimary,
    color: token.colorTextLightSolid,
  };
return (
    <>
      <Header style={{ 
  padding: '0 28px', 
  background: 'none', 
  height: '50px', 
  lineHeight: '50px', 
  marginTop: 0, 
  borderBottom: `1px solid ${token.colorBorderSecondary}`,
  marginBottom: '10px'
}}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '100%' }}>
          
          {/* Left Side: Menu Button + Shop Name */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', overflow: 'hidden' }}>
            {isMobile && (
  <Button
    type="text"
    icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
    onClick={() => setCollapsed(!collapsed)}
    style={{ fontSize: '18px', width: 32, height: 32, color: token.colorText, marginRight: '8px' }}
  />
)}

              {/* Sync Status Signals (Smart & Connected Style) */}
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '12px', 
                marginLeft: '23px'
              }}>
                <style>
                  {`
                    @keyframes pulse-yellow {
                      0% { box-shadow: 0 0 0 0 rgba(250, 173, 20, 0.7); transform: scale(1); }
                      70% { box-shadow: 0 0 0 4px rgba(250, 173, 20, 0); transform: scale(1.1); }
                      100% { box-shadow: 0 0 0 0 rgba(250, 173, 20, 0); transform: scale(1); }
                    }
                    @keyframes blink-red {
                      0% { opacity: 1; }
                      50% { opacity: 0.5; }
                      100% { opacity: 1; }
                    }
                  `}
                </style>

                {/* Red Light: Error/Stuck */}
                <Tooltip title={stuckCount > 0 ? `Attention: ${stuckCount} items failed to sync. Click to retry.` : "Database Health: Excellent"}>
                  <div 
                    onClick={stuckCount > 0 ? showSyncCenter : null}
                    style={{
                      width: '14px', height: '14px', borderRadius: '50%',
                      background: stuckCount > 0 ? '#ff4d4f' : 'rgba(100,100,100,0.2)', 
                      boxShadow: stuckCount > 0 ? '0 0 8px #ff4d4f' : 'none',
                      cursor: stuckCount > 0 ? 'pointer' : 'default',
                      transition: 'all 0.3s',
                      animation: stuckCount > 0 ? 'blink-red 1s infinite' : 'none'
                    }}
                  />
                </Tooltip>

                {/* Yellow Light: Syncing & Queue Status */}
                <Tooltip title={
                  pendingCount > 0 ? `Working: Syncing ${pendingCount} new items...` : 
                  stuckCount > 0 ? `Sync Center: ${stuckCount} items waiting in queue` : 
                  "Sync Center: All data uploaded"
                }>
                  <div style={{
                    width: '14px', height: '14px', borderRadius: '50%',
                    background: pendingCount > 0 ? '#faad14' : (stuckCount > 0 ? 'rgba(250, 173, 20, 0.5)' : 'rgba(100,100,100,0.2)'),
                    animation: pendingCount > 0 ? 'pulse-yellow 1.5s infinite' : 'none',
                    transition: 'all 0.3s'
                  }} />
                </Tooltip>

                {/* Green Light: Smart Status Indicator */}
                <Tooltip title={
                  stuckCount > 0 ? "System Online (Errors Detected)" : 
                  pendingCount > 0 ? "System (Syncing in progress...)" : 
                  "System Online & Fully Synced"
                }>
                  <div style={{
                    width: '14px', height: '14px', borderRadius: '50%',
                    // Green light hamesha jalegi (Online hone ki nishani), lekin glow tab karegi jab sab perfect ho
                    background: '#52c41a',
                    opacity: (pendingCount === 0 && stuckCount === 0) ? 1 : 0.6,
                    boxShadow: (pendingCount === 0 && stuckCount === 0) ? '0 0 8px #52c41a' : 'none',
                    transition: 'all 0.3s'
                  }} />
                </Tooltip>
              </div>
              {/* Page Titles (Left Aligned) */}
              {!isMobile && (
                <>
                  {location.pathname === '/pos' && (
                     <span style={{ fontSize: '20px', fontWeight: 'bold', color: token.colorText, marginLeft: '16px', display: 'flex', alignItems: 'center' }}>
                       <ShoppingCartOutlined style={{ marginRight: '8px' }} /> Point of Sale
                     </span>
                  )}
                  {location.pathname === '/' && (
                     <span style={{ fontSize: '20px', fontWeight: 'bold', color: token.colorText, marginLeft: '16px', display: 'flex', alignItems: 'center' }}>
                       <HomeOutlined style={{ marginRight: '8px' }} /> Dashboard
                     </span>
                  )}
                  {location.pathname === '/inventory' && (
                     <span style={{ fontSize: '20px', fontWeight: 'bold', color: token.colorText, marginLeft: '16px', display: 'flex', alignItems: 'center' }}>
                       <DatabaseOutlined style={{ marginRight: '8px' }} /> Inventory
                     </span>
                  )}
                  {location.pathname === '/warranty' && (
                     <span style={{ fontSize: '20px', fontWeight: 'bold', color: token.colorText, marginLeft: '16px', display: 'flex', alignItems: 'center' }}>
                       <SafetyCertificateOutlined style={{ marginRight: '8px' }} /> Warranty & Claims
                     </span>
                  )}
                  {location.pathname === '/categories' && (
                     <span style={{ fontSize: '20px', fontWeight: 'bold', color: token.colorText, marginLeft: '16px', display: 'flex', alignItems: 'center' }}>
                       <TagsOutlined style={{ marginRight: '8px' }} /> Categories & Attributes
                     </span>
                  )}
                  {location.pathname === '/purchases' && (
                     <span style={{ fontSize: '20px', fontWeight: 'bold', color: token.colorText, marginLeft: '16px', display: 'flex', alignItems: 'center' }}>
                       <FileTextOutlined style={{ marginRight: '8px' }} /> Purchase History
                     </span>
                  )}
                  {location.pathname === '/customers' && (
                     <span style={{ fontSize: '20px', fontWeight: 'bold', color: token.colorText, marginLeft: '16px', display: 'flex', alignItems: 'center' }}>
                       <UserSwitchOutlined style={{ marginRight: '8px' }} /> Customer Management
                     </span>
                  )}
                  {location.pathname === '/suppliers' && (
                     <span style={{ fontSize: '20px', fontWeight: 'bold', color: token.colorText, marginLeft: '16px', display: 'flex', alignItems: 'center' }}>
                       <ShopOutlined style={{ marginRight: '8px' }} /> Suppliers Dashboard
                     </span>
                  )}
                  {location.pathname === '/sales-history' && (
                     <span style={{ fontSize: '20px', fontWeight: 'bold', color: token.colorText, marginLeft: '16px', display: 'flex', alignItems: 'center' }}>
                       <HistoryOutlined style={{ marginRight: '8px' }} /> Sales History
                     </span>
                  )}
                  {location.pathname === '/expenses' && (
                     <span style={{ fontSize: '20px', fontWeight: 'bold', color: token.colorText, marginLeft: '16px', display: 'flex', alignItems: 'center' }}>
                       <DollarCircleOutlined style={{ marginRight: '8px' }} /> Manage Expenses
                     </span>
                  )}
                  {location.pathname === '/expense-categories' && (
                     <span style={{ fontSize: '20px', fontWeight: 'bold', color: token.colorText, marginLeft: '16px', display: 'flex', alignItems: 'center' }}>
                       <FileProtectOutlined style={{ marginRight: '8px' }} /> Expense Categories
                     </span>
                  )}
                  {location.pathname === '/damaged-stock' && (
                     <span style={{ fontSize: '20px', fontWeight: 'bold', color: token.colorText, marginLeft: '16px', display: 'flex', alignItems: 'center' }}>
                       <AlertOutlined style={{ marginRight: '8px' }} /> Damaged Stock
                     </span>
                  )}
                  {location.pathname === '/profile' && (
                     <span style={{ fontSize: '20px', fontWeight: 'bold', color: token.colorText, marginLeft: '16px', display: 'flex', alignItems: 'center' }}>
                       <ProfileOutlined style={{ marginRight: '8px' }} /> Profile
                     </span>
                  )}
                  {location.pathname === '/subscription' && (
                     <span style={{ fontSize: '20px', fontWeight: 'bold', color: token.colorText, marginLeft: '16px', display: 'flex', alignItems: 'center' }}>
                       <CreditCardOutlined style={{ marginRight: '8px' }} /> Manage Your Subscription
                     </span>
                  )}
                  {location.pathname === '/settings' && (
                     <span style={{ fontSize: '20px', fontWeight: 'bold', color: token.colorText, marginLeft: '16px', display: 'flex', alignItems: 'center' }}>
                       <ToolOutlined style={{ marginRight: '8px' }} /> App Settings
                     </span>
                  )}
                  {location.pathname.startsWith('/purchases/') && (
                     <span style={{ fontSize: '20px', fontWeight: 'bold', color: token.colorText, marginLeft: '16px', display: 'flex', alignItems: 'center' }}>
                       <FileTextOutlined style={{ marginRight: '8px' }} /> Purchase Details
                     </span>
                  )}
                  {location.pathname === '/reports' && (
                     <span style={{ fontSize: '20px', fontWeight: 'bold', color: token.colorText, marginLeft: '16px', display: 'flex', alignItems: 'center' }}>
                       <PieChartOutlined style={{ marginRight: '8px' }} /> Reports
                     </span>
                  )}
                </>
              )}
          </div>

          {/* Right Side: Icons & Subscription Button */}
          <Space align="center" size="small">
            <Tooltip title={isPro ? "Pro Plan Active" : "Free Plan Limit: 50 Items"} placement="bottom">
              <Button 
                type={isPro ? 'primary' : 'default'} 
                ghost={isPro}
                icon={isPro ? <CrownOutlined /> : null}
                onClick={() => navigate('/subscription')}
                style={!isPro && stockCount >= 45 && stockCount < 50 ? { borderColor: '#faad14', color: '#faad14' } : {}}
                danger={!isPro && stockCount >= 50}
                size="small"
              >
                {isPro ? 'PRO' : `Stock: ${stockCount}/50`}
              </Button>
            </Tooltip>
          </Space>
        </div>
      </Header>

      {/* SYNC CENTER MODAL - Ab yeh return ke andar hai */}
      <Modal
        title="Sync Center - Stuck Items"
        open={isSyncModalOpen}
        onCancel={() => setIsSyncModalOpen(false)}
        footer={[
          <Button key="close" onClick={() => setIsSyncModalOpen(false)}>Close</Button>,
          <Button key="retry" type="primary" onClick={() => { retryAll(); setIsSyncModalOpen(false); }}>
            Retry All
          </Button>
        ]}
      >
        <List
          itemLayout="horizontal"
          dataSource={stuckItems}
          renderItem={(item) => (
            <List.Item>
              <List.Item.Meta
  title={
    <Space direction="vertical" size={0}>
      <Text strong>{item.table_name?.toUpperCase()} ({item.action})</Text>
      <Text type="secondary" style={{ fontSize: '13px' }}>
        {/* Yeh logic decide karega ke kya dikhana hai */}
        {item.table_name === 'customers' && `Name: ${item.data?.name || 'Unknown'}`}
        {item.table_name === 'products' && `Item: ${item.data?.name || 'Unknown'}`}
        {item.table_name === 'sales' && `Amount: ${item.data?.sale?.total_amount || item.data?.total_amount || '0'}`}
        {item.table_name === 'expenses' && `Expense: ${item.data?.title || 'Unknown'}`}
        {item.table_name === 'purchases' && `Total: ${item.data?.purchase?.total_amount || '0'}`}
      </Text>
    </Space>
  }
  description={
    <div style={{ color: 'red', fontSize: '11px', marginTop: '4px' }}>
      Error: {item.last_error || 'Connection failed or server busy'}
    </div>
  }
/>
            </List.Item>
          )}
        />
      </Modal>
    </>
  );
};

export default AppHeader;