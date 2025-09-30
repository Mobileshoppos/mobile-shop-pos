// src/components/Inventory.jsx (Conditionally Hide Barcode Field)

import React, { useState, useEffect } from 'react';
import { Button, Table, Typography, Modal, Form, Input, InputNumber, App, Select, Tag, Tooltip } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import ExpandedVariantsList from './ExpandedVariantsList';
import AddStockModal from './AddStockModal';

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
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  
  const [productForm] = Form.useForm();
  
  // --- YAHAN TABDEELI KI GAYI HAI (Step 1) ---
  // Form ke andar 'category_id' field ki value ko watch karein
  const selectedCategoryId = Form.useWatch('category_id', productForm);

  const getData = async () => {
    try {
      setLoading(true);
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

  const showStockModal = (product) => {
    setSelectedProduct(product);
    setIsStockModalOpen(true);
  };

  const handleStockAdded = () => {
    setIsStockModalOpen(false);
    setSelectedProduct(null);
    getData();
  };
  
  // --- YAHAN TABDEELI KI GAYI HAI (Step 2) ---
  // Check karein ke kya selected category "Smart Phones / Devices" hai
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
    { 
      title: 'Actions', key: 'actions', 
      render: (_, record) => (
        <Tooltip title="Add Stock"><Button type="primary" shape="circle" icon={<PlusOutlined />} onClick={() => showStockModal(record)} /></Tooltip>
      ),
    },
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
          
          {/* --- YAHAN TABDEELI KI GAYI HAI (Step 3) --- */}
          {/* Barcode field sirf tab dikhayein jab Smart Phone category select NA ho */}
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
      {isStockModalOpen && (
        <AddStockModal visible={isStockModalOpen} onCancel={() => setIsStockModalOpen(false)} product={selectedProduct} onStockAdded={handleStockAdded} />
      )}
    </>
  );
};

export default Inventory;