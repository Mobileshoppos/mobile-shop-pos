import React, { useState, useEffect } from 'react';
import { Table, Button, Select, Typography, Tag, Space, App, Card } from 'antd';
import { DeleteOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';

const { Title, Text } = Typography;
const { Option } = Select;

const ControlCenter = () => {
  const { profile } = useAuth();
  const { modal, message } = App.useApp();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    // Sirf tab data layein jab user Super Admin ho
    if (profile?.is_super_admin) {
      fetchUsers();
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

  // User ko hamesha ke liye delete karna
  const handleDeleteUser = (userId, email) => {
    modal.confirm({
      title: 'DANGER: Delete User Permanently?',
      content: `Are you absolutely sure you want to delete ${email}? All their data and images will be wiped out. This cannot be undone.`,
      okText: 'Yes, Delete Permanently',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          message.loading({ content: 'Deleting user and images...', key: 'userDelete' });
          const { data, error } = await supabase.functions.invoke('control-center', {
            body: { action: 'delete_user', payload: { target_user_id: userId } }
          });
          if (error) throw error;
          if (data.error) throw new Error(data.error);
          
          message.success({ content: data.data.message, key: 'userDelete' });
          fetchUsers(); // List ko refresh karein
        } catch (error) {
          message.error({ content: "Delete failed: " + error.message, key: 'userDelete' });
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
    { title: 'Shop Name', dataIndex: 'shop_name', key: 'shop_name', render: (text) => <Text strong>{text}</Text> },
    { title: 'Email', dataIndex: 'email', key: 'email' },
    { 
      title: 'Current Plan', 
      dataIndex: 'subscription_tier', 
      key: 'plan', 
      render: (plan) => <Tag color={plan === 'pro' ? 'gold' : plan === 'growth' ? 'green' : 'blue'}>{plan?.toUpperCase()}</Tag> 
    },
    { title: 'Joined On', dataIndex: 'created_at', key: 'created_at', render: (date) => new Date(date).toLocaleDateString() },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
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
          </Select>
          <Button 
            danger 
            icon={<DeleteOutlined />} 
            onClick={() => handleDeleteUser(record.id, record.email)}
            disabled={record.is_super_admin} // Khud apne aap ko delete karne se rokna
          >
            Delete
          </Button>
        </Space>
      )
    }
  ];

  return (
    <div style={{ padding: '16px 0' }}>
      <Card variant="borderless" style={{ background: 'transparent' }}>
        <Title level={2}><SafetyCertificateOutlined style={{ color: '#faad14' }} /> Super Admin Control Center</Title>
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
    </div>
  );
};

export default ControlCenter;