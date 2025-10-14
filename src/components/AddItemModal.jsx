// src/components/AddItemModal.jsx (Final Version - Checks is_imei_based flag)

import React, { useEffect, useState, useRef } from 'react';
import { Modal, Form, Input, InputNumber, Select, Typography, Row, Col, Divider } from 'antd';

const { Option } = Select;
const { Title } = Typography;

const AddItemModal = ({ visible, onCancel, onOk, product, attributes }) => {
  const [form] = Form.useForm();
  const [imeis, setImeis] = useState(['']);
  const imeiInputRefs = useRef([]);

  // Yeh flag ab seedha product ki category se ayega.
  const isImeiCategory = product?.category_is_imei_based;

  useEffect(() => {
    if (visible && product) {
      // Set default values jo har form mein common hain
      const commonValues = {
        purchase_price: product.default_purchase_price || '',
        sale_price: product.default_sale_price || '',
      };

      if (isImeiCategory) {
        form.setFieldsValue({
            ...commonValues,
            Condition: 'New', // Yeh default values tab kaam kareingi agar in naam ke attributes mojood hon.
            'PTA Status': 'Approved'
        });
        setImeis(['']);
      } else {
        form.setFieldsValue({
            ...commonValues,
            quantity: 1,
        });
      }
    }
  }, [visible, product, isImeiCategory, form]);

  
  const handleImeiChange = (index, value) => {
    const newImeis = [...imeis];
    newImeis[index] = value;
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

  useEffect(() => {
    if (isImeiCategory) {
        imeiInputRefs.current = imeis.map((_, i) => imeiInputRefs.current[i] || React.createRef());
    }
  }, [imeis, isImeiCategory]);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      let finalItemsData = [];

      if (isImeiCategory) {
        const finalImeis = imeis.map(imei => imei.trim()).filter(imei => imei);
        if (finalImeis.length === 0) throw new Error("Please enter at least one IMEI/Serial.");

        const item_attributes = {};
        attributes.forEach(attr => {
            if (values[attr.attribute_name] !== undefined) {
                item_attributes[attr.attribute_name] = values[attr.attribute_name];
            }
        });

        finalItemsData = finalImeis.map(imei => ({
            product_id: product.id,
            name: product.name,
            purchase_price: values.purchase_price,
            sale_price: values.sale_price,
            quantity: 1,
            imei: imei, // IMEI ab bhi alag se save hoga
            item_attributes: { ...item_attributes, IMEI: imei } // Aur behtar tracking ke liye attributes mein bhi save hoga
        }));

      } else { // Normal Quantity-based Form
        finalItemsData = [{
            product_id: product.id,
            name: product.name,
            purchase_price: values.purchase_price,
            sale_price: values.sale_price,
            quantity: values.quantity,
            item_attributes: values.item_attributes || null
        }];
      }
      
      onOk(finalItemsData);
      form.resetFields();

    } catch (error) {
      console.error("Validation Error:", error);
    }
  };

  const renderAttributeField = (attribute) => {
    const commonRules = [{ required: attribute.is_required }];
    // IMEI-based form mein, hum fields ko top-level par rakhte hain for easy access
    const fieldName = isImeiCategory ? attribute.attribute_name : ['item_attributes', attribute.attribute_name];
    
    // IMEI wala attribute form mein nahi dikhana, kyunke uske liye neeche alag se input box hain
    if (isImeiCategory && attribute.attribute_name.toUpperCase() === 'IMEI') return null; 

    switch (attribute.attribute_type) {
      case 'number': return <Form.Item name={fieldName} label={attribute.attribute_name} rules={commonRules}><InputNumber style={{ width: '100%' }} /></Form.Item>;
      case 'select': return <Form.Item name={fieldName} label={attribute.attribute_name} rules={commonRules}><Select>{(attribute.options || []).map(opt => <Option key={opt} value={opt}>{opt}</Option>)}</Select></Form.Item>;
      default: return <Form.Item name={fieldName} label={attribute.attribute_name} rules={commonRules}><Input /></Form.Item>;
    }
  };

  return (
    <Modal
      title={<>Add Details for: <Typography.Text type="success">{product?.name}</Typography.Text></>}
      open={visible} onCancel={onCancel} onOk={handleOk} okText="Add to Purchase List"
      width={isImeiCategory ? 800 : 520} destroyOnHidden
    >
      <Form form={form} layout="vertical" autoComplete="off" style={{ marginTop: '24px' }}>
        {isImeiCategory ? (
            <>
                <Row gutter={16}>
                    <Col span={12}><Form.Item name="purchase_price" label="Purchase Price (per item)" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} prefix="Rs." /></Form.Item></Col>
                    <Col span={12}><Form.Item name="sale_price" label="Sale Price (per item)" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} prefix="Rs." /></Form.Item></Col>
                    {attributes.map(attr => <Col span={12} key={attr.id}>{renderAttributeField(attr)}</Col>)}
                </Row>
                <Divider />
                <Title level={5}>IMEI / Serial Numbers (One per line)</Title>
                <div style={{ maxHeight: '30vh', overflowY: 'auto', padding: '8px' }}>
                {imeis.map((imei, index) => (
                    <Form.Item key={index} style={{ marginBottom: 8 }}>
                    <Input ref={el => imeiInputRefs.current[index] = el} placeholder={`Serial #${index + 1}`} value={imei}
                        onChange={(e) => handleImeiChange(index, e.target.value)} onKeyDown={(e) => handleImeiKeyDown(e, index)} />
                    </Form.Item>
                ))}
                </div>
            </>
        ) : (
            <>
                <Row gutter={16}>
                    <Col span={12}><Form.Item name="purchase_price" label="Purchase Price (per item)" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} prefix="Rs." /></Form.Item></Col>
                    <Col span={12}><Form.Item name="sale_price" label="Sale Price (per item)" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} prefix="Rs." /></Form.Item></Col>
                    <Col span={12}><Form.Item name="quantity" label="Quantity" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} min={1} /></Form.Item></Col>
                </Row>
                <Row gutter={16}>
                    {attributes.map(attr => <Col span={12} key={attr.id}>{renderAttributeField(attr)}</Col>)}
                </Row>
            </>
        )}
      </Form>
    </Modal>
  );
};

export default AddItemModal;