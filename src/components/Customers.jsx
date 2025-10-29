import React, { useState, useEffect, useMemo } from 'react';
import {
  Typography, Table, Button, Modal, Form, Input, App as AntApp, Space, Spin, InputNumber, Card, Descriptions, Checkbox, List, Row, Col
} from 'antd';
import { UserAddOutlined, EyeOutlined, DollarCircleOutlined, SwapOutlined } from '@ant-design/icons';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { useMediaQuery } from '../hooks/useMediaQuery';

const { Title, Text } = Typography;

const Customers = () => {
  const { message, modal } = AntApp.useApp();
  const isMobile = useMediaQuery('(max-width: 768px)');
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
  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);
  const [payoutForm] = Form.useForm();
  
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

  // >> YEH TEEN NAYE FUNCTIONS PASTE KAREIN <<

  // Yeh function "Settle Credit" ka popup kholega
  const showPayoutModal = (customer) => {
    setSelectedCustomer(customer);
    // Math.abs() negative number ko positive bana deta hai
    payoutForm.setFieldsValue({ amount: Math.abs(customer.balance) });
    setIsPayoutModalOpen(true);
  };

  // Yeh function popup ko cancel karega
  const handlePayoutCancel = () => {
    setIsPayoutModalOpen(false);
    payoutForm.resetFields();
  };

  // Yeh function form submit hone par data save karega
  const handleConfirmPayout = async (values) => {
    try {
      const { error } = await supabase.from('credit_payouts').insert([
        { 
          customer_id: selectedCustomer.id, 
          amount_paid: values.amount, 
          remarks: values.remarks,
          user_id: user.id 
        }
      ]);
      if (error) throw error;
      message.success('Credit settled successfully!');
      handlePayoutCancel();
      await getCustomers();
      if (isLedgerModalOpen) handleViewLedger(selectedCustomer);
    } catch (error) {
      message.error('Failed to settle credit: ' + error.message);
    }
  };
  
  const openReturnModal = async (sale) => {
    try {
      setIsReturnModalOpen(true);
      setSelectedSale(sale);
      // BUG FIX: 'color', 'ram_rom' ki jagah 'item_attributes' manga gaya hai
      const { data: soldItems, error: siError } = await supabase
        .from('sale_items')
        .select(`id, price_at_sale, product_id, inventory(id, imei, item_attributes), products(name)`)
        .eq('sale_id', sale.id);

      if (siError) throw siError;
      
      const { data: returnedItems, error: riError } = await supabase.rpc('get_returned_items_for_sale', { p_sale_id: sale.id });
      if (riError) throw riError;

      const returnedInvIds = returnedItems.map(item => item.inventory_id);
      const availableItems = soldItems.filter(item => item.inventory && !returnedInvIds.includes(item.inventory.id));
      
      // BUG FIX: item_attributes ko data mein shamil kiya gaya hai
      setReturnableItems(availableItems.map(item => ({
        sale_item_id: item.id,
        inventory_id: item.inventory.id,
        product_id: item.product_id,
        product_name: item.products.name,
        imei: item.inventory.imei,
        item_attributes: item.inventory.item_attributes, // Naya data
        price_at_sale: item.price_at_sale
      })));

    } catch (error) {
      message.error("Error preparing return: " + error.message);
      setIsReturnModalOpen(false);
    }
  };
  const handleReturnCancel = () => { setIsReturnModalOpen(false); setSelectedSale(null); setReturnableItems([]); setSelectedReturnItems([]); returnForm.resetFields(); };

  const handleConfirmReturn = async (values) => {

    if (selectedReturnItems.length === 0) {
      message.warning("Please select at least one item.");
      return;
    }

    if (!user || !user.id) {
      message.error("User session is invalid. Please log in again.");
      return;
    }

    try {
      setIsReturnSubmitting(true);
      
      const { data: returnRecord, error: rError } = await supabase
        .from('sale_returns')
        .insert({
          sale_id: selectedSale.id,
          customer_id: selectedCustomer.id,
          total_refund_amount: totalRefundAmount,
          reason: values.reason,
          user_id: user.id 
        })
        .select()
        .single();

      if (rError) throw rError;

      const itemsToInsert = returnableItems
        .filter(i => selectedReturnItems.includes(i.sale_item_id))
        .map(i => ({
          return_id: returnRecord.id,
          inventory_id: i.inventory_id,
          product_id: i.product_id,
          price_at_return: i.price_at_sale
        }));
      
      const { error: riError } = await supabase.from('sale_return_items').insert(itemsToInsert);
      if (riError) throw riError;

      const { error: creditError } = await supabase.from('customer_payments').insert({
        customer_id: selectedCustomer.id,
        amount_paid: -totalRefundAmount,
        user_id: user.id,
        remarks: `Refund for Invoice #${selectedSale.id}`
      });
      if (creditError) throw creditError;

      message.success(`Return successful! Rs. ${totalRefundAmount.toFixed(2)} credited.`);
      handleReturnCancel();
      await getCustomers();
      handleViewLedger(selectedCustomer);

    } catch (error) {
      message.error("Failed to process return: " + error.message);
    } finally {
      setIsReturnSubmitting(false);
    }
  };
  
  const totalRefundAmount = useMemo(() => returnableItems.filter(i => selectedReturnItems.includes(i.sale_item_id)).reduce((sum, i) => sum + i.price_at_sale, 0), [selectedReturnItems, returnableItems]);
  
  // Purana 'handleViewLedger' function delete kar ke yeh naya function paste karein

