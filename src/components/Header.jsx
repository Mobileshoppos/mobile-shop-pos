import React from 'react';
import { Layout, Tag, theme, Tooltip, Button, Badge, Space, Modal, List, Typography } from 'antd';
import { 
  ShopOutlined, 
  CrownOutlined, 
  BellOutlined,
  MenuUnfoldOutlined, // Naya Icon (Menu kholne ke liye)
  MenuFoldOutlined    // Naya Icon (Menu band karne ke liye)
} from '@ant-design/icons';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
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
const AppHeader = ({ collapsed, setCollapsed }) => {
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
  }, [stuckCount, isSyncMenuOpen]); // stuckCount badalne par chalega

  const showSyncCenter = () => {
    setIsSyncModalOpen(true);
  };
  
  const { token } = theme.useToken();
  const navigate = useNavigate();

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
      <Header style={{ padding: '0 16px', background: 'none' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '100%' }}>
          
          {/* Left Side: Menu Button + Shop Name */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
              <Button
                type="text"
                icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                onClick={() => setCollapsed(!collapsed)}
                style={{ fontSize: '16px', width: 40, height: 40, color: token.colorText }}
              />

              <div style={titleContainerStyle} title={profile?.shop_name || 'My Shop'}>
                <Tag icon={<ShopOutlined />} style={chipStyle}>
                  {profile?.shop_name || 'My Shop'}
                </Tag>
              </div>

              {/* Sync Status Tags */}
              <Space size={4}>
                {stuckCount > 0 && (
                  <Tooltip title={`${stuckCount} items stuck. Click to retry.`}>
                    <Tag 
                      color="red" 
                      onClick={showSyncCenter}
                      style={{ borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                      {stuckCount} Stuck!
                    </Tag>
                  </Tooltip>
                )}

                {pendingCount > 0 && (
                  <Tooltip title={`${pendingCount} items syncing...`}>
                    <Tag 
                      color="orange" 
                      style={{ borderRadius: '10px', animation: 'pulse 2s infinite' }}
                    >
                      {pendingCount} Syncing...
                    </Tag>
                  </Tooltip>
                )}
              </Space>
          </div>

          {/* Right Side: Icons & Subscription Button */}
          <Space align="center" size="small">
            <Tooltip title="Manage Subscription" placement="bottom">
              <Button 
                type={isPro ? 'primary' : 'default'} 
                ghost={isPro}
                icon={isPro ? <CrownOutlined /> : null}
                onClick={() => navigate('/subscription')}
                danger={!isPro && stockCount >= 50}
                size="middle"
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