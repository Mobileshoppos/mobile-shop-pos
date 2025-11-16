import React, { useState, useEffect, useRef } from 'react';
import {
  Typography, Row, Col, Input, List, Card, Button, Statistic, Empty, App, Select, Radio, InputNumber, Form, Modal, Space, Divider
} from 'antd';
import { PlusOutlined, UserAddOutlined, DeleteOutlined } from '@ant-design/icons';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { generateSaleReceipt } from '../utils/receiptGenerator';
import { printThermalReceipt } from '../utils/thermalPrinter';
import { Tag } from 'antd';
import SelectVariantModal from './SelectVariantModal';
import { formatCurrency } from '../utils/currencyFormatter';

const { Title, Text } = Typography;
const { Search } = Input;

const POS = () => {
  const { message, modal } = App.useApp();
  const { user, profile, refetchStockCount } = useAuth();
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
  const searchInputRef = useRef(null);
  const [isVariantModalOpen, setIsVariantModalOpen] = useState(false);
  const [productForVariantSelection, setProductForVariantSelection] = useState(null);

  const getProducts = async () => {
    try {
      let { data, error } = await supabase
        .from('products_display_view') 
        .select('*')
        .order('name', { ascending: true });
      
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
        if (searchInputRef.current) {
          searchInputRef.current.focus();
        }
      };
      initialLoad();
    }
  }, [user, message]);

  const handleAddToCart = (product) => {
    if (product.quantity <= 0) { message.warning('This product is out of stock!'); return; }
    setProductForVariantSelection(product);
    setIsVariantModalOpen(true);
  };

  const handleVariantsSelected = (selectedItems) => {
    if (!selectedItems || selectedItems.length === 0) {
      setIsVariantModalOpen(false);
      return;
    }
  
    let newItemsAdded = false;
    let quantityUpdated = false;
    let alreadyInCart = false;

    setCart(currentCart => {
      let updatedCart = [...currentCart];

      const imeiItemsToAdd = selectedItems.filter(i => i.category_is_imei_based || i.imei);
      const quantityItemsToAdd = selectedItems.filter(i => !i.category_is_imei_based && !i.imei);

      imeiItemsToAdd.forEach(item => {
        const isImeiAlreadyInCart = updatedCart.some(cartItem => cartItem.imei === item.imei);
        if (!isImeiAlreadyInCart) {
          updatedCart.push({ ...item, quantity: 1 });
          newItemsAdded = true;
        } else {
          alreadyInCart = true;
        }
      });

      const groupedQuantityItems = {};
      quantityItemsToAdd.forEach(item => {
        if (!groupedQuantityItems[item.variant_id]) {
          groupedQuantityItems[item.variant_id] = { item: item, count: 0 };
        }
        groupedQuantityItems[item.variant_id].count++;
      });

      for (const variantId in groupedQuantityItems) {
        const { item, count } = groupedQuantityItems[variantId];
        const existingIndex = updatedCart.findIndex(ci => ci.variant_id === item.variant_id);

        if (existingIndex > -1) {
          const existingItem = updatedCart[existingIndex];
          const updatedItem = { ...existingItem, quantity: existingItem.quantity + count };
          updatedCart[existingIndex] = updatedItem;
          quantityUpdated = true;
        } else {
          updatedCart.push({ ...item, quantity: count });
          newItemsAdded = true;
        }
      }
      
      return updatedCart;
    });

    setTimeout(() => {
      if (newItemsAdded) message.success(`New item(s) added to cart.`);
      if (quantityUpdated) message.info(`Quantity updated for existing item(s).`);
      if (alreadyInCart) message.warning(`Some items were already in the cart.`);
    }, 100);
  
    setIsVariantModalOpen(false);
    setProductForVariantSelection(null);
  };

  const handleSearch = async (value) => {
    const trimmedValue = value.trim();
    setSearchTerm(trimmedValue);

    if (!trimmedValue) {
        return;
    }
  
    try {
      let { data: variantData, error: variantError } = await supabase.from('product_variants').select('*, products:product_id(name, brand)').eq('barcode', trimmedValue).eq('user_id', user.id).maybeSingle();
      if (variantError) throw variantError;
  
      if (variantData) {
        const itemToAdd = { ...variantData, product_name: variantData.products.name, variant_id: variantData.id };
        handleVariantsSelected([itemToAdd]);
        setSearchTerm('');
        return;
      }

      let { data: imeiData, error: imeiError } = await supabase.from('inventory').select('*, variants:product_variants(*, products:product_id(name, brand))').eq('imei', trimmedValue).eq('status', 'Available').maybeSingle();
      if (imeiError) throw imeiError;

      if (imeiData && imeiData.variants) {
        const itemToAdd = { ...imeiData, ...imeiData.variants, product_name: imeiData.variants.products.name, variant_id: imeiData.variant_id };
        handleVariantsSelected([itemToAdd]);
        setSearchTerm('');
        return;
      }

    } catch (error) {
      message.error("Search failed: " + error.message);
    }
  };

  const handleCartItemUpdate = (variantId, field, value) => {
    setCart(cart.map(item => {
      if (item.variant_id === variantId) {
        if (field === 'quantity') {
          const productInStock = products.find(p => p.id === item.product_id);
          if (value > productInStock.quantity) {
            message.warning(`No more stock for this product.`);
            return { ...item, quantity: productInStock.quantity };
          }
        }
        return { ...item, [field]: value };
      }
      return item;
    }));
  };
  
  const handleRemoveFromCart = (productId) => {
    const item = cart.find(item => item.id === productId);
    if (item && item.quantity <= 1) {
        setCart(cart.filter(cartItem => cartItem.id !== productId));
    } else {
        handleCartItemUpdate(productId, 'quantity', item.quantity - 1);
    }
  };

  const handleCompleteSale = async () => {
    if (cart.length === 0) return;
    if (paymentMethod === 'Unpaid' && !selectedCustomer) { message.error('Please select a customer for a credit (Pay Later) sale.'); return; }
    if (paymentMethod === 'Unpaid' && amountPaid > grandTotal) { message.error('Amount paid cannot be greater than the grand total.'); return; }
    
    const udhaarAmount = grandTotal - amountPaid;
    const confirmMessage = `Subtotal: ${formatCurrency(subtotal, profile?.currency)}\nDiscount: ${formatCurrency(discountAmount, profile?.currency)}\n--------------------\nGrand Total: ${formatCurrency(grandTotal, profile?.currency)}\n` + (paymentMethod === 'Unpaid' && udhaarAmount > 0 ? `Amount Paid: ${formatCurrency(amountPaid, profile?.currency)}\nNew Udhaar: ${formatCurrency(udhaarAmount, profile?.currency)}\n` : '') + `\nProceed?`;

    modal.confirm({
      title: 'Confirm Sale',
      content: <pre style={{ whiteSpace: 'pre-wrap' }}>{confirmMessage}</pre>,
      onOk: async () => {
        let saleDataForReceipt = null;
        
        try {
          setIsSubmitting(true);
          
          const saleRecord = { customer_id: selectedCustomer || 1, subtotal, discount: discountAmount, total_amount: grandTotal, amount_paid_at_sale: paymentMethod === 'Paid' ? grandTotal : amountPaid, payment_status: (paymentMethod === 'Unpaid' && (grandTotal - amountPaid > 0)) ? 'Unpaid' : 'Paid', user_id: user.id };
          const { data: saleData, error: saleError } = await supabase.from('sales').insert(saleRecord).select().single();
          if (saleError) throw saleError;

          const allSaleItemsToInsert = [];
          const allInventoryIdsToUpdate = [];

          for (const cartItem of cart) {
            const { data: availableInventory, error: inventoryError } = await supabase
              .from('inventory')
              .select('id, product_id')
              .eq('variant_id', cartItem.variant_id)
              .eq('status', 'Available')
              .limit(cartItem.quantity);

            if (inventoryError || availableInventory.length < cartItem.quantity) {
              throw new Error(`Not enough stock for ${cartItem.product_name}. Required: ${cartItem.quantity}, Available: ${availableInventory.length}.`);
            }

            for (const invItem of availableInventory) {
              allSaleItemsToInsert.push({
                sale_id: saleData.id,
                inventory_id: invItem.id,
                product_id: invItem.product_id,
                quantity: 1,
                price_at_sale: cartItem.sale_price,
                user_id: user.id
              });
              allInventoryIdsToUpdate.push(invItem.id);
            }
          }

          const { error: saleItemsError } = await supabase.from('sale_items').insert(allSaleItemsToInsert);
          if (saleItemsError) throw saleItemsError;

          const { error: updateError } = await supabase.from('inventory').update({ status: 'Sold' }).in('id', allInventoryIdsToUpdate);
          if (updateError) throw updateError;
          
          message.success('Sale completed successfully!');
          saleDataForReceipt = saleData;

        } catch (error) {
          message.error('Sale failed during database operation: ' + error.message);
          setIsSubmitting(false);
          return;
        }

        if (saleDataForReceipt) {
  // Use a small timeout to allow the confirm modal to close before the blocking print dialog opens.
  setTimeout(() => {
    (async () => {
      try {
        const { data: receiptDetails, error: rpcError } = await supabase.rpc('get_sale_details', { p_sale_id: saleDataForReceipt.id });
        if (rpcError) throw rpcError;

        // Check user's preferred receipt format from profile
        if (profile?.receipt_format === 'thermal') {
          printThermalReceipt(receiptDetails, profile?.currency);
        } else {
          // Default to PDF if not set or set to pdf
          generateSaleReceipt(receiptDetails, profile?.currency);
        }

      } catch (error) {
        console.error("Receipt generation failed:", error);
        message.warning('Sale was saved, but printing the receipt failed. You can reprint it from Sales History.');
      }
    })();
  }, 100); // 100ms delay is enough for the UI to update
}

        setCart([]);
        setSelectedCustomer(null);
        setPaymentMethod('Paid');
        setAmountPaid(0);
        setDiscount(0);
        setDiscountType('Amount');
        await getProducts();
        refetchStockCount();
        await getCustomers();
        if (searchInputRef.current) { searchInputRef.current.focus(); }
        setIsSubmitting(false);
      }
    });
  };

  const filteredProducts = products.filter(product => product.name.toLowerCase().includes(searchTerm.toLowerCase()));
  const subtotal = cart.reduce((sum, item) => sum + (item.sale_price * item.quantity), 0);
  let discountAmount = discountType === 'Amount' ? discount : (subtotal * discount) / 100;
  const grandTotal = Math.max(0, subtotal - discountAmount);
  const handleAddCustomer = async (values) => { try { const { data, error } = await supabase.from('customers').insert([{ ...values, user_id: user.id }]).select().single(); if (error) throw error; message.success('Customer added successfully!'); setIsAddCustomerModalOpen(false); addForm.resetFields(); await getCustomers(); setSelectedCustomer(data.id); } catch (error) { message.error('Error adding customer: ' + error.message); } };
  
  const handleFullRemoveFromCart = (variantId) => {
    setCart(cart.filter(item => item.variant_id !== variantId));
  };

  const handleResetCart = () => { modal.confirm({ title: 'Reset Bill?', content: 'Are you sure you want to remove all items from the current bill?', okText: 'Yes, Reset', cancelText: 'No', onOk: () => { setCart([]); setDiscount(0); setAmountPaid(0); setSelectedCustomer(null); message.success('Bill has been reset.'); } }); };

  return (
    <>
      <Title level={2} style={{ marginBottom: '24px' }}>Point of Sale</Title>
      <Row gutter={24}>
        <Col xs={24} md={14}>
          <Card>
            <Search 
              placeholder="Search by name or scan barcode..." 
              onChange={(e) => handleSearch(e.target.value)} 
              value={searchTerm}
              style={{ marginBottom: '16px' }}
              ref={searchInputRef}
            />
            <List 
              loading={loading} 
              dataSource={filteredProducts} 
              renderItem={(product) => (
                <List.Item>
                  <List.Item.Meta title={<Text>{product.name}</Text>} description={`Brand: ${product.brand} - Stock: ${product.quantity}`} />
                  <Button type="primary" icon={<PlusOutlined />} onClick={() => handleAddToCart(product)} disabled={product.quantity <= 0}>Add</Button>
                </List.Item>
              )} 
              style={{ height: '60vh', overflowY: 'auto' }} 
            />
          </Card>
        </Col>
        <Col xs={24} md={10}>
          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <Title level={4} style={{ margin: 0 }}>Current Bill</Title>
              {cart.length > 0 && (<Button danger type="text" icon={<DeleteOutlined />} onClick={handleResetCart}>Reset Cart</Button>)}
            </div>
            <Form.Item label="Customer">
              <Space.Compact style={{ width: '100%' }}>
                <Select showSearch placeholder="Select a customer (optional)" style={{ width: '100%' }} value={selectedCustomer} onChange={(value) => setSelectedCustomer(value)} filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())} options={customers.map(customer => ({ value: customer.id, label: `${customer.name} - ${customer.phone_number}` }))} allowClear />
                <Button icon={<UserAddOutlined />} onClick={() => setIsAddCustomerModalOpen(true)} />
              </Space.Compact>
            </Form.Item>
            <Radio.Group onChange={(e) => setPaymentMethod(e.target.value)} value={paymentMethod} style={{ marginBottom: '16px' }}>
              <Radio value={'Paid'}>Paid</Radio>
              <Radio value={'Unpaid'} disabled={!selectedCustomer}>Pay Later (Udhaar)</Radio>
            </Radio.Group>
            {paymentMethod === 'Unpaid' && selectedCustomer && (<Form.Item label="Amount Paid Now (optional)"><InputNumber style={{ width: '100%' }} prefix={profile?.currency ? `${profile.currency} ` : ''} min={0} max={grandTotal} value={amountPaid} onChange={(value) => setAmountPaid(value || 0)} /></Form.Item>)}
            {cart.length === 0 ? <Empty description="Cart is empty" /> : 
              <List 
                dataSource={cart} 
                renderItem={(item) => { 
                  const productInStock = products.find(p => p.id === item.product_id); 
                  return (
                    <List.Item style={{ paddingInline: 0 }}> 
                      <div style={{ width: '100%' }}>
                        <Row justify="space-between" align="top">
                          <Col flex="auto">
                            {/* === BUG FIX START === */}
                            {/* item.product_name ke bajaye productInStock se naam hasil kiya gaya hai */}
                            <Text strong>{productInStock ? productInStock.name : 'Unknown Product'}</Text>
                            {/* === BUG FIX END === */}
                            
                            <div style={{ marginTop: '4px' }}>
                              <Space wrap size={[0, 4]}>
                                {/* General attributes (sirf value dikhayein) */}
                                {item.item_attributes && Object.entries(item.item_attributes).map(([key, value]) => {
                                  if (!value || key.toLowerCase().includes('imei') || key.toLowerCase().includes('serial')) {
                                    return null;
                                  }
                                  return <Tag key={key}>{value}</Tag>;
                                })}
                                {/* IMEI/Serial ke liye alag se Tag (sirf value dikhayein) */}
                                {item.imei && <Tag color="purple" key="imei">{item.imei}</Tag>}
                              </Space>
                            </div>
                          </Col>
                          <Col><Button type="text" danger icon={<DeleteOutlined />} onClick={() => handleFullRemoveFromCart(item.variant_id)} /></Col>
                        </Row>
                        
                        {(item.category_is_imei_based || item.imei) ? (
  <Row justify="space-between" align="middle" style={{ marginTop: '8px' }}>
    <Col><Text type="secondary">Price:</Text></Col>
    <Col><Text strong>{formatCurrency(item.sale_price, profile?.currency)}</Text></Col>
  </Row>
) : (
  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
    <InputNumber size="small" style={{ flex: 1 }} prefix={profile?.currency ? `${profile.currency} ` : ''} value={item.sale_price} 
      onChange={(value) => handleCartItemUpdate(item.variant_id, 'sale_price', value || 0)} 
      min={0} 
    />
    <InputNumber 
      size="small" 
      style={{ width: '60px' }}
      value={item.quantity} 
      onChange={(value) => handleCartItemUpdate(item.variant_id, 'quantity', value || 1)} 
      min={1} 
      max={products.find(p => p.id === item.product_id)?.quantity || item.quantity} 
    />
    <Text strong style={{ flex: 1, textAlign: 'right', minWidth: '80px' }}>
  {formatCurrency(item.sale_price * item.quantity, profile?.currency)}
</Text>
  </div>
)}
                      </div>
                    </List.Item>
                  ); 
                }} 
                style={{ maxHeight: '30vh', overflowY: 'auto', marginBottom: '16px' }} 
              />
            }
            <Divider />
            <Row gutter={16} style={{ marginBottom: '16px' }}>
              <Col span={14}><InputNumber style={{ width: '100%' }} placeholder="Total Bill Discount" value={discount} onChange={(val) => setDiscount(val || 0)} min={0} /></Col>
              <Col span={10}><Radio.Group value={discountType} onChange={(e) => setDiscountType(e.target.value)}><Radio.Button value="Amount">{profile?.currency || 'Rs.'}</Radio.Button><Radio.Button value="Percentage">%</Radio.Button></Radio.Group></Col>
            </Row>
            <Row justify="space-between"><Text>Subtotal</Text><Text>{formatCurrency(subtotal, profile?.currency)}</Text></Row>
            <Row justify="space-between"><Text>Discount</Text><Text style={{ color: '#ff4d4f' }}>- {formatCurrency(discountAmount, profile?.currency)}</Text></Row>
            <Divider style={{ margin: '8px 0' }}/>
            <Row justify="space-between" align="middle">
              <Col><Statistic title={<Title level={5} style={{ margin: 0 }}>Grand Total</Title>} value={grandTotal} precision={2} prefix={profile?.currency ? `${profile.currency} ` : ''} /></Col>
              <Col><Button type="primary" size="large" disabled={cart.length === 0 || isSubmitting} loading={isSubmitting} onClick={handleCompleteSale}>Complete Sale</Button></Col>
            </Row>
          </Card>
        </Col>
      </Row>
      <Modal title="Add a New Customer" open={isAddCustomerModalOpen} onCancel={() => setIsAddCustomerModalOpen(false)} onOk={() => addForm.submit()} okText="Save Customer"><Form form={addForm} layout="vertical" onFinish={handleAddCustomer}><Form.Item name="name" label="Full Name" rules={[{ required: true }]}><Input /></Form.Item><Form.Item name="phone_number" label="Phone Number" rules={[{ required: true }]}><Input /></Form.Item><Form.Item name="address" label="Address (Optional)"><Input.TextArea rows={3} /></Form.Item></Form></Modal>
      {isVariantModalOpen && <SelectVariantModal visible={isVariantModalOpen} onCancel={() => setIsVariantModalOpen(false)} onOk={handleVariantsSelected} product={productForVariantSelection} />}
    </>
  );
};

export default POS;