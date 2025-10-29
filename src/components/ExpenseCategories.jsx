import React, { useState, useEffect, useCallback } from 'react';
import {
  Typography,
  Table,
  Button,
  Modal,
  Form,
  Input,
  App as AntApp,
  Space,
  Popconfirm,
  Tooltip
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { useMediaQuery } from '../hooks/useMediaQuery';

const { Title } = Typography;

const ExpenseCategories = () => {
  const { message } = AntApp.useApp();
  const isMobile = useMediaQuery('(max-width: 768px)');
  const { user } = useAuth();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [form] = Form.useForm();

  const getCategories = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      let { data, error } = await supabase
        .from('expense_categories')
        .select('*')
        .order('name', { ascending: true });
      
      if (error) throw error;
      setCategories(data);
    } catch (error) {
      message.error('Error fetching categories: ' + error.message);
    } finally {
      setLoading(false);
    }
  }, [user, message]);

  useEffect(() => {
    getCategories();
  }, [getCategories]);

  const showModal = (category = null) => {
    setEditingCategory(category);
    form.setFieldsValue(category ? { name: category.name } : { name: '' });
    setIsModalOpen(true);
  };

  const handleCancel = () => {
    setIsModalOpen(false);
    setEditingCategory(null);
    form.resetFields();
  };

  const handleOk = async (values) => {
    try {
      if (editingCategory) {
        const { error } = await supabase.from('expense_categories').update({ name: values.name }).eq('id', editingCategory.id);
        if (error) throw error;
        message.success('Category updated successfully!');
      } else {
        const { error } = await supabase.from('expense_categories').insert([{ name: values.name, user_id: user.id }]);
        if (error) throw error;
        message.success('Category added successfully!');
      }
      handleCancel();
      getCategories();
    } catch (error) {
      message.error('Error saving category: ' + error.message);
    }
  };
  
const handleDelete = async (categoryId) => {
    try {
      const { error } = await supabase.from('expense_categories').delete().eq('id', categoryId);
      if (error) throw error;
      message.success('Category deleted successfully!');
      getCategories();
    } catch (error) {
      if (error.code === '23503') {
        message.error('This category cannot be deleted as it is currently in use by one or more expenses.');
      } else {
        message.error('An unexpected error occurred while deleting the category.');
        console.error('Deletion Error:', error); // Yeh line aapko console mein asal error dikhaye gi
      }
    }
};

  const columns = [
    {
      title: 'Category Name',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 150,
      align: 'center',
      render: (_, record) => {
        if (record.user_id) {
          return (
            <Space>
              <Button size="small" icon={<EditOutlined />} onClick={() => showModal(record)} />
              <Popconfirm
                title="Delete this category?"
                description="This cannot be undone."
                onConfirm={() => handleDelete(record.id)}
                okText="Yes" cancelText="No"
              >
                <Button size="small" danger icon={<DeleteOutlined />} />
              </Popconfirm>
            </Space>
          );
        }
        return (
          <Tooltip title="Default categories cannot be edited or deleted.">
            <span style={{ color: '#666', cursor: 'not-allowed' }}>Default</span>
          </Tooltip>
        );
      },
    },
  ];

  return (
    <>
      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', gap: '16px' }}>
  <Title level={2} style={{ margin: 0, width: '100%', textAlign: isMobile ? 'center' : 'left' }}>Manage Expense Categories</Title>
  <Button type="primary" icon={<PlusOutlined />} size="large" onClick={() => showModal()} block={isMobile}>
    Add New Category
  </Button>
</div>
      <Table columns={columns} dataSource={categories} loading={loading} rowKey="id" scroll={{ x: true }} />
      <Modal title={editingCategory ? 'Edit Category' : 'Add a New Category'} open={isModalOpen} onCancel={handleCancel} onOk={() => form.submit()} okText="Save">
        <Form form={form} layout="vertical" onFinish={handleOk}>
          <Form.Item name="name" label="Category Name" rules={[{ required: true, message: 'Please enter the category name!' }]}>
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default ExpenseCategories;