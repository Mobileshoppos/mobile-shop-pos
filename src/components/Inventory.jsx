// src/components/Inventory.jsx (Mukammal, aakhri aur theek kiya hua code)

import React, { useState, useEffect, useRef } from 'react';
import { Button, Table, Typography, Modal, Form, Input, InputNumber, App, Select, Space, Tag, Spin, Col, Row, Divider, Tooltip, List } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';

const { Title, Text } = Typography;
const { Option } = Select;

// Helper function to format the price range
const formatPriceRange = (min, max) => {
  if (min === null || max === null) return 'N/A';
  if (min === max) return `Rs. ${min.toLocaleString()}`;
  return `Rs. ${min.toLocaleString()} - ${max.toLocaleString()}`;
};

const ExpandedVariantsList = ({ productId }) => {
  const [variants, setVariants] = useState([]);
  const [loading, setLoading] = useState(true);
  const { message } = App.useApp();

  useEffect(() => {
    const fetchVariants = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase.rpc('get_product_variants', { p_product_id: productId });
        if (error) throw error;
        setVariants(data);
      } catch (error) {
        message.error("Error fetching product variants: " + error.message);
      } finally {
        setLoading(false);
      }
    };
    fetchVariants();
  }, [productId, message]);

  if (loading) {
    return <div style={{ padding: '24px', textAlign: 'center' }}><Spin /></div>;
  }

  const tagOrder = ['condition', 'color', 'ram_rom', 'guaranty', 'pta_status'];

  return (
    <List
      itemLayout="vertical"
      dataSource={variants}
      renderItem={(variant) => (
        <List.Item key={JSON.stringify(variant.details)} style={{ borderBottom: '1px solid #f0f0f0', padding: '16px 8px' }}>
          <Row align="top" gutter={[16, 8]}>
            <Col xs={24} sm={10} md={9}>
              <Space align="start">
                <Tag color="blue" style={{ fontSize: '14px', padding: '6px 10px', marginTop: '5px' }}>{variant.quantity} Units</Tag>
                <div>
                  <Text strong>Sale Price:</Text> <Text>Rs. {variant.sale_price?.toLocaleString()}</Text><br/>
                  <Text type="secondary">Purchase:</Text> <Text type="secondary">Rs. {variant.purchase_price?.toLocaleString()}</Text>
                </div>
              </Space>
            </Col>
            <Col xs={24} sm={14} md={15}>
              <Space wrap>
                {tagOrder.map(key => {
                  const value = variant.details[key];
                  if (!value) return null;
                  let label = value;
                  if (key === 'pta_status') {
                    label = value === 'Not Approved' ? 'Non-PTA' : `PTA-${value}`;
                  }
                  return <Tag key={key}>{label}</Tag>;
                })}
              </Space>
            </Col>
          </Row>
        </List.Item>
      )}
    />
  );
};


