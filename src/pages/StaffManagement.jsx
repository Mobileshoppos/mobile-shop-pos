import React, { useState, useEffect } from 'react';
import { Layout, Flex, Card, Table, Button, Modal, Form, Input, Select, Checkbox, Switch, Typography, App, Space, Popconfirm, Tag, Divider, Alert, theme, Drawer, List, Statistic, DatePicker, Radio, Row, Col, InputNumber, Empty, Tooltip, Tabs, Descriptions, } from 'antd';
import dayjs from 'dayjs'; // Tarikh handle karne ke liye
import { PlusOutlined, EditOutlined, DeleteOutlined, TeamOutlined, InboxOutlined, ReloadOutlined, HistoryOutlined, ArrowLeftOutlined, DollarCircleOutlined, ArrowUpOutlined, ArrowDownOutlined, EyeOutlined } from '@ant-design/icons';
import DataService from '../DataService';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { useAuth } from '../context/AuthContext'; 
import { useNavigate } from 'react-router-dom'; 
import { getPlanLimits } from '../config/subscriptionPlans';
import bcrypt from 'bcryptjs';
import { useTheme } from '../context/ThemeContext'; // Naya Import
import { formatCurrency } from '../utils/currencyFormatter';

const { Sider, Content } = Layout; // <--- YEH LINE BOHOT ZAROORI HAI
const { Title, Text } = Typography;

const permissionOptions = [
  { label: 'View Reports & Dashboard Stats', value: 'can_view_reports' },
  { label: 'Edit or Delete Inventory', value: 'can_edit_inventory' },
  { label: 'Delete Sales / Process Returns', value: 'can_delete_sales' },
  { label: 'Manage Customers & Suppliers', value: 'can_manage_people' }
];

