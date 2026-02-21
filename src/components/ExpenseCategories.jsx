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
  Tooltip,
  theme
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, FileProtectOutlined } from '@ant-design/icons';
import DataService from '../DataService';
import { useAuth } from '../context/AuthContext';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { db } from '../db'; // Database ko import kiya

const { Title } = Typography;

const ExpenseCategories = () => {
  const { token } = theme.useToken(); // Control Center Connection
  const { message } = AntApp.useApp();
  const isMobile = useMediaQuery('(max-width: 768px)');
  const { user } = useAuth();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [isCategoryInUse, setIsCategoryInUse] = useState(false);
  const [form] = Form.useForm();

  const getCategories = useCallback(async () => {
    try {
      setLoading(true);
      // DataService se categories layein (Local DB)
      const data = await DataService.getExpenseCategories();
      // Naam ke hisaab se sort karein
      data.sort((a, b) => a.name.localeCompare(b.name));
      setCategories(data);
    } catch (error) {
      message.error('Error fetching categories: ' + error.message);
    } finally {
      setLoading(false);
    }
  }, [message]);

  useEffect(() => {
    getCategories();
  }, [getCategories]);

  const showModal = async (category = null) => {
    let inUse = false;
    
    // Agar Edit mode hai, to check karein ke kya is category mein expenses hain?
    if (category) {
      const count = await db.expenses.where('category_id').equals(category.id).count();
      inUse = count > 0;
    }

    setIsCategoryInUse(inUse); // Lock set karein
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
      // Duplicate Check (Local level par check karein ke naam pehle se to nahi?)
      const isDuplicate = categories.some(cat => 
        cat.name.toLowerCase().trim() === values.name.toLowerCase().trim() && 
        cat.id !== editingCategory?.id
      );

      if (isDuplicate) {
        return message.error('A category with this name already exists!');
      }

      if (editingCategory) {
        // Update (Offline)
        await DataService.updateExpenseCategory(editingCategory.id, values.name);
        message.success('Category updated successfully!');
      } else {
        // Add (Offline)
        // User ID hum DataService mein handle nahi kar rahe kyunke local DB mein zaroori nahi, 
        // lekin Supabase ke liye hum user_id sync context mein bhejte hain ya yahan pass kar sakte hain.
        // Behtar hai yahan pass kar dein agar available hai.
        const newCat = { name: values.name, user_id: user.id };
        await DataService.addExpenseCategory(newCat);
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
      // Delete (Offline)
      await DataService.deleteExpenseCategory(categoryId);
      message.success('Category deleted successfully!');
      getCategories();
    } catch (error) {
      message.error(error.message);
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
      render: (_, record) => (
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
      ),
    },
  ];

  return (
    <div style={{ padding: isMobile ? '12px 0' : '4px 0' }}>
      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: 'center', justifyContent: isMobile ? 'space-between' : 'flex-end', marginBottom: '16px', gap: '16px' }}>
        <Button type="primary" icon={<PlusOutlined />} size="large" onClick={() => showModal()} style={{ width: isMobile ? '100%' : 'auto' }}>
    Add New Category
  </Button>
</div>
      {isMobile && (
        <Title level={2} style={{ margin: 0, marginBottom: '16px', marginLeft: '8px', fontSize: '23px' }}>
          <FileProtectOutlined /> Manage Expense Categories
        </Title>
      )}
      <Table columns={columns} dataSource={categories} loading={loading} rowKey="id" scroll={{ x: true }} />
      <Modal title={editingCategory ? 'Edit Category' : 'Add a New Category'} open={isModalOpen} onCancel={handleCancel} onOk={() => form.submit()} okText="Save">
        <Form form={form} layout="vertical" onFinish={handleOk}>
          <Form.Item 
            name="name" 
            label="Category Name" 
            rules={[{ required: true, message: 'Please enter the category name!' }]}
            help={isCategoryInUse ? "This category is in use and cannot be renamed." : ""}
            validateStatus={isCategoryInUse ? "warning" : ""}
          >
            <Input disabled={isCategoryInUse} placeholder="e.g. Rent, Salaries" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ExpenseCategories;