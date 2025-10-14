// src/components/AddPurchaseForm.jsx (Final Corrected Version with DB Query Fix)

import React, { useState, useEffect, useCallback } from 'react';
import {
  Modal, Form, Select, Input, Button, Divider, Typography, Table, Space, App, Row, Col,
} from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import DataService from '../DataService';
import AddItemModal from './AddItemModal';
import { supabase } from '../supabaseClient';

const { Title, Text } = Typography;
const { Option } = Select;

const AddPurchaseForm = ({ visible, onCancel, onPurchaseCreated }) => {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [purchaseItems, setPurchaseItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isItemModalVisible, setIsItemModalVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedProductAttributes, setSelectedProductAttributes] = useState([]);

  // --- YAHAN GHALTI THEEK KI GAYI HAI ---
  // The select query now only asks for columns that actually exist.
  const getProductsWithCategory = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          id, 
          name, 
          brand, 
          category_id,
          categories ( is_imei_based )
        `);
      
      if (error) throw error;
      
      return data.map(p => ({
        ...p,
        category_is_imei_based: p.categories?.is_imei_based ?? false
      }));
    } catch (error) {
      // Throw the error again so it can be caught by the Promise.all catcher
      throw new Error("Error fetching products: " + error.message);
    }
  }, []);

  useEffect(() => {
    if (visible) {
      setLoading(true);
      Promise.all([DataService.getSuppliers(), getProductsWithCategory()])
        .then(([suppliersData, productsData]) => {
          setSuppliers(suppliersData || []);
          setProducts(productsData || []);
        })
        .catch((err) => { 
          // Display the specific error message from the failed promise
          message.error(err.message || "Failed to load initial data for purchase form."); 
        })
        .finally(() => { setLoading(false); });
    } else {
      form.resetFields();
      setPurchaseItems([]);
    }
  }, [visible, form, message, getProductsWithCategory]);

  const handleAddItemClick = async () => {
    const productId = form.getFieldValue('product_id');
    if (!productId) { message.warning('Please select a product first.'); return; }
    
    const selectedProdInfo = products.find(p => p.id === productId);
    
    try {
      const { data, error } = await supabase
          .from('category_attributes')
          .select('*')
          .eq('category_id', selectedProdInfo.category_id);
      
      if (error) throw error;
      
      setSelectedProductAttributes(data);
      setSelectedProduct(selectedProdInfo);
      setIsItemModalVisible(true);
    } catch (error) {
      message.error("Could not fetch attributes for this category: " + error.message);
    }
  };

  const handleItemDetailsOk = (itemsData) => {
    setPurchaseItems(prevItems => [...prevItems, ...itemsData]);
    setIsItemModalVisible(false);
    setSelectedProduct(null);
    setSelectedProductAttributes([]);
    form.setFieldsValue({ product_id: null });
  };

  const handleRemoveItem = (recordToRemove) => {
    setPurchaseItems(prevItems => prevItems.filter(item => 
        !(item.product_id === recordToRemove.product_id && JSON.stringify(item.item_attributes) === JSON.stringify(recordToRemove.item_attributes) && item.imei === recordToRemove.imei)
    ));
  };

  const handleSavePurchase = async () => {
    try {
      const values = await form.validateFields(['supplier_id', 'notes']);
      if (purchaseItems.length === 0) { message.error("Please add at least one item."); return; }
      
      setIsSubmitting(true);
      const purchasePayload = {
        p_supplier_id: values.supplier_id,
        p_notes: values.notes || null,
        p_inventory_items: purchaseItems.map(({ name, brand, categories, category_is_imei_based, ...item }) => item)
      };
      
      await DataService.createNewPurchase(purchasePayload);
      message.success("Purchase invoice created successfully!");
      onPurchaseCreated();
    } catch (error) {
      if (error.name !== 'ValidationError') { message.error("Failed to save purchase: " + error.message); }
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const renderItemName = (record) => {
    let details = [];
    if (record.item_attributes) {
        Object.entries(record.item_attributes).forEach(([key, value]) => {
            if (value && key.toUpperCase() !== 'IMEI') details.push(`${key}: ${value}`);
        });
    }
    if (record.imei) details.push(`IMEI: ${record.imei}`);
    return `${record.name} ${details.length > 0 ? `(${details.join(', ')})` : ''}`;
  }

  const columns = [
    { title: 'Product', key: 'name', render: (_, record) => renderItemName(record) },
    { title: 'Qty', dataIndex: 'quantity', key: 'quantity', align: 'center' },
    { title: 'Purchase Price', dataIndex: 'purchase_price', key: 'purchase_price', align: 'right', render: (price) => `Rs. ${price ? price.toLocaleString() : 0}` },
    { title: 'Subtotal', key: 'subtotal', align: 'right', render: (_, record) => `Rs. ${((record.quantity || 0) * (record.purchase_price || 0)).toLocaleString()}` },
    { title: 'Action', key: 'action', align: 'center', render: (_, record) => (<Button danger icon={<DeleteOutlined />} onClick={() => handleRemoveItem(record)} />)},
  ];

  return (
    <>
      <Modal
        title="Create New Purchase Invoice" open={visible} onCancel={onCancel} width={1000}
        footer={[ <Button key="back" onClick={onCancel}>Cancel</Button>, <Button key="submit" type="primary" loading={isSubmitting} onClick={handleSavePurchase}>Save Purchase</Button> ]}
      >
        <Form form={form} layout="vertical" style={{ marginTop: '24px' }}>
          <Row gutter={16}>
            <Col span={12}><Form.Item name="supplier_id" label="Supplier" rules={[{ required: true }]}><Select placeholder="Select a supplier" loading={loading}>{(suppliers || []).map(s => <Option key={s.id} value={s.id}>{s.name}</Option>)}</Select></Form.Item></Col>
            <Col span={12}><Form.Item name="notes" label="Notes / Bill # (Optional)"><Input placeholder="e.g., Invoice #INV-12345" /></Form.Item></Col>
          </Row>
          <Divider />
          <Title level={5}>Add Products to Invoice</Title>
          <Space.Compact style={{ width: '100%' }}>
              <Form.Item name="product_id" noStyle>
                  <Select showSearch placeholder="Search and select a product to add" style={{ width: '100%' }} loading={loading}
                      filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
                      options={(products || []).map(p => ({ value: p.id, label: `${p.name} - ${p.brand}` }))}
                  />
              </Form.Item>
              <Button type="primary" onClick={handleAddItemClick}>Add to List</Button>
          </Space.Compact>
          <Divider />
          <Title level={5}>Items in this Purchase</Title>
          <Table
            columns={columns} 
            dataSource={purchaseItems}
            rowKey={(record, index) => `${record.product_id}-${index}-${record.imei}`}
            pagination={false}
            summary={pageData => {
              const total = pageData.reduce((sum, item) => sum + ((item.quantity || 0) * (item.purchase_price || 0)), 0);
              return (
                <Table.Summary.Row>
                  <Table.Summary.Cell index={0} colSpan={3}><Text strong>Total Amount</Text></Table.Summary.Cell>
                  <Table.Summary.Cell index={1} align="right"><Text strong type="danger">Rs. {total.toLocaleString()}</Text></Table.Summary.Cell>
                  <Table.Summary.Cell index={2}></Table.Summary.Cell>
                </Table.Summary.Row>
              );
            }}
          />
        </Form>
      </Modal>
      {isItemModalVisible && 
        <AddItemModal 
          visible={isItemModalVisible} 
          onCancel={() => setIsItemModalVisible(false)} 
          onOk={handleItemDetailsOk} 
          product={selectedProduct}
          attributes={selectedProductAttributes}
        />
      }
    </>
  );
};

export default AddPurchaseForm;