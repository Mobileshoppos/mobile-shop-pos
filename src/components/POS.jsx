// --- File: src/components/POS.jsx (UPDATED FOR NEW INVENTORY SYSTEM) ---

import React, { useState, useEffect } from 'react';
import {
  Typography, Row, Col, Input, List, Card, Button, Statistic, Empty, App, Select, Radio, InputNumber, Form, Modal, Space, Divider
} from 'antd';
import { PlusOutlined, UserAddOutlined, DeleteOutlined } from '@ant-design/icons';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';

const { Title, Text } = Typography;
const { Search } = Input;

const POS = () => {
  const { message, modal } = App.useApp();
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('Paid');
  const [amountPaid, setAmountPaid] = useState(0);
  const [isAddCustomerModalOpen, setIsAddCustomerModalOpen] = useState(false);
  const [addForm] = Form.useForm();
  const [discount, setDiscount] = useState(0);
  const [discountType, setDiscountType] = useState('Amount');

  // --- TABDEELI #1: Ab hum 'products_with_quantity' view se data lenge ---
  const getProducts = async () => {
    try {
      // Yahan 'products' ke bajaye 'products_with_quantity' istemal kiya gaya hai
      let { data, error } = await supabase.from('products_with_quantity').select('*').order('name', { ascending: true });
      if (error) throw error;
      setProducts(data);
    } catch (error) {
      message.error('Error fetching products: ' + error.message);
    }
  };

  const getCustomers = async () => {
    try {
      let { data, error } = await supabase.from('customers_with_balance').select('*').order('name', { ascending: true });
      if (error) throw error;
      setCustomers(data);
    } catch (error)      {
      message.error('Error fetching customers: ' + error.message);
    }
  };

  useEffect(() => {
    if (user) {
      const initialLoad = async () => {
        setLoading(true);
        await Promise.all([getProducts(), getCustomers()]);
        setLoading(false);
      };
      initialLoad();
    }
  }, [user, message]);

  // handleAddToCart aur baqi chotay functions waise hi rahenge
  const handleAddToCart = (product) => {
    if (product.quantity <= 0) { message.warning('This product is out of stock!'); return; }
    const existingItem = cart.find(item => item.id === product.id);
    if (existingItem) {
      if (existingItem.quantity >= product.quantity) { message.warning(`No more stock available for ${product.name}.`); return; }
      setCart(cart.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item));
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }
  };

  const handleQuantityChange = (productId, newQuantity) => {
    const productInStock = products.find(p => p.id === productId);
    if (newQuantity > productInStock.quantity) { message.warning(`Only ${productInStock.quantity} items available in stock.`); return; }
    if (newQuantity < 1) { setCart(cart.filter(item => item.id !== productId)); } 
    else { setCart(cart.map(item => item.id === productId ? { ...item, quantity: newQuantity } : item)); }
  };

  // --- TABDEELI #2: Stock update karne ki logic mukammal tor par nayi hai ---
  const handleCompleteSale = async () => {
    if (cart.length === 0) return;
    if (paymentMethod === 'Unpaid' && !selectedCustomer) { message.error('Please select a customer for a credit (Pay Later) sale.'); return; }
    if (paymentMethod === 'Unpaid' && amountPaid > grandTotal) { message.error('Amount paid cannot be greater than the grand total.'); return; }
    const udhaarAmount = grandTotal - amountPaid;
    const confirmMessage = `Subtotal: Rs. ${subtotal.toFixed(2)}\nDiscount: Rs. ${discountAmount.toFixed(2)}\n--------------------\nGrand Total: Rs. ${grandTotal.toFixed(2)}\n` + (paymentMethod === 'Unpaid' && udhaarAmount > 0 ? `Amount Paid: Rs. ${amountPaid.toFixed(2)}\nNew Udhaar: Rs. ${udhaarAmount.toFixed(2)}\n` : '') + `\nProceed?`;
    
    modal.confirm({
      title: 'Confirm Sale',
      content: <pre style={{ whiteSpace: 'pre-wrap' }}>{confirmMessage}</pre>,
      onOk: async () => {
        try {
          setIsSubmitting(true);
          // Step 1: Sale aur Sale Items ko save karna (yeh pehle jaisa hai)
          const saleRecord = { customer_id: selectedCustomer, subtotal, discount: discountAmount, total_amount: grandTotal, amount_paid_at_sale: paymentMethod === 'Paid' ? grandTotal : amountPaid, payment_status: udhaarAmount > 0 ? 'Unpaid' : 'Paid', user_id: user.id };
          const { data: saleData, error: saleError } = await supabase.from('sales').insert(saleRecord).select().single();
          if (saleError) throw saleError;
          
          const saleItems = cart.map(item => ({ sale_id: saleData.id, product_id: item.id, quantity: item.quantity, price_at_sale: item.sale_price, user_id: user.id }));
          const { error: saleItemsError } = await supabase.from('sale_items').insert(saleItems);
          if (saleItemsError) throw saleItemsError;

          // --- YEH NAYI LOGIC HAI ---
          // Step 2: Har beche gaye item ke liye inventory se stock ka status 'Sold' karna
          for (const item of cart) {
            // 'inventory' table se is product ke 'Available' items ke IDs nikalein
            const { data: availableItems, error: stockError } = await supabase
              .from('inventory')
              .select('id')
              .eq('product_id', item.id)
              .eq('status', 'Available')
              .limit(item.quantity);

            if (stockError) throw stockError;
            if (availableItems.length < item.quantity) {
              // Aisa hona nahi chahiye kyunke UI check karta hai, lekin yeh ek safety check hai
              throw new Error(`Not enough stock for ${item.name}. Sale cannot be completed.`);
            }

            const inventoryIdsToUpdate = availableItems.map(invItem => invItem.id);

            // Un IDs ka status 'Sold' kar dein
            const { error: updateError } = await supabase
              .from('inventory')
              .update({ status: 'Sold' })
              .in('id', inventoryIdsToUpdate);
            
            if (updateError) throw updateError;
          }
          
          message.success('Sale completed successfully!');
          // Cart aur form reset karna
          setCart([]);
          setSelectedCustomer(null);
          setPaymentMethod('Paid');
          setAmountPaid(0);
          setDiscount(0);
          setDiscountType('Amount');
          // Naya data load karna
          await getProducts();
          await getCustomers();

        } catch (error) {
          message.error('Sale failed: ' + error.message);
          // Yahan humein sale ko reverse karne ki logic bhi daalni chahiye, lekin woh Phase 2 ka kaam hai
        } finally {
          setIsSubmitting(false);
        }
      }
    });
  };

  // Baqi tamam code (JSX/UI) bilkul waise ka waisa hi hai
  const filteredProducts = products.filter(product => product.name.toLowerCase().includes(searchTerm.toLowerCase()));
  const subtotal = cart.reduce((sum, item) => sum + (item.sale_price * item.quantity), 0);
  let discountAmount = discountType === 'Amount' ? discount : (subtotal * discount) / 100;
  const grandTotal = Math.max(0, subtotal - discountAmount);
  const handleAddCustomer = async (values) => { try { const { data, error } = await supabase.from('customers').insert([{ ...values, user_id: user.id }]).select().single(); if (error) throw error; message.success('Customer added successfully!'); setIsAddCustomerModalOpen(false); addForm.resetFields(); await getCustomers(); setSelectedCustomer(data.id); } catch (error) { message.error('Error adding customer: ' + error.message); } };
  const handleRemoveFromCart = (productId) => { setCart(cart.filter(item => item.id !== productId)); };
  const handleResetCart = () => { modal.confirm({ title: 'Reset Bill?', content: 'Are you sure you want to remove all items from the current bill?', okText: 'Yes, Reset', cancelText: 'No', onOk: () => { setCart([]); setDiscount(0); setAmountPaid(0); setSelectedCustomer(null); message.success('Bill has been reset.'); } }); };

  return (
    <>
      <Title level={2} style={{ color: 'white', marginBottom: '24px' }}>Point of Sale</Title>
      <Row gutter={24}>
        <Col xs={24} md={14}>
          <Card>
            <Search placeholder="Search for products..." onChange={(e) => setSearchTerm(e.target.value)} style={{ marginBottom: '16px' }} />
            <List loading={loading} dataSource={filteredProducts} renderItem={(product) => (<List.Item><List.Item.Meta title={<Text style={{ color: 'white' }}>{product.name}</Text>} description={`Brand: ${product.brand} - Stock: ${product.quantity}`} /><Button type="primary" icon={<PlusOutlined />} onClick={() => handleAddToCart(product)} disabled={product.quantity <= 0}>Add</Button></List.Item>)} style={{ height: '60vh', overflowY: 'auto' }} />
          </Card>
        </Col>
        <Col xs={24} md={10}>
          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}><Title level={4} style={{ margin: 0 }}>Current Bill</Title>{cart.length > 0 && (<Button danger type="text" icon={<DeleteOutlined />} onClick={handleResetCart}>Reset Cart</Button>)}</div>
            <Form.Item label="Customer"><Space.Compact style={{ width: '100%' }}><Select showSearch placeholder="Select a customer (optional)" style={{ width: '100%' }} value={selectedCustomer} onChange={(value) => setSelectedCustomer(value)} filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())} options={customers.map(customer => ({ value: customer.id, label: `${customer.name} - ${customer.phone_number}` }))} allowClear /><Button icon={<UserAddOutlined />} onClick={() => setIsAddCustomerModalOpen(true)} /></Space.Compact></Form.Item>
            <Radio.Group onChange={(e) => setPaymentMethod(e.target.value)} value={paymentMethod} style={{ marginBottom: '16px' }}><Radio value={'Paid'}>Paid</Radio><Radio value={'Unpaid'} disabled={!selectedCustomer}>Pay Later (Udhaar)</Radio></Radio.Group>
            {paymentMethod === 'Unpaid' && selectedCustomer && (<Form.Item label="Amount Paid Now (optional)"><InputNumber style={{ width: '100%' }} prefix="Rs. " min={0} max={grandTotal} value={amountPaid} onChange={(value) => setAmountPaid(value || 0)} /></Form.Item>)}
            {cart.length === 0 ? <Empty description="Cart is empty" /> : <List dataSource={cart} renderItem={(item) => { const productInStock = products.find(p => p.id === item.id); return (<List.Item actions={[<Button type="text" danger icon={<DeleteOutlined />} onClick={() => handleRemoveFromCart(item.id)} />]}><List.Item.Meta title={<Text style={{ color: 'white' }}>{item.name}</Text>} description={`Rs. ${item.sale_price.toFixed(2)}`} /><Space><InputNumber size="small" min={1} max={productInStock?.quantity || item.quantity} value={item.quantity} onChange={(value) => handleQuantityChange(item.id, value)} style={{ width: '60px' }} /><Text strong style={{ color: 'white', minWidth: '80px', textAlign: 'right' }}>Rs. {(item.sale_price * item.quantity).toFixed(2)}</Text></Space></List.Item>); }} style={{ maxHeight: '30vh', overflowY: 'auto', marginBottom: '16px' }} />}
            <Divider />
            <Row gutter={16} style={{ marginBottom: '16px' }}><Col span={14}><InputNumber style={{ width: '100%' }} placeholder="Discount" value={discount} onChange={(val) => setDiscount(val || 0)} min={0} /></Col><Col span={10}><Radio.Group value={discountType} onChange={(e) => setDiscountType(e.target.value)}><Radio.Button value="Amount">Rs.</Radio.Button><Radio.Button value="Percentage">%</Radio.Button></Radio.Group></Col></Row>
            <Row justify="space-between"><Text>Subtotal</Text><Text>Rs. {subtotal.toFixed(2)}</Text></Row>
            <Row justify="space-between"><Text>Discount</Text><Text style={{ color: '#ff4d4f' }}>- Rs. {discountAmount.toFixed(2)}</Text></Row>
            <Divider style={{ margin: '8px 0' }}/>
            <Row justify="space-between" align="middle"><Col><Statistic title={<Title level={5} style={{ margin: 0 }}>Grand Total</Title>} value={grandTotal} precision={2} prefix="Rs. " /></Col><Col><Button type="primary" size="large" disabled={cart.length === 0 || isSubmitting} loading={isSubmitting} onClick={handleCompleteSale}>Complete Sale</Button></Col></Row>
          </Card>
        </Col>
      </Row>
      <Modal title="Add a New Customer" open={isAddCustomerModalOpen} onCancel={() => setIsAddCustomerModalOpen(false)} onOk={() => addForm.submit()} okText="Save Customer"><Form form={addForm} layout="vertical" onFinish={handleAddCustomer}><Form.Item name="name" label="Full Name" rules={[{ required: true }]}><Input /></Form.Item><Form.Item name="phone_number" label="Phone Number" rules={[{ required: true }]}><Input /></Form.Item><Form.Item name="address" label="Address (Optional)"><Input.TextArea rows={3} /></Form.Item></Form></Modal>
    </>
  );
};

export default POS;