const Inventory = () => {
  const { message } = App.useApp();
  const { user } = useAuth();
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isSubmittingStock, setIsSubmittingStock] = useState(false);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [imeis, setImeis] = useState(['']);
  const imeiInputRefs = useRef([]);
  const [productForm] = Form.useForm();
  const [stockForm] = Form.useForm();

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

      const visibleCategories = categoriesData.filter(cat => cat.is_visible);
      setProducts(productsData);
      setCategories(visibleCategories);
    } catch (error) { 
      message.error('Error fetching data: ' + error.message); 
    }
    finally { setLoading(false); }
  };

  useEffect(() => { if (user) { getData(); } }, [user, message]);

  // --- DESIGN BEHTAR KIYA GAYA HAI ---
  const mainColumns = [
    { 
      title: 'Product Name', 
      dataIndex: 'name', 
      key: 'name',
      render: (name, record) => (
        <div>
          <Text strong>{name}</Text>
          {record.brand && <div style={{ marginTop: '4px' }}><Tag>{record.brand}</Tag></div>}
        </div>
      )
    },
    { title: 'Category', dataIndex: 'category_name', key: 'category' },
    // { title: 'Brand', dataIndex: 'brand', key: 'brand' }, // Brand ka column yahan se hata diya gaya hai
    { title: 'Total Stock', dataIndex: 'quantity', key: 'quantity', render: (qty) => <Tag color={qty > 0 ? 'blue' : 'red'}>{qty ?? 0}</Tag> },
    { 
      title: 'Sale Price Range', 
      key: 'price_range', 
      render: (_, record) => formatPriceRange(record.min_sale_price, record.max_sale_price) 
    },
    { 
      title: 'Actions', 
      key: 'actions', 
      render: (_, record) => (
        <Tooltip title="Add Stock">
          <Button type="primary" shape="circle" icon={<PlusOutlined />} onClick={() => showStockModal(record)} />
        </Tooltip>
      ),
    },
  ];

  const showProductModal = () => setIsProductModalOpen(true);
  const handleProductCancel = () => setIsProductModalOpen(false);

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
    const isSmartPhone = product?.category_name === 'Smart Phones / Devices';
    
    const defaultPurchasePrice = product.default_purchase_price;
    const defaultSalePrice = product.default_sale_price;

    if (isSmartPhone) {
      stockForm.setFieldsValue({
        purchase_price: defaultPurchasePrice,
        sale_price: defaultSalePrice,
        condition: 'New',
        pta_status: 'Approved',
      });
      setImeis(['']);
    } else {
      stockForm.setFieldsValue({
        purchase_price: defaultPurchasePrice,
        sale_price: defaultSalePrice,
        condition: 'New',
        quantity: 1
      });
    }
    setIsStockModalOpen(true);
  };

  const handleStockCancel = () => {
    setIsStockModalOpen(false);
    setSelectedProduct(null);
    stockForm.resetFields();
    setImeis(['']);
  };

  const handleImeiChange = (index, value) => {
    const newImeis = [...imeis];
    newImeis[index] = value;
    if (index === imeis.length - 1 && value.trim() !== '') {
      newImeis.push('');
    }
    setImeis(newImeis);
  };

  const handleImeiKeyDown = (event, index) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      const nextIndex = index + 1;
      if (imeiInputRefs.current[nextIndex]) {
        imeiInputRefs.current[nextIndex].focus();
      }
    }
  };

  const handleSubmitStock = async () => {
    try {
      if (!user || !selectedProduct) {
        message.error("User session or selected product not found. Please close the form and try again.");
        return;
      }

      await stockForm.validateFields();
      const values = stockForm.getFieldsValue();
      setIsSubmittingStock(true);
      const isSmartPhone = selectedProduct?.category_name === 'Smart Phones / Devices';
      let newInventoryItems = [];

      if (isSmartPhone) {
        const finalImeis = imeis.map(imei => imei.trim()).filter(imei => imei !== '');
        if (finalImeis.length === 0) {
          message.warning("Please enter at least one IMEI/Serial number.");
          setIsSubmittingStock(false);
          return;
        }
        const uniqueImeis = new Set(finalImeis);
        if (uniqueImeis.size !== finalImeis.length) {
          message.error("Duplicate IMEI/Serial numbers found in the list. Please correct them.");
          setIsSubmittingStock(false);
          return;
        }
        newInventoryItems = finalImeis.map(imei => ({ ...values, imei, product_id: selectedProduct.id, user_id: user.id }));
      } else {
        const { quantity, ...itemDetails } = values;
        for (let i = 0; i < (quantity || 1); i++) {
          newInventoryItems.push({
            ...itemDetails,
            product_id: selectedProduct.id,
            user_id: user.id,
            imei: itemDetails.imei || null,
          });
        }
      }

      const { error } = await supabase.from('inventory').insert(newInventoryItems);
      if (error) {
        if (error.code === '23505' && error.message.includes('unique_imei_per_user')) {
           const match = error.message.match(/\(([^)]+)\)/);
           if (match && match[1]) {
             const duplicateImei = match[1].split(',').pop().trim();
             throw new Error(`This IMEI (${duplicateImei}) already exists in your inventory.`);
           } else {
             throw new Error("One of the entered IMEIs already exists in your inventory.");
           }
        }
        throw error;
      }
      message.success(`${newInventoryItems.length} stock item(s) added for ${selectedProduct.name}`);
      handleStockCancel();
      getData();
    } catch (error) {
      message.error('Error adding stock: ' + error.message);
    } finally {
      setIsSubmittingStock(false);
    }
  };

  const isSmartPhoneCategory = selectedProduct?.category_name === 'Smart Phones / Devices';

  useEffect(() => {
    imeiInputRefs.current = imeis.map((_, i) => imeiInputRefs.current[i] || React.createRef());
  }, [imeis]);

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <Title level={2}>Product Inventory</Title>
        <Button type="primary" size="large" onClick={showProductModal}>Add New Product Model</Button>
      </div>
      <Table 
        columns={mainColumns} 
        dataSource={products} 
        rowKey="id" 
        loading={loading}
        expandable={{
          expandedRowRender: (record) => <ExpandedVariantsList productId={record.id} />,
          rowExpandable: (record) => record.quantity > 0,
        }}
      />
      
      <Modal title="Add a New Product Model" open={isProductModalOpen} onOk={productForm.submit} onCancel={handleProductCancel} okText="Save Model">
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
        onOk={handleSubmitStock} 
        onCancel={handleStockCancel} 
        okText="Save All Stock"
        confirmLoading={isSubmittingStock}
        width={isSmartPhoneCategory ? 800 : 520}
      >
        <Form form={stockForm} layout="vertical" autoComplete="off">
          {isSmartPhoneCategory ? (
            <>
              <Title level={5}>Step 1: Enter Common Details for this Batch</Title>
              <Row gutter={16}>
                <Col span={12}><Form.Item name="purchase_price" label="Purchase Price" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} prefix="Rs." /></Form.Item></Col>
                <Col span={12}><Form.Item name="sale_price" label="Sale Price" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} prefix="Rs." /></Form.Item></Col>
                <Col span={12}><Form.Item name="condition" label="Condition" rules={[{ required: true }]}><Select><Option value="New">New</Option><Option value="Open Box">Open Box</Option><Option value="Used">Used</Option></Select></Form.Item></Col>
                <Col span={12}><Form.Item name="pta_status" label="PTA Status" rules={[{ required: true }]}><Select><Option value="Approved">Approved</Option><Option value="Not Approved">Non-PTA</Option></Select></Form.Item></Col>
                <Col span={8}><Form.Item name="color" label="Color"><Input /></Form.Item></Col>
                <Col span={8}><Form.Item name="ram_rom" label="RAM/ROM"><Input /></Form.Item></Col>
                <Col span={8}><Form.Item name="guaranty" label="Guaranty"><Input /></Form.Item></Col>
              </Row>
              <Divider />
              <Title level={5}>Step 2: Enter IMEI / Serial Numbers</Title>
              <div style={{ maxHeight: '40vh', overflowY: 'auto', padding: '8px' }}>
                {imeis.map((imei, index) => (
                  <Form.Item key={index} style={{ marginBottom: 8 }}>
                    <Input
                      ref={el => imeiInputRefs.current[index] = el}
                      placeholder={`IMEI / Serial #${index + 1}`}
                      value={imei}
                      onChange={(e) => handleImeiChange(index, e.target.value)}
                      onKeyDown={(e) => handleImeiKeyDown(e, index)}
                    />
                  </Form.Item>
                ))}
              </div>
            </>
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