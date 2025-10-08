// src/components/Inventory.jsx (Cleaned up code)

import React, { useState, useEffect } from 'react';
import { Button, Table, Typography, Modal, Form, Input, InputNumber, App, Select, Tag } from 'antd';
// Note: PlusOutlined aur Tooltip ko hata diya gaya hai
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import ExpandedVariantsList from './ExpandedVariantsList';
// Note: AddStockModal ko hata diya gaya hai

const { Title, Text } = Typography;
const { Option } = Select;

const formatPriceRange = (min, max) => {
  if (min === null || max === null) return 'N/A';
  if (min === max) return `Rs. ${min.toLocaleString()}`;
  return `Rs. ${min.toLocaleString()} - ${max.toLocaleString()}`;
};

const Inventory = () => {
  const { message } = App.useApp();
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  
  const [productForm] = Form.useForm();
  
  const selectedCategoryId = Form.useWatch('category_id', productForm);

  const getData = async () => {
    try {
      setLoading(true);
      // DataService se data fetch karna behtar hai, lekin filhal isay aise hi rakhte hain
      const { data: productsData, error: productsError } = await supabase
        .from('products_display_view')
        .select('*')
        .order('name', { ascending: true });
      if (productsError) throw productsError;

      const { data: categoriesData, error: categoriesError } = await supabase.rpc('get_user_categories_with_settings');
      if (categoriesError) throw categoriesError;

      setProducts(productsData);
      setCategories(categoriesData.filter(cat => cat.is_visible));
    } catch (error) { 
      message.error('Error fetching data: ' + error.message); 
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (user) { getData(); } }, [user]);

  const handleProductOk = async (values) => {
    try {
      const productData = {
        ...values,
        barcode: values.barcode || null,
        user_id: user.id
      };
      const { error } = await supabase.from('products').insert([productData]);
      if (error) {
        if (error.code === '23505') {
            throw new Error('This barcode is already assigned to another product.');
        }
        throw error;
      }
      message.success('Product Model added successfully!');
      setIsProductModalOpen(false);
      productForm.resetFields();
      getData();
    } catch (error) { message.error('Error adding product model: ' + error.message); }
  };
  
  const isSmartPhoneCategorySelected = categories.find(c => c.id === selectedCategoryId)?.name === 'Smart Phones / Devices';

  const mainColumns = [
    { 
      title: 'Product Name', dataIndex: 'name', key: 'name',
      render: (name, record) => (
        <div><Text strong>{name}</Text>{record.brand && <div style={{ marginTop: '4px' }}><Tag>{record.brand}</Tag></div>}</div>
      )
    },
    { title: 'Category', dataIndex: 'category_name', key: 'category' },
    { title: 'Total Stock', dataIndex: 'quantity', key: 'quantity', render: (qty) => <Tag color={qty > 0 ? 'blue' : 'red'}>{qty ?? 0}</Tag> },
    { title: 'Sale Price Range', key: 'price_range', render: (_, record) => formatPriceRange(record.min_sale_price, record.max_sale_price) },
    // --- YAHAN TABDEELI KI GAYI HAI ---
    // 'Actions' column ko mukammal tor par hata diya gaya hai.
  ];

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <Title level={2}>Product Inventory</Title>
        <Button type="primary" size="large" onClick={() => setIsProductModalOpen(true)}>Add New Product Model</Button>
      </div>
      <Table 
        columns={mainColumns} dataSource={products} rowKey="id" loading={loading}
        expandable={{ expandedRowRender: (record) => <ExpandedVariantsList productId={record.id} />, rowExpandable: (record) => record.quantity > 0 }}
      />
      <Modal title="Add a New Product Model" open={isProductModalOpen} onOk={productForm.submit} onCancel={() => setIsProductModalOpen(false)} okText="Save Model">
        <Form form={productForm} layout="vertical" onFinish={handleProductOk} style={{marginTop: '24px'}}>
          <Form.Item name="name" label="Product Name" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="category_id" label="Category" rules={[{ required: true }]}><Select placeholder="Select...">{categories.map(c => (<Option key={c.id} value={c.id}>{c.name}</Option>))}</Select></Form.Item>
          <Form.Item name="brand" label="Brand" rules={[{ required: true }]}><Input /></Form.Item>
          
          {!isSmartPhoneCategorySelected && (
            <Form.Item 
              name="barcode" 
              label="Barcode / QR Code (Optional)"
              help="You can scan a barcode directly into this field."
            >
              <Input placeholder="e.g., 8964000141061" />
            </Form.Item>
          )}
          
          <Form.Item name="purchase_price" label="Default Purchase Price"><InputNumber style={{ width: '100%' }} prefix="Rs." /></Form.Item>
          <Form.Item name="sale_price" label="Default Sale Price"><InputNumber style={{ width: '100%' }} prefix="Rs." /></Form.Item>
        </Form>
      </Modal>
      {/* AddStockModal ke component ko yahan se hata diya gaya hai */}
    </>
  );
};

export default Inventory;