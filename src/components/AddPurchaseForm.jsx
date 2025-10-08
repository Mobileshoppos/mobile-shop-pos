// src/components/AddPurchaseForm.jsx (Improved Variant Handling)

import React, { useState, useEffect } from 'react';
import {
  Modal, Form, Select, Input, Button, Divider, Typography, Table, Space, App, Row, Col,
} from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import DataService from '../DataService';
import AddItemModal from './AddItemModal';

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

  useEffect(() => {
    if (visible) {
      setLoading(true);
      Promise.all([DataService.getSuppliers(), DataService.getInventoryData()])
        .then(([suppliersData, inventoryData]) => {
          setSuppliers(suppliersData || []);
          setProducts(inventoryData.productsData || []);
        })
        .catch(() => { message.error("Failed to load initial data (suppliers/products)."); })
        .finally(() => { setLoading(false); });
    } else {
      form.resetFields();
      setPurchaseItems([]);
    }
  }, [visible, form, message]);

  // --- YAHAN TABDEELI KI GAYI HAI (Step 1) ---
  // Yahan se woh purana check hata diya gaya hai jo item ko dobara add karne se rokta tha.
  const handleAddItemClick = () => {
    const productId = form.getFieldValue('product_id');
    if (!productId) { message.warning('Please select a product first.'); return; }
    
    const selectedProdInfo = products.find(p => p.id === productId);
    setSelectedProduct(selectedProdInfo);
    setIsItemModalVisible(true);
  };

  // --- YAHAN TABDEELI KI GAYI HAI (Step 2) ---
  // Yeh function ab variants ko handle karne ke liye zyada samajhdar hai.
  const handleItemDetailsOk = (itemsData) => {
    // itemsData hamesha ek array hota hai.
    const newItem = itemsData[0]; // Non-IMEI items ke liye array mein ek hi item hoga.

    // IMEI wale items ko hamesha alag line mein add karein.
    if (newItem.imei) {
        setPurchaseItems(prevItems => [...prevItems, ...itemsData]);
    } else {
        // Non-IMEI items ke liye check karein ke kya same variant pehle se mojood hai.
        // Variant ki pehchaan hum 'color' se kar rahe hain. Agar mustaqbil mein 'size' bhi ho to usay bhi shamil kar sakte hain.
        const existingItemIndex = purchaseItems.findIndex(
            item => item.product_id === newItem.product_id && item.color === newItem.color
        );

        if (existingItemIndex > -1) {
            // Agar variant mojood hai, to sirf quantity update karein.
            const updatedItems = [...purchaseItems];
            updatedItems[existingItemIndex].quantity += newItem.quantity;
            setPurchaseItems(updatedItems);
            message.success(`Updated quantity for ${newItem.name} (${newItem.color || 'standard'})`);
        } else {
            // Agar naya variant hai, to usay list mein shamil karein.
            setPurchaseItems(prevItems => [...prevItems, newItem]);
        }
    }

    setIsItemModalVisible(false);
    setSelectedProduct(null);
    form.setFieldsValue({ product_id: null });
  };

  const handleRemoveItem = (recordToRemove) => {
    // Unique identifier ke liye product_id aur color ka combination istemal karein
    setPurchaseItems(prevItems => prevItems.filter(item => 
        !(item.product_id === recordToRemove.product_id && item.color === recordToRemove.color && item.imei === recordToRemove.imei)
    ));
  };

  const handleSavePurchase = async () => {
    try {
      const values = await form.validateFields(['supplier_id', 'notes']);
      if (purchaseItems.length === 0) { message.error("Please add at least one item to the purchase."); return; }
      
      setIsSubmitting(true);
      const purchasePayload = {
        p_supplier_id: values.supplier_id,
        p_notes: values.notes || null,
        p_inventory_items: purchaseItems.map(({ name, product_name, product_brand, ...item }) => item)
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

  const columns = [
    { title: 'Product', dataIndex: 'name', key: 'name', 
      render: (name, record) => `${name} ${record.color ? `[${record.color}]` : ''} ${record.imei ? `(${record.imei})` : ''}`
    },
    { title: 'Qty', dataIndex: 'quantity', key: 'quantity', align: 'center' },
    { title: 'Purchase Price', dataIndex: 'purchase_price', key: 'purchase_price', align: 'right', render: (price) => `Rs. ${price ? price.toLocaleString() : 0}` },
    { title: 'Subtotal', key: 'subtotal', align: 'right', render: (_, record) => `Rs. ${((record.quantity || 0) * (record.purchase_price || 0)).toLocaleString()}` },
    {
      title: 'Action', key: 'action', align: 'center',
      render: (_, record) => (<Button danger icon={<DeleteOutlined />} onClick={() => handleRemoveItem(record)} />),
    },
  ];

  return (
    <>
      <Modal
        title="Create New Purchase Invoice" open={visible} onCancel={onCancel} width={1000}
        footer={[ <Button key="back" onClick={onCancel}>Cancel</Button>, <Button key="submit" type="primary" loading={isSubmitting} onClick={handleSavePurchase}>Save Purchase</Button> ]}
      >
        <Form form={form} layout="vertical" style={{ marginTop: '24px' }}>
          <Title level={5}>1. Invoice Details</Title>
          <Row gutter={16}>
            <Col span={12}><Form.Item name="supplier_id" label="Supplier" rules={[{ required: true }]}><Select placeholder="Select a supplier" loading={loading}>{(suppliers || []).map(s => <Option key={s.id} value={s.id}>{s.name}</Option>)}</Select></Form.Item></Col>
            <Col span={12}><Form.Item name="notes" label="Notes / Bill # (Optional)"><Input placeholder="e.g., Invoice #INV-12345" /></Form.Item></Col>
          </Row>
          <Divider />
          <Title level={5}>2. Add Products to Invoice</Title>
          <Space.Compact style={{ width: '100%' }}>
              <Form.Item name="product_id" noStyle>
                  <Select
                      showSearch placeholder="Search and select a product to add" style={{ width: '100%' }} loading={loading}
                      filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
                      options={(products || []).map(p => ({ value: p.id, label: `${p.name} - ${p.brand}` }))}
                  />
              </Form.Item>
              <Button type="primary" onClick={handleAddItemClick}>Add to List</Button>
          </Space.Compact>
          <Divider />
          <Title level={5}>3. Items in this Purchase</Title>
          <Table
            columns={columns} dataSource={purchaseItems} 
            rowKey={(record) => `${record.product_id}-${record.color || 'default'}-${record.imei || 'na'}`} // Behtar unique key
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
      <AddItemModal visible={isItemModalVisible} onCancel={() => setIsItemModalVisible(false)} onOk={handleItemDetailsOk} product={selectedProduct} />
    </>
  );
};

export default AddPurchaseForm;