// src/components/AddStockModal.jsx (Final Corrected Code)

import React, { useState, useEffect, useRef } from 'react';
import { Modal, Form, Input, InputNumber, Select, Row, Col, Divider, Typography, App, Button, Space } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import DataService from '../DataService';

const { Title, Text } = Typography;
const { Option } = Select;

const AddStockModal = ({ visible, onCancel, product, onStockAdded }) => {
  const { message, modal } = App.useApp();
  const [form] = Form.useForm();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imeis, setImeis] = useState(['']);
  const imeiInputRefs = useRef([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loadingSuppliers, setLoadingSuppliers] = useState(false);

  const isSmartPhoneCategory = product?.category_name === 'Smart Phones / Devices';

  useEffect(() => {
    if (visible) {
      setLoadingSuppliers(true);
      DataService.getSuppliers()
        .then(data => {
          setSuppliers(data || []); // <-- FIX: Ensure suppliers is always an array
        })
        .catch(() => message.error('Failed to load suppliers list.'))
        .finally(() => setLoadingSuppliers(false));
    }
  }, [visible, message]);

  useEffect(() => {
    if (visible && product) {
      form.setFieldsValue({
        purchase_price: product.default_purchase_price,
        sale_price: product.default_sale_price,
        condition: 'New',
        pta_status: isSmartPhoneCategory ? 'Approved' : undefined,
        quantity: isSmartPhoneCategory ? undefined : 1,
      });
      setImeis(['']);
    } else if (!visible) {
      form.resetFields();
      setImeis(['']);
    }
  }, [visible, product, form, isSmartPhoneCategory]);

  const handleAddNewSupplier = () => {
    let newSupplierName = '';
    modal.confirm({
        title: 'Add a New Supplier',
        content: <Input placeholder="Enter new supplier's name" onChange={e => newSupplierName = e.target.value} style={{marginTop: '24px'}} />,
        onOk: async () => {
            if (!newSupplierName.trim()) { message.warning('Supplier name cannot be empty.'); return Promise.reject(); }
            try {
                const newSupplier = await DataService.addSupplier({ name: newSupplierName });
                setSuppliers(prev => [newSupplier, ...prev]);
                form.setFieldsValue({ supplier_id: newSupplier.id });
                message.success(`Supplier "${newSupplier.name}" added!`);
            } catch (error) { message.error('Failed to add supplier.'); return Promise.reject(); }
        },
    });
  };

  const handleSubmit = async () => {
    try {
      if (!product) throw new Error("Product not found.");
      const values = await form.validateFields();
      setIsSubmitting(true);
      let inventoryItems = [];

      if (isSmartPhoneCategory) {
        const finalImeis = (imeis || []).map(imei => imei.trim()).filter(imei => imei);
        if (finalImeis.length === 0) throw new Error("Please enter at least one IMEI/Serial number.");
        if (new Set(finalImeis).size !== finalImeis.length) throw new Error("Duplicate IMEIs found.");
        inventoryItems = finalImeis.map(imei => ({ 
            product_id: product.id, purchase_price: values.purchase_price, sale_price: values.sale_price,
            condition: values.condition, pta_status: values.pta_status, color: values.color,
            ram_rom: values.ram_rom, guaranty: values.guaranty, imei
        }));
      } else {
        for (let i = 0; i < (values.quantity || 1); i++) {
          inventoryItems.push({
            product_id: product.id, purchase_price: values.purchase_price, sale_price: values.sale_price,
            condition: values.condition, color: values.color, imei: values.imei || null,
          });
        }
      }
      
      await DataService.createNewPurchase({
        p_supplier_id: values.supplier_id, p_notes: values.notes || null, p_inventory_items: inventoryItems
      });
      message.success(`${inventoryItems.length} stock item(s) added successfully for ${product.name}`);
      onStockAdded();
    } catch (error) {
      if (error.errorFields) return;
      message.error('Error: ' + error.message);
    } finally { setIsSubmitting(false); }
  };

  const handleImeiChange = (index, value) => {
    const newImeis = [...(imeis || [''])]; newImeis[index] = value;
    if (index === newImeis.length - 1 && value.trim()) { newImeis.push(''); }
    setImeis(newImeis);
  };
  const handleImeiKeyDown = (event, index) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      const nextInput = imeiInputRefs.current[index + 1];
      if (nextInput) { nextInput.focus(); }
    }
  };
  useEffect(() => { imeiInputRefs.current = (imeis || []).map((_, i) => imeiInputRefs.current[i] || React.createRef()); }, [imeis]);

  return (
    <Modal
      title={<Text>Add Stock for: <Text type="success">{product?.name}</Text></Text>}
      open={visible} onOk={handleSubmit} onCancel={onCancel} okText="Save Purchase"
      confirmLoading={isSubmitting} width={isSmartPhoneCategory ? 800 : 520} 
      destroyOnHidden // <-- FIX: Warning corrected
    >
      <Form form={form} layout="vertical" autoComplete="off" style={{marginTop: '24px'}}>
        <Title level={5}>Step 1: Purchase & Supplier Details</Title>
        <Form.Item label="Supplier" required>
            <Space.Compact style={{ width: '100%' }}>
                <Form.Item name="supplier_id" noStyle rules={[{ required: true, message: 'Please select a supplier!' }]}>
                    <Select placeholder="Select a supplier" loading={loadingSuppliers}>
                        {/* FIX: Safe-guard the map call */}
                        {(suppliers || []).map(s => <Option key={s.id} value={s.id}>{s.name}</Option>)}
                    </Select>
                </Form.Item>
                <Button icon={<PlusOutlined />} onClick={handleAddNewSupplier}>Add New</Button>
            </Space.Compact>
        </Form.Item>
        <Form.Item name="notes" label="Notes (Optional)"><Input.TextArea rows={2} placeholder="e.g., Bill #123, etc." /></Form.Item>
        <Divider />
        <Title level={5}>{isSmartPhoneCategory ? "Step 2: Batch Details" : "Step 2: Item Details"}</Title>
        {isSmartPhoneCategory ? (
            <>
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
              <Title level={5}>Step 3: IMEI / Serial Numbers</Title>
              <div style={{ maxHeight: '30vh', overflowY: 'auto', padding: '8px' }}>
                {(imeis || []).map((imei, index) => (
                  <Form.Item key={index} style={{ marginBottom: 8 }}>
                    <Input ref={el => imeiInputRefs.current[index] = el} placeholder={`IMEI / Serial #${index + 1}`} value={imei}
                      onChange={(e) => handleImeiChange(index, e.target.value)} onKeyDown={(e) => handleImeiKeyDown(e, index)} />
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
  );
};

export default AddStockModal;