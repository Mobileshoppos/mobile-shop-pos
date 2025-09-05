// --- File: src/components/Inventory.jsx (FINAL CODE) ---

import React, { useState, useEffect } from 'react';
import { Button, Table, Typography, Modal, Form, Input, InputNumber, App, Select } from 'antd';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';

const { Title } = Typography;
const { Option } = Select;

const Inventory = () => {
  const { message } = App.useApp();
  const { user } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form] = Form.useForm();

  // YEH FUNCTION UPDATE HUA HAI
  const getData = async () => {
    try {
      setLoading(true);
      
      // Products fetch karein (yeh waise hi hai)
      let { data: productsData, error: productsError } = await supabase
        .from('products')
        .select(`*, categories ( name )`)
        .order('name', { ascending: true });
      if (productsError) throw productsError;
      
      // Naye function se categories aur unki settings mangwayein
      let { data: categoriesData, error: categoriesError } = await supabase
        .rpc('get_user_categories_with_settings');
      if (categoriesError) throw categoriesError;

      // Sirf "Visible" categories ko dropdown ke liye alag karein
      const visibleCategories = categoriesData.filter(cat => cat.is_visible);

      setProducts(productsData);
      setCategories(visibleCategories); // State mein sirf visible categories daalein

    } catch (error) {
      message.error('Error fetching data: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      getData();
    }
  }, [user]);

  const columns = [
    { title: 'Product Name', dataIndex: 'name', key: 'name' },
    { title: 'Category', dataIndex: 'categories', key: 'category', render: (category) => category ? category.name : 'N/A' },
    { title: 'Brand', dataIndex: 'brand', key: 'brand' },
    { title: 'Quantity', dataIndex: 'quantity', key: 'quantity' },
    { title: 'Sale Price', dataIndex: 'sale_price', key: 'sale_price', render: (price) => `Rs. ${price ? price.toFixed(2) : '0.00'}` },
  ];

  const showModal = () => {
    setIsModalOpen(true);
  };

  const handleCancel = () => {
    setIsModalOpen(false);
  };

  const handleOk = async (values) => {
    try {
      const productData = {
        name: values.name,
        brand: values.brand,
        quantity: values.quantity,
        purchase_price: values.purchase_price,
        sale_price: values.sale_price,
        user_id: user.id,
        category_id: values.category_id,
      };

      const { error } = await supabase.from('products').insert([productData]);
      if (error) throw error;

      message.success('Product added successfully!');
      setIsModalOpen(false);
      form.resetFields();
      getData();
    } catch (error) {
      message.error('Error adding product: ' + error.message);
    }
  };

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <Title level={2} style={{ color: 'white' }}>Product Inventory</Title>
        <Button type="primary" size="large" onClick={showModal}>
          Add New Product
        </Button>
      </div>
      <Table columns={columns} dataSource={products} rowKey="id" loading={loading} />
      
      <Modal title="Add a New Product" open={isModalOpen} onOk={() => form.submit()} onCancel={handleCancel} okText="Save Product">
        <Form form={form} layout="vertical" onFinish={handleOk}>
          <Form.Item name="name" label="Product Name" rules={[{ required: true }]}><Input /></Form.Item>
          
          <Form.Item name="category_id" label="Category" rules={[{ required: true, message: 'Please select a category!' }]}>
            <Select placeholder="Select a category">
              {categories.map(category => (
                <Option key={category.id} value={category.id}>
                  {category.name}
                </Option>
              ))}
            </Select>
          </Form.Item>
          
          <Form.Item name="brand" label="Brand" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="quantity" label="Quantity" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="purchase_price" label="Purchase Price" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} prefix="Rs." /></Form.Item>
          <Form.Item name="sale_price" label="Sale Price" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} prefix="Rs." /></Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default Inventory;