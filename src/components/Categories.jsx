import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Typography, Table, Button, Modal, Form, Input, App as AntApp,
  Space, Popconfirm, Tooltip, Row, Col, Card, Empty, Select, Switch, Tag, theme
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, MobileOutlined, TagsOutlined, LockOutlined } from '@ant-design/icons';
import DataService from '../DataService';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom'; // Naya Import
import { useMediaQuery } from '../hooks/useMediaQuery';
import { supabase } from '../supabaseClient';
import { db } from '../db';
import { getPlanLimits } from '../config/subscriptionPlans';

const { Title, Text } = Typography;
const { Option } = Select;

const Categories = () => {
  const { token } = theme.useToken(); // Control Center Connection
  const { message, modal } = AntApp.useApp(); // 'modal' shamil kiya
  const navigate = useNavigate(); // Hook initialize kiya
  const isMobile = useMediaQuery('(max-width: 992px)');
  const { user, profile } = useAuth();
  
  const [categories, setCategories] = useState([]);
  const [rawCategories, setRawCategories] = useState([]); // NAYA IZAFA: Dropdown ke liye asal list
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryForm] = Form.useForm();
  const categoryNameInputRef = useRef(null); // NAYA IZAFA
  
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [attributes, setAttributes] = useState([]);
  const [loadingAttributes, setLoadingAttributes] = useState(false);
  const [isAttributeModalOpen, setIsAttributeModalOpen] = useState(false);
  const [editingAttribute, setEditingAttribute] = useState(null);
  const [attributeForm] = Form.useForm();
  const attributeNameInputRef = useRef(null); // NAYA IZAFA
  const attributeType = Form.useWatch('attribute_type', attributeForm);

  // NAYA IZAFA: Modal khulte hi cursor set karna (Sirf Desktop par)
  useEffect(() => {
    if (isCategoryModalOpen && !isMobile) {
      setTimeout(() => categoryNameInputRef.current?.focus(), 100);
    }
  }, [isCategoryModalOpen, isMobile]);

  useEffect(() => {
    if (isAttributeModalOpen && !isMobile) {
      setTimeout(() => attributeNameInputRef.current?.focus(), 100);
    }
  }, [isAttributeModalOpen, isMobile]);

  const getCategories = useCallback(async () => {
    try {
      setLoadingCategories(true);
      const data = await DataService.getProductCategories();
      
      setRawCategories(data); // NAYA IZAFA: Asal list dropdown ke liye save ki

      // NAYA IZAFA: Flat list ko Tree (darakht) mein badalna
      const categoryMap = new Map();
      const tree = [];

      // Pehle sab ko map mein daalein aur children array banayein
      data.forEach(cat => {
        categoryMap.set(cat.id, { ...cat, children: [] });
      });

      // Ab parent-child ka rishta banayein
      data.forEach(cat => {
        if (cat.parent_id) {
          const parent = categoryMap.get(cat.parent_id);
          if (parent) {
            parent.children.push(categoryMap.get(cat.id));
          }
        } else {
          tree.push(categoryMap.get(cat.id));
        }
      });

      // Khali children array ko hata dein taake faltu [+] icon na aaye
      const cleanEmptyChildren = (nodes) => {
        nodes.forEach(node => {
          if (node.children.length === 0) {
            delete node.children;
          } else {
            cleanEmptyChildren(node.children);
          }
        });
      };
      cleanEmptyChildren(tree);

      setCategories(tree); // Table ke liye tree structure set kiya
    } catch (error) { 
      message.error('Error fetching categories: ' + error.message); 
    } finally { 
      setLoadingCategories(false); 
    }
  }, [message]);

  useEffect(() => { getCategories(); }, [getCategories]);

  const getAttributesForCategory = useCallback(async (categoryId) => {
    if (!categoryId) return;
    try {
      setLoadingAttributes(true);
      
      // NAYA IZAFA: Parent Categories ke attributes bhi lana
      const hierarchyIds = [];
      let currentId = categoryId;
      
      // Jab tak parent milta rahe, ID save karte raho (Neeche se Upar ki taraf)
      while (currentId) {
        hierarchyIds.push(currentId);
        const currentCat = rawCategories.find(c => c.id === currentId);
        currentId = currentCat ? currentCat.parent_id : null;
      }

      let combinedAttributes = [];
      
      // Har ID ke attributes DataService se mangwayein
      for (const id of hierarchyIds) {
        const data = await DataService.getCategoryAttributes(id);
        const mappedData = data.map(attr => ({
          ...attr,
          // Agar attribute ki ID current category se match na ho, to matlab virasat (inherit) mein mila hai
          is_inherited: attr.category_id !== categoryId, 
          source_category_name: attr.category_id !== categoryId ? rawCategories.find(c => c.id === attr.category_id)?.name : null
        }));
        combinedAttributes = [...combinedAttributes, ...mappedData];
      }

      setAttributes(combinedAttributes);
    } catch (error) { message.error("Failed to fetch attributes: " + error.message); } 
    finally { setLoadingAttributes(false); }
  }, [message, rawCategories]); // rawCategories ko dependencies mein add kiya

  const showCategoryModal = async (category = null) => {
    setEditingCategory(category);
    if (category) {
      categoryForm.setFieldsValue({ 
        name: category.name, 
        is_imei_based: category.is_imei_based,
        parent_id: category.parent_id || null // NAYA IZAFA
      });
    } else {
      categoryForm.resetFields();
      categoryForm.setFieldsValue({ is_imei_based: false, parent_id: null }); // NAYA IZAFA
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
      // --- DUPLICATE CHECK ---
      const isDuplicate = await DataService.checkDuplicateCategory(values.name, editingCategory?.id);
      if (isDuplicate) {
        categoryForm.setFields([
          {
            name: 'name',
            errors: [`Category "${values.name}" already exists!`],
          },
        ]);
        return;
      }
      // NAYA IZAFA: parent_id ko theek tarah set karna
      const payload = {
        ...values,
        parent_id: values.parent_id || null 
      };

      if (editingCategory) {
        // Update (Offline)
        await DataService.updateProductCategory(editingCategory.id, payload);
        message.success('Category updated successfully!');
      } else {
        // Add (Offline)
        const newCat = { ...payload, user_id: user.id };
        await DataService.addProductCategory(newCat);
        message.success('Category added successfully!');
      }
      handleCategoryModalCancel();
      getCategories();
    } catch (error) { message.error('Error saving category: ' + error.message); }
  };

  const handleDeleteCategory = async (categoryId) => {
    try {
      // Delete (Offline)
      await DataService.deleteProductCategory(categoryId);
      message.success('Category deleted successfully!');
      if (selectedCategory?.id === categoryId) {
        setSelectedCategory(null);
        setAttributes([]);
      }
      getCategories();
    } catch (error) { message.error(error.message); }
  };
  
  const showAttributeModal = async (attribute = null) => {
    setEditingAttribute(attribute);
    if (attribute) {
      attributeForm.setFieldsValue({
        ...attribute,
        // NAYA IZAFA: Ab options ko string banane ki zaroorat nahi, direct array hi set karein
        options: Array.isArray(attribute.options) ? attribute.options : []
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
      const payload = {
        ...values,
        category_id: selectedCategory.id,
        // NAYA IZAFA: Ab options pehle se hi array hain, is liye split karne ki zaroorat nahi
        options: values.attribute_type === 'select' && values.options ? values.options : null,
      };

      if (editingAttribute) {
        // Update Attribute (Offline)
        await DataService.updateCategoryAttribute(editingAttribute.id, payload);
        message.success('Attribute updated successfully!');
      } else {
        // Add Attribute (Offline)
        await DataService.addCategoryAttribute(payload);
        message.success('Attribute added successfully!');
      }
      handleAttributeModalCancel();
      getAttributesForCategory(selectedCategory.id);
    } catch (error) { message.error('Error saving attribute: ' + error.message); }
  };

  const handleDeleteAttribute = async (attributeId) => {
    try {
        // Delete Attribute (Offline)
        await DataService.deleteCategoryAttribute(attributeId);
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
        : <Tag icon={<TagsOutlined />} color="processing">Quantity</Tag>
    },
    {
      title: 'Actions', key: 'actions', width: 120, align: 'center',
      render: (_, record) => (
        <Space>
          <Tooltip title="Edit Category">
            <Button size="small" icon={<EditOutlined />} onClick={(e) => { e.stopPropagation(); showCategoryModal(record); }} />
          </Tooltip>
          {(() => {
             const limits = getPlanLimits(profile?.subscription_tier);
             const isLocked = !limits.allow_custom_categories;
             return (
               <Tooltip title={isLocked ? "Delete is disabled in Free Plan" : ""}>
                 <Popconfirm 
                   title="Delete this category?" 
                   onConfirm={(e) => { e.stopPropagation(); handleDeleteCategory(record.id); }} 
                   onCancel={(e) => e.stopPropagation()} 
                   okText="Yes" 
                   cancelText="No"
                   disabled={isLocked} // Popconfirm bhi disable
                 >
                   <Button 
                     size="small" 
                     danger 
                     icon={<DeleteOutlined />} 
                     onClick={(e) => e.stopPropagation()} 
                     disabled={isLocked}
                     style={isLocked ? { color: token.colorTextDisabled, opacity: 0.5 } : {}}
                   />
                 </Popconfirm>
               </Tooltip>
             );
          })()}
        </Space>
      ),
    },
  ];

  const attributeColumns = [
    { 
      title: 'Attribute Name', 
      dataIndex: 'attribute_name', 
      key: 'attribute_name',
      render: (text, record) => (
        <Space direction="vertical" size={0}>
          <Text>{text}</Text>
          {/* NAYA IZAFA: Virasat ka Tag */}
          {record.is_inherited && (
            <Tag color="purple" style={{ margin: 0, fontSize: '10px', lineHeight: '14px', border: 'none' }}>
              From: {record.source_category_name}
            </Tag>
          )}
        </Space>
      )
    },
    { title: 'Type', dataIndex: 'attribute_type', key: 'attribute_type', render: type => <Tag>{type.toUpperCase()}</Tag> },
    { title: 'Required', dataIndex: 'is_required', key: 'is_required', render: req => req ? <Tag color="success">Yes</Tag> : <Tag>No</Tag> },
    {
        title: 'Actions', key: 'actions', width: 120, align: 'center',
        render: (_, record) => {
          // NAYA IZAFA: Agar attribute virasat mein mila hai to edit/delete ki jagah Lock dikhayein
          if (record.is_inherited) {
            return (
              <Tooltip title={`Edit this in the main category (${record.source_category_name})`}>
                <LockOutlined style={{ color: token.colorTextDisabled, fontSize: '16px' }} />
              </Tooltip>
            );
          }

          return (
            <Space>
                <Button size="small" icon={<EditOutlined />} onClick={() => showAttributeModal(record)} />
                {(() => {
                   const isLocked = !profile?.subscription_tier || profile?.subscription_tier === 'free';
                   return (
                     <Popconfirm 
                       title="Delete this attribute?" 
                       onConfirm={() => handleDeleteAttribute(record.id)} 
                       okText="Yes" 
                       cancelText="No"
                       disabled={isLocked}
                     >
                       <Button 
                         size="small" 
                         danger 
                         icon={<DeleteOutlined />} 
                         disabled={isLocked}
                       />
                     </Popconfirm>
                   );
                })()}
            </Space>
          );
        }
    }
  ];

  return (
    <div style={{ padding: isMobile ? '12px 0' : '4px 0' }}>
      {isMobile && (
        <Title level={2} style={{ margin: 0, marginBottom: '16px', marginLeft: '8px', fontSize: '23px' }}>
          <TagsOutlined /> Manage Categories & Attributes
        </Title>
      )}
      <Row gutter={[24, 24]}>
        {/* NAYA IZAFA: Left column ki width 10 se badha kar 12 (50%) kar di gayi hai */}
        <Col span={isMobile ? 24 : 12}>
          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <Title level={4} style={{ margin: 0 }}>Product Categories</Title>
              {(() => {
                const limits = getPlanLimits(profile?.subscription_tier);
                const isLocked = !limits.allow_custom_categories;
                return (
                  <Button 
                    id="cat-add-btn"
                    type="primary" 
                    icon={isLocked ? <LockOutlined /> : <PlusOutlined />} 
                    onClick={() => {
                      if (isLocked) {
                        modal.confirm({
                          title: 'Custom Categories Locked',
                          content: (
                            <div>
                              <p>In Free Plan, you can only use the <b>Standard Categories</b> provided by the system.</p>
                              <p>To create your own custom categories and attributes, please upgrade to Growth or Pro Plan.</p>
                            </div>
                          ),
                          okText: 'View Plans',
                          cancelText: 'Close',
                          onOk: () => navigate('/subscription')
                        });
                      } else {
                        showCategoryModal();
                      }
                    }}
                    style={isLocked ? { 
                      color: token.colorTextDisabled, 
                      backgroundColor: token.colorFillTertiary, 
                      borderColor: token.colorBorder 
                    } : {}}
                  >
                    Add New
                  </Button>
                );
              })()}
            </div>
            <Table columns={categoryColumns} dataSource={categories} loading={loadingCategories} rowKey="id" size="small"
            scroll={{ x: true }}
              onRow={(record) => ({ onClick: () => { setSelectedCategory(record); getAttributesForCategory(record.id); }})}
              rowClassName={(record) => (selectedCategory?.id === record.id ? 'ant-table-row-selected' : '')}
            />
          </Card>
        </Col>
        {/* NAYA IZAFA: Right column ki width 14 se kam kar ke 12 (50%) kar di gayi hai */}
        <Col span={isMobile ? 24 : 12}>
          {/* NAYA IZAFA: Right side ko scroll ke sath sticky (fixed) kiya gaya hai */}
          <div style={{ position: isMobile ? 'static' : 'sticky', top: isMobile ? 'auto' : '85px', zIndex: 10 }}>
            <Card>
              {selectedCategory ? (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <Title level={4} style={{ margin: 0 }}>Attributes for: <Text style={{ color: token.colorSuccess }}>{selectedCategory.name}</Text></Title>
                    {(() => {
                      const limits = getPlanLimits(profile?.subscription_tier);
                      const isLocked = !limits.allow_custom_categories;
                      return (
                        <Button 
                          id="attr-add-btn"
                          type="primary" 
                          icon={isLocked ? <LockOutlined /> : <PlusOutlined />} 
                          onClick={() => {
                            if (isLocked) {
                              modal.confirm({
                                title: 'Attribute Management',
                                content: 'Creating custom attributes for categories requires a Growth or Pro plan.',
                                okText: 'View Plans',
                                cancelText: 'Close',
                                onOk: () => navigate('/subscription')
                              });
                            } else {
                              showAttributeModal();
                            }
                          }}
                          style={isLocked ? { 
                            color: token.colorTextDisabled, 
                            backgroundColor: token.colorFillTertiary, 
                            borderColor: token.colorBorder 
                          } : {}}
                        >
                          Add New
                        </Button>
                      );
                    })()}
                </div>
                <Table columns={attributeColumns} dataSource={attributes} loading={loadingAttributes} rowKey="id" size="small" pagination={false} scroll={{ x: true }} />
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '300px' }}>
                <Empty description="Select a category from the left to manage its attributes." />
              </div>
            )}
          </Card>
         </div>
        </Col>
      </Row>

      <Modal title={editingCategory ? 'Edit Category' : 'Add New Category'} open={isCategoryModalOpen} onCancel={handleCategoryModalCancel} onOk={() => categoryForm.submit()} okText="Save">
        <Form form={categoryForm} layout="vertical" onFinish={handleCategoryModalOk} style={{ marginTop: '24px' }}>
          {/* NAYA IZAFA: Enter dabane se form save karne ke liye hidden button */}
          <button type="submit" style={{ display: 'none' }} />
          
          <Form.Item 
              name="name" 
              label="Category Name" 
              rules={[{ required: true }]}
              help={editingCategory ? "Note: Renaming will update all existing products in this category." : ""}
          >
    <Input ref={categoryNameInputRef} placeholder="e.g. Smartphones, Audio, Accessories" />
        </Form.Item>

          {/* NAYA IZAFA: Parent Category Select Dropdown */}
          <Form.Item 
              name="parent_id" 
              label="Parent Category (Optional)"
              tooltip="Select a main category if you want to make this a sub-category."
          >
              <Select 
                  allowClear 
                  placeholder="None (Main Category)"
                  showSearch
                  optionFilterProp="children"
              >
                  {rawCategories
                      .filter(cat => cat.id !== editingCategory?.id) // Khud ko parent banane se rokna
                      .map(cat => (
                          <Option key={cat.id} value={cat.id}>{cat.name}</Option>
                      ))
                  }
              </Select>
          </Form.Item>

          <Form.Item 
            name="is_imei_based" 
            label="Stock Tracking Type"
            valuePropName="checked"
            tooltip={editingCategory ? "Tracking type cannot be changed once products are created." : "Enable this if items in this category need to be tracked individually."}
          >
            <Switch 
                checkedChildren="Per-Item (IMEI/Serial)" 
                unCheckedChildren="By Quantity (Bulk)" 
                disabled={!!editingCategory}
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal title={editingAttribute ? 'Edit Attribute' : 'Add New Attribute'} open={isAttributeModalOpen} onCancel={handleAttributeModalCancel} onOk={() => attributeForm.submit()} okText="Save">
        <Form form={attributeForm} layout="vertical" onFinish={handleAttributeModalOk} style={{ marginTop: '24px' }}>
          {/* NAYA IZAFA: Enter dabane se form save karne ke liye hidden button */}
          <button type="submit" style={{ display: 'none' }} />
          
          <Form.Item name="attribute_name" label="Attribute Name" rules={[{ required: true }]}><Input ref={attributeNameInputRef} placeholder="e.g., Color, Storage, IMEI" /></Form.Item>
          <Form.Item name="attribute_type" label="Input Type" rules={[{ required: true }]}><Select><Option value="text">Text</Option><Option value="number">Number</Option><Option value="select">Select</Option></Select></Form.Item>
          {attributeType === 'select' && (
            <Form.Item 
              name="options" 
              label="Options (Type and press Enter)" 
              rules={[{ required: true, message: 'Please provide at least one option!'}]}
              tooltip="Type an option name and press Enter to add it as a tag."
            >
              <Select 
                mode="tags" 
                style={{ width: '100%' }} 
                placeholder="e.g., New (Press Enter), Used (Press Enter)" 
                open={false} // Ye dropdown menu ko khulne se rokta hai, sirf type aur enter kaam karega
              />
            </Form.Item>
          )}
          <Form.Item name="is_required" label="Is this field required?" valuePropName="checked"><Switch /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Categories;