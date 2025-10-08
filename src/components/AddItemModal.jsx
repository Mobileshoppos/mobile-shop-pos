// src/components/AddItemModal.jsx (Warning Fix)

import React, { useState, useEffect, useRef } from 'react';
import { Modal, Form, Input, InputNumber, Select, Row, Col, Divider, Typography } from 'antd';

const { Title } = Typography;
const { Option } = Select;

const AddItemModal = ({ visible, onCancel, onOk, product }) => {
  const [form] = Form.useForm();
  const [imeis, setImeis] = useState(['']);
  const imeiInputRefs = useRef([]);

  const isSmartPhoneCategory = product?.category_name === 'Smart Phones / Devices';

  useEffect(() => {
    if (visible && product) {
      form.setFieldsValue({
        purchase_price: product.default_purchase_price || product.purchase_price,
        sale_price: product.default_sale_price || product.sale_price,
        condition: 'New',
        pta_status: isSmartPhoneCategory ? 'Approved' : undefined,
        quantity: isSmartPhoneCategory ? 1 : 1,
      });
      setImeis(['']);
    }
  }, [visible, product, form, isSmartPhoneCategory]);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      let finalItemData;

      if (isSmartPhoneCategory) {
        const finalImeis = imeis.map(imei => imei.trim()).filter(imei => imei);
        if (finalImeis.length === 0) { throw new Error("Please enter at least one IMEI/Serial number."); }
        if (new Set(finalImeis).size !== finalImeis.length) { throw new Error("Duplicate IMEIs/Serials found."); }
        
        finalItemData = finalImeis.map(imei => ({
            ...values,
            product_id: product.id,
            name: product.name,
            imei: imei,
            quantity: 1,
        }));

      } else {
        finalItemData = [{
            ...values,
            product_id: product.id,
            name: product.name,
            imei: values.imei || null,
        }];
      }
      
      onOk(finalItemData);
      form.resetFields();
      setImeis(['']);

    } catch (error) {
      console.error("Validation Error:", error);
    }
  };

  const handleImeiChange = (index, value) => {
    const newImeis = [...imeis]; newImeis[index] = value;
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

  useEffect(() => { imeiInputRefs.current = imeis.map((_, i) => imeiInputRefs.current[i] || React.createRef()); }, [imeis]);

  return (
    <Modal
      title={<>Add Details for: <Typography.Text type="success">{product?.name}</Typography.Text></>}
      open={visible}
      onCancel={onCancel}
      onOk={handleOk}
      okText="Add to Purchase List"
      width={isSmartPhoneCategory ? 800 : 520}
      destroyOnHidden // <-- YAHAN TABDEELI KI GAYI HAI: 'destroyOnClose' ko 'destroyOnHidden' se badal diya gaya hai
    >
      <Form form={form} layout="vertical" autoComplete="off" style={{ marginTop: '24px' }}>
        {isSmartPhoneCategory ? (
          <>
            <Row gutter={16}>
              <Col span={12}><Form.Item name="purchase_price" label="Purchase Price (per item)" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} prefix="Rs." /></Form.Item></Col>
              <Col span={12}><Form.Item name="sale_price" label="Sale Price (per item)" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} prefix="Rs." /></Form.Item></Col>
              <Col span={12}><Form.Item name="condition" label="Condition" rules={[{ required: true }]}><Select><Option value="New">New</Option><Option value="Open Box">Open Box</Option><Option value="Used">Used</Option></Select></Form.Item></Col>
              <Col span={12}><Form.Item name="pta_status" label="PTA Status" rules={[{ required: true }]}><Select><Option value="Approved">Approved</Option><Option value="Not Approved">Non-PTA</Option></Select></Form.Item></Col>
              <Col span={8}><Form.Item name="color" label="Color"><Input /></Form.Item></Col>
              <Col span={8}><Form.Item name="ram_rom" label="RAM/ROM"><Input /></Form.Item></Col>
              <Col span={8}><Form.Item name="guaranty" label="Guaranty"><Input /></Form.Item></Col>
            </Row>
            <Divider />
            <Title level={5}>IMEI / Serial Numbers</Title>
            <div style={{ maxHeight: '30vh', overflowY: 'auto', padding: '8px' }}>
              {imeis.map((imei, index) => (
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
            <Form.Item name="purchase_price" label="Purchase Price (per item)" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} prefix="Rs." /></Form.Item>
            <Form.Item name="sale_price" label="Sale Price (per item)"><InputNumber style={{ width: '100%' }} prefix="Rs." /></Form.Item>
            <Form.Item name="color" label="Color (Optional)"><Input /></Form.Item>
            <Form.Item name="imei" label="Serial Number (Optional)"><Input placeholder="For items like power banks, etc." /></Form.Item>
          </>
        )}
      </Form>
    </Modal>
  );
};

export default AddItemModal;