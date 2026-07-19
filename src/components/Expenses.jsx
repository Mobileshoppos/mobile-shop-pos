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
  theme,
  Card
} from 'antd';
import { PlusOutlined, EditOutlined, CloseCircleOutlined, DollarCircleOutlined, UndoOutlined, SearchOutlined } from '@ant-design/icons';
import DataService from '../DataService';
import DataExport from '../components/DataExport'; // <--- NAYA IZAFA
import { useAuth } from '../context/AuthContext';
import { useStaff } from '../context/StaffContext'; // <--- NAYA IZAFA
import { formatCurrency } from '../utils/currencyFormatter';
import { generateInvoiceId } from '../utils/idGenerator'; // <--- NAYA IZAFA
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
  const [paymentAccounts, setPaymentAccounts] = useState([]); // <--- NAYA IZAFA
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [form] = Form.useForm();
  const expenseTitleInputRef = useRef(null);

  // --- NAYA IZAFA: Expense List View Modes ---
  const [expenseViewMode, setExpenseViewMode] = useState('detailed'); // 'detailed' vs 'grouped'

  // --- NAYA IZAFA: Search & Performance States ---
  const [searchText, setSearchText] = useState('');
  const [dateRange, setDateRange] = useState([dayjs().startOf('month'), dayjs().endOf('month')]); // Default This Month
  const [expenseDateRangeType, setExpenseDateRangeType] = useState('this_month');

  // Modal khulne par cursor Title field mein le jane ki logic
  useEffect(() => {
    if (isModalOpen) {
      const timer = setTimeout(() => {
        expenseTitleInputRef.current?.focus();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isModalOpen]);

  // --- NAYA IZAFA: 3-Level Collapsible Grouped Expenses Data Builder (Standard Reconciliation) ---
  const getGroupedExpensesData = () => {
    const groups = {};
    
    // Category mapping
    const categoryMap = {};
    categories.forEach(c => { categoryMap[c.id] = c; });

    expenses.forEach(e => {
        const cat = categoryMap[e.category_id];
        let parentCatName = 'Other Expenses';
        let subCatName = 'General';
        
        if (cat) {
            if (cat.parent_id) {
                // Agar subcategory hai, to uske parent ka naam aur apna naam lein
                const parent = categoryMap[cat.parent_id];
                parentCatName = parent ? parent.name : 'Other Expenses';
                subCatName = cat.name;
            } else {
                // Agar khud hi main category hai
                parentCatName = cat.name;
                subCatName = 'General / Miscellaneous';
            }
        }

        // Level 1: Parent Category
        if (!groups[parentCatName]) {
            groups[parentCatName] = {
                key: parentCatName,
                title: parentCatName,
                type: 'parent',
                amount: 0,
                children: {}
            };
        }

        const amt = Number(e.amount) || 0;
        groups[parentCatName].amount += amt;

        // Level 2: Sub Category
        if (!groups[parentCatName].children[subCatName]) {
            groups[parentCatName].children[subCatName] = {
                key: `${parentCatName}-${subCatName}`,
                title: subCatName,
                type: 'sub',
                amount: 0,
                children: []
            };
        }
        groups[parentCatName].children[subCatName].amount += amt;

        // Level 3: Individual Expense Transactions (Leafs)
        groups[parentCatName].children[subCatName].children.push({
            id: e.id,
            key: e.id,
            date: e.expense_date,
            voucher_no: e.voucher_no,
            title: e.title,
            payment_method: e.payment_method,
            amount: e.amount,
            staff_id: e.staff_id,
            isLeaf: true
        });
    });

    // Nested array format mein convert karna (Tree Table)
    return Object.values(groups).map(g => ({
        ...g,
        children: Object.values(g.children).map(s => ({
            ...s,
            children: s.children.sort((a, b) => new Date(b.date) - new Date(a.date))
        }))
    }));
  };

  // NAYA IZAFA: Grouped View Columns Configuration
  const groupedColumns = [
    {
      title: 'Category Name / Date',
      dataIndex: 'title',
      key: 'title',
      render: (text, record) => {
          if (record.isLeaf) {
              return dayjs(record.date).format('DD MMM, YYYY');
          }
          return <Text strong style={{ color: token.colorCardHeadingsText }}>{text}</Text>;
      }
    },
    {
      title: 'Voucher No.',
      dataIndex: 'voucher_no',
      key: 'voucher_no',
      render: (text, record) => record.isLeaf ? <Text code>{text || '-'}</Text> : null
    },
    {
      title: 'Title / Description',
      dataIndex: 'title',
      key: 'title',
      render: (text, record) => record.isLeaf ? text : null
    },
    {
      title: 'Paid From',
      dataIndex: 'payment_method',
      key: 'payment_method',
      render: (method, record) => record.isLeaf ? <Tag color={method === 'Cash' ? 'default' : 'cyan'}>{method || 'Cash'}</Tag> : null
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      align: 'right',
      render: (val, record) => (
          <Text strong style={{ color: record.isLeaf ? undefined : token.colorWarning }}>
              {formatCurrency(val, profile?.currency)}
          </Text>
      )
    },
    {
      title: 'Handled By',
      key: 'staff',
      render: (_, record) => {
        if (!record.isLeaf) return null;
        const staff = staffMembers.find(s => s.id === record.staff_id);
        return <Text type="secondary" style={{ fontSize: '12px' }}>{staff ? staff.name : 'Owner'}</Text>;
      }
    }
  ];

  const getData = useCallback(async () => {
    try {
      setLoading(true);

      // 1. High-Performance Indexed Query (Loads ONLY selected dates to prevent lags/crashes over the years)
      let matchedExpenses = [];
      if (dateRange && dateRange[0] && dateRange[1]) {
          const startStr = dateRange[0].startOf('day').format('YYYY-MM-DD');
          const endStr = dateRange[1].endOf('day').format('YYYY-MM-DD');
          matchedExpenses = await db.expenses
              .where('expense_date')
              .between(startStr, endStr, true, true)
              .toArray();
      } else {
          // Safety Cap: Capped to 500 records on "All Time" to prevent memory leaks/crashes
          matchedExpenses = await db.expenses
              .orderBy('expense_date')
              .reverse()
              .limit(500)
              .toArray();
      }

      const categoriesData = await DataService.getExpenseCategories();
      const staffData = await DataService.getStaffMembers();

      if (DataService.getPaymentAccounts) {
          const accountsData = await DataService.getPaymentAccounts();
          setPaymentAccounts(accountsData);
      }

      const catMap = {};
      categoriesData.forEach(c => { catMap[c.id] = c.name; });

      // Join categories in memory
      const mappedExpenses = matchedExpenses.map(e => ({
          ...e,
          expense_categories: { name: catMap[e.category_id] || 'Uncategorized' }
      }));

      // Live search filter inside memory
      let finalExpenses = mappedExpenses;
      if (searchText) {
          const query = searchText.toLowerCase().trim();
          finalExpenses = mappedExpenses.filter(e => 
              (e.title && e.title.toLowerCase().includes(query)) ||
              (e.voucher_no && e.voucher_no.toLowerCase().includes(query)) ||
              (e.expense_categories?.name && e.expense_categories.name.toLowerCase().includes(query))
          );
      }

      // Sort descending (Newest first)
      finalExpenses.sort((a, b) => new Date(b.expense_date) - new Date(a.expense_date));

      setExpenses(finalExpenses);
      setCategories(categoriesData);
      setStaffMembers(staffData);
    } catch (error) {
      message.error('Error fetching data: ' + error.message);
    } finally {
      setLoading(false);
    }
  }, [message, dateRange, searchText]); // <--- Dependencies updated

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
      const defaultCash = paymentAccounts.find(a => a.type === 'Cash')?.name || 'Cash';
      form.setFieldsValue({ 
        expense_date: dayjs(),
        payment_method: defaultCash 
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
      const vNo = await generateInvoiceId(); // <--- NAYA IZAFA
      const expenseData = {
        ...values,
        voucher_no: `EXP-${vNo}`, // <--- NAYA IZAFA
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

  // --- NAYA IZAFA: Expense Export Columns ---
  const exportColumns = [
    { title: 'Date', dataIndex: 'formattedDate' },
    { title: 'Voucher No.', dataIndex: 'voucher_no' },
    { title: 'Title / Description', dataIndex: 'title' },
    { title: 'Category', dataIndex: 'categoryName' },
    { title: 'Paid From', dataIndex: 'payment_method' },
    { title: 'Amount', dataIndex: 'amount' },
    { title: 'Handled By', dataIndex: 'staffName' }
  ];

  const columns = [
    { title: 'Date', dataIndex: 'expense_date', key: 'expense_date', render: (date) => dayjs(date).format('DD MMM, YYYY') },
    { title: 'Voucher No.', dataIndex: 'voucher_no', key: 'voucher_no', render: (text) => <Text code>{text || '-'}</Text> },
    { title: 'Title / Description', dataIndex: 'title', key: 'title' },
    { title: 'Category', dataIndex: 'expense_categories', key: 'category', render: (category) => category ? category.name : 'N/A' },
    { 
      title: 'Paid From', 
      dataIndex: 'payment_method', 
      key: 'payment_method', 
      render: (method) => <Tag color={method === 'Cash' ? 'default' : 'cyan'}>{method || 'Cash'}</Tag> 
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

  // NAYA IZAFA: Dynamic Export formatting based on selected view mode (Excel layout formatted beautifully)
  const getDynamicExportData = () => {
    if (expenseViewMode === 'grouped') {
        const flatList = [];
        const grouped = getGroupedExpensesData();
        grouped.forEach(g => {
            flatList.push({ category_name: g.title, amount: formatCurrency(g.amount, profile?.currency), is_parent: true });
            g.children.forEach(s => {
                flatList.push({ category_name: `  └── ${s.title}`, amount: formatCurrency(s.amount, profile?.currency), is_sub: true });
                s.children.forEach(leaf => {
                    flatList.push({
                        category_name: `      • ${leaf.title}`,
                        date: dayjs(leaf.date).format('DD MMM, YYYY'),
                        voucher: leaf.voucher_no,
                        method: leaf.payment_method,
                        amount: formatCurrency(leaf.amount, profile?.currency),
                        staff: staffMembers.find(st => st.id === leaf.staff_id)?.name || 'Owner'
                    });
                });
            });
        });
        return flatList;
    }
    return expenses.map(e => ({
        ...e,
        formattedDate: dayjs(e.expense_date).format('DD MMM, YYYY'),
        categoryName: e.expense_categories ? e.expense_categories.name : 'N/A',
        staffName: staffMembers.find(s => s.id === e.staff_id)?.name || 'Owner',
        amount_formatted: formatCurrency(e.amount, profile?.currency)
    }));
  };

  const getDynamicExportColumns = () => {
    if (expenseViewMode === 'grouped') {
        return [
            { title: 'Category Name / Title', dataIndex: 'category_name' },
            { title: 'Date', dataIndex: 'date' },
            { title: 'Voucher No', dataIndex: 'voucher' },
            { title: 'Account', dataIndex: 'method' },
            { title: 'Amount', dataIndex: 'amount' },
            { title: 'Handled By', dataIndex: 'staff' }
        ];
    }
    return [
        { title: 'Date', dataIndex: 'formattedDate' },
        { title: 'Voucher No.', dataIndex: 'voucher_no' },
        { title: 'Title / Description', dataIndex: 'title' },
        { title: 'Category', dataIndex: 'categoryName' },
        { title: 'Paid From', dataIndex: 'payment_method' },
        { title: 'Amount', dataIndex: 'amount_formatted' },
        { title: 'Handled By', dataIndex: 'staffName' }
    ];
  };

  return (
    <div style={{ padding: isMobile ? '12px 0' : '4px 0' }}>
      {isMobile && (
        <Title level={2} style={{ margin: 0, marginBottom: '16px', marginLeft: '8px', fontSize: '23px' }}>
          <DollarCircleOutlined /> Manage Expenses
        </Title>
      )}
      <Card styles={{ body: { paddingTop: '16px' } }}> {/* <--- NAYA IZAFA: Header clean and space optimized */}
        
        {/* --- NAYA IZAFA: Advanced Filter Bar (With Search, Period, Toggle, and Export) --- */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
          
          <Space wrap={isMobile}>
            {/* 1. View Mode Switch */}
            <Radio.Group 
              value={expenseViewMode} 
              onChange={(e) => setExpenseViewMode(e.target.value)} 
              size="middle"
              buttonStyle="solid"
            >
              <Radio.Button value="detailed">Detailed List</Radio.Button>
              <Radio.Button value="grouped">Summary Ledger</Radio.Button>
            </Radio.Group>

            {/* 2. Interactive Search Box */}
            <Input.Search 
              placeholder="Search description or voucher..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onSearch={setSearchText}
              style={{ width: 220 }}
              allowClear
            />

            {/* 3. Quick Period Selector (Default: This Month) */}
            <Select
              value={expenseDateRangeType}
              onChange={(val) => {
                  setExpenseDateRangeType(val);
                  const now = dayjs();
                  if (val === 'today') {
                      setDateRange([now.startOf('day'), now.endOf('day')]);
                  } else if (val === 'week') {
                      setDateRange([now.startOf('week'), now.endOf('day')]);
                  } else if (val === 'this_month') {
                      setDateRange([now.startOf('month'), now.endOf('month')]);
                  } else if (val === 'all') {
                      setDateRange(null); // All Time (capped to 500)
                  }
              }}
              style={{ width: 130 }}
              styles={{ popup: { root: { zIndex: 2000 } } }}
            >
              <Select.Option value="this_month">This Month</Select.Option>
              <Select.Option value="today">Today</Select.Option>
              <Select.Option value="week">This Week</Select.Option>
              <Select.Option value="all">All Time</Select.Option>
              <Select.Option value="custom">Custom Range</Select.Option>
            </Select>

            {expenseDateRangeType === 'custom' && (
              <DatePicker.RangePicker 
                value={dateRange}
                onChange={(values) => setDateRange(values)}
                style={{ width: 250 }}
              />
            )}

            {/* 4. Reset Button */}
            <Tooltip title="Reset Filters">
                <Button 
                  icon={<UndoOutlined />} 
                  onClick={() => {
                    setSearchText('');
                    setExpenseDateRangeType('this_month');
                    setDateRange([dayjs().startOf('month'), dayjs().endOf('month')]);
                  }}
                />
            </Tooltip>
          </Space>

          {/* Right Aligned Export & Add Buttons */}
          <Space>
            <DataExport 
              data={getDynamicExportData()} 
              exportColumns={getDynamicExportColumns()} 
              fileName={expenseViewMode === 'grouped' ? "Grouped_Expenses_Report" : "Expenses_Detailed_List"} 
              reportTitle={expenseViewMode === 'grouped' ? "Category Wise Expenses Summary" : "Expenses Detailed List Report"} 
            />
            <Tooltip title={!activeSession ? "Please open a register shift to add expenses." : ""}>
              <Button id="exp-add-btn" type="primary" icon={<PlusOutlined />} onClick={() => showModal()} style={{ width: isMobile ? '100%' : 'auto' }} disabled={!activeSession}>
                Add New Expense
              </Button>
            </Tooltip>
          </Space>
        </div>

        <Table 
          columns={expenseViewMode === 'grouped' ? groupedColumns : columns} 
          dataSource={expenseViewMode === 'grouped' ? getGroupedExpensesData() : expenses} 
          loading={loading} 
          rowKey={(record) => record.key || record.id}
          pagination={expenseViewMode === 'grouped' ? false : { pageSize: 10 }}
          scroll={{ x: true }} 
        />
      </Card>
      
      <Modal title={editingExpense ? 'Edit Expense' : 'Add a New Expense'} open={isModalOpen} onCancel={handleCancel} onOk={() => form.submit()} okText="Save">
        <Form form={form} layout="vertical" onFinish={handleOk}>
          <Form.Item name="title" label="Title / Description" rules={[{ required: true }]}>
            <Input ref={expenseTitleInputRef} />
          </Form.Item>
          <Form.Item name="amount" label="Amount" rules={[{ required: true }]}>
            <InputNumber style={{ width: '100%' }} prefix={profile?.currency ? `${profile.currency} ` : ''} min={1} />
          </Form.Item>
          <Form.Item name="payment_method" label="Paid From" rules={[{ required: true }]}>
            <Select placeholder="Select Account">
              <Select.OptGroup label="Physical Cash">
                <Select.Option value="Cash">Cash (Counter)</Select.Option>
              </Select.OptGroup>
              <Select.OptGroup label="Banks & Wallets">
                {paymentAccounts.map(acc => (
                  <Select.Option key={acc.id} value={acc.name}>{acc.name}</Select.Option>
                ))}
              </Select.OptGroup>
            </Select>
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