const StaffManagement = () => {
  const { profile } = useAuth(); // <--- Plan check karne ke liye
  const navigate = useNavigate();
  const [staffList, setStaffList] = useState([]);
  const [isViewModalVisible, setIsViewModalVisible] = useState(false); // Naya: View Modal ke liye
  const [showInactive, setShowInactive] = useState(false); // Naya: Inactive staff dekhne ke liye
  const [loading, setLoading] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [form] = Form.useForm();
  const { message } = App.useApp();
  const isMobile = useMediaQuery('(max-width: 768px)');
  const { token } = theme.useToken(); // Theme colors nikaalne ke liye
  const { isDarkMode } = useTheme(); // Dark mode check karne ke liye

  const [activeCount, setActiveCount] = useState(0); 
  
  // --- STAFF LEDGER STATES ---
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false); // Nayi State
  const [editingEntry, setEditingEntry] = useState(null); // Edit mode ke liye
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [ledgerEntries, setLedgerEntries] = useState([]);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [ledgerForm] = Form.useForm();

  const loadStaff = async () => {
    setLoading(true);
    try {
      const data = await DataService.getStaffMembers();
      
      // 1. Hamesha Active staff ki ginti karein (Limit check ke liye)
      const currentActive = data.filter(s => s.is_active !== false).length;
      setActiveCount(currentActive);

      // 2. UI ke liye filter karein
      const filteredData = data.filter(s => {
        if (showInactive) {
          return s.is_active === false;
        } else {
          return s.is_active === true || s.is_active === undefined;
        }
      });
      
      setStaffList(filteredData);
    } catch (error) {
      message.error("Failed to load staff list.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStaff();
  }, [showInactive]);
  const handleOpenLedger = async (staff) => {
    setSelectedStaff(staff);
    // setIsLedgerOpen(true); // Yeh line hum ne hata di hai
    setLedgerLoading(true);
    try {
      const data = await DataService.getStaffLedger(staff.id);
      setLedgerEntries(data);
    } catch (error) {
      message.error("Failed to load ledger.");
    } finally {
      setLedgerLoading(false);
    }
  };

  const handleAddLedgerEntry = async (values) => {
    try {
      const entryData = {
        staff_id: selectedStaff.id,
        user_id: profile.user_id,
        amount: values.amount,
        type: values.type,
        entry_date: values.entry_date.format('YYYY-MM-DD'),
        salary_month: values.type === 'Salary' && values.salary_month ? values.salary_month.format('MMMM YYYY') : null,
        notes: values.notes,
      };

      if (editingEntry) {
        await DataService.updateStaffLedgerEntry(editingEntry.id, entryData);
        message.success("Transaction updated!");
      } else {
        await DataService.addStaffLedgerEntry(entryData);
        message.success("Entry added to ledger!");
      }
      ledgerForm.resetFields();
      ledgerForm.setFieldsValue({ entry_date: dayjs(), type: 'Payment' });
      
      // List refresh karein
      const updatedData = await DataService.getStaffLedger(selectedStaff.id);
      setLedgerEntries(updatedData);
      
      // NAYA: Left list aur top header ko foran update karein taake refresh na karna pare
      await loadStaff();
      const updatedStaff = await DataService.getStaffMembers().then(list => list.find(s => s.id === selectedStaff.id));
      if (updatedStaff) setSelectedStaff(updatedStaff);
    } catch (error) {
      // NAYA: Agar duplicate month ka error aaye to wo dikhayein
      message.error(error.message || "Error saving entry.");
      throw error; // Modal band hone se rokne ke liye
    }
  };

  const handleDeleteEntry = async (id) => {
    try {
      await DataService.deleteStaffLedgerEntry(id);
      message.success("Transaction deleted!");
      const updatedData = await DataService.getStaffLedger(selectedStaff.id);
      setLedgerEntries(updatedData);

      // NAYA: Left list aur top header ko foran update karein taake refresh na karna pare
      await loadStaff();
      const updatedStaff = await DataService.getStaffMembers().then(list => list.find(s => s.id === selectedStaff.id));
      if (updatedStaff) setSelectedStaff(updatedStaff);
    } catch (error) {
      message.error("Failed to delete.");
    }
  };

  const openEditModal = (entry) => {
    setEditingEntry(entry);
    ledgerForm.setFieldsValue({
      type: entry.type,
      amount: entry.amount,
      entry_date: dayjs(entry.entry_date),
      salary_month: entry.salary_month ? dayjs(entry.salary_month, "MMMM YYYY") : null,
      notes: entry.notes
    });
    setIsTransactionModalOpen(true);
  };

  const handleOpenModal = (staff = null) => {
    setEditingStaff(staff);
    if (staff) {
      // Form ko purane data se bhar dein
      const activePermissions = Object.keys(staff.permissions || {}).filter(key => staff.permissions[key]);
      form.setFieldsValue({
        ...staff, // Yeh line Phone, CNIC, Address, Bank sab kuch load kar degi
        pin_code: '', // Security: PIN ko edit karte waqt khali rakhein
        joining_date: staff.joining_date ? dayjs(staff.joining_date) : dayjs(),
        permissions: activePermissions
      });
    } else {
      form.resetFields();
      form.setFieldsValue({ is_active: true, role: 'Salesman', permissions:[], joining_date: dayjs() }); // NAYA: Naye staff ke liye aaj ki tarikh
    }
    setIsModalVisible(true);
  };

  const handleSubmit = async (values) => {
    try {
      // --- NAYE CHECKS (Duplicate Name & PIN) ---
      
      // Sab se pehle database se saara staff mangwayein (taake archived staff bhi check ho sake)
      const allStaff = await DataService.getStaffMembers();

      // 1. Duplicate Name Check
      const isNameDuplicate = allStaff.some(s => 
        s.name.toLowerCase().trim() === values.name.toLowerCase().trim() && 
        s.id !== editingStaff?.id
      );
      if (isNameDuplicate) {
        message.error("This staff name already exists!");
        return;
      }

      // 2. Duplicate PIN Check (Security Check)
      // Agar user ne PIN box mein kuch likha hai, tab hi check karein
      if (values.pin_code) {
        const isPinDuplicate = allStaff.some(s => {
          if (s.id === editingStaff?.id) return false;
          return bcrypt.compareSync(values.pin_code, s.pin_code);
        });

        if (isPinDuplicate) {
          message.error("This PIN is already assigned to another staff member. Please use a unique PIN.");
          return;
        }
      }

      // Permissions array ko object mein convert karein { can_delete_sales: true, ... }
      const permissionsObj = {};
      permissionOptions.forEach(opt => {
        permissionsObj[opt.value] = values.permissions.includes(opt.value);
      });

      const staffData = {
        // NAYA: "...values" likhne se Phone, CNIC, Address, Bank waghera khud hi shamil ho jayenge
        ...values, 
        
        // Jo cheezein special formatting maangti hain, unhein hum neechay override kar rahe hain
        ...(values.pin_code && { pin_code: values.pin_code }),
        salary: values.salary || 0,
        joining_date: values.joining_date ? values.joining_date.format('YYYY-MM-DD') : new Date().toISOString().split('T')[0],
        permissions: permissionsObj
      };
      
      // Faltu cheezein saaf karein (taake database confuse na ho)
      if (!values.pin_code) delete staffData.pin_code;

      if (editingStaff) {
        await DataService.updateStaffMember(editingStaff.id, staffData);
        message.success("Staff updated successfully!");

        // --- LIVE UPDATE FIX ---
        // Agar yehi staff right side par khula hua hai, toh usay foran update karo
        if (selectedStaff && selectedStaff.id === editingStaff.id) {
            setSelectedStaff(prev => ({ ...prev, ...staffData }));
        }
      } else {
        await DataService.addStaffMember(staffData);
        message.success("New staff added successfully!");
      }

      setIsModalVisible(false);
      loadStaff(); // Left side list ko refresh karo
    } catch (error) {
      message.error("Error saving staff data.");
    }
  };

  const handleToggleStatus = async (staff) => {
    // --- SECURITY CHECK: Restore karte waqt limit check ---
    if (!staff.is_active && isLimitReached) {
      message.error(`Cannot restore. Your plan limit (${staffLimit}) is already reached.`);
      return;
    }

    try {
      const newStatus = !staff.is_active;
      await DataService.updateStaffMember(staff.id, { is_active: newStatus });
      message.success(newStatus ? "Staff activated!" : "Staff archived successfully!");
      loadStaff();
    } catch (error) {
      message.error("Error updating staff status.");
    }
  };

  const columns = [
    {
      title: 'Staff Member',
      key: 'staff_info',
      render: (_, record) => (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <div>
            <Text strong style={{ color: 'inherit' }}>{record.name}</Text><br/>
            <Text type="secondary" style={{ fontSize: '11px' }}>{record.role}</Text>
          </div>
          <div style={{ textAlign: 'right' }}>
            <Text 
              strong 
              style={{ color: record.balance > 0 ? token.colorSuccess : record.balance < 0 ? token.colorError : 'inherit' }}
            >
              {formatCurrency(record.balance, profile?.currency)}
            </Text>
          </div>
        </div>
      )
    }
  ];

  // --- SUBSCRIPTION CHECK: FREE PLAN ---
  if (profile?.subscription_tier === 'free') {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center' }}>
        <Card style={{ maxWidth: 500, margin: '0 auto', borderRadius: 12 }}>
          <TeamOutlined style={{ fontSize: 60, color: '#bfbfbf', marginBottom: 20 }} />
          <Title level={3}>Staff Management is Locked</Title>
          <Text type="secondary" style={{ fontSize: 16, display: 'block', marginBottom: 24 }}>
            Staff management is a premium feature available in Growth and Pro plans. 
            Upgrade now to add your team members and manage permissions.
          </Text>
          <Button type="primary" size="large" onClick={() => navigate('/subscription')}>
            View Upgrade Plans
          </Button>
        </Card>
      </div>
    );
  }

  // --- LIMIT CHECK: CONTROL CENTER ---
  const planLimits = getPlanLimits(profile?.subscription_tier);
  const staffLimit = planLimits.max_staff;
  // Ab hum staffList.length nahi balkeh activeCount use karenge
  const isLimitReached = activeCount >= staffLimit;

  return (
    <Layout style={{ background: 'transparent', padding: isMobile ? '12px 4px' : '4px' }}>
      {/* Row selection color fix */}
      <style>{`
        .ant-table-row-selected { background-color: ${isDarkMode ? 'rgba(26, 182, 201, 0.15)' : token.colorMenuSelectedBg} !important; }
        .staff-sider .ant-table-cell { padding: 12px 16px !important; }
      `}</style>
      
      {isMobile && !selectedStaff && (
        <Title level={2} style={{ margin: 0, marginBottom: '16px', marginLeft: '8px', fontSize: '23px' }}>
          <TeamOutlined /> Staff Dashboard
        </Title>
      )}

      {/* Warning Alert: Agar limit cross ho jaye */}
      {activeCount > staffLimit && (
        <Alert
          message="Plan Limit Exceeded"
          description={`Your plan allows ${staffLimit} staff, but you have ${activeCount} active.`}
          type="error"
          showIcon
          style={{ marginBottom: '16px' }}
        />
      )}

      <Layout style={{ background: 'transparent', borderRadius: token.borderRadiusLG, overflow: 'hidden', height: 'calc(100vh - 140px)' }}>
        
        {/* --- LEFT SIDE: STAFF LIST (SIDER) --- */}
        <Sider 
          width={isMobile ? '100%' : 350} 
          style={{ 
            background: token.colorBgContainer, 
            borderRight: `1px solid ${token.colorBorderSecondary}`,
            display: (isMobile && selectedStaff) ? 'none' : 'block' 
          }}
          className="staff-sider"
        >
          <div style={{ padding: '12px', borderBottom: `1px solid ${token.colorBorderSecondary}` }}>
            <Flex gap="small" align="center" justify="space-between">
              <Space>
                <Switch checked={showInactive} onChange={setShowInactive} size="small" />
                <Text type="secondary" style={{ fontSize: '11px' }}>{showInactive ? "Archived" : "Active"}</Text>
              </Space>
              <Button 
                type="primary" 
                size="small" 
                icon={<PlusOutlined />} 
                onClick={() => handleOpenModal()}
                // NAYA: Ab hum sirf limit check karenge. Agar limit full hai to button hamesha band rahega.
                disabled={isLimitReached}
              >
                Add Staff
              </Button>
            </Flex>
          </div>
          <Table 
            columns={columns} 
            dataSource={staffList} 
            rowKey="id" 
            loading={loading}
            pagination={false}
            showHeader={false}
            onRow={(record) => ({
              onClick: () => handleOpenLedger(record),
              style: { cursor: 'pointer' }
            })}
            rowClassName={(record) => record.id === selectedStaff?.id ? 'ant-table-row-selected' : ''}
          />
        </Sider>

        {/* --- RIGHT SIDE: STAFF DETAILS & LEDGER --- */}
        <Layout style={{ background: 'transparent', display: (isMobile && !selectedStaff) ? 'none' : 'block' }}>
          <Content style={{ padding: isMobile ? 0 : '0 24px', overflowY: 'auto' }}>
            {selectedStaff ? (
              <Card>
                {isMobile && (
                  <Button 
                    type="text" 
                    icon={<ArrowLeftOutlined />} 
                    onClick={() => setSelectedStaff(null)} 
                    style={{ marginBottom: 16 }}
                  >
                    Back to List
                  </Button>
                )}
                
                <Flex justify="space-between" align="start" wrap="wrap" gap="small">
                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Title level={2} style={{ margin: 0 }}>{selectedStaff.name}</Title>
                      <Button 
                        type="text"
                        icon={<EyeOutlined style={{ fontSize: '22px', color: '#b8b9baff' }} />} 
                        onClick={() => setIsViewModalVisible(true)}
                        title="View Full Details"
                        style={{ padding: 0, height: 'auto' }}
                      />
                    </div>
                    <Space direction="vertical" size={0}>
                      <Text type="secondary">
                        {selectedStaff.role} | Salary: {formatCurrency(selectedStaff.salary, profile?.currency)}
                        {selectedStaff.joining_date && ` | Joined: ${dayjs(selectedStaff.joining_date).format('DD MMM YYYY')}`}
                      </Text>
                      <Text strong style={{ fontSize: '16px', color: selectedStaff.balance > 0 ? token.colorSuccess : selectedStaff.balance < 0 ? token.colorError : 'inherit' }}>
                        Balance: {formatCurrency(selectedStaff.balance, profile?.currency)}
                      </Text>
                    </Space>
                  </div>
                  <Space wrap>
                    <Button type="primary" icon={<DollarCircleOutlined />} onClick={() => {
                        ledgerForm.resetFields();
                        // NAYA: Modal khulne se pehle hi default amount set kar dein
                        const defaultAmount = selectedStaff.balance > 0 ? selectedStaff.balance : null;
                        ledgerForm.setFieldsValue({ 
                          type: 'Payment', 
                          entry_date: dayjs(),
                          amount: defaultAmount,
                          notes: 'Salary Paid'
                        });
                        setIsTransactionModalOpen(true);
                    }}>
                      Record Transaction
                    </Button>
                    
                    <Button icon={<EditOutlined />} onClick={() => handleOpenModal(selectedStaff)}>Edit</Button>
                    <Popconfirm 
                      title={selectedStaff.is_active ? "Archive this staff?" : "Restore this staff?"} 
                      onConfirm={() => handleToggleStatus(selectedStaff)}
                    >
                      <Button 
                        danger={selectedStaff.is_active} 
                        icon={selectedStaff.is_active ? <InboxOutlined /> : <ReloadOutlined />}
                      >
                        {selectedStaff.is_active ? "Archive" : "Restore"}
                      </Button>
                    </Popconfirm>
                  </Space>
                </Flex>
                
                <Divider />
                
                <div style={{ marginTop: 24 }}>
                  <Title level={4}>Transaction History</Title>
                  <List
                    loading={ledgerLoading}
                    dataSource={ledgerEntries}
                    style={{ background: token.colorBgContainer, borderRadius: 8, border: `1px solid ${token.colorBorderSecondary}` }}
                    renderItem={(item) => {
                      const isCredit = item.type === 'Salary' || item.type === 'Commission';
                      return (
                        <List.Item style={{ padding: '12px 16px' }}>
                          <List.Item.Meta
                            avatar={
                              <div style={{ 
                                background: isCredit ? '#f6ffed' : '#fff1f0', 
                                border: `1px solid ${isCredit ? '#b7eb8f' : '#ffa39e'}`,
                                borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' 
                              }}>
                                {isCredit ? <ArrowUpOutlined style={{ color: '#52c41a' }} /> : <ArrowDownOutlined style={{ color: '#f5222d' }} />}
                              </div>
                            }
                            title={
                              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Text strong>
                                  {item.type === 'Salary' && item.salary_month 
                                    ? `Salary (${item.salary_month})` 
                                    : (item.notes || item.type)}
                                </Text>
                                <Text strong style={{ color: isCredit ? token.colorSuccess : token.colorError }}>
                                  {isCredit ? '+' : '-'} {formatCurrency(item.amount, profile?.currency)}
                                </Text>
                              </div>
                            }
                            description={dayjs(item.entry_date).format('DD MMM YYYY')}
                          />
                          <Space>
                            <Button type="text" size="small" icon={<EditOutlined />} onClick={() => openEditModal(item)} />
                            <Popconfirm title="Delete this entry?" onConfirm={() => handleDeleteEntry(item.id)}>
                              <Button type="text" size="small" danger icon={<DeleteOutlined />} />
                            </Popconfirm>
                          </Space>
                        </List.Item>
                      );
                    }}
                  />
                </div>
              </Card>
            ) : (
              <div style={{ 
                height: '100%', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                background: token.colorBgContainer,
                borderRadius: token.borderRadiusLG
              }}>
                <Empty description="Select a staff member from the list to view their ledger" />
              </div>
            )}
          </Content>
        </Layout>
      </Layout>

      <Modal
        title={editingStaff ? "Edit Staff Member" : "Add New Staff"}
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        onOk={() => form.submit()}
        okText={editingStaff ? "Save Changes" : "Add Staff"}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Tabs defaultActiveKey="1" items={[
            {
              key: '1',
              label: 'Personal Info',
              children: (
                <Row gutter={16}>
                  <Col span={24}>
                    <Form.Item name="name" label="Full Name" rules={[{ required: true, message: 'Please enter staff name' }]}>
                      <Input placeholder="e.g. Ali Raza" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="phone" label="Phone Number" rules={[{ required: true, message: 'Required for contact' }]}>
                      <Input placeholder="0300-1234567" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="cnic" label="CNIC (National ID)" tooltip="Important for security">
                      <Input placeholder="35202-1234567-1" />
                    </Form.Item>
                  </Col>
                  <Col span={24}>
                    <Form.Item name="email" label="Email Address" tooltip="Optional: For recovery or managers">
                      <Input placeholder="ali@example.com" />
                    </Form.Item>
                  </Col>
                  <Col span={24}>
                    <Form.Item name="address" label="Home Address">
                      <Input.TextArea rows={2} placeholder="House #, Street, City..." />
                    </Form.Item>
                  </Col>
                </Row>
              )
            },
            {
              key: '2',
              label: 'Employment & Access',
              children: (
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item name="role" label="Role" rules={[{ required: true }]}>
                      <Select>
                        <Select.Option value="Manager">Manager</Select.Option>
                        <Select.Option value="Salesman">Salesman</Select.Option>
                        <Select.Option value="Cashier">Cashier</Select.Option>
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="salary" label="Monthly Salary" rules={[{ required: true }]}>
                      <InputNumber 
                        style={{ width: '100%' }} 
                        prefix={profile?.currency} 
                        formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                        parser={(v) => v.replace(/,/g, '')}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="joining_date" label="Joining Date" rules={[{ required: true }]}>
                      <DatePicker style={{ width: '100%' }} format="DD MMM YYYY" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item 
                      name="pin_code" 
                      label="Login PIN (4-Digits)" 
                      rules={[
                        { required: !editingStaff, message: 'PIN is required' },
                        { len: 4, message: 'Must be 4 digits' },
                        { pattern: /^[0-9]+$/, message: 'Numbers only' }
                      ]}
                      extra={editingStaff ? "Leave blank to keep current PIN" : ""}
                    >
                      <Input.Password placeholder={editingStaff ? "******" : "1234"} maxLength={4} iconRender={(visible) => (visible ? <EyeOutlined /> : <EyeOutlined />)} />
                    </Form.Item>
                  </Col>
                  <Col span={24}>
                    <Form.Item name="permissions" label="App Permissions">
                      <Checkbox.Group options={permissionOptions} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }} />
                    </Form.Item>
                  </Col>
                  <Col span={24}>
                    <Form.Item name="is_active" label="Account Status" valuePropName="checked">
                      <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
                    </Form.Item>
                  </Col>
                </Row>
              )
            },
            {
              key: '3',
              label: 'Banking Info',
              children: (
                <Row gutter={16}>
                  <Col span={24}>
                    <Form.Item name="bank_name" label="Bank / Wallet Name">
                      <Input placeholder="e.g. Meezan Bank, Easypaisa..." />
                    </Form.Item>
                  </Col>
                  <Col span={24}>
                    <Form.Item name="bank_account_title" label="Account Title">
                      <Input placeholder="Account Holder Name" />
                    </Form.Item>
                  </Col>
                  <Col span={24}>
                    <Form.Item name="bank_account_no" label="Account Number / IBAN">
                      <Input placeholder="PK35 MEZN..." />
                    </Form.Item>
                  </Col>
                </Row>
              )
            }
          ]} />
        </Form>
      </Modal>
      {/* --- TRANSACTION MODAL (SUPPLIER STYLE) --- */}
      <Modal
        title={editingEntry ? "Edit Transaction" : "Record Transaction"}
        open={isTransactionModalOpen}
        onCancel={() => { 
          setIsTransactionModalOpen(false); 
          setEditingEntry(null); 
          ledgerForm.resetFields(); 
        }}
        onOk={() => ledgerForm.submit()}
        okText="Save Entry"
      >
        <Form 
          form={ledgerForm} 
          layout="vertical" 
          onFinish={async (values) => {
            try {
              await handleAddLedgerEntry(values);
              setIsTransactionModalOpen(false); // Sirf tab band karein jab error na ho
            } catch (err) {
              // Error message pehle hi DataService se aa chuka hai
            }
          }}
          initialValues={{ entry_date: dayjs(), type: 'Payment' }}
        >
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item name="type" label="Transaction Type" rules={[{ required: true }]}>
                <Select 
                  onChange={(value) => {
                    // Agar Salary select ho, to base salary auto-fill karein
                    if (value === 'Salary') {
                      ledgerForm.setFieldsValue({ 
                        amount: selectedStaff.salary, 
                        notes: 'Monthly Salary',
                        salary_month: dayjs() // Current month khud select ho jayega
                      });
                    } 
                    // Agar Pay Cash select ho, to dukan ne jo bacha hua balance dena hai wo auto-fill karein
                    else if (value === 'Payment') {
                      ledgerForm.setFieldsValue({
                         amount: selectedStaff.balance > 0 ? selectedStaff.balance : null,
                         notes: 'Salary Paid',
                         salary_month: null
                      });
                    }
                    // Baqi options ke liye amount khali kar dein
                    else {
                      ledgerForm.setFieldsValue({ amount: null, notes: '', salary_month: null });
                    }
                  }}
                >
                  <Select.Option value="Salary">Add Monthly Salary (Credit +)</Select.Option>
                  <Select.Option value="Commission">Bonus / Commission (Credit +)</Select.Option>
                  <Select.Option value="Payment">Pay Cash / Salary Paid (Debit -)</Select.Option>
                  <Select.Option value="Advance">Advance Payment (Debit -)</Select.Option>
                  <Select.Option value="Deduction">Fine / Deduction (Debit -)</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            
            {/* NAYA: Month Picker jo sirf tab dikhega jab type Salary ho */}
            <Form.Item
              noStyle
              shouldUpdate={(prevValues, currentValues) => prevValues.type !== currentValues.type}
            >
              {({ getFieldValue }) =>
                getFieldValue('type') === 'Salary' ? (
                  <Col span={24}>
                    <Form.Item name="salary_month" label="Salary Month" rules={[{ required: true, message: 'Please select the salary month' }]}>
                      <DatePicker picker="month" format="MMMM YYYY" style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>
                ) : null
              }
            </Form.Item>
            <Col span={12}>
              <Form.Item name="amount" label="Amount" rules={[{ required: true }]}>
                <InputNumber style={{ width: '100%' }} min={0} placeholder="0.00" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="entry_date" label="Date" rules={[{ required: true }]}>
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item name="notes" label="Remarks (Optional)">
                <Input placeholder="e.g. Monthly Salary" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
      {/* --- VIEW DETAILS MODAL --- */}
      <Modal
        title={null} 
        open={isViewModalVisible}
        onCancel={() => setIsViewModalVisible(false)}
        footer={[
          <Button key="close" type="primary" onClick={() => setIsViewModalVisible(false)}>
            Close Profile
          </Button>
        ]}
        width={600}
        centered
      >
        <div style={{ padding: '10px 0' }}>
          <div style={{ borderBottom: '2px solid #1890ff', paddingBottom: 15, marginBottom: 25 }}>
            <Title level={3} style={{ margin: 0, color: '#1890ff' }}>
              {selectedStaff?.name?.toUpperCase()}
            </Title>
            <Text type="secondary">{selectedStaff?.role} | Joined: {selectedStaff?.joining_date ? dayjs(selectedStaff.joining_date).format('DD MMM YYYY') : 'N/A'}</Text>
          </div>

          <Row gutter={[32, 24]}>
            <Col span={24}>
              <Divider orientation="left" plain><Text strong type="secondary">PERSONAL INFORMATION</Text></Divider>
              <Descriptions column={2} bordered={false}>
                <Descriptions.Item label={<Text type="secondary">Phone Number</Text>} span={2}>
                  <Text strong>{selectedStaff?.phone || 'N/A'}</Text>
                </Descriptions.Item>
                <Descriptions.Item label={<Text type="secondary">CNIC (ID)</Text>} span={2}>
                  <Text strong>{selectedStaff?.cnic || 'N/A'}</Text>
                </Descriptions.Item>
                <Descriptions.Item label={<Text type="secondary">Email</Text>} span={2}>
                  <Text strong>{selectedStaff?.email || 'N/A'}</Text>
                </Descriptions.Item>
                <Descriptions.Item label={<Text type="secondary">Address</Text>} span={2}>
                  <Text strong>{selectedStaff?.address || 'N/A'}</Text>
                </Descriptions.Item>
              </Descriptions>
            </Col>

            <Col span={24}>
              <div style={{ background: isDarkMode ? 'rgba(255,255,255,0.05)' : '#f5f5f5', padding: '15px', borderRadius: '8px', borderLeft: '4px solid #52c41a' }}>
                <Text strong style={{ display: 'block', marginBottom: 10, color: '#52c41a' }}>BANKING & SALARY</Text>
                <Descriptions column={1} size="small" bordered={false}>
                  <Descriptions.Item label={<Text type="secondary">Monthly Salary</Text>}>
                    <Text strong>{formatCurrency(selectedStaff?.salary || 0, profile?.currency)}</Text>
                  </Descriptions.Item>
                  <Descriptions.Item label={<Text type="secondary">Bank Name</Text>}>
                    <Text strong>{selectedStaff?.bank_name || 'N/A'}</Text>
                  </Descriptions.Item>
                  <Descriptions.Item label={<Text type="secondary">Account Title</Text>}>
                    <Text strong>{selectedStaff?.bank_account_title || 'N/A'}</Text>
                  </Descriptions.Item>
                  <Descriptions.Item label={<Text type="secondary">Account No</Text>}>
                    <Text code style={{ fontSize: '14px' }}>{selectedStaff?.bank_account_no || 'N/A'}</Text>
                  </Descriptions.Item>
                </Descriptions>
              </div>
            </Col>
          </Row>
        </div>
      </Modal>
    </Layout>
  );
};

export default StaffManagement;