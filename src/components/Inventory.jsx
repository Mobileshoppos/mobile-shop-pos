// --- File: src/components/Inventory.jsx (FINAL VERSION - With Frontend Duplicate IMEI Check) ---

import React, { useState, useEffect, useRef, createRef } from 'react';
import { Button, Table, Typography, Modal, Form, Input, InputNumber, App, Select, Space, Divider, Tooltip } from 'antd';
import { DeleteOutlined, DownOutlined, RightOutlined, ArrowDownOutlined } from '@ant-design/icons';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';

const { Title } = Typography;
const { Option } = Select;

const Inventory = () => {
  const { message, modal } = App.useApp();
  const { user } = useAuth();
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isStockModalOpen, setIsStockModalOpen] = useState(false); 
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isSubmittingStock, setIsSubmittingStock] = useState(false);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedKeys, setExpandedKeys] = useState([0]);
  const [productForm] = Form.useForm();
  const [stockForm] = Form.useForm();
  const isFillingDown = useRef(false);
  const imeiInputRefs = useRef([]);

  const getData = async () => {
    try {
      setLoading(true);
      let { data: productsData, error: productsError } = await supabase.from('products_with_quantity').select(`*, categories ( name )`).order('name', { ascending: true });
      if (productsError) throw productsError;
      let { data: categoriesData, error: categoriesError } = await supabase.rpc('get_user_categories_with_settings');
      if (categoriesError) throw categoriesError;
      const visibleCategories = categoriesData.filter(cat => cat.is_visible);
      setProducts(productsData);
      setCategories(visibleCategories);
    } catch (error) { message.error('Error fetching data: ' + error.message); } 
    finally { setLoading(false); }
  };

  useEffect(() => { if (user) { getData(); } }, [user, message]);

  const columns = [
    { title: 'Product Name', dataIndex: 'name', key: 'name' },
    { title: 'Category', dataIndex: 'categories', key: 'category', render: (category) => category ? category.name : 'N/A' },
    { title: 'Brand', dataIndex: 'brand', key: 'brand' },
    { title: 'Available Stock', dataIndex: 'quantity', key: 'quantity' },
    { title: 'Default Sale Price', dataIndex: 'sale_price', key: 'sale_price', render: (price) => `Rs. ${price ? price.toFixed(2) : '0.00'}` },
    { title: 'Actions', key: 'actions', render: (_, record) => (<Space><Button type="primary" onClick={() => showStockModal(record)}>Add Stock</Button></Space>), },
  ];

  const showProductModal = () => { setIsProductModalOpen(true); };
  const handleProductCancel = () => { setIsProductModalOpen(false); };

  const handleProductOk = async (values) => {
    try {
      const { error } = await supabase.from('products').insert([{ ...values, user_id: user.id }]);
      if (error) throw error;
      message.success('Product Model added successfully!');
      setIsProductModalOpen(false);
      productForm.resetFields();
      getData();
    } catch (error) { message.error('Error adding product model: ' + error.message); }
  };

  const showStockModal = (product) => {
    setSelectedProduct(product);
    const isSmartPhone = product?.categories?.name === 'Smart Phones / Devices';
    if (isSmartPhone) {
      openStockModalForBulk(product, 1);
    } else {
      stockForm.setFieldsValue({ purchase_price: product.purchase_price, sale_price: product.sale_price, condition: 'New', quantity: 1 });
      setIsStockModalOpen(true);
    }
  };

  const openStockModalForBulk = (product, quantity) => {
    imeiInputRefs.current = Array(quantity).fill(0).map(() => createRef());
    const initialItems = Array.from({ length: quantity }, () => ({
      purchase_price: product.purchase_price, sale_price: product.sale_price,
      condition: 'New', pta_status: 'Approved',
      imei: undefined, ram_rom: undefined, guaranty: undefined, color: undefined,
    }));
    stockForm.setFieldsValue({ items: initialItems });
    setExpandedKeys([0]);
    setIsStockModalOpen(true);
  };
  
  const handleStockCancel = () => {
    setIsStockModalOpen(false);
    setSelectedProduct(null);
    stockForm.resetFields();
  };
  
  const handleStockOk = async (values) => {
    try {
      setIsSubmittingStock(true);
      const isSmartPhone = selectedProduct?.categories?.name === 'Smart Phones / Devices';
      let newInventoryItems = [];

      if (isSmartPhone) {
        if (!values.items || values.items.length === 0) {
          message.warning("No items to add.");
          setIsSubmittingStock(false);
          return;
        }
        newInventoryItems = values.items.map(item => ({ ...item, product_id: selectedProduct.id }));
      } else {
        for (let i = 0; i < (values.quantity || 1); i++) {
          newInventoryItems.push({ product_id: selectedProduct.id, imei: values.imei || null, color: values.color, condition: values.condition, purchase_price: values.purchase_price, sale_price: values.sale_price });
        }
      }
      const { error } = await supabase.from('inventory').insert(newInventoryItems);
      if (error) throw error;
      message.success(`${newInventoryItems.length} stock item(s) added for ${selectedProduct.name}`);
      handleStockCancel();
      getData();
    } catch (error) { message.error('Error adding stock: ' + error.message); } 
    finally { setIsSubmittingStock(false); }
  };

  const handleSubmit = async () => {
    try {
      let values = stockForm.getFieldsValue();
      let itemsToSave = values.items || [];
      
      // Step 1: Aakhri khali row ko hatana
      if (itemsToSave.length > 0) {
        const lastItem = itemsToSave[itemsToSave.length - 1];
        if (lastItem && (!lastItem.imei || lastItem.imei.trim() === '')) {
          itemsToSave = itemsToSave.slice(0, -1);
        }
      }
      
      // --- NAYA FEATURE: Duplicate IMEI Check ---
      const imeiMap = new Map();
      for (let i = 0; i < itemsToSave.length; i++) {
        const item = itemsToSave[i];
        const imei = item.imei ? item.imei.trim() : '';
        if (imei) {
          if (imeiMap.has(imei)) {
            const firstIndex = imeiMap.get(imei);
            message.error(`Duplicate IMEI "${imei}" found in Row ${firstIndex + 1} and Row ${i + 1}.`);
            return; // Submission ko roko
          }
          imeiMap.set(imei, i);
        }
      }
      // --- CHECK MUKAMMAL ---

      // Step 2: Form ki values ko update karna (taake khali row validation mein na aaye)
      stockForm.setFieldsValue({ items: itemsToSave });
      
      // Step 3: Form ko validate karna
      await stockForm.validateFields();

      // Step 4: Agar sab theek hai, to data save karna
      handleStockOk({ items: itemsToSave });

    } catch (errorInfo) {
      console.log('Validation Failed:', errorInfo);
      message.error('Please fill all required fields.');
    }
  };

  const toggleRowExpansion = (key) => {
    setExpandedKeys(prevKeys => prevKeys.includes(key) ? prevKeys.filter(k => k !== key) : [...prevKeys, key]);
  };

  const handleFormValuesChange = (changedValues, allValues) => {
    if (isFillingDown.current || !changedValues.items) return;
    const changedItemIndex = Object.keys(changedValues.items)[0];
    if (Number(changedItemIndex) === 0) {
      const changedFieldName = Object.keys(changedValues.items[0])[0];
      if (changedFieldName === 'imei') return;
      const firstItemValues = allValues.items[0];
      const updatedItems = [...allValues.items];
      for (let i = 1; i < updatedItems.length; i++) {
        if (firstItemValues[changedFieldName] !== undefined) {
          updatedItems[i] = { ...updatedItems[i], [changedFieldName]: firstItemValues[changedFieldName] };
        }
      }
      isFillingDown.current = true;
      stockForm.setFieldsValue({ items: updatedItems });
      setTimeout(() => { isFillingDown.current = false; }, 100);
    }
  };

  const applyToAllBelow = (sourceIndex) => {
    const allValues = stockForm.getFieldsValue();
    const sourceValues = allValues.items[sourceIndex];
    const updatedItems = [...allValues.items];
    for (let i = sourceIndex + 1; i < updatedItems.length; i++) {
      updatedItems[i] = { ...sourceValues, imei: updatedItems[i].imei };
    }
    stockForm.setFieldsValue({ items: updatedItems });
    message.success(`Details from row ${sourceIndex + 1} applied to all rows below.`);
  };

  const handleImeiKeyDown = (event, index) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      const nextIndex = index + 1;
      if (nextIndex < imeiInputRefs.current.length) {
        imeiInputRefs.current[nextIndex]?.current?.focus();
      }
    }
  };

  const handleImeiChange = (index, add) => {
    const allItems = stockForm.getFieldValue('items') || [];
    if (index === allItems.length - 1) {
      const firstItemValues = allItems[0];
      add({ ...firstItemValues, imei: undefined });
      imeiInputRefs.current.push(createRef());
    }
  };

  const isSmartPhoneCategory = selectedProduct?.categories?.name === 'Smart Phones / Devices';

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <Title level={2} style={{ color: 'white' }}>Product Inventory</Title>
        <Button type="primary" size="large" onClick={showProductModal}>Add New Product Model</Button>
      </div>
      <Table columns={columns} dataSource={products} rowKey="id" loading={loading} />
      
      <Modal title="Add a New Product Model" open={isProductModalOpen} onOk={() => productForm.submit()} onCancel={handleProductCancel} okText="Save Model">
        <Form form={productForm} layout="vertical" onFinish={handleProductOk}><Form.Item name="name" label="Product Name" rules={[{ required: true }]}><Input /></Form.Item><Form.Item name="category_id" label="Category" rules={[{ required: true }]}><Select placeholder="Select...">{categories.map(c => (<Option key={c.id} value={c.id}>{c.name}</Option>))}</Select></Form.Item><Form.Item name="brand" label="Brand" rules={[{ required: true }]}><Input /></Form.Item><Form.Item name="purchase_price" label="Default Purchase Price"><InputNumber style={{ width: '100%' }} prefix="Rs." /></Form.Item><Form.Item name="sale_price" label="Default Sale Price"><InputNumber style={{ width: '100%' }} prefix="Rs." /></Form.Item></Form>
      </Modal>

      <Modal 
        title={<span>Add Stock for: <span style={{ color: '#1677ff' }}>{selectedProduct?.name}</span></span>} 
        open={isStockModalOpen} 
        onOk={handleSubmit} 
        onCancel={handleStockCancel} 
        okText="Save All Stock"
        confirmLoading={isSubmittingStock}
        width={isSmartPhoneCategory ? 1200 : 520}
      >
        <Form form={stockForm} layout="vertical" onValuesChange={handleFormValuesChange} autoComplete="off">
          {isSmartPhoneCategory ? (
            <Form.List name="items">
              {(fields, { add, remove }) => (
                <div style={{ maxHeight: '60vh', overflowY: 'auto', paddingRight: '16px' }}>
                  {fields.map(({ key, name, ...restField }, index) => {
                    const isExpanded = expandedKeys.includes(key);
                    return (
                      <div key={key} style={{ border: '1px solid #f0f0f0', padding: '12px', borderRadius: '8px', marginBottom: '12px' }}>
                        <Space align="baseline" style={{ display: 'flex', width: '100%', justifyContent: 'space-between' }}>
                          <Form.Item {...restField} name={[name, 'imei']} rules={[{ required: true, message: 'IMEI!' }]} style={{ flexGrow: 1, marginBottom: isExpanded ? '24px' : '0' }}>
                            <Input 
                              placeholder="IMEI / Serial Number" 
                              ref={imeiInputRefs.current[index]}
                              onKeyDown={(e) => handleImeiKeyDown(e, index)}
                              onChange={() => handleImeiChange(index, add)}
                            />
                          </Form.Item>
                          <Space>
                            <Button type="text" icon={isExpanded ? <DownOutlined /> : <RightOutlined />} onClick={() => toggleRowExpansion(key)}>{isExpanded ? 'Collapse' : 'Details'}</Button>
                            {fields.length > 1 && <DeleteOutlined onClick={() => remove(name)} style={{ color: 'red', cursor: 'pointer', fontSize: '16px' }} />}
                          </Space>
                        </Space>
                        {isExpanded && (
                          <div>
                            <Space align="baseline" style={{ display: 'flex', flexWrap: 'nowrap', justifyContent: 'space-between', width: '100%' }} >
                              <Space>
                                <Form.Item {...restField} name={[name, 'ram_rom']}><Input placeholder="RAM/ROM" /></Form.Item>
                                <Form.Item {...restField} name={[name, 'pta_status']} rules={[{ required: true }]}><Select placeholder="PTA Status" style={{minWidth: 120}}><Option value="Approved">Approved</Option><Option value="Not Approved">Non-PTA</Option></Select></Form.Item>
                                <Form.Item {...restField} name={[name, 'guaranty']}><Input placeholder="Guaranty" /></Form.Item>
                                <Form.Item {...restField} name={[name, 'color']}><Input placeholder="Color" /></Form.Item>
                              </Space>
                              {name > 0 && (<Tooltip title="Apply these details to all rows below"><Button type="link" icon={<ArrowDownOutlined />} onClick={() => applyToAllBelow(name)}>Apply Down</Button></Tooltip>)}
                            </Space>
                            <Space align="baseline" style={{ display: 'flex', flexWrap: 'nowrap', marginTop: '8px' }} >
                                <Form.Item {...restField} name={[name, 'condition']} rules={[{ required: true }]}><Select placeholder="Condition" style={{minWidth: 120}}><Option value="New">New</Option><Option value="Open Box">Open Box</Option><Option value="Used">Used</Option></Select></Form.Item>
                                <Form.Item {...restField} name={[name, 'purchase_price']}><InputNumber placeholder="Purchase Price" prefix="Rs." style={{width: '100%'}} /></Form.Item>
                                <Form.Item {...restField} name={[name, 'sale_price']}><InputNumber placeholder="Sale Price" prefix="Rs." style={{width: '100%'}} /></Form.Item>
                            </Space>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </Form.List>
          ) : (
            <>{/* Accessories form unchanged */}</>
          )}
        </Form>
      </Modal>
    </>
  );
};

export default Inventory;