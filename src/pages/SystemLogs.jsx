import React, { useEffect, useState } from 'react';
import { Table, Tag, Space, Card, Button, Typography, Modal, Row, Col, Badge, Input, theme, App } from 'antd';
import { supabase } from '../supabaseClient';
import { ReloadOutlined, BugOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons';
import Logger from '../utils/logger';
import { db } from '../db';

const { Title, Text } = Typography;

const SystemLogs = () => {
  const { token } = theme.useToken();
  const { modal, notification } = App.useApp();
  
  const [logs, setLogs] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [stuckItems, setStuckItems] = useState([]);
  const [filterLevel, setFilterLevel] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);

  const fetchLogs = async () => {
    // Agar internet nahi hai, to server se logs mangne ki koshish hi na karein
    if (!navigator.onLine) {
      console.log("App is offline. Skipping logs fetch.");
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase.from('profiles').select('is_admin').single();
      const adminStatus = profile?.is_admin || false;
      setIsAdmin(adminStatus);

      let query = supabase.from('system_logs').select('*');
      if (!adminStatus) {
        query = query.eq('user_id', user.id);
      }

      const { data, error } = await query.order('created_at', { ascending: false }).limit(100);
      if (!error) setLogs(data);
      
    } catch (err) {
      // Sirf tab error dikhayein jab internet ho aur phir bhi masla aaye
      if (navigator.onLine) {
        console.error("Error fetching logs:", err);
      }
    } finally {
      setLoading(false);
    }
  };

  const clearLogs = async () => {
    Modal.confirm({
      title: 'Kya aap tamam logs delete karna chahte hain?',
      content: 'Yeh amal wapis nahi ho sakta.',
      okText: 'Haan, Delete Karein',
      okType: 'danger',
      cancelText: 'Nahi',
      onOk: async () => {
        const { error } = await supabase.from('system_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        if (!error) fetchLogs();
      },
    });
  };

  const checkLocalQueue = async () => {
    const allItems = await db.sync_queue.toArray();
    setPendingCount(allItems.length);
    
    // Sirf wo items nikaalein jo 3 ya us se zyada dafa fail ho chuke hain
    const stuck = allItems.filter(item => (item.retry_count || 0) >= 3);
    setStuckItems(stuck);
  };

  const retrySyncItem = async (id) => {
    // Retry ka matlab hai retry_count ko wapis 0 kar dena
    await db.sync_queue.update(id, { retry_count: 0, status: 'pending' });
    notification.success({ message: 'Retry Started', description: 'System is trying to sync this item again.' });
    checkLocalQueue();
  };

  useEffect(() => {
    fetchLogs();
    checkLocalQueue();
    const interval = setInterval(checkLocalQueue, 3000);
    return () => clearInterval(interval);
  }, []);

  const showDetails = (log) => {
    setSelectedLog(log);
    setIsModalOpen(true);
  };

  const columns = [
    {
      title: 'Time',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (text) => new Date(text).toLocaleTimeString(),
      width: 110,
      fixed: 'left',
    },
    {
      title: 'Level',
      dataIndex: 'level',
      key: 'level',
      render: (level) => (
        <Tag color={level === 'error' ? 'red' : level === 'warning' ? 'orange' : 'blue'}>
          {level.toUpperCase()}
        </Tag>
      ),
      width: 90,
    },
    {
      title: 'Message',
      dataIndex: 'message',
      key: 'message',
      ellipsis: true,
    },
    {
      title: 'Action',
      key: 'action',
      render: (_, record) => (
        <Button type="link" size="small" onClick={() => showDetails(record)}>
          Details
        </Button>
      ),
      width: 90,
    },
  ];

  const filteredData = logs.filter(log => {
    const matchesLevel = filterLevel ? log.level === filterLevel : true;
    const matchesSearch = log.message.toLowerCase().includes(searchText.toLowerCase()) || 
                          log.category.toLowerCase().includes(searchText.toLowerCase());
    return matchesLevel && matchesSearch;
  });

  return (
    <div style={{ padding: '16px' }}>
      <Card variant="borderless" style={{ background: token.colorBgContainer, borderRadius: token.borderRadiusLG }}>
        {/* Header Section */}
        <Row gutter={[16, 16]} align="middle" style={{ marginBottom: 24 }}>
          <Col xs={24} md={12}>
            <Space align="center" wrap>
              <Title level={3} style={{ margin: 0 }}>System Health</Title>
              <Badge status="processing" text={isAdmin ? <Tag color="gold">Admin View</Tag> : <Tag color="blue">User View</Tag>} />
            </Space>
          </Col>
          <Col xs={24} md={12} style={{ textAlign: 'right' }}>
            <Space wrap>
              <Button icon={<ReloadOutlined />} onClick={fetchLogs} loading={loading}>Refresh</Button>
              {isAdmin && (
                <>
                  <Button danger icon={<DeleteOutlined />} onClick={clearLogs}>Clear Logs</Button>
                  <Button type="primary" danger icon={<BugOutlined />} onClick={() => Logger.error('test', 'Diagnostic Test', { info: 'Manual' }, 'System OK!')}>Test</Button>
                </>
              )}
            </Space>
          </Col>
        </Row>

        {/* Stats & Filter Section */}
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={8}>
            {/* Background ab token se aayega taake light/dark mode mein change ho sake */}
            <Card size="small" variant="borderless" style={{ 
              background: token.colorFillAlter, 
              borderLeft: `4px solid ${pendingCount > 0 ? token.colorWarning : token.colorSuccess}`,
              borderRadius: token.borderRadius
            }}>
              <Text type="secondary" style={{ fontSize: '12px' }}>Local Sync Queue</Text>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: pendingCount > 0 ? token.colorWarning : token.colorSuccess }}>
                {pendingCount} Items
              </div>
            </Card>
          </Col>

          <Col xs={24} sm={8}>
  <Card size="small" variant="borderless" style={{ 
    background: token.colorFillAlter, 
    borderLeft: `4px solid ${logs.filter(l => l.level === 'error').length > 5 ? token.colorError : token.colorSuccess}`,
    borderRadius: token.borderRadius
  }}>
    <Text type="secondary" style={{ fontSize: '12px' }}>System Health Score</Text>
    <div style={{ fontSize: '20px', fontWeight: 'bold', color: logs.filter(l => l.level === 'error').length > 5 ? token.colorError : token.colorSuccess }}>
      {logs.filter(l => l.level === 'error').length > 5 ? 'Attention Needed' : 'Excellent'}
    </div>
  </Card>
</Col>
          <Col xs={24} sm={16}>
            <Space wrap style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Input 
                placeholder="Search logs..." 
                prefix={<SearchOutlined />} 
                onChange={e => setSearchText(e.target.value)}
                style={{ width: 200 }}
              />
              <select 
                onChange={(e) => setFilterLevel(e.target.value)} 
                style={{ 
                  padding: '7px 12px', 
                  borderRadius: token.borderRadius, 
                  background: token.colorBgContainer, 
                  color: token.colorText, 
                  border: `1px solid ${token.colorBorder}` 
                }}
              >
                <option value="">All Levels</option>
                <option value="error">Errors</option>
                <option value="info">Info</option>
              </select>
            </Space>
          </Col>
        </Row>
        
        <Table 
          dataSource={filteredData}
          columns={columns} 
          rowKey="id" 
          loading={loading}
          size="small"
          pagination={{ pageSize: 10, simple: true }}
          scroll={{ x: 600 }}
        />
        {/* Stuck Sync Items Section (Professional View) */}
        {stuckItems.length > 0 && (
          <div style={{ marginTop: '32px', padding: '16px', border: `1px solid ${token.colorErrorOutline}`, borderRadius: token.borderRadiusLG, background: token.colorErrorBg }}>
            <Title level={4} style={{ color: token.colorError, marginTop: 0 }}>
              <BugOutlined /> Stuck Sync Items (Needs Attention)
            </Title>
            <Text type="secondary">Yeh wo items hain jo 3 dafa sync hone mein nakam rahe. Aap "Retry" daba kar dobara koshish kar sakte hain.</Text>
            
            <Table 
              style={{ marginTop: '16px' }}
              size="small"
              dataSource={stuckItems}
              rowKey="id"
              pagination={false}
              columns={[
                { title: 'Type', dataIndex: 'table_name', key: 'type', render: (t) => <b>{t.toUpperCase()}</b> },
                { title: 'Action', dataIndex: 'action', key: 'action' },
                { 
    title: 'Record ID', 
    key: 'record_id', 
    render: (_, record) => <Text copyable>{record.data?.id || record.data?.local_id || 'N/A'}</Text> 
  },
                { title: 'Last Error', dataIndex: 'last_error', key: 'error', ellipsis: true, render: (e) => <Text danger>{e}</Text> },
                {
                  title: 'Retry',
                  key: 'retry',
                  render: (_, record) => (
                    <Button 
                      type="primary" 
                      size="small" 
                      icon={<ReloadOutlined />} 
                      onClick={() => retrySyncItem(record.id)}
                    >
                      Retry
                    </Button>
                  )
                }
              ]}
            />
          </div>
        )}
      </Card>

      {/* Details Modal */}
      <Modal
        title="Log Technical Details"
        open={isModalOpen}
        onOk={() => setIsModalOpen(false)}
        onCancel={() => setIsModalOpen(false)}
        footer={[<Button key="close" onClick={() => setIsModalOpen(false)}>Close</Button>]}
      >
        {selectedLog && (
          <div style={{ maxHeight: '450px', overflowY: 'auto' }}>
            <p><strong>Message:</strong> {selectedLog.message}</p>
            <p><strong>Category:</strong> <Tag>{selectedLog.category}</Tag></p>
            <p><strong>Suggested Fix:</strong> <Text type="success" strong>{selectedLog.details?.suggested_fix || 'No guide available'}</Text></p>
            <hr style={{ border: `0.5px solid ${token.colorBorderSecondary}`, margin: '15px 0' }} />
            
            <Text type="secondary">Raw Error Data:</Text>
            <pre style={{ 
              background: token.colorFillTertiary, 
              padding: '12px', 
              borderRadius: token.borderRadius, 
              marginTop: '10px', 
              fontSize: '11px', 
              color: token.colorTextDescription,
              overflowX: 'auto'
            }}>
              {JSON.stringify(selectedLog.details, null, 2)}
            </pre>
            
            <hr style={{ border: `0.5px solid ${token.colorBorderSecondary}`, margin: '15px 0' }} />
            
            <Text type="secondary">Device Info:</Text>
            <pre style={{ 
              fontSize: '11px', 
              color: token.colorTextDescription,
              background: token.colorFillQuaternary,
              padding: '10px',
              borderRadius: token.borderRadius
            }}>
              {JSON.stringify(selectedLog.device_info, null, 2)}
            </pre>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default SystemLogs;