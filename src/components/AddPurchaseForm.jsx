import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Modal, Form, Select, Input, Button, Divider, Typography, Table, Space, App, Row, Col, InputNumber
} from 'antd';
import { DeleteOutlined, BarcodeOutlined, EditOutlined } from '@ant-design/icons';
import DataService from '../DataService';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../utils/currencyFormatter';
import { useSync } from '../context/SyncContext';
import { db } from '../db';
import { useTheme } from '../context/ThemeContext';

const { Title, Text } = Typography;
const { Option } = Select;

// --- ITEM DETAIL MODAL (Chota Modal) ---
const AddItemModal = ({ visible, onCancel, onOk, product, attributes, initialValues }) => {
  const { profile } = useAuth();
  const { isDarkMode } = useTheme();
  const [form] = Form.useForm();
  const [imeis, setImeis] = useState(['']);
  const imeiInputRefs = useRef([]);
  const isImeiCategory = product?.category_is_imei_based;
  const [isBarcodeLocked, setIsBarcodeLocked] = useState(!!initialValues);

  useEffect(() => {
    if (visible && product) {
      if (initialValues) {
          // EXISTING ITEM (Edit Mode)
          setIsBarcodeLocked(true);
          const formData = {
              purchase_price: initialValues.purchase_price,
              sale_price: initialValues.sale_price,
              quantity: initialValues.quantity || 1,
              barcode: initialValues.barcode,
              ...initialValues.item_attributes
          };
          if (isImeiCategory && initialValues.imei) {
              setImeis([initialValues.imei]);
          } else if (isImeiCategory) {
              setImeis(['']);
          }
          form.setFieldsValue(formData);
      } else {
          // NEW ITEM
          setIsBarcodeLocked(false);
          const commonValues = {
            purchase_price: product.default_purchase_price || '',
            sale_price: product.default_sale_price || '',
          };
          if (isImeiCategory) {
            form.setFieldsValue({ ...commonValues });
            setImeis(['']);
          } else {
            form.setFieldsValue({ ...commonValues, quantity: 1 });
          }
      }
    }
  }, [visible, product, isImeiCategory, form, initialValues]);

  const handleValuesChange = (changedValues, allValues) => {
    if (!initialValues) return;
    const attributeNames = attributes.map(a => a.attribute_name);
    const isAttributeChanged = attributeNames.some(attr => {
        return allValues[attr] !== initialValues.item_attributes[attr];
    });
    if (isAttributeChanged) {
        if (isBarcodeLocked) setIsBarcodeLocked(false);
    } else {
        if (!isBarcodeLocked) setIsBarcodeLocked(true);
        if (allValues.barcode !== initialValues.barcode) {
            form.setFieldValue('barcode', initialValues.barcode);
        }
    }
  };
  
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

      const item_attributes = {};
      attributes.forEach(attr => {
          if (values[attr.attribute_name] !== undefined) {
              item_attributes[attr.attribute_name] = values[attr.attribute_name];
          }
      });
      
      if (isImeiCategory) {
        const finalImeis = imeis.map(imei => imei.trim()).filter(imei => imei);
        if (finalImeis.length === 0) throw new Error("Please enter at least one IMEI/Serial.");

        finalItemsData = finalImeis.map(imei => ({
            // Agar edit kar rahe hain to purani ID sath rakhein (Server Safety)
            id: initialValues?.id || null, 
            product_id: product.id,
            name: product.name,
            purchase_price: values.purchase_price,
            sale_price: values.sale_price,
            quantity: 1,
            imei: imei,
            item_attributes: { ...item_attributes, 'Serial / IMEI': imei },
            barcode: null
        }));

      } else {
        finalItemsData = [{
            id: initialValues?.id || null,
            product_id: product.id,
            name: product.name,
            purchase_price: values.purchase_price,
            sale_price: values.sale_price,
            quantity: values.quantity,
            item_attributes: item_attributes,
            barcode: values.barcode || null
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
    if (isImeiCategory && ['IMEI', 'SERIAL / IMEI', 'SERIAL NUMBER'].includes(attribute.attribute_name.toUpperCase())) return null;

    switch (attribute.attribute_type) {
      case 'number': return <Form.Item name={attribute.attribute_name} label={attribute.attribute_name} rules={commonRules}><InputNumber style={{ width: '100%' }} /></Form.Item>;
      case 'select': return <Form.Item name={attribute.attribute_name} label={attribute.attribute_name} rules={commonRules}><Select>{(attribute.options || []).map(opt => <Option key={opt} value={opt}>{opt}</Option>)}</Select></Form.Item>;
      default: return <Form.Item name={attribute.attribute_name} label={attribute.attribute_name} rules={commonRules}><Input /></Form.Item>;
    }
  };

  const disabledInputStyle = isBarcodeLocked ? { 
      backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : '#f5f5f5',
      color: isDarkMode ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.25)',
      borderColor: isDarkMode ? '#424242' : '#d9d9d9',
      cursor: 'not-allowed' 
  } : {};

  return (
    <Modal
      title={<>Details for: <Typography.Text type="success">{product?.name}</Typography.Text></>}
      open={visible} onCancel={onCancel} onOk={handleOk} okText={initialValues ? "Update Item" : "Add to List"}
      width={isImeiCategory ? 800 : 520} destroyOnHidden
    >
      <Form form={form} layout="vertical" autoComplete="off" style={{ marginTop: '24px' }} onValuesChange={handleValuesChange}>
        {isImeiCategory ? (
            <>
                <Row gutter={16}>
                    <Col span={12}><Form.Item name="purchase_price" label="Purchase Price" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} prefix={profile?.currency ? `${profile.currency} ` : ''} /></Form.Item></Col>
                    <Col span={12}><Form.Item name="sale_price" label="Sale Price" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} prefix={profile?.currency ? `${profile.currency} ` : ''} /></Form.Item></Col>
                    {attributes.map(attr => <Col span={12} key={attr.id}>{renderAttributeField(attr)}</Col>)}
                </Row>
                <Divider />
                <Title level={5}>IMEI / Serial Numbers</Title>
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
                    <Col span={12}><Form.Item name="purchase_price" label="Purchase Price" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} prefix={profile?.currency ? `${profile.currency} ` : ''} /></Form.Item></Col>
                    <Col span={12}><Form.Item name="sale_price" label="Sale Price" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} prefix={profile?.currency ? `${profile.currency} ` : ''} /></Form.Item></Col>
                    <Col span={12}><Form.Item name="quantity" label="Quantity" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} min={1} /></Form.Item></Col>
                    <Col span={12}>
                        <Form.Item name="barcode" label="Variant Barcode" tooltip="Assign a unique barcode to this variant.">
                            <Input prefix={<BarcodeOutlined />} placeholder="Scan or type barcode" disabled={isBarcodeLocked} style={disabledInputStyle} />
                        </Form.Item>
                    </Col>
                </Row>
                <Divider>Attributes</Divider>
                <Row gutter={16}>
                    {attributes.map(attr => <Col span={12} key={attr.id}>{renderAttributeField(attr)}</Col>)}
                </Row>
            </>
        )}
      </Form>
    </Modal>
  );
};

