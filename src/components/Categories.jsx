import React, { useState, useEffect, useCallback } from 'react';
import {
  Typography, Table, Button, Modal, Form, Input, App as AntApp,
  Space, Popconfirm, Tooltip, Row, Col, Card, Empty, Select, Switch, Tag
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, MobileOutlined, AppstoreOutlined } from '@ant-design/icons';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';

const { Title, Text } = Typography;
const { Option } = Select;

const Categories = () => {
  const { message } = AntApp.useApp();
  const { user } = useAuth();
  
  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryForm] = Form.useForm();
  
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [attributes, setAttributes] = useState([]);
  const [loadingAttributes, setLoadingAttributes] = useState(false);
  const [isAttributeModalOpen, setIsAttributeModalOpen] = useState(false);
  const [editingAttribute, setEditingAttribute] = useState(null);
  const [attributeForm] = Form.useForm();
  const attributeType = Form.useWatch('attribute_type', attributeForm);

  const getCategories = useCallback(async () => {
    if (!user) return;
    try {
      setLoadingCategories(true);
      let { data, error } = await supabase.from('categories').select('*').order('name');
      if (error) throw error;
      setCategories(data);
    } catch (error) { message.error('Error fetching categories: ' + error.message); } 
    finally { setLoadingCategories(false); }
  }, [user, message]);

  useEffect(() => { getCategories(); }, [getCategories]);

  const getAttributesForCategory = useCallback(async (categoryId) => {
    if (!categoryId) return;
    try {
      setLoadingAttributes(true);
      const { data, error } = await supabase.from('category_attributes').select('*').eq('category_id', categoryId).order('created_at');
      if (error) throw error;
      setAttributes(data);
    } catch (error) { message.error("Failed to fetch attributes: " + error.message); } 
    finally { setLoadingAttributes(false); }
  }, [message]);

  const showCategoryModal = (category = null) => {
    setEditingCategory(category);
    if (category) {
      categoryForm.setFieldsValue({ name: category.name, is_imei_based: category.is_imei_based });
    } else {
      categoryForm.resetFields();
      categoryForm.setFieldsValue({ is_imei_based: false }); // Default for new category
    }
    setIsCategoryModalOpen(true);
  };
  const handleCategoryModalCancel = () => {
    setIsCategoryModalOpen(false);
    setEditingCategory(null);
    categoryForm.resetFields();
  };
  const handleCategoryModalOk = async (values) => {
    try {
      let error;
      if (editingCategory) {
        ({ error } = await supabase.from('categories').update(values).eq('id', editingCategory.id));
      } else {
        ({ error } = await supabase.from('categories').insert([{ ...values, user_id: user.id }]));
      }
      if (error) throw error;
      message.success(`Category ${editingCategory ? 'updated' : 'added'} successfully!`);
      handleCategoryModalCancel();
      getCategories();
    } catch (error) { message.error('Error saving category: ' + error.message); }
  };
  const handleDeleteCategory = async (categoryId) => {
    try {
      const { error } = await supabase.from('categories').delete().eq('id', categoryId);
      if (error) throw error;
      message.success('Category deleted successfully!');
      if (selectedCategory?.id === categoryId) {
        setSelectedCategory(null);
        setAttributes([]);
      }
      getCategories();
    } catch (error) { message.error('Error deleting category: ' + error.message); }
  };

  const showAttributeModal = (attribute = null) => {
    setEditingAttribute(attribute);
    if (attribute) {
      attributeForm.setFieldsValue({
        ...attribute,
        options: Array.isArray(attribute.options) ? attribute.options.join(',') : ''
      });
    } else {
      attributeForm.resetFields();
      attributeForm.setFieldsValue({ is_required: true, attribute_type: 'text' });
    }
    setIsAttributeModalOpen(true);
  };
  const handleAttributeModalCancel = () => {
    setIsAttributeModalOpen(false);
    setEditingAttribute(null);
    attributeForm.resetFields();
  };
  const handleAttributeModalOk = async (values) => {
    try {
      let error;
      const payload = {
        ...values,
        category_id: selectedCategory.id,
        options: values.attribute_type === 'select' && values.options ? values.options.split(',').map(opt => opt.trim()) : null,
      };
      if (editingAttribute) {
        ({ error } = await supabase.from('category_attributes').update(payload).eq('id', editingAttribute.id));
      } else {
        ({ error } = await supabase.from('category_attributes').insert([payload]));
      }
      if (error) throw error;
      message.success(`Attribute ${editingAttribute ? 'updated' : 'added'} successfully!`);
      handleAttributeModalCancel();
      getAttributesForCategory(selectedCategory.id);
    } catch (error) { message.error('Error saving attribute: ' + error.message); }
  };
  const handleDeleteAttribute = async (attributeId) => {
    try {
        const { error } = await supabase.from('category_attributes').delete().eq('id', attributeId);
        if (error) throw error;
        message.success('Attribute deleted successfully!');
        getAttributesForCategory(selectedCategory.id);
    } catch (error) { message.error('Error deleting attribute: ' + error.message); }
  };

  const categoryColumns = [
    { title: 'Category Name', dataIndex: 'name', key: 'name' },
    { 
      title: 'Stock Type', dataIndex: 'is_imei_based', key: 'is_imei_based', align: 'center',
      render: (is_imei_based) => is_imei_based 
        ? <Tag icon={<MobileOutlined />} color="cyan">Per-Item</Tag> 
        : <Tag icon={<AppstoreOutlined />} color="geekblue">Quantity</Tag>
    },
    {
      title: 'Actions', key: 'actions', width: 120, align: 'center',
      render: (_, record) => record.user_id ? (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={(e) => { e.stopPropagation(); showCategoryModal(record); }} />
          <Popconfirm title="Delete this category?" onConfirm={(e) => { e.stopPropagation(); handleDeleteCategory(record.id); }} onCancel={(e) => e.stopPropagation()} okText="Yes" cancelText="No">
            <Button size="small" danger icon={<DeleteOutlined />} onClick={(e) => e.stopPropagation()} />
          </Popconfirm>
        </Space>
      ) : <Tooltip title="Default categories cannot be edited."><Text type="secondary">Default</Text></Tooltip>,
    },
  ];

  const attributeColumns = [
    { title: 'Attribute Name', dataIndex: 'attribute_name', key: 'attribute_name' },
    { title: 'Type', dataIndex: 'attribute_type', key: 'attribute_type', render: type => <Tag>{type.toUpperCase()}</Tag> },
    { title: 'Required', dataIndex: 'is_required', key: 'is_required', render: req => req ? <Tag color="green">Yes</Tag> : <Tag>No</Tag> },
    {
        title: 'Actions', key: 'actions', width: 120, align: 'center',
        render: (_, record) => (
            <Space>
                <Button size="small" icon={<EditOutlined />} onClick={() => showAttributeModal(record)} />
                <Popconfirm title="Delete this attribute?" onConfirm={() => handleDeleteAttribute(record.id)} okText="Yes" cancelText="No">
                    <Button size="small" danger icon={<DeleteOutlined />} />
                </Popconfirm>
            </Space>
        )
    }
  ];

  return (
    <>
      <Title level={2} style={{ margin: 0, marginBottom: '24px' }}>Manage Categories & Attributes</Title>
      <Row gutter={24}>
        <Col span={10}>
          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <Title level={4} style={{ margin: 0 }}>Product Categories</Title>
              <Button type="primary" icon={<PlusOutlined />} onClick={() => showCategoryModal()}>Add New</Button>
            </div>
            <Table columns={categoryColumns} dataSource={categories} loading={loadingCategories} rowKey="id" size="small"
              onRow={(record) => ({ onClick: () => { setSelectedCategory(record); getAttributesForCategory(record.id); }})}
              rowClassName={(record) => (selectedCategory?.id === record.id ? 'ant-table-row-selected' : '')}
            />
          </Card>
        </Col>
        <Col span={14}>
          <Card>
            {selectedCategory ? (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <Title level={4} style={{ margin: 0 }}>Attributes for: <Text type="success">{selectedCategory.name}</Text></Title>
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => showAttributeModal()}>Add New</Button>
                </div>
                <Table columns={attributeColumns} dataSource={attributes} loading={loadingAttributes} rowKey="id" size="small" pagination={false} />
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '300px' }}>
                <Empty description="Select a category from the left to manage its attributes." />
              </div>
            )}
          </Card>
        </Col>
      </Row>

      <Modal title={editingCategory ? 'Edit Category' : 'Add New Category'} open={isCategoryModalOpen} onCancel={handleCategoryModalCancel} onOk={() => categoryForm.submit()} okText="Save">
        <Form form={categoryForm} layout="vertical" onFinish={handleCategoryModalOk} style={{ marginTop: '24px' }}>
          <Form.Item name="name" label="Category Name" rules={[{ required: true }]}><Input /></Form.Item>
          {/* --- YAHAN NAYA SWITCH ADD KIYA GAYA HAI --- */}
          <Form.Item 
            name="is_imei_based" 
            label="Stock Tracking Type"
            valuePropName="checked"
            tooltip="Enable this if items in this category need to be tracked individually (e.g., by IMEI or Serial Number)."
          >
            <Switch checkedChildren="Per-Item (IMEI/Serial)" unCheckedChildren="By Quantity (Bulk)" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal title={editingAttribute ? 'Edit Attribute' : 'Add New Attribute'} open={isAttributeModalOpen} onCancel={handleAttributeModalCancel} onOk={() => attributeForm.submit()} okText="Save">
        <Form form={attributeForm} layout="vertical" onFinish={handleAttributeModalOk} style={{ marginTop: '24px' }}>
          <Form.Item name="attribute_name" label="Attribute Name" rules={[{ required: true }]}><Input placeholder="e.g., Color, Storage, IMEI" /></Form.Item>
          <Form.Item name="attribute_type" label="Input Type" rules={[{ required: true }]}><Select><Option value="text">Text</Option><Option value="number">Number</Option><Option value="select">Select</Option></Select></Form.Item>
          {attributeType === 'select' && (
            <Form.Item name="options" label="Options (comma-separated)" rules={[{ required: true, message: 'Please provide options for the select type!'}]}>
              <Input placeholder="e.g., New, Used, Open Box" />
            </Form.Item>
          )}
          <Form.Item name="is_required" label="Is this field required?" valuePropName="checked"><Switch /></Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default Categories;