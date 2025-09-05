import React, { useState, useEffect } from 'react';
import {
  Typography, Table, Button, Modal, Form, Input, App as AntApp, Space, Spin, InputNumber, Card, Descriptions
} from 'antd';
import { UserAddOutlined, EyeOutlined, DollarCircleOutlined } from '@ant-design/icons';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext'; // Step 1: Import karein

const { Title, Text } = Typography;

const Customers = () => {
  const { message } = AntApp.useApp();
  const { user } = useAuth(); // Step 2: User ki maloomat hasil karein
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addForm] = Form.useForm();
  const [isLedgerModalOpen, setIsLedgerModalOpen] = useState(false);
  const [ledgerData, setLedgerData] = useState([]);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentForm] = Form.useForm();

  const getCustomers = async () => {
    try {
      setLoading(true);
      let { data, error } = await supabase.from('customers_with_balance').select('*').order('name', { ascending: true });
      if (error) throw error;
      setCustomers(data);
    } catch (error) {
      message.error('Error fetching customers: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) { // Yeh check karein ke user login hai
      getCustomers();
    }
  }, [user]);

  const handleAddCustomer = async (values) => {
    try {
      const { error } = await supabase.from('customers').insert([
        { 
          name: values.name, 
          phone_number: values.phone_number, 
          address: values.address,
          user_id: user.id // Step 3: User ID shamil karein
        }
      ]);
      if (error) throw error;
      message.success('Customer added successfully!');
      setIsAddModalOpen(false);
      addForm.resetFields();
      getCustomers();
    } catch (error) {
      message.error('Error adding customer: ' + error.message);
    }
  };

  const handleViewLedger = async (customer) => {
    // ... (Is function mein koi tabdeeli nahi)
    setSelectedCustomer(customer);
    setIsLedgerModalOpen(true);
    try {
      setLedgerLoading(true);
      const { data: salesData, error: salesError } = await supabase.from('sales').select(`id, created_at, total_amount, subtotal, discount, amount_paid_at_sale, sale_items ( quantity, price_at_sale, products ( name, brand ) )`).eq('customer_id', customer.id);
      if (salesError) throw salesError;
      const { data: paymentsData, error: paymentsError } = await supabase.from('customer_payments').select('id, created_at, amount_paid').eq('customer_id', customer.id);
      if (paymentsError) throw paymentsError;
      const salesTransactions = salesData.map(sale => {
        const newUdhaar = (sale.total_amount || 0) - (sale.amount_paid_at_sale || 0);
        return { date: sale.created_at, description: `Sale (Invoice #${sale.id})`, debit: newUdhaar > 0 ? newUdhaar : 0, credit: 0, type: 'sale', ...sale };
      });
      const paymentTransactions = paymentsData.map(payment => ({ date: payment.created_at, description: 'Payment Received', debit: 0, credit: payment.amount_paid, type: 'payment', id: payment.id }));
      const allTransactions = [...salesTransactions, ...paymentTransactions].sort((a, b) => new Date(a.date) - new Date(b.date));
      let runningBalance = 0;
      const finalLedger = allTransactions.map(tx => {
        runningBalance = runningBalance + tx.debit - tx.credit;
        return { ...tx, balance: runningBalance, key: `${tx.type}-${tx.id}-${tx.date}` };
      });
      setLedgerData(finalLedger.reverse());
    } catch (error) {
      message.error('Error fetching ledger: ' + error.message);
    } finally {
      setLedgerLoading(false);
    }
  };

  const showPaymentModal = (customer) => {
    setSelectedCustomer(customer);
    setIsPaymentModalOpen(true);
  };

  const handlePaymentCancel = () => {
    setIsPaymentModalOpen(false);
    paymentForm.resetFields();
  };

  const handleReceivePayment = async (values) => {
    try {
      const { error: paymentError } = await supabase.from('customer_payments').insert([
        { 
          customer_id: selectedCustomer.id, 
          amount_paid: values.amount,
          user_id: user.id // Step 3: User ID shamil karein
        }
      ]);
      if (paymentError) throw paymentError;
      message.success('Payment received successfully!');
      setIsPaymentModalOpen(false);
      paymentForm.resetFields();
      getCustomers();
      if (isLedgerModalOpen) {
        handleViewLedger(selectedCustomer);
      }
    } catch (error) {
      message.error('Failed to receive payment: ' + error.message);
    }
  };

  const columns = [
    { title: 'Customer Name', dataIndex: 'name', key: 'name' },
    { title: 'Phone Number', dataIndex: 'phone_number', key: 'phone_number' },
    { title: 'Address', dataIndex: 'address', key: 'address' },
    { title: 'Balance (Udhaar)', dataIndex: 'balance', key: 'balance', align: 'right', render: (balance) => <Text type={balance > 0 ? 'danger' : 'success'}>Rs. {balance ? balance.toFixed(2) : '0.00'}</Text> },
    { title: 'Actions', key: 'actions', render: (text, record) => (<Space><Button icon={<EyeOutlined />} onClick={() => handleViewLedger(record)}>Ledger</Button><Button icon={<DollarCircleOutlined />} onClick={() => showPaymentModal(record)} disabled={!record.balance || record.balance <= 0}>Receive Payment</Button></Space>) }
  ];
  
  const expandedRowRender = (record) => {
    // ... (Is function mein koi tabdeeli nahi)
    if (record.type !== 'sale') return null;
    const itemColumns = [
      { title: 'Product Name', dataIndex: 'name', key: 'name' },
      { title: 'Brand', dataIndex: 'brand', key: 'brand' },
      { title: 'Quantity', dataIndex: 'quantity', key: 'quantity', align: 'right' },
      { title: 'Price', dataIndex: 'price', key: 'price', align: 'right', render: (price) => `Rs. ${price.toFixed(2)}` },
      { title: 'Subtotal', key: 'subtotal', align: 'right', render: (item) => `Rs. ${(item.quantity * item.price).toFixed(2)}` },
    ];
    const itemsDataSource = record.sale_items?.map(item => ({ name: item.products.name, brand: item.products.brand, quantity: item.quantity, price: item.price_at_sale })) || [];
    return (
      <Card size="small" style={{ margin: '8px 0', backgroundColor: '#2c2c2c' }}>
        <Descriptions title={`Invoice #${record.id} Summary`} bordered size="small" column={1}>
          <Descriptions.Item label="Subtotal">Rs. {(record.subtotal || 0).toFixed(2)}</Descriptions.Item>
          <Descriptions.Item label="Discount">- Rs. {(record.discount || 0).toFixed(2)}</Descriptions.Item>
          <Descriptions.Item label="Grand Total"><strong>Rs. {(record.total_amount || 0).toFixed(2)}</strong></Descriptions.Item>
          <Descriptions.Item label="Amount Paid at Sale">Rs. {(record.amount_paid_at_sale || 0).toFixed(2)}</Descriptions.Item>
          <Descriptions.Item label="New Udhaar from this Sale"><strong>Rs. {record.debit.toFixed(2)}</strong></Descriptions.Item>
        </Descriptions>
        <Title level={5} style={{ marginTop: '16px' }}>Items in this Invoice</Title>
        <Table columns={itemColumns} dataSource={itemsDataSource} pagination={false} rowKey="name" />
      </Card>
    );
  };

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <Title level={2} style={{ margin: 0, color: 'white' }}>Customer Management</Title>
        <Button 
          type="primary" 
          icon={<UserAddOutlined />} 
          size="large" 
          onClick={() => setIsAddModalOpen(true)}
        >
          Add New Customer
        </Button>
      </div>
      <Table columns={columns} dataSource={customers} loading={loading} rowKey="id" scroll={{ y: '65vh' }} />

      <Modal 
        title="Add a New Customer" 
        open={isAddModalOpen} 
        onCancel={() => setIsAddModalOpen(false)} 
        onOk={() => addForm.submit()} 
        okText="Save Customer"
      >
        <Form form={addForm} layout="vertical" onFinish={handleAddCustomer}>
          <Form.Item name="name" label="Full Name" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="phone_number" label="Phone Number" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="address" label="Address (Optional)"><Input.TextArea rows={3} /></Form.Item>
        </Form>
      </Modal>
      
      <Modal title={`Account Ledger for: ${selectedCustomer?.name}`} open={isLedgerModalOpen} onCancel={() => setIsLedgerModalOpen(false)} footer={null} width={800}>
        {ledgerLoading ? <div style={{ textAlign: 'center', padding: '48px' }}><Spin size="large" /></div> :
          <Table dataSource={ledgerData} rowKey="key" pagination={{ pageSize: 10 }} expandable={{ expandedRowRender, expandRowByClick: true }} columns={[{ title: 'Date', dataIndex: 'date', key: 'date', render: (date) => new Date(date).toLocaleString() }, { title: 'Description', dataIndex: 'description', key: 'description' }, { title: 'Debit (Udhaar)', dataIndex: 'debit', key: 'debit', align: 'right', render: (amount) => amount > 0 ? `Rs. ${amount.toFixed(2)}` : '-' }, { title: 'Credit (Wusooli)', dataIndex: 'credit', key: 'credit', align: 'right', render: (amount) => amount > 0 ? `Rs. ${amount.toFixed(2)}` : '-' }, { title: 'Balance', dataIndex: 'balance', key: 'balance', align: 'right', render: (amount) => `Rs. ${amount.toFixed(2)}` }]} />
        }
      </Modal>
      
      <Modal title={`Receive Payment from: ${selectedCustomer?.name}`} open={isPaymentModalOpen} onCancel={handlePaymentCancel} onOk={() => paymentForm.submit()} okText="Confirm Payment">
        <Title level={5}>Current Balance: <Text type="danger">Rs. {selectedCustomer?.balance ? selectedCustomer.balance.toFixed(2) : '0.00'}</Text></Title>
        <Form form={paymentForm} layout="vertical" onFinish={handleReceivePayment}><Form.Item name="amount" label="Amount Received" rules={[{ required: true, message: 'Please enter the amount!' }]}><InputNumber style={{ width: '100%' }} prefix="Rs." min={1} max={selectedCustomer?.balance} /></Form.Item></Form>
      </Modal>
    </>
  );
};

export default Customers;