// --- MAIN FORM COMPONENT ---
// Yahan hum ne 'editingPurchase' aur 'editingItems' props add kiye hain
const AddPurchaseForm = ({ visible, onCancel, onPurchaseCreated, initialData, editingPurchase, editingItems }) => {
  const { profile } = useAuth();
  const { message } = App.useApp();
  const { refetchStockCount } = useAuth();
  const { syncAllData } = useSync();
  const [form] = Form.useForm();
  
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [purchaseItems, setPurchaseItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isItemModalVisible, setIsItemModalVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedProductAttributes, setSelectedProductAttributes] = useState([]);
  const [editingItemIndex, setEditingItemIndex] = useState(null);
  
  const totalAmount = purchaseItems.reduce((sum, item) => sum + ((item.quantity || 0) * (item.purchase_price || 0)), 0);

  // Amount Paid Auto-Fill Logic
  useEffect(() => {
    if (visible && !editingPurchase) {
        // Sirf naye purchase mein auto-fill karein
        form.setFieldsValue({ amount_paid: totalAmount });
    }
  }, [totalAmount, visible, form, editingPurchase]);

  const getProductsWithCategory = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`id, name, brand, category_id, categories ( is_imei_based )`);
      if (error) throw error;
      return data.map(p => ({ ...p, category_is_imei_based: p.categories?.is_imei_based ?? false }));
    } catch (error) {
      throw new Error("Error fetching products: " + error.message);
    }
  }, []);

  // --- INITIAL DATA LOADING ---
  useEffect(() => {
    if (visible) {
      setLoading(true);
      const loadData = async () => {
        try {
          const [suppliersData, productsData] = await Promise.all([
            DataService.getSuppliers(),
            getProductsWithCategory()
          ]);

          let allSuppliers = suppliersData || [];
          
          // Cash Purchase Logic (Only for New Purchase)
          if (!editingPurchase) {
              let cashSupplier = allSuppliers.find(s => s.name.toLowerCase() === 'cash purchase');
              if (!cashSupplier && navigator.onLine) {
                const { data: serverSupplier } = await supabase.from('suppliers').select('*').ilike('name', 'Cash Purchase').maybeSingle();
                if (serverSupplier) {
                    await db.suppliers.put(serverSupplier);
                    allSuppliers = await DataService.getSuppliers();
                    cashSupplier = serverSupplier;
                } 
              }
              if (!cashSupplier) {
                 const newSupplierData = { name: 'Cash Purchase', address: 'Market / Walk-in', phone: '' };
                 const createdSupplier = await DataService.addSupplier(newSupplierData);
                 cashSupplier = createdSupplier;
                 allSuppliers = [...allSuppliers, createdSupplier];
              }
              setSuppliers(allSuppliers);
              setProducts(productsData || []);
              if (cashSupplier) {
                setTimeout(() => { form.setFieldsValue({ supplier_id: cashSupplier.id }); }, 100);
              }
          } else {
              // EDIT MODE: Load Existing Data
              setSuppliers(allSuppliers);
              setProducts(productsData || []);
              
              form.setFieldsValue({
                  supplier_id: editingPurchase.supplier_id,
                  notes: editingPurchase.notes,
                  amount_paid: editingPurchase.amount_paid,
                  payment_method: 'Cash' // Default
              });

              // Items ko format karein taake Table sahi dikhaye
              if (editingItems) {
                  const formattedItems = editingItems.map(item => ({
                      ...item,
                      name: item.product_name,
                      quantity: item.quantity || 1,
                      // ID zaroori hai taake update karte waqt pata chale ke yeh purana item hai
                  }));
                  setPurchaseItems(formattedItems);
              }
          }

        } catch (err) {
          message.error(err.message || "Failed to load initial data.");
        } finally {
          setLoading(false);
        }
      };
      loadData();
    } 
  }, [visible, form, message, getProductsWithCategory, editingPurchase, editingItems]);

  // --- INVENTORY ADD LOGIC (Existing) ---
  useEffect(() => {
    if (visible && initialData && products.length > 0 && !editingPurchase) {
      const targetProduct = products.find(p => p.id === initialData.product_id);
      if (targetProduct) {
          setSelectedProduct(targetProduct);
          form.setFieldsValue({ product_id: targetProduct.id });
          const fetchAttributes = async () => {
             const { data } = await supabase.from('category_attributes').select('*').eq('category_id', targetProduct.category_id);
             setSelectedProductAttributes(data || []);
             setTimeout(() => { setIsItemModalVisible(true); }, 200);
          };
          fetchAttributes();
      }
    }
  }, [visible, initialData, products, form, editingPurchase]);

  // --- RESET ON CLOSE ---
  useEffect(() => {
    if (!visible) {
      setPurchaseItems([]);
      form.resetFields();
      setEditingItemIndex(null);
    }
  }, [visible, form]);

  const handleAddItemClick = async () => {
    const productId = form.getFieldValue('product_id');
    if (!productId) { message.warning('Please select a product first.'); return; }
    const selectedProdInfo = products.find(p => p.id === productId);
    try {
      const { data, error } = await supabase.from('category_attributes').select('*').eq('category_id', selectedProdInfo.category_id);
      if (error) throw error;
      setSelectedProductAttributes(data);
      setSelectedProduct(selectedProdInfo);
      setIsItemModalVisible(true);
    } catch (error) {
      message.error("Could not fetch attributes: " + error.message);
    }
  };

  const handleEditItem = async (record, index) => {
    try {
        setLoading(true);
        const originalProduct = products.find(p => p.id === record.product_id);
        if (!originalProduct) return;

        const { data: attrs, error } = await supabase.from('category_attributes').select('*').eq('category_id', originalProduct.category_id);
        if (error) throw error;

        setSelectedProductAttributes(attrs);
        setSelectedProduct(originalProduct);
        setEditingItemIndex(index);
        setIsItemModalVisible(true);
    } catch (error) {
        message.error("Error preparing edit: " + error.message);
    } finally {
        setLoading(false);
    }
  };

  const handleItemDetailsOk = (itemsData) => {
    if (editingItemIndex !== null) {
        const updatedList = [...purchaseItems];
        updatedList.splice(editingItemIndex, 1, ...itemsData);
        setPurchaseItems(updatedList);
        setEditingItemIndex(null);
    } else {
        setPurchaseItems(prevItems => [...prevItems, ...itemsData]);
    }
    setIsItemModalVisible(false);
    setSelectedProduct(null);
    setSelectedProductAttributes([]);
    form.setFieldsValue({ product_id: null });
  };

  const handleRemoveItem = (recordToRemove, index) => {
     // Index se remove karein taake duplicate items mein masla na ho
     const updatedList = [...purchaseItems];
     updatedList.splice(index, 1);
     setPurchaseItems(updatedList);
  };

  // --- SAVE LOGIC (UPDATED FOR EDITING) ---
  const handleSavePurchase = async () => {
    try {
      const values = await form.validateFields(['supplier_id', 'notes', 'amount_paid', 'payment_method']);
      if (purchaseItems.length === 0) { message.error("Please add at least one item."); return; }
      
      setIsSubmitting(true);

      const payload = {
        p_supplier_id: values.supplier_id,
        p_notes: values.notes || null,
        p_inventory_items: purchaseItems.map(({ name, brand, categories, category_is_imei_based, ...item }) => item)
      };

      if (editingPurchase) {
          // --- EDIT MODE ---
          // Step 2 mein hum DataService.updatePurchaseFully banayenge.
          // Abhi ke liye hum yahan rukte hain taake error na aaye.
          
          await DataService.updatePurchaseFully(editingPurchase.id, {
              supplier_id: values.supplier_id,
              notes: values.notes,
              amount_paid: values.amount_paid,
              items: purchaseItems
          });
          
          message.success("Purchase updated successfully!");

      } else {
          // --- CREATE MODE (Existing Logic) ---
          const { data: rpcData, error } = await supabase.rpc('create_new_purchase', payload);
          if (error) throw error;

          const amountPaid = values.amount_paid || 0;
          if (amountPaid > 0) {
              let newPurchaseId = rpcData;
              if (!newPurchaseId) {
                  const { data: latestPurchase } = await supabase.from('purchases').select('id').eq('supplier_id', values.supplier_id).order('created_at', { ascending: false }).limit(1).single();
                  newPurchaseId = latestPurchase?.id;
              }
              if (newPurchaseId) {
                  await DataService.recordPurchasePayment({
                      supplier_id: values.supplier_id,
                      purchase_id: newPurchaseId,
                      amount: amountPaid,
                      payment_method: values.payment_method,
                      payment_date: new Date().toISOString(),
                      notes: `Initial payment for Purchase #${newPurchaseId}`
                  });
              }
          }
          message.success("Purchase invoice created successfully!");
      }

      await syncAllData();
      refetchStockCount();
      onPurchaseCreated();

    } catch (error) {
      if (error.name !== 'ValidationError') { message.error("Failed to save: " + error.message); }
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
    { 
        title: 'Product', 
        key: 'name', 
        render: (_, record) => (
            <Space direction="vertical" size={0}>
                <Text>{renderItemName(record)}</Text>
                {/* Agar item Sold hai to Red Tag dikhayein */}
                {record.status && record.status.toLowerCase() !== 'available' && (
                    <Text type="danger" style={{ fontSize: '12px' }}>
                        (Sold - Cannot Delete)
                    </Text>
                )}
            </Space>
        ) 
    },
    { title: 'Qty', dataIndex: 'quantity', key: 'quantity', align: 'center' },
    { title: 'Purchase Price', dataIndex: 'purchase_price', key: 'purchase_price', align: 'right', render: (price) => formatCurrency(price, profile?.currency) },
    { title: 'Subtotal', key: 'subtotal', align: 'right', render: (_, record) => formatCurrency((record.quantity || 0) * (record.purchase_price || 0), profile?.currency) },
    { 
      title: 'Action', 
      key: 'action', 
      align: 'center', 
      render: (_, record, index) => {
        // Check karein ke kya item Sold hai?
        const isSold = record.status && record.status.toLowerCase() !== 'available';
        
        return (
            <Space>
                {/* Agar Sold hai to Edit/Delete disable karein */}
                <Button 
                    icon={<EditOutlined />} 
                    disabled={isSold} 
                    onClick={() => handleEditItem(record, index)} 
                />
                <Button 
                    danger 
                    icon={<DeleteOutlined />} 
                    disabled={isSold} // <--- Yahan Lock lagaya hai
                    onClick={() => handleRemoveItem(record, index)} 
                />
            </Space>
        );
      }
    },
  ];

  return (
    <>
      <Modal
        title={editingPurchase ? `Edit Purchase #${editingPurchase.id}` : "Create New Purchase Invoice"} 
        open={visible} onCancel={onCancel} width={1000}
        footer={[ <Button key="back" onClick={onCancel}>Cancel</Button>, <Button key="submit" type="primary" loading={isSubmitting} onClick={handleSavePurchase}>{editingPurchase ? "Update Purchase" : "Save Purchase"}</Button> ]}
      >
        <Form form={form} layout="vertical" style={{ marginTop: '24px' }}>
          <Row gutter={16}>
            <Col span={12}><Form.Item name="supplier_id" label="Supplier" rules={[{ required: true }]}><Select placeholder="Select a supplier" loading={loading}>{(suppliers || []).map(s => <Option key={s.id} value={s.id}>{s.name}</Option>)}</Select></Form.Item></Col>
            <Col span={12}><Form.Item name="notes" label="Notes / Bill #"><Input placeholder="e.g., Invoice #INV-12345" /></Form.Item></Col>
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
            rowKey={(record, index) => record.id || `new-${index}`}
            pagination={false}
            summary={pageData => {
              const total = pageData.reduce((sum, item) => sum + ((item.quantity || 0) * (item.purchase_price || 0)), 0);
              return (
                <Table.Summary.Row>
                  <Table.Summary.Cell index={0} colSpan={3}><Text strong>Total Amount</Text></Table.Summary.Cell>
                  <Table.Summary.Cell index={1} align="right"><Text strong type="danger">{formatCurrency(total, profile?.currency)}</Text></Table.Summary.Cell>
                  <Table.Summary.Cell index={2}></Table.Summary.Cell>
                </Table.Summary.Row>
              );
            }}
          />
          <Divider />
          <Title level={5}>Payment Record</Title>
          <Row gutter={16} style={{ background: 'transparent', padding: '16px', borderRadius: '8px' }}>
              <Col span={12}>
                  <Form.Item 
                      name="amount_paid" 
                      label="Amount Paid Now" 
                      rules={[{ required: true, message: 'Please enter amount (0 if unpaid)' }]}
                  >
                      <InputNumber style={{ width: '100%' }} prefix={profile?.currency ? `${profile.currency} ` : ''} min={0} />
                  </Form.Item>
              </Col>
              <Col span={12}>
                  <Form.Item name="payment_method" label="Payment Method" rules={[{ required: true }]} initialValue="Cash">
                      <Select>
                          <Option value="Cash">Cash</Option>
                          <Option value="Bank Transfer">Bank Transfer</Option>
                          <Option value="Cheque">Cheque</Option>
                          <Option value="Other">Other</Option>
                      </Select>
                  </Form.Item>
              </Col>
          </Row>
        </Form>
      </Modal>
      {isItemModalVisible && 
        <AddItemModal 
          visible={isItemModalVisible} 
          onCancel={() => { setIsItemModalVisible(false); setEditingItemIndex(null); }} 
          onOk={handleItemDetailsOk} 
          product={selectedProduct}
          attributes={selectedProductAttributes}
          initialValues={editingItemIndex !== null ? purchaseItems[editingItemIndex] : (initialData && !editingPurchase ? { ...initialData, quantity: 1 } : null)}
        />
      }
    </>
  );
};

export default AddPurchaseForm;