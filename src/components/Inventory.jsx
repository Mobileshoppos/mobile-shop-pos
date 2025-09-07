// --- File: src/components/Inventory.jsx (FINAL-CORRECTED CODE WITH ALL BULK FIELDS) ---

import React, { useState, useEffect } from 'react';
import { Button, Table, Typography, Modal, Form, Input, InputNumber, App, Select, Space, Divider } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
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
  
  const [productForm] = Form.useForm();
  const [stockForm] = Form.useForm();

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
      modal.confirm({
        title: 'How many phones do you want to add?',
        content: <InputNumber id="bulk-quantity-input" min={1} defaultValue={1} style={{ marginTop: '16px', width: '100%' }} autoFocus />,
        onOk: () => {
          const quantityInput = document.getElementById('bulk-quantity-input');
          if (quantityInput) {
            const quantity = parseInt(quantityInput.value, 10);
            openStockModalForBulk(product, quantity);
          }
        },
      });
    } else {
      stockForm.setFieldsValue({ purchase_price: product.purchase_price, sale_price: product.sale_price, condition: 'New', quantity: 1 });
      setIsStockModalOpen(true);
    }
  };

  const openStockModalForBulk = (product, quantity) => {
    if (!quantity || quantity < 1) { message.error("Please enter a valid quantity."); return; }
    const initialItems = Array.from({ length: quantity }, () => ({
      purchase_price: product.purchase_price,
      sale_price: product.sale_price,
      condition: 'New',
      pta_status: 'Approved',
    }));
    stockForm.setFieldsValue({ items: initialItems });
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
        if (!values.items || values.items.length === 0) { message.warning("No items to add."); setIsSubmittingStock(false); return; }
        newInventoryItems = values.items.map(item => ({ ...item, product_id: selectedProduct.id }));
      } else {
        const quantityToAdd = values.quantity || 1;
        for (let i = 0; i < quantityToAdd; i++) {
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

  const isSmartPhoneCategory = selectedProduct?.categories?.name === 'Smart Phones / Devices';

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <Title level={2} style={{ color: 'white' }}>Product Inventory</Title>
        <Button type="primary" size="large" onClick={showProductModal}>Add New Product Model</Button>
      </div>
      <Table columns={columns} dataSource={products} rowKey="id" loading={loading} />
      
      <Modal title="Add a New Product Model" open={isProductModalOpen} onOk={() => productForm.submit()} onCancel={handleProductCancel} okText="Save Model">
        <Form form={productForm} layout="vertical" onFinish={handleProductOk}>
          <Form.Item name="name" label="Product Name" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="category_id" label="Category" rules={[{ required: true }]}><Select placeholder="Select...">{categories.map(c => (<Option key={c.id} value={c.id}>{c.name}</Option>))}</Select></Form.Item>
          <Form.Item name="brand" label="Brand" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="purchase_price" label="Default Purchase Price"><InputNumber style={{ width: '100%' }} prefix="Rs." /></Form.Item>
          <Form.Item name="sale_price" label="Default Sale Price"><InputNumber style={{ width: '100%' }} prefix="Rs." /></Form.Item>
        </Form>
      </Modal>

      <Modal 
        title={<span>Add Stock for: <span style={{ color: '#1677ff' }}>{selectedProduct?.name}</span></span>} 
        open={isStockModalOpen} 
        onOk={() => stockForm.submit()} 
        onCancel={handleStockCancel} 
        okText="Save All Stock"
        confirmLoading={isSubmittingStock}
        width={isSmartPhoneCategory ? 1200 : 520} // Modal ko thora aur bara kar diya hai
      >
        <Form form={stockForm} layout="vertical" onFinish={handleStockOk} autoComplete="off">
          {isSmartPhoneCategory ? (
            <Form.List name="items">
              {(fields, { add, remove }) => (
                <div style={{ maxHeight: '60vh', overflowY: 'auto', paddingRight: '16px' }}>
                  {fields.map(({ key, name, ...restField }) => (
                    <div key={key}>
                      <Space align="baseline" style={{ display: 'flex', flexWrap: 'nowrap' }} >
                        <Form.Item {...restField} name={[name, 'imei']} rules={[{ required: true, message: 'IMEI!' }]}><Input placeholder="IMEI"/></Form.Item>
                        
                        {/* --- NAYI CHEEZ: Missing fields yahan add kiye gaye hain --- */}
                        <Form.Item {...restField} name={[name, 'ram_rom']}><Input placeholder="RAM/ROM" /></Form.Item>
                        <Form.Item {...restField} name={[name, 'pta_status']} rules={[{ required: true }]}><Select placeholder="PTA Status"><Option value="Approved">Approved</Option><Option value="Not Approved">Non-PTA</Option></Select></Form.Item>
                        <Form.Item {...restField} name={[name, 'guaranty']}><Input placeholder="Guaranty" /></Form.Item>
                        
                        <Form.Item {...restField} name={[name, 'color']}><Input placeholder="Color" /></Form.Item>
                        <Form.Item {...restField} name={[name, 'condition']} rules={[{ required: true }]}><Select placeholder="Condition"><Option value="New">New</Option><Option value="Open Box">Open Box</Option><Option value="Used">Used</Option></Select></Form.Item>
                        <Form.Item {...restField} name={[name, 'purchase_price']}><InputNumber placeholder="Purchase Price" prefix="Rs." /></Form.Item>
                        <Form.Item {...restField} name={[name, 'sale_price']}><InputNumber placeholder="Sale Price" prefix="Rs." /></Form.Item>
                        <DeleteOutlined onClick={() => remove(name)} style={{ color: 'red', cursor: 'pointer', fontSize: '16px' }} />
                      </Space>
                      <Divider style={{margin: '8px 0'}}/>
                    </div>
                  ))}
                </div>
              )}
            </Form.List>
          ) : (
            <>
              <Form.Item name="quantity" label="Quantity" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} min={1} /></Form.Item>
              <Form.Item name="imei" label="Serial Number (Optional)"><Input /></Form.Item>
              <Form.Item name="color" label="Color"><Input /></Form.Item>
              <Form.Item name="condition" label="Condition" rules={[{ required: true }]}><Select><Option value="New">New</Option><Option value="Open Box">Open Box</Option><Option value="Used">Used</Option><Option value="Refurbished">Refurbished</Option></Select></Form.Item>
              <Form.Item name="purchase_price" label="Actual Purchase Price"><InputNumber style={{ width: '100%' }} prefix="Rs." /></Form.Item>
              <Form.Item name="sale_price" label="Specific Sale Price"><InputNumber style={{ width: '100%' }} prefix="Rs." /></Form.Item>
            </>
          )}
        </Form>
      </Modal>
    </>
  );
};

export default Inventory;