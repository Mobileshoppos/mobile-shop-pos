import React, { useState, useEffect, useRef } from 'react';
import {
  Typography, Row, Col, Input, List, Card, Button, Statistic, Empty, App, Select, Radio, InputNumber, Form, Modal, Space, Divider, Tooltip
} from 'antd';
import { PlusOutlined, UserAddOutlined, DeleteOutlined, StarOutlined } from '@ant-design/icons';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { generateSaleReceipt } from '../utils/receiptGenerator';
import { printThermalReceipt } from '../utils/thermalPrinter';
import { Tag } from 'antd';
import SelectVariantModal from './SelectVariantModal';
import { formatCurrency } from '../utils/currencyFormatter';
import { db } from '../db';
import { useSync } from '../context/SyncContext';
import DataService from '../DataService';
import { generateInvoiceId } from '../utils/idGenerator';

const { Title, Text } = Typography;
const { Search } = Input;

const POS = () => {
  const { message, modal } = App.useApp();
  const { user, profile, refetchStockCount } = useAuth();
  const { processSyncQueue } = useSync();
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
  const [allProducts, setAllProducts] = useState([]);
  const [displayedProducts, setDisplayedProducts] = useState([]);
  const [popularCategories, setPopularCategories] = useState([]);
  const [activeCategoryId, setActiveCategoryId] = useState(null);
  const [topSellingProducts, setTopSellingProducts] = useState([]);

  useEffect(() => {
  if (!user) return;

  // NAYA initialLoad (Offline-First)
  const initialLoad = async () => {
    setLoading(true);
    try {
      // 1. Customers Local DB se layein
      const customersData = await db.customers.toArray();
      setCustomers(customersData.sort((a, b) => a.name.localeCompare(b.name)));

      // 2. Products Local DB se layein (Wohi DataService jo Inventory mein use kiya tha)
      const { productsData } = await DataService.getInventoryData();
      setAllProducts(productsData);
      
      // 3. Categories Local DB se layein
      const categoriesData = await db.categories.toArray();
      // Pehle 4 categories ko "Popular" bana lein
      const popCats = categoriesData.slice(0, 4).map(c => ({ category_id: c.id, category_name: c.name }));
      setPopularCategories(popCats);

      // 4. Filhal "Top Selling" mein hum saare products dikhayenge (Offline mein calculation mushkil hai)
      setDisplayedProducts(productsData);
      setTopSellingProducts(productsData); 

    } catch (error) {
      message.error("Error loading initial data: " + error.message);
    } finally {
      setLoading(false);
      if (searchInputRef.current) {
        searchInputRef.current.focus();
      }
    }
  };

  initialLoad();

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

// === NAYA AUR MUKAMMAL SEARCH FUNCTION START ===
// NAYA handleSearch (Offline-First)
  const handleSearch = async (value, source = 'input') => {
    const trimmedValue = value ? value.trim() : '';
    setSearchTerm(value || ''); 

    // Jab Enter dabaya jaye (Barcode ya IMEI Search)
    if (source === 'search' && trimmedValue) {
      setLoading(true);
      try {
        // 1. Pehle Products list mein Barcode check karein (Yeh list pehle se loaded hai)
        const productByBarcode = allProducts.find(p => p.barcode === trimmedValue);
        
        if (productByBarcode) {
             // Agar product mil gaya, to cart mein add karne ke liye modal kholein
             handleAddToCart(productByBarcode);
             setSearchTerm('');
             setDisplayedProducts(topSellingProducts);
             return;
        }

        // ... (Product check code ke baad) ...

        // 2. Agar Product table mein nahi mila, to Variants table mein Barcode check karein (NEW FIX)
        if (!productByBarcode) {
            // Local DB ke product_variants table mein dhoondein
            const variantItem = await db.product_variants.where('barcode').equals(trimmedValue).first();
            
            if (variantItem) {
                // Agar Variant mil gaya, to us variant ka "Available" stock dhoondein inventory mein
                const inventoryItem = await db.inventory
                    .where('variant_id').equals(variantItem.id) // Variant ID match karein
                    .filter(i => (i.status || '').toLowerCase() === 'available') // Sirf Available items
                    .first();

                if (inventoryItem) {
                    // Agar stock mil gaya, to parent product ki maloomat lein
                    const parentProduct = allProducts.find(p => p.id === inventoryItem.product_id);
                    if (parentProduct) {
                        const itemToAdd = {
                            ...inventoryItem,
                            product_name: parentProduct.name,
                            variant_id: inventoryItem.variant_id,
                            sale_price: inventoryItem.sale_price || parentProduct.sale_price
                        };
                        handleVariantsSelected([itemToAdd]);
                        setSearchTerm('');
                        setDisplayedProducts(topSellingProducts);
                        return;
                    }
                } else {
                     message.warning('Item found but out of stock!');
                     return;
                }
            }
        }

        // 3. Agar ab bhi nahi mila, to Inventory Items (IMEI) mein dhoondein...
        // ... (Baqi purana code yahan se continue hoga) ...

        // 2. Agar Product nahi mila, to Inventory Items (IMEI) mein dhoondein
        // Hamein Local DB ke 'inventory' table mein check karna hai
        const inventoryItem = await db.inventory.where('imei').equals(trimmedValue).first();
        
        // Sirf wo item uthayein jo 'available' ho
        if (inventoryItem && inventoryItem.status === 'available') {
             // Item mil gaya, ab iski parent product details (Naam, Brand) chahiye
             const parentProduct = allProducts.find(p => p.id === inventoryItem.product_id);
             
             if (parentProduct) {
                 const itemToAdd = {
                     ...inventoryItem,
                     product_name: parentProduct.name,
                     variant_id: inventoryItem.variant_id || inventoryItem.id,
                     sale_price: inventoryItem.sale_price || parentProduct.sale_price
                 };
                 handleVariantsSelected([itemToAdd]);
                 setSearchTerm('');
                 setDisplayedProducts(topSellingProducts);
                 return;
             }
        }

        message.warning(`No product found for: ${trimmedValue}`);

      } catch (error) {
        message.error("Search failed: " + error.message);
      } finally {
        setLoading(false);
      }
      return;
    }

    // Normal Typing Search (Naam se dhoondna) - Yeh pehle jaisa hi hai
    setActiveCategoryId(null); 

    if (trimmedValue === '') {
      setDisplayedProducts(topSellingProducts); 
    } else {
      const lowercasedValue = trimmedValue.toLowerCase();
      const filtered = allProducts.filter(product => 
        (product.name.toLowerCase().includes(lowercasedValue)) ||
        (product.brand && product.brand.toLowerCase().includes(lowercasedValue)) ||
        (product.category_name && product.category_name.toLowerCase().includes(lowercasedValue))
      );
      setDisplayedProducts(filtered);
    }
  };

  const handleCartItemUpdate = (variantId, field, value) => {
    setCart(cart.map(item => {
      if (item.variant_id === variantId) {
        if (field === 'quantity') {
          const productInStock = allProducts.find(p => p.id === item.product_id);
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

  // FINAL handleCompleteSale (With Debugging)
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
          
          // *** FINAL LOGIC: 6-Digit Device-Safe ID ***
          // Hum naya utility function use kar rahe hain jo Device ID aur Random Number
          // mila kar hamesha unique 6-digit ID banayega.
          const saleId = await generateInvoiceId(db);
          // ********************************************

          const saleDate = new Date().toISOString();

          const saleRecord = { 
              id: saleId, // Ab yeh Number hai (e.g., 75)
              customer_id: selectedCustomer || 1, 
              subtotal, 
              discount: discountAmount, 
              total_amount: grandTotal, 
              amount_paid_at_sale: paymentMethod === 'Paid' ? grandTotal : amountPaid, 
              payment_status: (paymentMethod === 'Unpaid' && (grandTotal - amountPaid > 0)) ? 'Unpaid' : 'Paid', 
              user_id: user.id,
              created_at: saleDate
          };

          const allSaleItemsToInsert = [];
          const inventoryIdsToUpdate = [];

          for (const cartItem of cart) {
            if (cartItem.imei) {
                const inventoryId = cartItem.inventory_id || cartItem.id;
                allSaleItemsToInsert.push({
                    id: crypto.randomUUID(), // Items ki ID UUID hi rahegi (Internal use)
                    sale_id: saleId,
                    inventory_id: inventoryId,
                    product_id: cartItem.product_id,
                    quantity: 1,
                    price_at_sale: cartItem.sale_price,
                    user_id: user.id
                });
                inventoryIdsToUpdate.push(inventoryId);
            } else {
                const availableItems = await db.inventory
                    .where('product_id').equals(cartItem.product_id)
                    .filter(item => (item.status || '').toLowerCase() === 'available') 
                    .limit(cartItem.quantity)
                    .toArray();

                if (availableItems.length < cartItem.quantity) {
                     throw new Error(`Not enough stock locally for ${cartItem.product_name}.`);
                }

                for (const invItem of availableItems) {
                    allSaleItemsToInsert.push({
                        id: crypto.randomUUID(),
                        sale_id: saleId,
                        inventory_id: invItem.id,
                        product_id: invItem.product_id,
                        quantity: 1,
                        price_at_sale: cartItem.sale_price,
                        user_id: user.id
                    });
                    inventoryIdsToUpdate.push(invItem.id);
                }
            }
          }

          // Save Locally
          await db.sales.add(saleRecord);
          if (db.sale_items) await db.sale_items.bulkAdd(allSaleItemsToInsert);
          
          for (const id of inventoryIdsToUpdate) {
              await db.inventory.update(id, { status: 'sold' });
          }

          // Balance Update
          if (paymentMethod === 'Unpaid' && selectedCustomer) {
              const customer = await db.customers.get(selectedCustomer);
              if (customer) {
                  const newBalance = (customer.balance || 0) + udhaarAmount;
                  await db.customers.update(selectedCustomer, { balance: newBalance });
              }
          }

          // Add to Sync Queue
          await db.sync_queue.add({
              table_name: 'sales',
              action: 'create_full_sale',
              data: {
                  sale: saleRecord,
                  items: allSaleItemsToInsert,
                  inventory_ids: inventoryIdsToUpdate
              }
          });
          
          message.success(`Sale #${saleId} completed successfully!`);
          saleDataForReceipt = saleRecord;
          
          processSyncQueue();

        } catch (error) {
          console.error("Sale Error:", error);
          message.error('Sale failed: ' + error.message);
          setIsSubmitting(false);
          return;
        }

        // Print Receipt
        if (saleDataForReceipt) {
             const receiptData = {
                 ...saleDataForReceipt,
                 shopName: profile?.shop_name || 'My Shop',
                 shopAddress: profile?.address || '',
                 shopPhone: profile?.phone || '',
                 saleId: saleDataForReceipt.id, // Ab yeh Number hai (e.g., 75)
                 items: cart.map(c => ({
                     name: c.product_name,
                     quantity: c.quantity,
                     price_at_sale: c.sale_price,
                     total: c.quantity * c.sale_price
                 })),
                 customerName: customers.find(c => c.id === saleDataForReceipt.customer_id)?.name || 'Walk-in Customer',
                 saleDate: new Date().toISOString(),
                 amountPaid: saleDataForReceipt.amount_paid_at_sale,
                 paymentStatus: saleDataForReceipt.payment_status,
                 grandTotal: saleDataForReceipt.total_amount
             };

             if (profile?.receipt_format === 'thermal') {
                printThermalReceipt(receiptData, profile?.currency);
             } else {
                generateSaleReceipt(receiptData, profile?.currency);
             }
        }

        // Reset
        setCart([]);
        setSelectedCustomer(null);
        setPaymentMethod('Paid');
        setAmountPaid(0);
        setDiscount(0);
        setDiscountType('Amount');
        
        const { productsData } = await DataService.getInventoryData();
        setAllProducts(productsData);
        setDisplayedProducts(productsData);

        if (searchInputRef.current) { searchInputRef.current.focus(); }
        setIsSubmitting(false);
      }
    });
  };

  const subtotal = cart.reduce((sum, item) => sum + (item.sale_price * item.quantity), 0);
  let discountAmount = discountType === 'Amount' ? discount : (subtotal * discount) / 100;
  const grandTotal = Math.max(0, subtotal - discountAmount);

  // NAYA handleAddCustomer (Offline-First)
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
      
      // 3. Sync Queue mein daalein (Taake internet aane par upload ho)
      await db.sync_queue.add({
          table_name: 'customers',
          action: 'create',
          data: newCustomer
      });

      message.success('Customer added successfully!');
      setIsAddCustomerModalOpen(false);
      addForm.resetFields();

      // 4. Dropdown list ko update karein
      setCustomers(currentCustomers => 
        [...currentCustomers, newCustomer].sort((a, b) => a.name.localeCompare(b.name))
      );
      setSelectedCustomer(newCustomer.id);
      
      // 5. Upload Trigger karein (Agar internet hua to foran chala jayega)
      processSyncQueue();

    } catch (error) {
      message.error('Error adding customer: ' + error.message);
    }
  };
  
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
  placeholder="Search or Scan Barcode & Press Enter"
  onChange={(e) => handleSearch(e.target.value, 'input')}
  onSearch={(value) => handleSearch(value, 'search')}
  allowClear
  value={searchTerm}
  style={{ marginBottom: '16px' }}
  ref={searchInputRef}
/>

<div style={{ margin: '16px 0' }}>
  <Space wrap>
    <Tooltip title="Top Selling">
  <Button
    type={!activeCategoryId ? 'primary' : 'default'}
    icon={<StarOutlined />}
    onClick={() => {
  setActiveCategoryId(null);
  setSearchTerm('');
  setDisplayedProducts(topSellingProducts);
}}
  />
</Tooltip>
    {popularCategories.map(cat => (
      <Button
        key={cat.category_id}
        type={activeCategoryId === cat.category_id ? 'primary' : 'default'}
        onClick={() => {
          setActiveCategoryId(cat.category_id);
          const filtered = allProducts.filter(p => p.category_id === cat.category_id);
          setDisplayedProducts(filtered);
          setSearchTerm('');
        }}
      >
        {cat.category_name}
      </Button>
    ))}
    <Select
      placeholder="All Categories"
      value={activeCategoryId}
      onChange={(value) => {
        if (!value) {
          setActiveCategoryId(null);
          handleSearch('');
        } else {
          setActiveCategoryId(value);
          const filtered = allProducts.filter(p => p.category_id === value);
          setDisplayedProducts(filtered);
        }
        setSearchTerm('');
      }}
      style={{ width: 150 }}
      allowClear
    >
      {allProducts
        .reduce((acc, current) => {
          if (!acc.find(item => item.category_id === current.category_id)) {
            acc.push({ category_id: current.category_id, category_name: current.category_name });
          }
          return acc;
        }, [])
        .sort((a,b) => a.category_name.localeCompare(b.category_name))
        .map(cat => (
          <Select.Option key={cat.category_id} value={cat.category_id}>
            {cat.category_name}
          </Select.Option>
        ))
      }
    </Select>
  </Space>
</div>
<Divider style={{ margin: '0 0 16px 0' }} />

            <List loading={loading} dataSource={displayedProducts} 
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
              <Radio value={'Unpaid'} disabled={!selectedCustomer}>Pay Later (Credit)</Radio>
            </Radio.Group>
            {paymentMethod === 'Unpaid' && selectedCustomer && (<Form.Item label="Amount Paid Now (optional)"><InputNumber style={{ width: '100%' }} prefix={profile?.currency ? `${profile.currency} ` : ''} min={0} max={grandTotal} value={amountPaid} onChange={(value) => setAmountPaid(value || 0)} /></Form.Item>)}
            {cart.length === 0 ? <Empty description="Cart is empty" /> : 
              <List 
                dataSource={cart} 
                renderItem={(item) => { 
                  const productInStock = allProducts.find(p => p.id === item.product_id); 
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
      max={allProducts.find(p => p.id === item.product_id)?.quantity || item.quantity} 
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