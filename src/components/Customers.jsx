// src/components/Customers.jsx (FINAL CORRECTED version with full details for Sales & Returns)

import React, { useState, useEffect, useMemo } from 'react';
import {
  Typography, Table, Button, Modal, Form, Input, App as AntApp, Space, Spin, InputNumber, Card, Descriptions, Checkbox
} from 'antd';
import { UserAddOutlined, EyeOutlined, DollarCircleOutlined, SwapOutlined } from '@ant-design/icons';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';

const { Title, Text } = Typography;

const Customers = () => {
  const { message, modal } = AntApp.useApp();
  const { user } = useAuth();
  
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isLedgerModalOpen, setIsLedgerModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [ledgerData, setLedgerData] = useState([]);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [selectedSale, setSelectedSale] = useState(null);
  const [returnableItems, setReturnableItems] = useState([]);
  const [selectedReturnItems, setSelectedReturnItems] = useState([]);
  const [isReturnSubmitting, setIsReturnSubmitting] = useState(false);
  
  const [addForm] = Form.useForm();
  const [paymentForm] = Form.useForm();
  const [returnForm] = Form.useForm();

  const getCustomers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('customers_with_balance').select('*').order('name', { ascending: true });
      if (error) throw error;
      setCustomers(data);
    } catch (error) { message.error('Error fetching customers: ' + error.message); } 
    finally { setLoading(false); }
  };

  useEffect(() => { if (user) getCustomers(); }, [user]);

  const handleAddCustomer = async (values) => {
    try {
      const { error } = await supabase.from('customers').insert([{ ...values, user_id: user.id }]);
      if (error) throw error;
      message.success('Customer added successfully!');
      setIsAddModalOpen(false);
      addForm.resetFields();
      await getCustomers();
    } catch (error) { message.error('Error adding customer: ' + error.message); }
  };

  const showPaymentModal = (customer) => {
    setSelectedCustomer(customer);
    paymentForm.setFieldsValue({ amount: customer.balance > 0 ? customer.balance : 1 });
    setIsPaymentModalOpen(true);
  };
  const handlePaymentCancel = () => { setIsPaymentModalOpen(false); paymentForm.resetFields(); };
  
  const handleReceivePayment = async (values) => {
    try {
      const { error } = await supabase.from('customer_payments').insert([{ customer_id: selectedCustomer.id, amount_paid: values.amount, user_id: user.id }]);
      if (error) throw error;
      message.success('Payment received successfully!');
      handlePaymentCancel();
      await getCustomers();
      if (isLedgerModalOpen) handleViewLedger(selectedCustomer);
    } catch (error) { message.error('Failed to receive payment: ' + error.message); }
  };
  
  const openReturnModal = async (sale) => {
    try {
      setIsReturnModalOpen(true);
      setSelectedSale(sale);
      const { data: soldItems, error: siError } = await supabase.from('sale_items').select(`id, price_at_sale, product_id, inventory(id, imei, color, ram_rom), products(name)`).eq('sale_id', sale.id);
      if (siError) throw siError;
      const { data: returnedItems, error: riError } = await supabase.rpc('get_returned_items_for_sale', { p_sale_id: sale.id });
      if (riError) throw riError;
      const returnedInvIds = returnedItems.map(item => item.inventory_id);
      const availableItems = soldItems.filter(item => !returnedInvIds.includes(item.inventory.id));
      setReturnableItems(availableItems.map(item => ({ sale_item_id: item.id, inventory_id: item.inventory.id, product_id: item.product_id, product_name: item.products.name, imei: item.inventory.imei, color: item.inventory.color, ram_rom: item.inventory.ram_rom, price_at_sale: item.price_at_sale })));
    } catch (error) { message.error("Error preparing return: " + error.message); setIsReturnModalOpen(false); }
  };
  const handleReturnCancel = () => { setIsReturnModalOpen(false); setSelectedSale(null); setReturnableItems([]); setSelectedReturnItems([]); returnForm.resetFields(); };

  const handleConfirmReturn = async (values) => {
    if (selectedReturnItems.length === 0) { message.warning("Please select at least one item."); return; }
    try {
      setIsReturnSubmitting(true);
      const { data: returnRecord, error: rError } = await supabase.from('sale_returns').insert({ sale_id: selectedSale.id, customer_id: selectedCustomer.id, total_refund_amount: totalRefundAmount, reason: values.reason, user_id: user.id }).select().single();
      if (rError) throw rError;
      const itemsToInsert = returnableItems.filter(i => selectedReturnItems.includes(i.sale_item_id)).map(i => ({ return_id: returnRecord.id, inventory_id: i.inventory_id, product_id: i.product_id, price_at_return: i.price_at_sale, user_id: user.id }));
      const { error: riError } = await supabase.from('sale_return_items').insert(itemsToInsert);
      if (riError) throw riError;
      const { error: creditError } = await supabase.from('customer_payments').insert({ customer_id: selectedCustomer.id, amount_paid: -totalRefundAmount, user_id: user.id, remarks: `Refund for Invoice #${selectedSale.id}` });
      if (creditError) throw creditError;
      message.success(`Return successful! Rs. ${totalRefundAmount.toFixed(2)} credited.`);
      handleReturnCancel();
      await getCustomers();
      handleViewLedger(selectedCustomer);
    } catch (error) { message.error("Failed to process return: " + error.message); } 
    finally { setIsReturnSubmitting(false); }
  };
  
  const totalRefundAmount = useMemo(() => returnableItems.filter(i => selectedReturnItems.includes(i.sale_item_id)).reduce((sum, i) => sum + i.price_at_sale, 0), [selectedReturnItems, returnableItems]);
  
  const handleViewLedger = async (customer) => {
    setSelectedCustomer(customer);
    setIsLedgerModalOpen(true);
    try {
      setLedgerLoading(true);
      const { data: sales, error: sError } = await supabase.from('sales').select(`*, sale_items(*, inventory(*), products(*))`).eq('customer_id', customer.id);
      if (sError) throw sError;
      const { data: payments, error: pError } = await supabase.from('customer_payments').select(`*`).eq('customer_id', customer.id);
      if (pError) throw pError;
      const { data: returns, error: rError } = await supabase.from('sale_returns').select(`*, sale_return_items(*, inventory(*), products(*))`).eq('customer_id', customer.id);
      if(rError) throw rError;

      const salesTx = sales.map(s => ({ type: 'sale', date: s.created_at, description: `Sale (Invoice #${s.id})`, debit: (s.total_amount || 0) - (s.amount_paid_at_sale || 0), credit: 0, details: s }));
      const paymentsTx = payments.map(p => ({ type: p.amount_paid > 0 ? 'payment' : 'return', date: p.created_at, description: p.amount_paid > 0 ? 'Payment Received' : `Return Credit (Ref. Invoice #${p.remarks?.split('#')[1] || ''})`, debit: 0, credit: Math.abs(p.amount_paid), details: { ...p, return_details: returns.find(r => r.sale_id === parseInt(p.remarks?.split('#')[1])) } }));

      const allTx = [...salesTx, ...paymentsTx].sort((a, b) => new Date(a.date) - new Date(b.date));
      let runningBalance = 0;
      const finalLedger = allTx.map(tx => {
        runningBalance += tx.debit - tx.credit;
        return { ...tx, balance: runningBalance, key: `${tx.type}-${tx.details.id}-${tx.date}` };
      });
      setLedgerData(finalLedger.reverse());
    } catch (error) { message.error('Error fetching ledger: ' + error.message); } 
    finally { setLedgerLoading(false); }
  };

  const customerColumns = [ { title: 'Customer Name', dataIndex: 'name' }, { title: 'Phone', dataIndex: 'phone_number' }, { title: 'Balance', dataIndex: 'balance', align: 'right', render: (b) => <Text type={b > 0 ? 'danger' : 'success'}>Rs. {b?.toFixed(2) || '0.00'}</Text> }, { title: 'Actions', key: 'actions', render: (_, record) => (<Space><Button icon={<EyeOutlined />} onClick={() => handleViewLedger(record)}>Ledger</Button><Button icon={<DollarCircleOutlined />} onClick={() => showPaymentModal(record)} disabled={!record.balance || record.balance <= 0}>Pay</Button></Space>) }];
  
  // ====================================================================
  // === THIS IS THE FINAL CORRECTED RENDER FUNCTION FOR EXPANDED ROW ===
  // ====================================================================
  const expandedRowRender = (record) => {
    // Show FULL details for Sales
    if (record.type === 'sale') {
      const saleItemCols = [ { title: 'Product', dataIndex: ['products', 'name'] }, { title: 'Details', render: (_, item) => <Text type="secondary">{item.inventory.imei || `${item.inventory.color || ''} ${item.inventory.ram_rom || ''}`.trim() || 'N/A'}</Text> }, { title: 'Price', dataIndex: 'price_at_sale', align: 'right', render: p => `Rs. ${p.toFixed(2)}` }];
      return (
        <Card size="small" style={{ margin: '8px 0' }}>
          <Descriptions title={`Invoice #${record.details.id} Summary`} bordered size="small" column={1}>
            <Descriptions.Item label="Subtotal">Rs. {(record.details.subtotal || 0).toFixed(2)}</Descriptions.Item>
            <Descriptions.Item label="Discount">- Rs. {(record.details.discount || 0).toFixed(2)}</Descriptions.Item>
            <Descriptions.Item label="Grand Total"><strong>Rs. {(record.details.total_amount || 0).toFixed(2)}</strong></Descriptions.Item>
            <Descriptions.Item label="Amount Paid at Sale">Rs. {(record.details.amount_paid_at_sale || 0).toFixed(2)}</Descriptions.Item>
            <Descriptions.Item label="New Udhaar from this Sale"><strong>Rs. {record.debit.toFixed(2)}</strong></Descriptions.Item>
          </Descriptions>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px'}}>
            <Title level={5} style={{ margin: 0 }}>Items in this Invoice</Title>
            <Button icon={<SwapOutlined />} type="primary" ghost onClick={() => openReturnModal(record.details)}>Return Items</Button>
          </div>
          <Table columns={saleItemCols} dataSource={record.details.sale_items} pagination={false} rowKey="id" style={{marginTop: '8px'}} />
        </Card>
      );
    }
    // Show FULL details for Returns
    if (record.type === 'return') {
      const returnDetails = record.details.return_details;
      if (!returnDetails) return <Text type="secondary">Details not available.</Text>; // Safety check

      const returnItemCols = [ { title: 'Product', dataIndex: ['products', 'name'] }, { title: 'Details', render: (_, item) => <Text type="secondary">{item.inventory.imei || `${item.inventory.color || ''} ${item.inventory.ram_rom || ''}`.trim() || 'N/A'}</Text> }, { title: 'Returned Price', dataIndex: 'price_at_return', align: 'right', render: p => `Rs. ${p.toFixed(2)}` }];
      return (
        <Card size="small" style={{ margin: '8px 0' }}>
          <Descriptions title={`Return Details`} bordered size="small" column={1}>
            <Descriptions.Item label="Reason for Return">{returnDetails.reason || <Text type="secondary">No reason provided.</Text>}</Descriptions.Item>
            <Descriptions.Item label="Total Credit Amount"><strong>Rs. {record.credit.toFixed(2)}</strong></Descriptions.Item>
          </Descriptions>
          <Title level={5} style={{ marginTop: '16px' }}>Items Returned in this Transaction</Title>
          <Table columns={returnItemCols} dataSource={returnDetails.sale_return_items} pagination={false} rowKey="id" style={{marginTop: '8px'}}/>
        </Card>
      );
    }
    return null;
  };
  
  return (<> <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}> <Title level={2} style={{ margin: 0 }}>Customer Management</Title> <Button type="primary" icon={<UserAddOutlined />} size="large" onClick={() => setIsAddModalOpen(true)}>Add Customer</Button> </div> <Table columns={customerColumns} dataSource={customers} loading={loading} rowKey="id" /> <Modal title="Add New Customer" open={isAddModalOpen} onCancel={() => setIsAddModalOpen(false)} onOk={() => addForm.submit()} okText="Save"> <Form form={addForm} layout="vertical" onFinish={handleAddCustomer}><Form.Item name="name" label="Full Name" rules={[{ required: true }]}><Input /></Form.Item><Form.Item name="phone_number" label="Phone" rules={[{ required: true }]}><Input /></Form.Item><Form.Item name="address" label="Address"><Input.TextArea /></Form.Item></Form> </Modal> <Modal title={`Ledger: ${selectedCustomer?.name}`} open={isLedgerModalOpen} onCancel={() => setIsLedgerModalOpen(false)} footer={null} width={1000}> {ledgerLoading ? <Spin /> : <Table dataSource={ledgerData} rowKey="key" expandable={{ expandedRowRender, rowExpandable: (record) => record.type === 'sale' || record.type === 'return' }} columns={[{ title: 'Date', dataIndex: 'date', render: d => new Date(d).toLocaleString() }, { title: 'Description', dataIndex: 'description' }, { title: 'Debit', dataIndex: 'debit', align: 'right', render: a => a > 0 ? <Text>Rs. {a.toFixed(2)}</Text> : '-' }, { title: 'Credit', dataIndex: 'credit', align: 'right', render: a => a > 0 ? <Text type="success">Rs. {a.toFixed(2)}</Text> : '-' }, { title: 'Balance', dataIndex: 'balance', align: 'right', render: a => <Text strong>Rs. {a.toFixed(2)}</Text> }]} />} </Modal> <Modal title={`Payment from: ${selectedCustomer?.name}`} open={isPaymentModalOpen} onCancel={handlePaymentCancel} onOk={() => paymentForm.submit()} okText="Confirm Payment"> <Title level={5}>Balance: <Text type="danger">Rs. {selectedCustomer?.balance?.toFixed(2) || '0.00'}</Text></Title> <Form form={paymentForm} layout="vertical" onFinish={handleReceivePayment}><Form.Item name="amount" label="Amount Received" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} prefix="Rs." min={1} max={selectedCustomer?.balance} /></Form.Item></Form> </Modal> <Modal title={`Return for Invoice #${selectedSale?.id}`} open={isReturnModalOpen} onCancel={handleReturnCancel} onOk={() => returnForm.submit()} okText="Confirm Return" confirmLoading={isReturnSubmitting} okButtonProps={{ disabled: selectedReturnItems.length === 0 }}> <Checkbox.Group style={{ width: '100%' }} value={selectedReturnItems} onChange={setSelectedReturnItems}> <div style={{ maxHeight: '30vh', overflowY: 'auto' }}> {returnableItems.length > 0 ? returnableItems.map(item => (<Card size="small" key={item.sale_item_id} style={{ marginBottom: '8px' }}><Checkbox value={item.sale_item_id}><Space><Text strong>{item.product_name}</Text><Text type="secondary">({item.imei || 'Item'})</Text>-<Text>Rs. {item.price_at_sale.toFixed(2)}</Text></Space></Checkbox></Card>)) : <Text type="secondary">No items available.</Text>} </div> </Checkbox.Group> <Form form={returnForm} layout="vertical" onFinish={handleConfirmReturn} style={{ marginTop: '24px' }}> <Form.Item name="reason" label="Reason for Return"><Input.TextArea /></Form.Item> </Form> <Descriptions bordered><Descriptions.Item label="Total Credit"><Title level={4} style={{margin:0, color: '#52c41a'}}>Rs. {totalRefundAmount.toFixed(2)}</Title></Descriptions.Item></Descriptions> </Modal> </> );
};

export default Customers;