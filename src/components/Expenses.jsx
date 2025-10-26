import React, { useState, useEffect, useCallback } from 'react';
import {
  Typography,
  Table,
  Button,
  Modal,
  Form,
  Input,
  InputNumber,
  DatePicker,
  Select,
  App as AntApp,
  Space,
  Popconfirm
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;

const Expenses = () => {
  const { message } = AntApp.useApp();
  const { user } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [form] = Form.useForm();

  const getData = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      let { data: expensesData, error: expensesError } = await supabase
        .from('expenses')
        .select('*, expense_categories ( name )')
        .order('expense_date', { ascending: false });
      if (expensesError) throw expensesError;
      
      let { data: categoriesData, error: categoriesError } = await supabase
        .from('expense_categories')
        .select('*');
      if (categoriesError) throw categoriesError;

      setExpenses(expensesData);
      setCategories(categoriesData);
    } catch (error) {
      message.error('Error fetching data: ' + error.message);
    } finally {
      setLoading(false);
    }
  }, [user, message]);

  useEffect(() => {
    getData();
  }, [getData]);

  const showModal = (expense = null) => {
    setEditingExpense(expense);
    if (expense) {
      form.setFieldsValue({
        ...expense,
        expense_date: dayjs(expense.expense_date),
      });
    } else {
      form.resetFields();
      form.setFieldsValue({ expense_date: dayjs() });
    }
    setIsModalOpen(true);
  };

  const handleCancel = () => {
    setIsModalOpen(false);
    setEditingExpense(null);
    form.resetFields();
  };

  const handleOk = async (values) => {
    try {
      const expenseData = {
        ...values,
        user_id: user.id,
        expense_date: dayjs(values.expense_date).format('YYYY-MM-DD'),
      };

      if (editingExpense) {
        const { error } = await supabase.from('expenses').update(expenseData).eq('id', editingExpense.id);
        if (error) throw error;
        message.success('Expense updated successfully!');
      } else {
        const { error } = await supabase.from('expenses').insert([expenseData]);
        if (error) throw error;
        message.success('Expense added successfully!');
      }
      handleCancel();
      getData();
    } catch (error) {
      message.error('Error saving expense: ' + error.message);
    }
  };
  
  const handleDelete = async (expenseId) => {
    try {
      const { error } = await supabase.from('expenses').delete().eq('id', expenseId);
      if (error) throw error;
      message.success('Expense deleted successfully!');
      getData();
    } catch (error) {
      message.error('Error deleting expense: ' + error.message);
    }
  };

  const columns = [
    { title: 'Date', dataIndex: 'expense_date', key: 'expense_date', render: (date) => dayjs(date).format('DD MMM, YYYY') },
    { title: 'Title / Description', dataIndex: 'title', key: 'title' },
    { title: 'Category', dataIndex: 'expense_categories', key: 'category', render: (category) => category ? category.name : 'N/A' },
    { title: 'Amount', dataIndex: 'amount', key: 'amount', align: 'right', render: (amount) => <Text strong>Rs. {Number(amount).toFixed(2)}</Text> },
    {
      title: 'Actions',
      key: 'actions',
      align: 'center',
      render: (_, record) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => showModal(record)} />
          <Popconfirm title="Delete this expense?" onConfirm={() => handleDelete(record.id)} okText="Yes" cancelText="No">
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        {/* --- TABDEELI: Yahan se hardcoded 'color: white' hata diya hai --- */}
        <Title level={2} style={{ margin: 0 }}>Manage Expenses</Title>
        <Button type="primary" icon={<PlusOutlined />} size="large" onClick={() => showModal()}>
          Add New Expense
        </Button>
      </div>
      <Table columns={columns} dataSource={expenses} loading={loading} rowKey="id" />
      
      <Modal title={editingExpense ? 'Edit Expense' : 'Add a New Expense'} open={isModalOpen} onCancel={handleCancel} onOk={() => form.submit()} okText="Save">
        <Form form={form} layout="vertical" onFinish={handleOk}>
          <Form.Item name="title" label="Title / Description" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="amount" label="Amount" rules={[{ required: true }]}>
            <InputNumber style={{ width: '100%' }} prefix="Rs." min={1} />
          </Form.Item>
          <Form.Item name="category_id" label="Category" rules={[{ required: true }]}>
            <Select placeholder="Select a category">
              {categories.map(cat => (
                <Option key={cat.id} value={cat.id}>{cat.name}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="expense_date" label="Date of Expense" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default Expenses;