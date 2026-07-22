import React, { useState, useEffect } from 'react';
import { Table, Button, Select, Typography, Tag, Space, App, Card, Switch, DatePicker, Row, Col, Input, theme } from 'antd';
import { DeleteOutlined, SafetyCertificateOutlined, NotificationOutlined } from '@ant-design/icons';
import dayjs from 'dayjs'; // <-- Calendar dates format karne ke liye import kiya
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';

const { Title, Text } = Typography;
const { Option } = Select;

const ControlCenter = () => {
  const { profile } = useAuth();
  const { modal, message } = App.useApp();
  const { token } = theme.useToken(); // <-- Theme tokens tak rasayi hasil ki
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- Point 5 State Variables (System Announcements) ---
  const [announcements, setAnnouncements] = useState([]);
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementMessage, setAnnouncementMessage] = useState('');
  const [announcementLoading, setAnnouncementLoading] = useState(false);

  // Edge Function se tamam users ka data mangwana
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('control-center', {
        body: { action: 'get_users' }
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      
      setUsers(data.data);
    } catch (error) {
      message.error("Failed to load users: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Announcements ko database se load karne wala function
  const fetchAnnouncements = async () => {
    try {
      const { data, error } = await supabase
        .from('system_announcements')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setAnnouncements(data || []);
    } catch (err) {
      console.error('Failed to load announcements:', err);
    }
  };

  useEffect(() => {
    // Sirf tab data layein jab user Super Admin ho
    if (profile?.is_super_admin) {
      fetchUsers();
      fetchAnnouncements(); // System announcements ko bhi load karein
    }
  }, [profile]);

  // Kisi user ka plan tabdeel karna
  const handlePlanChange = async (userId, newPlan) => {
    try {
      message.loading({ content: 'Updating plan...', key: 'planUpdate' });
      const { data, error } = await supabase.functions.invoke('control-center', {
        body: { action: 'update_plan', payload: { target_user_id: userId, new_plan: newPlan } }
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      
      message.success({ content: data.data.message, key: 'planUpdate' });
      fetchUsers(); // List ko refresh karein
    } catch (error) {
      message.error({ content: "Plan update failed: " + error.message, key: 'planUpdate' });
    }
  };

  // Kisi shop ko suspend ya active status mein badalna
  const handleToggleSuspension = async (userId, checked) => {
    try {
      message.loading({ content: 'Updating status...', key: 'statusUpdate' });
      const { data, error } = await supabase.functions.invoke('control-center', {
        body: { action: 'toggle_suspension', payload: { target_user_id: userId, is_suspended: checked } }
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      
      message.success({ content: data.data.message, key: 'statusUpdate' });
      fetchUsers(); // List ko refresh karein
    } catch (error) {
      message.error({ content: "Status update failed: " + error.message, key: 'statusUpdate' });
    }
  };

  // Kisi shop ki subscription expiry date update karna
  const handleExpiryChange = async (userId, expiryDate) => {
    try {
      message.loading({ content: 'Updating expiry date...', key: 'expiryUpdate' });
      const { data, error = null } = await supabase.functions.invoke('control-center', {
        body: { action: 'update_expiry', payload: { target_user_id: userId, expiry_date: expiryDate } }
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      
      message.success({ content: data.data.message, key: 'expiryUpdate' });
      fetchUsers(); // List ko refresh karein
    } catch (error) {
      message.error({ content: "Expiry update failed: " + error.message, key: 'expiryUpdate' });
    }
  };

  // Naya: Suspended/Deleted Shop ko wapis active (Restore) karne wala function
  const handleRestoreUser = async (userId) => {
    try {
      message.loading({ content: 'Restoring shop account...', key: 'userRestore' });
      const { data, error = null } = await supabase.functions.invoke('control-center', {
        body: { action: 'restore_user', payload: { target_user_id: userId } }
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      
      message.success({ content: data.data.message, key: 'userRestore' });
      fetchUsers(); // List ko refresh karein
    } catch (error) {
      message.error({ content: "Restore failed: " + error.message, key: 'userRestore' });
    }
  };

  // Naya Announcement broadcast publish karne wala function
  const handlePublishAnnouncement = async () => {
    if (!announcementTitle.trim() || !announcementMessage.trim()) {
      message.warning("Announcement Title and Message are required!");
      return;
    }
    setAnnouncementLoading(true);
    try {
      const { error } = await supabase
        .from('system_announcements')
        .insert([{ title: announcementTitle, message: announcementMessage }]);
      
      if (error) throw error;
      message.success("Announcement broadcasted successfully!");
      setAnnouncementTitle('');
      setAnnouncementMessage('');
      fetchAnnouncements();
    } catch (err) {
      message.error("Failed to publish announcement: " + err.message);
    } finally {
      setAnnouncementLoading(false);
    }
  };

  // Announcement ko list se hamesha ke liye delete karne wala function
  const handleDeleteAnnouncement = async (id) => {
    try {
      const { error } = await supabase
        .from('system_announcements')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      message.success("Announcement deleted successfully!");
      fetchAnnouncements();
    } catch (err) {
      message.error("Failed to delete announcement: " + err.message);
    }
  };

  // User ko hamesha ke liye delete karna (60 Days Grace Period ya Force Delete ke sath)
  const handleDeleteUser = (userId, email, isScheduled) => {
    const title = isScheduled ? 'DANGER: Delete User Permanently?' : 'Schedule Shop Deletion?';
    const content = isScheduled 
      ? `Are you absolutely sure you want to FORCE delete ${email} immediately? All their dukan data, active products, and stored images will be permanently wiped out from the cloud. This action is irreversible.`
      : `Are you sure you want to schedule ${email} for deletion? The shop's login access will be suspended immediately. You will have a 60-day grace period to restore the shop before permanent deletion.`;
    const okText = isScheduled ? 'Yes, Force Delete Permanently' : 'Yes, Schedule Deletion';

    modal.confirm({
      title: title,
      content: content,
      okText: okText,
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          message.loading({ content: isScheduled ? 'Wiping user data...' : 'Scheduling deletion...', key: 'userDelete' });
          const { data, error = null } = await supabase.functions.invoke('control-center', {
            body: { 
              action: 'delete_user', 
              payload: { 
                target_user_id: userId, 
                force_delete: isScheduled // Agar pehle se scheduled hai, to yeh direct wipe (hard delete) hoga
              } 
            }
          });
          if (error) throw error;
          if (data.error) throw new Error(data.error);
          
          message.success({ content: data.data.message, key: 'userDelete' });
          fetchUsers(); // List ko refresh karein
        } catch (error) {
          message.error({ content: "Delete action failed: " + error.message, key: 'userDelete' });
        }
      }
    });
  };

  // Agar koi aam user (jo admin nahi hai) is page par aa jaye to usay bahar nikal dein
  if (!profile?.is_super_admin) {
    return (
      <div style={{ padding: '50px', textAlign: 'center' }}>
        <Title level={3} type="danger">Access Denied</Title>
        <Text>You are not authorized to view this page.</Text>
      </div>
    );
  }

  const columns = [
    { 
      title: 'Shop Name', 
      dataIndex: 'shop_name', 
      key: 'shop_name', 
      render: (text) => <Text strong style={{ whiteSpace: 'nowrap' }}>{text}</Text> 
    },
    { title: 'Email', dataIndex: 'email', key: 'email' },
    { title: 'Current Plan', dataIndex: 'subscription_tier', key: 'plan', render: (plan) => <Tag color={plan === 'scale' ? 'purple' : plan === 'pro' ? 'gold' : plan === 'growth' ? 'green' : 'blue'}>{plan?.toUpperCase()}</Tag> },
    { title: 'Joined On', dataIndex: 'created_at', key: 'created_at', render: (date) => new Date(date).toLocaleDateString() },
    { 
      title: 'Active Products', 
      dataIndex: 'active_products_count', 
      key: 'active_products_count', 
      render: (count) => <Text strong>{count || 0}</Text>,
      align: 'center'
    },
    { 
      title: 'Last Active', 
      dataIndex: 'last_active_at', 
      key: 'last_active_at', 
      render: (date) => date ? new Date(date).toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' }) : 'Never' 
    },
    { 
      title: 'Expiry Date', 
      dataIndex: 'subscription_expires_at', 
      key: 'subscription_expires_at', 
      render: (date, record) => (
        <DatePicker 
          value={date ? dayjs(date) : null}
          onChange={(val) => handleExpiryChange(record.id, val ? val.toISOString() : null)}
          disabled={record.is_super_admin} // Super Admin ki expiry update nahi ki ja sakti
          style={{ width: 140 }}
          placeholder="No Expiry"
        />
      )
    },
    {
      title: 'Status',
      key: 'status',
      render: (_, record) => {
        // Agar dukan deletion scheduled hai to bache hue din dikhayein
        if (record.scheduled_deletion_at) {
          const daysLeft = Math.max(0, dayjs(record.scheduled_deletion_at).diff(dayjs(), 'day'));
          return (
            <Tag color="volcano" style={{ fontWeight: 'bold' }}>
              Pending Deletion ({daysLeft} days left)
            </Tag>
          );
        }
        return (
          <Switch 
            checkedChildren="Suspended" 
            unCheckedChildren="Active" 
            checked={record.is_suspended} 
            onChange={(checked) => handleToggleSuspension(record.id, checked)}
            disabled={record.is_super_admin} // Khud apne aap ko block karne se rokna
            style={{ backgroundColor: record.is_suspended ? token.colorError : token.colorSuccess }}
          />
        );
      }
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => {
        // Super Admin ke paas options nahi honge
        if (record.is_super_admin) return <Tag color="blue">System Owner</Tag>;

        // Agar shop soft-deleted hai to "Restore" aur "Force Delete" ka button dikhana
        if (record.scheduled_deletion_at) {
          return (
            <Space>
              <Button 
                type="primary" 
                style={{ backgroundColor: token.colorSuccess, borderColor: token.colorSuccess }}
                onClick={() => handleRestoreUser(record.id)}
              >
                Restore Shop
              </Button>
              <Button 
                danger 
                icon={<DeleteOutlined />} 
                onClick={() => handleDeleteUser(record.id, record.email, true)} // True ka matlab hai FORCE DELETE
              >
                Force Delete
              </Button>
            </Space>
          );
        }

        // Normal active shops ke actions
        return (
          <Space>
            <Select 
              value={record.subscription_tier} 
              style={{ width: 110 }} 
              onChange={(val) => handlePlanChange(record.id, val)}
              disabled={record.is_super_admin} // Khud apna plan change karne se rokna
            >
              <Option value="free">Free</Option>
              <Option value="growth">Growth</Option>
              <Option value="pro">Pro</Option>
              <Option value="scale">Scale</Option>
            </Select>
            <Button 
              danger 
              icon={<DeleteOutlined />} 
              onClick={() => handleDeleteUser(record.id, record.email, false)} // False ka matlab hai schedule deletion
              disabled={record.is_super_admin} // Khud apne aap ko delete karne se rokna
            >
              Delete
            </Button>
          </Space>
        );
      }
    }
  ];

  return (
    <div style={{ padding: '16px 0' }}>
      <Card 
        variant="borderless" 
        style={{ 
          background: token.colorBgContainer, 
          borderRadius: token.borderRadiusLG,
          boxShadow: token.boxShadowTertiary 
        }}
      >
        <Title level={2}><SafetyCertificateOutlined style={{ color: token.colorWarning }} /> Super Admin Control Center</Title>
        <Text type="secondary" style={{ display: 'block', marginBottom: '24px' }}>
          Manage all registered shops, update their subscription plans, and securely delete abandoned accounts.
        </Text>
        <Table 
          dataSource={users} 
          columns={columns} 
          rowKey="id" 
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      {/* --- System Announcements Broadcast Section --- */}
      <Card 
        variant="borderless" 
        style={{ 
          marginTop: '24px', 
          background: token.colorBgContainer, 
          borderRadius: token.borderRadiusLG,
          boxShadow: token.boxShadowTertiary 
        }}
      >
        <Title level={3}><NotificationOutlined style={{ color: token.colorInfo }} /> Broadcast Announcements</Title>
        <Text type="secondary" style={{ display: 'block', marginBottom: '24px' }}>
          Send live system notifications, maintenance alerts, or general updates to all active shops instantly.
        </Text>
        
        <Row gutter={[24, 24]}>
          {/* Left Column: Form to publish new announcement */}
          <Col xs={24} md={10}>
            <div style={{ 
              background: token.colorFillAlter, 
              padding: '20px', 
              borderRadius: token.borderRadiusLG, 
              border: `1px solid ${token.colorBorderSecondary}` 
            }}>
              <Text strong style={{ display: 'block', marginBottom: '8px' }}>Announcement Title</Text>
              <Input 
                placeholder="e.g. Server Maintenance Alert" 
                value={announcementTitle}
                onChange={(e) => setAnnouncementTitle(e.target.value)}
                style={{ marginBottom: '16px' }}
              />
              
              <Text strong style={{ display: 'block', marginBottom: '8px' }}>Message Description</Text>
              <Input.TextArea 
                rows={4} 
                placeholder="Write your announcement detail here..." 
                value={announcementMessage}
                onChange={(e) => setAnnouncementMessage(e.target.value)}
                style={{ marginBottom: '20px' }}
              />
              
              <Button 
                type="primary" 
                icon={<NotificationOutlined />} 
                onClick={handlePublishAnnouncement}
                loading={announcementLoading}
                block
              >
                Publish Broadcast
              </Button>
            </div>
          </Col>
          
          {/* Right Column: List/Table of past announcements */}
          <Col xs={24} md={14}>
            <Table 
              dataSource={announcements}
              rowKey="id"
              pagination={{ pageSize: 5, simple: true }}
              size="small"
              columns={[
                {
                  title: 'Date',
                  dataIndex: 'created_at',
                  key: 'created_at',
                  render: (date) => new Date(date).toLocaleDateString(),
                  width: 100
                },
                {
                  title: 'Title',
                  dataIndex: 'title',
                  key: 'title',
                  ellipsis: true,
                  render: (text) => <b>{text}</b>
                },
                {
                  title: 'Message',
                  dataIndex: 'message',
                  key: 'message',
                  ellipsis: true
                },
                {
                  title: 'Action',
                  key: 'delete_action',
                  align: 'center',
                  render: (_, record) => (
                    <Button 
                      danger 
                      type="text" 
                      icon={<DeleteOutlined />} 
                      onClick={() => handleDeleteAnnouncement(record.id)}
                    />
                  ),
                  width: 80
                }
              ]}
            />
          </Col>
        </Row>
      </Card>
    </div>
  );
};

export default ControlCenter;