const handleViewLedger = async (customer) => {
    setSelectedCustomer(customer);
    setIsLedgerModalOpen(true);
    try {
        setLedgerLoading(true);

        // Step 1: Purana data haasil karein (sales, payments, returns)
        const { data: sales, error: sError } = await supabase.from('sales').select(`*, sale_items(*, inventory(*), products(*))`).eq('customer_id', customer.id);
        if (sError) throw sError;
        const { data: payments, error: pError } = await supabase.from('customer_payments').select(`*`).eq('customer_id', customer.id);
        if (pError) throw pError;
        const { data: returns, error: rError } = await supabase.from('sale_returns').select(`*, sale_return_items(*, inventory(*), products(*))`).eq('customer_id', customer.id);
        if(rError) throw rError;

        // --- NAYA STEP: Payouts ka data bhi haasil karein ---
        const { data: payouts, error: poError } = await supabase.from('credit_payouts').select('*').eq('customer_id', customer.id);
        if (poError) throw poError;

        // Step 2: Data ko aam transactions mein tabdeel karein
        const salesTx = sales.map(s => ({ type: 'sale', date: s.created_at, description: `Sale (Invoice #${s.id})`, debit: (s.total_amount || 0) - (s.amount_paid_at_sale || 0), credit: 0, details: s }));
        const paymentsTx = payments.map(p => ({ type: p.amount_paid > 0 ? 'payment' : 'return', date: p.created_at, description: p.amount_paid > 0 ? 'Payment Received' : `Return Credit (Ref. Invoice #${p.remarks?.split('#')[1] || ''})`, debit: 0, credit: Math.abs(p.amount_paid), details: { ...p, return_details: returns.find(r => r.sale_id === parseInt(p.remarks?.split('#')[1])) } }));
        
        // --- NAYA STEP: Payouts ko bhi transactions banayein ---
        const payoutsTx = payouts.map(p => ({ type: 'payout', date: p.created_at, description: 'Credit Payout', debit: p.amount_paid, credit: 0, details: p }));

        // Step 3: Tamam transactions ko milayein aur date ke hisab se sort karein
        const allTx = [...salesTx, ...paymentsTx, ...payoutsTx].sort((a, b) => new Date(a.date) - new Date(b.date));
        
        // Step 4: Running balance calculate karein
        let runningBalance = 0;
        const finalLedger = allTx.map(tx => {
            runningBalance += tx.debit - tx.credit;
            return { ...tx, balance: runningBalance, key: `${tx.type}-${tx.details.id}-${tx.date}` };
        });

        setLedgerData(finalLedger.reverse());

    } catch (error) {
        message.error('Error fetching ledger: ' + error.message);
    } finally {
        setLedgerLoading(false);
    }
};

  const customerColumns = [
    { title: 'Customer Name', dataIndex: 'name' },
    { title: 'Phone', dataIndex: 'phone_number' },
    { title: 'Address', dataIndex: 'address', render: (address) => address || <Text type="secondary">N/A</Text> },
    { title: 'Balance', dataIndex: 'balance', align: 'right', render: (b) => <Text type={b > 0 ? 'danger' : 'success'}>Rs. {b?.toFixed(2) || '0.00'}</Text> },
    // Is hisse ko dhoond kar replace karein
    { 
      title: 'Actions', 
      key: 'actions', 
      render: (_, record) => (
        <Space>
          <Button icon={<EyeOutlined />} onClick={() => handleViewLedger(record)}>Ledger</Button>
          
          {/* --- NAYA CONDITIONAL LOGIC --- */}
          {record.balance > 0 ? (
            <Button icon={<DollarCircleOutlined />} onClick={() => showPaymentModal(record)}>
              Payment receive
            </Button>
          ) : record.balance < 0 ? (
            <Button type="primary" ghost icon={<DollarCircleOutlined />} onClick={() => showPayoutModal(record)}>
              Settle Credit
            </Button>
          ) : null}

        </Space>
      ) 
    }
];
  
  const expandedRowRender = (record) => {
    const renderItemDetails = (_, item) => {
      if (!item.inventory) return <Text type="secondary">N/A</Text>;
      
      const attributes = Object.entries(item.inventory.item_attributes || {})
        .filter(([key]) => !key.toLowerCase().includes('imei') && !key.toLowerCase().includes('serial'))
        .map(([, value]) => value) // Sirf value hasil karein
        .join(' ');

      // Ab dedicated imei field ko saaf attributes ke saath jorein
      const details = [item.inventory.imei, attributes].filter(Boolean).join(' / ');
      
      return <Text type="secondary">{details || 'N/A'}</Text>;
    };

    if (record.type === 'sale') {
      const saleItemCols = [
        { title: 'Product', dataIndex: ['products', 'name'] },
        { title: 'Details', render: renderItemDetails },
        { title: 'Price', dataIndex: 'price_at_sale', align: 'right', render: p => `Rs. ${p.toFixed(2)}` }
      ];
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
    if (record.type === 'return') {
      const returnDetails = record.details.return_details;
      if (!returnDetails) return <Text type="secondary">Details not available.</Text>;

      const returnItemCols = [
        { title: 'Product', dataIndex: ['products', 'name'] },
        { title: 'Details', render: renderItemDetails },
        { title: 'Returned Price', dataIndex: 'price_at_return', align: 'right', render: p => `Rs. ${p.toFixed(2)}` }
      ];
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
  
  return (<> <div style={{
    display: 'flex',
    flexDirection: isMobile ? 'column' : 'row',
    justifyContent: 'space-between',
    alignItems: isMobile ? 'flex-start' : 'center',
    marginBottom: '24px'
}}>
    <Title level={2} style={{ margin: 0, marginBottom: isMobile ? '16px' : '0' }}>
        Customer Management
    </Title>
    <Button
        type="primary"
        icon={<UserAddOutlined />}
        size="large"
        onClick={() => setIsAddModalOpen(true)}
        style={{ width: isMobile ? '100%' : 'auto' }}
    >
        Add Customer
    </Button>
</div> {isMobile ? (
    <List
        loading={loading}
        dataSource={customers}
        renderItem={(customer) => (
        <List.Item style={{ padding: '0 0 16px 0' }}>
            <Card style={{ width: '100%' }} styles={{ body: { padding: '16px' } }}>
            <Row justify="space-between" align="top">
                <Col>
    <Text strong style={{ fontSize: '16px' }}>{customer.name}</Text><br/>
    <Text type="secondary">{customer.phone_number}</Text><br/>
    {/* --- Nayi Line Shamil Ki Gayi Hai --- */}
    {customer.address && <Text type="secondary">{customer.address}</Text>}
</Col>
                <Col style={{ textAlign: 'right' }}>
                <Text type="secondary">Balance</Text><br/>
                <Text type={customer.balance > 0 ? 'danger' : 'success'} strong style={{ fontSize: '16px' }}>
                    Rs. {customer.balance?.toFixed(2) || '0.00'}
                </Text>
                </Col>
            </Row>
            <div style={{ borderTop: '1px solid #f0f0f0', marginTop: '12px', paddingTop: '12px' }}>
                <Space style={{ width: '100%' }}>
                  <Button icon={<EyeOutlined />} onClick={() => handleViewLedger(customer)} style={{ flex: 1 }}>Ledger</Button>
                  
                  {customer.balance > 0 ? (
                    <Button icon={<DollarCircleOutlined />} onClick={() => showPaymentModal(customer)} style={{ flex: 1 }}>
                      Payment receive
                    </Button>
                  ) : customer.balance < 0 ? (
                    <Button type="primary" ghost icon={<DollarCircleOutlined />} onClick={() => showPayoutModal(customer)} style={{ flex: 1 }}>
                      Settle Credit
                    </Button>
                  ) : null}

                </Space>
            </div>
            </Card>
        </List.Item>
        )}
    />
    ) : (
    <Table columns={customerColumns} dataSource={customers} loading={loading} rowKey="id" />
)} <Modal title="Add New Customer" open={isAddModalOpen} onCancel={() => setIsAddModalOpen(false)} onOk={() => addForm.submit()} okText="Save"> <Form form={addForm} layout="vertical" onFinish={handleAddCustomer}><Form.Item name="name" label="Full Name" rules={[{ required: true }]}><Input /></Form.Item><Form.Item name="phone_number" label="Phone" rules={[{ required: true }]}><Input /></Form.Item><Form.Item name="address" label="Address"><Input.TextArea /></Form.Item></Form> </Modal> <Modal
    title={`Ledger: ${selectedCustomer?.name}`}
    open={isLedgerModalOpen}
    onCancel={() => setIsLedgerModalOpen(false)}
    footer={null}
    width={isMobile ? '95vw' : 1000}
>
    {ledgerLoading ? <div style={{ textAlign: 'center', padding: '50px' }}><Spin /></div> : (
        isMobile ? (
            <List
                dataSource={ledgerData}
                rowKey="key"
                renderItem={(record) => (
                    <List.Item style={{ padding: '8px 0' }}>
                        <Card style={{ width: '100%' }} styles={{ body: { padding: '12px' } }}>
                            <Row justify="space-between">
                                <Col span={16}>
                                    <Text strong>{record.description}</Text><br/>
                                    <Text type="secondary">{new Date(record.date).toLocaleString()}</Text>
                                </Col>
                                <Col span={8} style={{ textAlign: 'right' }}>
                                    {record.debit > 0 && <Text type="danger">- Rs. {record.debit.toFixed(2)}</Text>}
                                    {record.credit > 0 && <Text type="success">+ Rs. {record.credit.toFixed(2)}</Text>}
                                </Col>
                            </Row>
                            <div style={{ textAlign: 'right', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #f0f0f0' }}>
                                <Text type="secondary">Balance: </Text>
                                <Text strong>Rs. {record.balance.toFixed(2)}</Text>
                            </div>
                            {(record.type === 'sale' || record.type === 'return') && (
                                <div style={{ marginTop: '10px' }}>
                                    {expandedRowRender(record)}
                                </div>
                            )}
                        </Card>
                    </List.Item>
                )}
            />
        ) : (
            <Table
                dataSource={ledgerData}
                rowKey="key"
                expandable={{ expandedRowRender, rowExpandable: (record) => record.type === 'sale' || record.type === 'return' }}
                columns={[
                    { title: 'Date', dataIndex: 'date', render: d => new Date(d).toLocaleString() },
                    { title: 'Description', dataIndex: 'description' },
                    { title: 'Debit', dataIndex: 'debit', align: 'right', render: a => a > 0 ? <Text>Rs. {a.toFixed(2)}</Text> : '-' },
                    { title: 'Credit', dataIndex: 'credit', align: 'right', render: a => a > 0 ? <Text type="success">Rs. {a.toFixed(2)}</Text> : '-' },
                    { title: 'Balance', dataIndex: 'balance', align: 'right', render: a => <Text strong>Rs. {a.toFixed(2)}</Text> }
                ]}
            />
        )
    )}
</Modal> <Modal title={`Payment from: ${selectedCustomer?.name}`} open={isPaymentModalOpen} onCancel={handlePaymentCancel} onOk={() => paymentForm.submit()} okText="Confirm Payment"> <Title level={5}>Balance: <Text type="danger">Rs. {selectedCustomer?.balance?.toFixed(2) || '0.00'}</Text></Title> <Form form={paymentForm} layout="vertical" onFinish={handleReceivePayment}><Form.Item name="amount" label="Amount Received" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} prefix="Rs." min={1} max={selectedCustomer?.balance} /></Form.Item></Form> </Modal> <Modal title={`Return for Invoice #${selectedSale?.id}`} open={isReturnModalOpen} onCancel={handleReturnCancel} onOk={() => returnForm.submit()} okText="Confirm Return" confirmLoading={isReturnSubmitting} okButtonProps={{ disabled: selectedReturnItems.length === 0 }}> <Checkbox.Group style={{ width: '100%' }} value={selectedReturnItems} onChange={setSelectedReturnItems}> <div style={{ maxHeight: '30vh', overflowY: 'auto' }}> {returnableItems.length > 0 ? returnableItems.map(item => (<Card size="small" key={item.sale_item_id} style={{ marginBottom: '8px' }}><Checkbox value={item.sale_item_id}><Space><Text strong>{item.product_name}</Text><Text type="secondary">({item.imei || 'Item'})</Text>-<Text>Rs. {item.price_at_sale.toFixed(2)}</Text></Space></Checkbox></Card>)) : <Text type="secondary">No items available.</Text>} </div> </Checkbox.Group> <Form form={returnForm} layout="vertical" onFinish={handleConfirmReturn} style={{ marginTop: '24px' }}> <Form.Item name="reason" label="Reason for Return"><Input.TextArea /></Form.Item> </Form> <Descriptions bordered><Descriptions.Item label="Total Credit"><Title level={4} style={{margin:0, color: '#52c41a'}}>Rs. {totalRefundAmount.toFixed(2)}</Title></Descriptions.Item></Descriptions> </Modal> <Modal
  title={`Settle Credit for: ${selectedCustomer?.name}`}
  open={isPayoutModalOpen}
  onCancel={handlePayoutCancel}
  onOk={() => payoutForm.submit()}
  okText="Confirm Payout"
>
  <Title level={5}>Credit Balance: <Text type="success">Rs. {Math.abs(selectedCustomer?.balance || 0).toFixed(2)}</Text></Title>
  <Form form={payoutForm} layout="vertical" onFinish={handleConfirmPayout}>
    <Form.Item
      name="amount"
      label="Amount Paid to Customer"
      rules={[{ required: true }]}
    >
      <InputNumber 
        style={{ width: '100%' }} 
        prefix="Rs." 
        min={1} 
        max={Math.abs(selectedCustomer?.balance)} 
      />
    </Form.Item>
    <Form.Item name="remarks" label="Remarks (Optional)">
      <Input.TextArea placeholder="e.g., Paid in cash" />
    </Form.Item>
  </Form>
</Modal> </> );
};

export default Customers;