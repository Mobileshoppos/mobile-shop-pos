import React, { useState, useEffect, useMemo } from 'react';
import {
  Typography, Table, Button, Modal, Form, Input, App as AntApp, Space, Spin, InputNumber, Card, Descriptions, Checkbox, List, Row, Col, Divider
} from 'antd';
import { UserAddOutlined, EyeOutlined, DollarCircleOutlined, SwapOutlined } from '@ant-design/icons';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { formatCurrency } from '../utils/currencyFormatter';
import { db } from '../db';
import { useSync } from '../context/SyncContext';
import DataService from '../DataService';

const { Title, Text } = Typography;

const Customers = () => {
  const { message, modal } = AntApp.useApp();
  const isMobile = useMediaQuery('(max-width: 768px)');
  const { user, profile } = useAuth();
  const { processSyncQueue } = useSync();
  
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
  const [isInvoiceSearchModalOpen, setIsInvoiceSearchModalOpen] = useState(false);
  const [invoiceSearchForm] = Form.useForm();
  const [searchedSale, setSearchedSale] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [payoutForm] = Form.useForm();
  
  const [addForm] = Form.useForm();
  const [paymentForm] = Form.useForm();
  const [returnForm] = Form.useForm();

  const getCustomers = async () => {
    try {
      setLoading(true);
      // Local DB se customers uthayein
      const data = await db.customers.toArray();
      // Naam ke hisaab se sort karein
      setCustomers(data.sort((a, b) => a.name.localeCompare(b.name)));
    } catch (error) { 
      message.error('Error fetching customers: ' + error.message); 
    } finally { 
      setLoading(false); 
    }
  };

  useEffect(() => { if (user) getCustomers(); }, [user]);

  const handleAddCustomer = async (values) => {
    try {
      // 1. Naya Customer Object banayein
      const newCustomer = { 
          ...values, 
          id: crypto.randomUUID(), // ID khud generate karein
          user_id: user.id, 
          balance: 0 
      };

      // 2. Local DB mein save karein
      await db.customers.add(newCustomer);
      
      // 3. Sync Queue mein daalein
      await db.sync_queue.add({
          table_name: 'customers',
          action: 'create',
          data: newCustomer
      });

      message.success('Customer added successfully!');
      setIsAddModalOpen(false);
      addForm.resetFields();
      
      // List update karein aur upload trigger karein
      await getCustomers();
      processSyncQueue();

    } catch (error) { 
      message.error('Error adding customer: ' + error.message); 
    }
  };

  const showPaymentModal = (customer) => {
    setSelectedCustomer(customer);
    paymentForm.setFieldsValue({ amount: customer.balance > 0 ? customer.balance : 1 });
    setIsPaymentModalOpen(true);
  };
  const handlePaymentCancel = () => { setIsPaymentModalOpen(false); paymentForm.resetFields(); };
  
  const handleReceivePayment = async (values) => {
    try {
      const paymentData = { 
          id: crypto.randomUUID(),
          customer_id: selectedCustomer.id, 
          amount_paid: values.amount, 
          user_id: user.id,
          created_at: new Date().toISOString()
      };

      // 1. Local DB mein save karein (TAAKE LEDGER MEIN FORAN AAYE)
      await db.customer_payments.add(paymentData);
      
      // 2. Sync Queue mein daalein
      await db.sync_queue.add({
          table_name: 'customer_payments',
          action: 'create',
          data: paymentData
      });

      // 3. Balance Update (UI)
      const currentCustomer = await db.customers.get(selectedCustomer.id);
      if (currentCustomer) {
          const newBalance = (currentCustomer.balance || 0) - values.amount;
          await db.customers.update(selectedCustomer.id, { balance: newBalance });
          
          setCustomers(prev => prev.map(c => 
              c.id === selectedCustomer.id ? { ...c, balance: newBalance } : c
          ));
      }

      message.success('Payment received successfully!');
      handlePaymentCancel();
      processSyncQueue();

    } catch (error) { 
        message.error('Failed to receive payment: ' + error.message); 
    }
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

  const handleConfirmPayout = async (values) => {
    try {
      const payoutData = { 
          id: crypto.randomUUID(),
          customer_id: selectedCustomer.id, 
          amount_paid: values.amount, 
          remarks: values.remarks,
          user_id: user.id,
          created_at: new Date().toISOString()
      };

      // 1. Local DB mein save karein
      await db.credit_payouts.add(payoutData);
      
      // 2. Sync Queue mein daalein
      await db.sync_queue.add({
          table_name: 'credit_payouts',
          action: 'create',
          data: payoutData
      });

      // 3. Balance Update (UI & Local DB)
      // Payout ka matlab hai hum ne customer ko paise diye, to uska balance barh jayega (ya negative balance kam ho jayega)
      const currentCustomer = await db.customers.get(selectedCustomer.id);
      if (currentCustomer) {
          const newBalance = (currentCustomer.balance || 0) + values.amount;
          await db.customers.update(selectedCustomer.id, { balance: newBalance });
          
          setCustomers(prev => prev.map(c => 
              c.id === selectedCustomer.id ? { ...c, balance: newBalance } : c
          ));
      }

      message.success('Credit settled successfully!');
      handlePayoutCancel();
      processSyncQueue();

    } catch (error) {
      message.error('Failed to settle credit: ' + error.message);
    }
  };

  const handleSearchInvoice = async (values) => {
    try {
      setIsSearching(true);
      setSearchedSale(null); 

      // User jo number likhega ya Scan karega
      let searchInput = values.invoiceId; 
      
      // --- SMART SCAN LOGIC START ---
      // Agar scanner ne "INV:123" bheja hai, to "INV:" hata dein
      if (typeof searchInput === 'string' && searchInput.toUpperCase().startsWith('INV:')) {
          searchInput = searchInput.split(':')[1]; // Sirf number utha lein
      }
      // ------------------------------

      let saleData = null;

      // 1. Seedha Number se dhoondein
      const searchId = Number(searchInput);
      if (isNaN(searchId)) {
          message.error("Please enter a valid numeric Invoice ID");
          setIsSearching(false);
          return;
      }
      saleData = await db.sales.get(searchId);

      if (!saleData) {
        message.error(`Invoice ID #${searchInput} not found locally.`);
        setIsSearching(false);
        return;
      }

      // 2. Details Jama Karein
      const customer = await db.customers.get(saleData.customer_id);
      const saleItems = await db.sale_items.where('sale_id').equals(saleData.id).toArray();

      const itemsWithDetails = await Promise.all(saleItems.map(async (item) => {
          const product = await db.products.get(item.product_id);
          const inventory = await db.inventory.get(item.inventory_id);
          
          return {
              ...item,
              product: product || { name: 'Unknown Product' },
              inventory: inventory || {}
          };
      }));

      const fullSaleObject = {
          ...saleData,
          // Hum saleData se ID utha rahe hain (jo ke 1 hogi)
          customer: customer || { id: saleData.customer_id, name: 'Walk-in Customer' },
          sale_items: itemsWithDetails
      };

      setSearchedSale(fullSaleObject);

    } catch (error) {
      console.error("Invoice search failed:", error);
      message.error("Search failed: " + error.message);
    } finally {
      setIsSearching(false);
    }
  };

const handleCloseInvoiceSearchModal = () => {
  setIsInvoiceSearchModalOpen(false);
  invoiceSearchForm.resetFields();
  setSearchedSale(null);
};
  
  const openReturnModal = async (sale) => {
    try {
      setIsReturnModalOpen(true);
      setSelectedSale(sale);

      // 1. Sale Items layein
      const soldItems = await db.sale_items.where('sale_id').equals(sale.id).toArray();

      // 2. Pehle se Return kiye gaye items layein
      // Hamein sale_returns table se is sale ke returns dhoondne honge
      const previousReturns = await db.sale_returns.where('sale_id').equals(sale.id).toArray();
      const previousReturnIds = previousReturns.map(r => r.id);
      
      // Phir un returns ke items dhoondne honge
      let returnedInventoryIds = [];
      if (previousReturnIds.length > 0) {
          const returnedItems = await db.sale_return_items
              .filter(item => previousReturnIds.includes(item.return_id))
              .toArray();
          returnedInventoryIds = returnedItems.map(i => i.inventory_id);
      }

      // 3. Sirf wo items dikhayein jo abhi tak return nahi hue
      const availableItems = soldItems.filter(item => !returnedInventoryIds.includes(item.inventory_id));

      // 4. Details Jorein (Product Name, IMEI etc)
      const itemsWithDetails = await Promise.all(availableItems.map(async (item) => {
          const product = await db.products.get(item.product_id);
          const inventory = await db.inventory.get(item.inventory_id);
          
          return {
            sale_item_id: item.id, // Sale Item ID zaroori hai return ke liye
            inventory_id: item.inventory_id,
            product_id: item.product_id,
            product_name: product ? product.name : 'Unknown Product',
            imei: inventory ? inventory.imei : '',
            item_attributes: inventory ? inventory.item_attributes : {},
            price_at_sale: item.price_at_sale
          };
      }));

      setReturnableItems(itemsWithDetails);

    } catch (error) {
      console.error(error);
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
      
      // 1. Return Record Banayein
      const returnId = crypto.randomUUID();
      const returnRecord = {
          id: returnId,
          sale_id: selectedSale.id,
          customer_id: selectedSale.customer_id,
          total_refund_amount: totalRefundAmount,
          reason: values.reason,
          user_id: user.id,
          created_at: new Date().toISOString()
      };

      // 2. Return Items Banayein
      const itemsToInsert = returnableItems
        .filter(i => selectedReturnItems.includes(i.sale_item_id))
        .map(i => ({
          id: crypto.randomUUID(),
          return_id: returnId,
          inventory_id: i.inventory_id,
          product_id: i.product_id,
          price_at_return: i.price_at_sale
        }));

      // 3. Payment (Credit) Record Banayein
      const paymentId = crypto.randomUUID();
      const paymentRecord = {
        id: paymentId,
        customer_id: selectedSale.customer_id,
        amount_paid: -totalRefundAmount, // Negative amount for credit
        user_id: user.id,
        remarks: `Refund for Invoice #${selectedSale.id}`,
        created_at: new Date().toISOString()
      };

      // --- NAYA CODE START (Inventory & Sync Fix) ---

      // 4. Local DB mein Save karein
      await db.sale_returns.add(returnRecord);
      if (db.sale_return_items) await db.sale_return_items.bulkAdd(itemsToInsert);
      await db.customer_payments.add(paymentRecord);

      // 5. Inventory ko wapis 'Available' karein (Local)
      const inventoryIdsToUpdate = itemsToInsert.map(i => i.inventory_id);
      for (const invId of inventoryIdsToUpdate) {
          await db.inventory.update(invId, { status: 'available' });
      }

      // 6. Balance Update (UI & Local DB)
      const currentCustomer = await db.customers.get(selectedSale.customer_id);
      if (currentCustomer) {
          const newBalance = (currentCustomer.balance || 0) - totalRefundAmount;
          await db.customers.update(selectedSale.customer_id, { balance: newBalance });
          
          setCustomers(prev => prev.map(c => 
              c.id === selectedSale.customer_id ? { ...c, balance: newBalance } : c
          ));
      }

      // 7. Sync Queue mein daalein (Ab hum poora return data bhejenge)
      await db.sync_queue.add({
          table_name: 'sale_returns',
          action: 'create_full_return', // Naya Action
          data: {
              return_record: returnRecord,
              items: itemsToInsert,
              payment_record: paymentRecord,
              inventory_ids: inventoryIdsToUpdate
          }
      });

      // --- NAYA CODE END ---

      message.success(`Return successful! ${formatCurrency(totalRefundAmount, profile?.currency)} credited.`);
      handleReturnCancel();
      
      if (selectedCustomer) {
          handleViewLedger(selectedCustomer);
      }
      
      processSyncQueue();

    } catch (error) {
      message.error("Failed to process return: " + error.message);
    } finally {
      setIsReturnSubmitting(false);
    }
  };
  
  const totalRefundAmount = useMemo(() => returnableItems.filter(i => selectedReturnItems.includes(i.sale_item_id)).reduce((sum, i) => sum + i.price_at_sale, 0), [selectedReturnItems, returnableItems]);
  
  const handleViewLedger = async (customer) => {
    setSelectedCustomer(customer);
    setIsLedgerModalOpen(true);
    try {
        setLedgerLoading(true);

        // 1. Sales layein
        const sales = await db.sales.where('customer_id').equals(customer.id).toArray();
        
        // 2. Payments layein
        const payments = await db.customer_payments.where('customer_id').equals(customer.id).toArray();

        // 3. Returns layein
        const returns = await db.sale_returns.where('customer_id').equals(customer.id).toArray();

        // 4. Payouts layein
        let payouts = [];
        if (db.credit_payouts) {
             payouts = await db.credit_payouts.where('customer_id').equals(customer.id).toArray();
        }

        // *** MAGIC STEP: Sales ke Items + Products + Inventory Details dhoondein ***
        const salesWithDetails = await Promise.all(sales.map(async (sale) => {
            // Is sale ke items dhoondein
            const items = await db.sale_items.where('sale_id').equals(sale.id).toArray();
            
            // Har item ka Product Name aur Inventory Details dhoondein
            const itemsWithFullDetails = await Promise.all(items.map(async (item) => {
                const product = await db.products.get(item.product_id);
                
                // *** YEH LINE NAYI HAI (Inventory Details ke liye) ***
                const inventoryItem = await db.inventory.get(item.inventory_id);

                return { 
                    ...item, 
                    products: product || { name: 'Unknown Product' },
                    inventory: inventoryItem || {} // <--- Yeh "N/A" ko khatam karega
                };
            }));

            return { ...sale, sale_items: itemsWithFullDetails };
        }));
        // *************************************************************************

        // Data ko format karein
        const salesTx = salesWithDetails.map(s => ({ 
            type: 'sale', 
            date: s.created_at || s.sale_date, 
            description: `Sale (Invoice #${s.id})`, 
            debit: (s.total_amount || 0) - (s.amount_paid_at_sale || 0), 
            credit: 0, 
            details: s 
        }));

        const paymentsTx = payments.map(p => ({
            type: p.amount_paid > 0 ? 'payment' : 'return',
            date: p.created_at,
            description: p.amount_paid > 0 ? 'Payment Received' : `Return Credit`,
            debit: 0,
            credit: Math.abs(p.amount_paid),
            details: p
        }));

        const payoutsTx = payouts.map(p => ({
            type: 'payout',
            date: p.created_at,
            description: 'Credit Payout',
            debit: p.amount_paid,
            credit: 0,
            details: p
        }));

        // Sab ko milayein aur sort karein
        const allTx = [...salesTx, ...paymentsTx, ...payoutsTx].sort((a, b) => new Date(a.date) - new Date(b.date));
        
        let runningBalance = 0;
        const finalLedger = allTx.map(tx => {
            runningBalance += tx.debit - tx.credit;
            return { ...tx, balance: runningBalance, key: `${tx.type}-${tx.details.id}` };
        });

        setLedgerData(finalLedger.reverse());

    } catch (error) {
        console.error(error);
        message.error('Error fetching ledger: ' + error.message);
    } finally {
        setLedgerLoading(false);
    }
};

  const customerColumns = [
    { title: 'Customer Name', dataIndex: 'name' },
    { title: 'Phone', dataIndex: 'phone_number' },
    { title: 'Address', dataIndex: 'address', render: (address) => address || <Text type="secondary">N/A</Text> },
    { title: 'Balance', dataIndex: 'balance', align: 'right', render: (b) => <Text type={b > 0 ? 'danger' : 'success'}>{formatCurrency(b, profile?.currency)}</Text> },
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
        .map(([, value]) => value)
        .join(' ');

      const details = [item.inventory.imei, attributes].filter(Boolean).join(' / ');
      
      return <Text type="secondary">{details || 'N/A'}</Text>;
    };

    if (record.type === 'sale') {
      const saleItemCols = [
        { title: 'Product', dataIndex: ['products', 'name'] },
        { title: 'Details', render: renderItemDetails },
        // --- YAHAN TABDEELI HUI HAI ---
        { title: 'Price', dataIndex: 'price_at_sale', align: 'right', render: p => formatCurrency(p, profile?.currency) }
      ];
      return (
        <Card size="small" style={{ margin: '8px 0' }}>
          <Descriptions title={`Invoice #${record.details.id} Summary`} bordered size="small" column={1}>
            {/* --- IN 5 JAGAHON PAR TABDEELI HUI HAI --- */}
            <Descriptions.Item label="Subtotal">{formatCurrency(record.details.subtotal || 0, profile?.currency)}</Descriptions.Item>
            <Descriptions.Item label="Discount">- {formatCurrency(record.details.discount || 0, profile?.currency)}</Descriptions.Item>
            <Descriptions.Item label="Grand Total"><strong>{formatCurrency(record.details.total_amount || 0, profile?.currency)}</strong></Descriptions.Item>
            <Descriptions.Item label="Amount Paid at Sale">{formatCurrency(record.details.amount_paid_at_sale || 0, profile?.currency)}</Descriptions.Item>
            <Descriptions.Item label="New Udhaar from this Sale"><strong>{formatCurrency(record.debit, profile?.currency)}</strong></Descriptions.Item>
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
        // --- YAHAN TABDEELI HUI HAI ---
        { title: 'Returned Price', dataIndex: 'price_at_return', align: 'right', render: p => formatCurrency(p, profile?.currency) }
      ];
      return (
        <Card size="small" style={{ margin: '8px 0' }}>
          <Descriptions title={`Return Details`} bordered size="small" column={1}>
            <Descriptions.Item label="Reason for Return">{returnDetails.reason || <Text type="secondary">No reason provided.</Text>}</Descriptions.Item>
            {/* --- YAHAN TABDEELI HUI HAI --- */}
            <Descriptions.Item label="Total Credit Amount"><strong>{formatCurrency(record.credit, profile?.currency)}</strong></Descriptions.Item>
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
    <Space direction={isMobile ? 'vertical' : 'horizontal'} style={{ width: isMobile ? '100%' : 'auto' }}>
    <Button
        type="primary"
        ghost // Yeh button ko thora alag dikhayega
        icon={<SwapOutlined />} // Return ka icon
        size="large"
        onClick={() => setIsInvoiceSearchModalOpen(true)} // Naye popup ko kholega
        style={{ width: isMobile ? '100%' : 'auto' }}
    >
        Return by Invoice
    </Button>
    <Button
        type="primary"
        icon={<UserAddOutlined />}
        size="large"
        onClick={() => setIsAddModalOpen(true)}
        style={{ width: isMobile ? '100%' : 'auto' }}
    >
        Add Customer
    </Button>
</Space>
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
                    {formatCurrency(customer.balance, profile?.currency)}
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
                                    {record.debit > 0 && <Text type="danger">- {formatCurrency(record.debit, profile?.currency)}</Text>}
                                    {record.credit > 0 && <Text type="success">+ {formatCurrency(record.credit, profile?.currency)}</Text>}
                                </Col>
                            </Row>
                            <div style={{ textAlign: 'right', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #f0f0f0' }}>
                                <Text type="secondary">Balance: </Text>
                                <Text strong>{formatCurrency(record.balance, profile?.currency)}</Text>
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
    { title: 'Debit', dataIndex: 'debit', align: 'right', render: a => a > 0 ? <Text>{formatCurrency(a, profile?.currency)}</Text> : '-' },
    { title: 'Credit', dataIndex: 'credit', align: 'right', render: a => a > 0 ? <Text type="success">{formatCurrency(a, profile?.currency)}</Text> : '-' },
    { title: 'Balance', dataIndex: 'balance', align: 'right', render: a => <Text strong>{formatCurrency(a, profile?.currency)}</Text> }
]}
            />
        )
    )}
</Modal> <Modal title={`Payment from: ${selectedCustomer?.name}`} open={isPaymentModalOpen} onCancel={handlePaymentCancel} onOk={() => paymentForm.submit()} okText="Confirm Payment"> <Title level={5}>Balance: <Text type="danger">{formatCurrency(selectedCustomer?.balance, profile?.currency)}</Text></Title> <Form form={paymentForm} layout="vertical" onFinish={handleReceivePayment}><Form.Item name="amount" label="Amount Received" rules={[{ required: true }]}>
    <InputNumber style={{ width: '100%' }} prefix={profile?.currency ? `${profile.currency} ` : ''} min={1} max={selectedCustomer?.balance} />
</Form.Item></Form> </Modal> <Modal title={`Return for Invoice #${selectedSale?.id}`} open={isReturnModalOpen} onCancel={handleReturnCancel} onOk={() => returnForm.submit()} okText="Confirm Return" confirmLoading={isReturnSubmitting} okButtonProps={{ disabled: selectedReturnItems.length === 0 }}> <Checkbox.Group style={{ width: '100%' }} value={selectedReturnItems} onChange={setSelectedReturnItems}> <div style={{ maxHeight: '30vh', overflowY: 'auto' }}> {returnableItems.length > 0 ? returnableItems.map(item => (<Card size="small" key={item.sale_item_id} style={{ marginBottom: '8px' }}><Checkbox value={item.sale_item_id}><Space><Text strong>{item.product_name}</Text><Text type="secondary">({item.imei || 'Item'})</Text>-<Text>{formatCurrency(item.price_at_sale, profile?.currency)}</Text></Space></Checkbox></Card>)) : <Text type="secondary">No items available.</Text>} </div> </Checkbox.Group> <Form form={returnForm} layout="vertical" onFinish={handleConfirmReturn} style={{ marginTop: '24px' }}> <Form.Item name="reason" label="Reason for Return"><Input.TextArea /></Form.Item> </Form> <Descriptions bordered><Descriptions.Item label="Total Credit"><Title level={4} style={{margin:0, color: '#52c41a'}}>{formatCurrency(totalRefundAmount, profile?.currency)}</Title></Descriptions.Item></Descriptions> </Modal> <Modal
  title={`Settle Credit for: ${selectedCustomer?.name}`}
  open={isPayoutModalOpen}
  onCancel={handlePayoutCancel}
  onOk={() => payoutForm.submit()}
  okText="Confirm Payout"
>
  <Title level={5}>Credit Balance: <Text type="success">{formatCurrency(Math.abs(selectedCustomer?.balance || 0), profile?.currency)}</Text></Title>
  <Form form={payoutForm} layout="vertical" onFinish={handleConfirmPayout}>
    <Form.Item
      name="amount"
      label="Amount Paid to Customer"
      rules={[{ required: true }]}
    >
      <InputNumber 
    style={{ width: '100%' }} 
    prefix={profile?.currency ? `${profile.currency} ` : ''}
    min={1} 
    max={Math.abs(selectedCustomer?.balance)} 
/>
    </Form.Item>
    <Form.Item name="remarks" label="Remarks (Optional)">
      <Input.TextArea placeholder="e.g., Paid in cash" />
    </Form.Item>
  </Form>
</Modal>
<Modal
    title="Find Sale to Return Items"
    open={isInvoiceSearchModalOpen}
    onCancel={handleCloseInvoiceSearchModal}
    footer={null} // Hum apne custom buttons istemal karenge
    destroyOnHidden // Jab modal band ho to andar ki states ko destroy kar de
  >
    {!searchedSale ? (
      // STAGE 1: JAB SALE TALASH KI JA RAHI HO
      <Form form={invoiceSearchForm} onFinish={handleSearchInvoice} layout="vertical">
        <Form.Item
          name="invoiceId"
          label="Scan QR Code or Enter Invoice ID"
          rules={[{ required: true, message: 'Please scan or enter the invoice number!' }]}
        >
          <Input 
            style={{ width: '100%' }} 
            placeholder="Click here and scan receipt..." 
            autoFocus 
            autoComplete="off"
          />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit" loading={isSearching} block>
            {isSearching ? 'Searching...' : 'Find Sale'}
          </Button>
        </Form.Item>
      </Form>
    ) : (
      // STAGE 2: JAB SALE MIL GAYI HO
      <div>
        <Descriptions title={`Invoice #${searchedSale.id}`} bordered column={1} size="small">
          <Descriptions.Item label="Customer">
            {searchedSale.customer ? searchedSale.customer.name : 'Walk-in Customer'}
          </Descriptions.Item>
          <Descriptions.Item label="Date">
            {new Date(searchedSale.created_at).toLocaleString()}
          </Descriptions.Item>
          <Descriptions.Item label="Total Amount">
            <strong>{formatCurrency(searchedSale.total_amount, profile?.currency)}</strong>
          </Descriptions.Item>
        </Descriptions>

        <Title level={5} style={{ marginTop: '24px' }}>Items in this Sale</Title>
        <List
          dataSource={searchedSale.sale_items}
          renderItem={item => {
              const attributes = Object.entries(item.inventory?.item_attributes || {})
                .map(([, value]) => value)
                .join(' ');
              const details = [item.inventory?.imei, attributes].filter(Boolean).join(' / ');

            return (
              <List.Item>
                <List.Item.Meta
                  title={item.product.name}
                  description={details || 'Standard Item'}
                />
                <div>{formatCurrency(item.price_at_sale, profile?.currency)}</div>
              </List.Item>
            );
          }}
          style={{ maxHeight: '20vh', overflowY: 'auto' }}
        />
        
        <Divider />

        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
            <Button onClick={() => setSearchedSale(null)}>
                Search Again
            </Button>
            <Button 
    type="primary" 
    icon={<SwapOutlined />}
    // Button ko sirf tab enable karein jab sale mein items hon
    disabled={!searchedSale.sale_items || searchedSale.sale_items.length === 0}
    onClick={() => {
        // Step 1: Search ke popup ko band karein
        handleCloseInvoiceSearchModal();

        // Step 2: Customer ki maloomat set karein (return modal ke liye zaroori hai)
        // Hum searchedSale se customer ka data istemal kar rahe hain
        setSelectedCustomer(searchedSale.customer);

        // Step 3: Aapke mojooda return function ko sale ki details ke sath call karein
        openReturnModal(searchedSale);
    }}
>
    Proceed to Return
</Button>
        </Space>
      </div>
    )}
</Modal>
 </> 
 );
};

export default Customers;