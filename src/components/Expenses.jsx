import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  Popconfirm,
  Radio,
  Tag,
  Tooltip,
  theme
} from 'antd';
import { PlusOutlined, EditOutlined, CloseCircleOutlined, DollarCircleOutlined } from '@ant-design/icons';
import DataService from '../DataService';
import { useAuth } from '../context/AuthContext';
import { useStaff } from '../context/StaffContext'; // <--- NAYA IZAFA
import { formatCurrency } from '../utils/currencyFormatter';
import dayjs from 'dayjs';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { db } from '../db'; // Database check karne ke liye

const { Title, Text } = Typography;
const { Option } = Select;

const Expenses = () => {
  const { token } = theme.useToken(); // Control Center Connection
  const { message } = AntApp.useApp();
  const isMobile = useMediaQuery('(max-width: 768px)');
  const { user, profile } = useAuth();
  const { activeStaff, activeSession } = useStaff(); // <--- NAYA IZAFA
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [staffMembers, setStaffMembers] = useState([]); // <--- NAYA IZAFA
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [form] = Form.useForm();
  const expenseTitleInputRef = useRef(null);

  // Modal khulne par cursor Title field mein le jane ki logic
  useEffect(() => {
    if (isModalOpen) {
      const timer = setTimeout(() => {
        expenseTitleInputRef.current?.focus();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isModalOpen]);

  const getData = useCallback(async () => {
    try {
      setLoading(true);
      // Ab hum DataService se data le rahe hain
      const expensesData = await DataService.getExpenses();
      const categoriesData = await DataService.getExpenseCategories();
      const staffData = await DataService.getStaffMembers(); // <--- NAYA IZAFA

      setExpenses(expensesData);
      setCategories(categoriesData);
      setStaffMembers(staffData); // <--- NAYA IZAFA
    } catch (error) {
      message.error('Error fetching data: ' + error.message);
    } finally {
      setLoading(false);
    }
  }, [message]);

  useEffect(() => {
    getData();

    // Live Sync: Jab bhi server se naya data aaye, table refresh ho jaye
    window.addEventListener('local-db-updated', getData);
    
    return () => {
      window.removeEventListener('local-db-updated', getData);
    };
  }, [getData]);

  const showModal = async (expense = null) => {
    // NAYA: Check karein ke kya yeh Staff Payment hai?
    if (expense) {
      const linkedStaffEntry = await db.staff_ledger.where('expense_id').equals(expense.id).first();
      
      if (linkedStaffEntry) {
        message.warning("This is a Staff Payment. Please edit it from Staff Management to keep balances correct.");
        return; // Yahin ruk jao, modal mat kholo
      }
    }

    setEditingExpense(expense);
    if (expense) {
      form.setFieldsValue({
        ...expense,
        expense_date: dayjs(expense.expense_date),
      });
    } else {
      form.resetFields();
      form.setFieldsValue({ 
        expense_date: dayjs(),
        payment_method: 'Cash' // Naya kharcha hamesha Cash se shuru ho
      });
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
        staff_id: activeStaff?.id, // <--- NAYA IZAFA
        expense_date: dayjs(values.expense_date).format('YYYY-MM-DD'),
      };

      if (editingExpense) {
        // Update Expense (Offline)
        await DataService.updateExpense(editingExpense.id, expenseData);
        message.success('Expense updated successfully!');
      } else {
        // Add Expense (Offline)
        await DataService.addExpense(expenseData);
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
      // NAYA: Check karein ke kya yeh Staff Payment hai?
      const linkedStaffEntry = await db.staff_ledger.where('expense_id').equals(expenseId).first();
      
      if (linkedStaffEntry) {
        message.warning("Cannot delete here! This is linked to Staff Ledger. Please delete it from Staff Management.");
        return;
      }

      // Delete Expense (Offline)
      await DataService.deleteExpense(expenseId);
      message.success('Expense deleted successfully!');
      getData();
    } catch (error) {
      message.error('Error deleting expense: ' + error.message);
    }
  };

  const handleVoid = async (expense) => {
    try {
      // NAYA: Check karein ke kya yeh Staff Payment hai?
      const linkedStaffEntry = await db.staff_ledger.where('expense_id').equals(expense.id).first();
      if (linkedStaffEntry) {
        message.warning("This is a Staff Payment. Please handle it from Staff Management.");
        return;
      }

      const voidData = {
        title: expense.title.startsWith('[VOID]') ? expense.title : `[VOID] ${expense.title}`,
        amount: 0,
        category_id: expense.category_id,
        expense_date: expense.expense_date,
        payment_method: expense.payment_method,
        user_id: user.id,
        staff_id: activeStaff?.id // <--- NAYA IZAFA
      };

      await DataService.updateExpense(expense.id, voidData);
      message.success('Transaction voided successfully!');
      getData();
    } catch (error) {
      message.error('Void failed: ' + error.message);
    }
  };

  const columns = [
    { title: 'Date', dataIndex: 'expense_date', key: 'expense_date', render: (date) => dayjs(date).format('DD MMM, YYYY') },
    { title: 'Title / Description', dataIndex: 'title', key: 'title' },
    { title: 'Category', dataIndex: 'expense_categories', key: 'category', render: (category) => category ? category.name : 'N/A' },
    { 
      title: 'Method', 
      dataIndex: 'payment_method', 
      key: 'payment_method', 
      render: (method) => <Tag color={method === 'Bank' ? 'cyan' : 'default'}>{method || 'Cash'}</Tag> 
    },
    { title: 'Amount', dataIndex: 'amount', key: 'amount', align: 'right', render: (amount) => <Text strong>{formatCurrency(amount, profile?.currency)}</Text> },
    { 
      title: 'Handled By', 
      key: 'staff', 
      render: (_, record) => {
        const staff = staffMembers.find(s => s.id === record.staff_id);
        return <Text type="secondary" style={{ fontSize: '12px' }}>{staff ? staff.name : 'Owner'}</Text>;
      }
    },
    {
      title: 'Actions',
      key: 'actions',
      align: 'center',
      render: (_, record) => {
        const isVoided = record.amount === 0;
        return (
          <Space>
            {!isVoided && (
              <>
                <Tooltip title={!activeSession ? "Shift closed" : ""}>
                  <Button size="small" icon={<EditOutlined />} onClick={() => showModal(record)} disabled={!activeSession} />
                </Tooltip>
                {activeSession ? (
                  <Popconfirm 
                    title="VOID this transaction?" 
                    description="This will set amount to 0 and keep the record for audit."
                    onConfirm={() => handleVoid(record)} 
                    okText="Yes, Void it" 
                    cancelText="No"
                    okButtonProps={{ danger: true }}
                  >
                    <Tooltip title="Void / Cancel">
                      <Button size="small" danger icon={<CloseCircleOutlined />} />
                    </Tooltip>
                  </Popconfirm>
                ) : (
                  <Tooltip title="Shift closed">
                    <Button size="small" danger icon={<CloseCircleOutlined />} disabled />
                  </Tooltip>
                )}
              </>
            )}
            {isVoided && <Tag color="default">VOIDED</Tag>}
          </Space>
        );
      },
    },
  ];

  return (
    <div style={{ padding: isMobile ? '12px 0' : '4px 0' }}>
      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: 'center', justifyContent: isMobile ? 'space-between' : 'flex-end', marginBottom: '16px', gap: '16px' }}>
        <Tooltip title={!activeSession ? "Please open a register shift to add expenses." : ""}>
          <Button type="primary" icon={<PlusOutlined />} size="large" onClick={() => showModal()} style={{ width: isMobile ? '100%' : 'auto' }} disabled={!activeSession}>
            Add New Expense
          </Button>
        </Tooltip>
      </div>
      {isMobile && (
        <Title level={2} style={{ margin: 0, marginBottom: '16px', marginLeft: '8px', fontSize: '23px' }}>
          <DollarCircleOutlined /> Manage Expenses
        </Title>
      )}
      <Table columns={columns} dataSource={expenses} loading={loading} rowKey="id" scroll={{ x: true }} />
      
      <Modal title={editingExpense ? 'Edit Expense' : 'Add a New Expense'} open={isModalOpen} onCancel={handleCancel} onOk={() => form.submit()} okText="Save">
        <Form form={form} layout="vertical" onFinish={handleOk}>
          <Form.Item name="title" label="Title / Description" rules={[{ required: true }]}>
            <Input ref={expenseTitleInputRef} />
          </Form.Item>
          <Form.Item name="amount" label="Amount" rules={[{ required: true }]}>
            <InputNumber style={{ width: '100%' }} prefix={profile?.currency ? `${profile.currency} ` : ''} min={1} />
          </Form.Item>
          <Form.Item name="payment_method" label="Paid From" initialValue="Cash">
            <Radio.Group buttonStyle="solid">
              <Radio.Button value="Cash">Cash</Radio.Button>
              <Radio.Button value="Bank">Bank / Online</Radio.Button>
            </Radio.Group>
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
    </div>
  );
};

export default Expenses;