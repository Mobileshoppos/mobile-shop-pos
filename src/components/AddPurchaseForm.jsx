import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Modal, Form, Select, Input, Button, Divider, Typography, Table, Space, App, Row, Col, InputNumber, Tooltip,
} from 'antd';
import { DeleteOutlined, BarcodeOutlined, EditOutlined } from '@ant-design/icons';
import DataService from '../DataService';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../utils/currencyFormatter';
import { useSync } from '../context/SyncContext';
import { db } from '../db';

const { Title, Text } = Typography;
const { Option } = Select;

const AddItemModal = ({ visible, onCancel, onOk, product, attributes, initialValues }) => {
  const { profile } = useAuth();
  const [form] = Form.useForm();
  const [imeis, setImeis] = useState(['']);
  const imeiInputRefs = useRef([]);
  const isImeiCategory = product?.category_is_imei_based;

  useEffect(() => {
    if (visible && product) {
      // Agar Edit kar rahe hain (initialValues mojood hai)
      if (initialValues) {
          const formData = {
              purchase_price: initialValues.purchase_price,
              sale_price: initialValues.sale_price,
              quantity: initialValues.quantity || 1,
              barcode: initialValues.barcode,
              ...initialValues.item_attributes // Purane attributes wapis daalein
          };
          
          // Agar IMEI wala item hai
          if (isImeiCategory && initialValues.imei) {
              setImeis([initialValues.imei]); // Sirf wohi IMEI dikhayein jo edit ho raha hai
          } else if (isImeiCategory) {
              setImeis(['']);
          }

          form.setFieldsValue(formData);
      } 
      // Agar Naya Item add kar rahe hain
      else {
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
                    <Col span={12}><Form.Item name="purchase_price" label="Purchase Price (per item)" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} prefix={profile?.currency ? `${profile.currency} ` : ''} /></Form.Item></Col>
                    <Col span={12}><Form.Item name="sale_price" label="Sale Price (per item)" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} prefix={profile?.currency ? `${profile.currency} ` : ''} /></Form.Item></Col>
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
                    <Col span={12}><Form.Item name="purchase_price" label="Purchase Price (per item)" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} prefix={profile?.currency ? `${profile.currency} ` : ''} /></Form.Item></Col>
                    <Col span={12}><Form.Item name="sale_price" label="Sale Price (per item)" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} prefix={profile?.currency ? `${profile.currency} ` : ''} /></Form.Item></Col>
                    <Col span={12}><Form.Item name="quantity" label="Quantity" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} min={1} /></Form.Item></Col>
                    
                    <Col span={12}>
                        <Form.Item 
                          name="barcode" 
                          label="Variant Barcode (Optional)"
                          tooltip="Assign a unique barcode to this specific variant (e.g., 18W Adapter). You can scan it here."
                        >
                            <Input prefix={<BarcodeOutlined />} placeholder="Scan or type barcode" />
                        </Form.Item>
                    </Col>
                </Row>
                <Divider>Variant Attributes</Divider>
                <Row gutter={16}>
                    {attributes.map(attr => <Col span={12} key={attr.id}>{renderAttributeField(attr)}</Col>)}
                </Row>
            </>
        )}
      </Form>
    </Modal>
  );
};

const AddPurchaseForm = ({ visible, onCancel, onPurchaseCreated }) => {
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

  // Update "Amount Paid" field whenever Total Amount changes
  useEffect(() => {
    if (visible) {
        // Default behavior: Set Amount Paid equal to Total Amount
        form.setFieldsValue({ amount_paid: totalAmount });
    }
  }, [totalAmount, visible, form]);

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
      throw new Error("Error fetching products: " + error.message);
    }
  }, []);

  // Updated useEffect to handle "Cash Purchase" default supplier
  useEffect(() => {
    if (visible) {
      setLoading(true);
      
      const loadData = async () => {
        try {
          // 1. Pehle Local Data Load karein
          const [suppliersData, productsData] = await Promise.all([
            DataService.getSuppliers(),
            getProductsWithCategory()
          ]);

          let allSuppliers = suppliersData || [];
          
          // 2. Check: Kya Local DB mein "Cash Purchase" hai?
          let cashSupplier = allSuppliers.find(s => s.name.toLowerCase() === 'cash purchase');

          // 3. Agar Local nahi mila, to Server check karein (Agar Online hain)
          if (!cashSupplier && navigator.onLine) {
            
            // Sirf check kar rahe hain, bana nahi rahe
            const { data: serverSupplier } = await supabase
                .from('suppliers')
                .select('*')
                .ilike('name', 'Cash Purchase')
                .maybeSingle();

            if (serverSupplier) {
                // CASE A: Server par mil gaya!
                // Hum isay Local DB mein 'put' karenge taake agli baar mil jaye.
                // NOTE: Hum DataService.addSupplier use NAHI karenge, kyunke wo Queue mein daal dega.
                // Hum direct DB mein save karenge taake duplicate na bane.
                
                await db.suppliers.put(serverSupplier);
                
                // List update karein
                allSuppliers = await DataService.getSuppliers();
                cashSupplier = serverSupplier;
            } 
          }

          // 4. Agar ab bhi nahi mila (Na Local, Na Server), tab naya banayein
          if (!cashSupplier) {
             // CASE B: Bilkul naya hai.
             // Ab hum DataService use karenge taake yeh Queue mein lag jaye
             // aur Swap Logic ke zariye baad mein Server par sync ho jaye.
             
             const newSupplierData = { 
                name: 'Cash Purchase', 
                address: 'Market / Walk-in', 
                phone: '' 
             };
             
             // Yeh function Queue handle karega
             const createdSupplier = await DataService.addSupplier(newSupplierData);
             
             cashSupplier = createdSupplier;
             allSuppliers = [...allSuppliers, createdSupplier];
          }

          // 5. State update aur Default Selection
          setSuppliers(allSuppliers);
          setProducts(productsData || []);

          if (cashSupplier) {
            // Hum thora sa intezaar (100ms) karenge taake Form screen par aa jaye
            setTimeout(() => {
                form.setFieldsValue({ supplier_id: cashSupplier.id });
            }, 100);
          }

        } catch (err) {
          message.error(err.message || "Failed to load initial data.");
        } finally {
          setLoading(false);
        }
      };

      loadData();

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

  const handleEditItem = async (record, index) => {
    try {
        setLoading(true);
        // 1. Asal Product dhoondein
        const originalProduct = products.find(p => p.id === record.product_id);
        if (!originalProduct) return;

        // 2. Attributes fetch karein (Jaisa add karte waqt karte hain)
        const { data: attrs, error } = await supabase
          .from('category_attributes')
          .select('*')
          .eq('category_id', originalProduct.category_id);
        
        if (error) throw error;

        // 3. Modal kholne ki tayari
        setSelectedProductAttributes(attrs);
        setSelectedProduct(originalProduct);
        setEditingItemIndex(index); // Yaad rakhein ke hum kis number wala item edit kar rahe hain
        setIsItemModalVisible(true);
        
    } catch (error) {
        message.error("Error preparing edit: " + error.message);
    } finally {
        setLoading(false);
    }
  };

  const handleItemDetailsOk = (itemsData) => {
    if (editingItemIndex !== null) {
        // CASE: Editing Existing Item
        // Hum purane item ko naye data se badal denge
        const updatedList = [...purchaseItems];
        // Note: Edit karte waqt hum maan rahe hain ke user ne 1 item edit kiya hai.
        // Agar user ne quantity barha di, to itemsData mein zyada items honge.
        // Hum us specific index par naye items insert kar denge.
        updatedList.splice(editingItemIndex, 1, ...itemsData);
        
        setPurchaseItems(updatedList);
        setEditingItemIndex(null); // Reset karein
    } else {
        // CASE: Adding New Item
        setPurchaseItems(prevItems => [...prevItems, ...itemsData]);
    }
    
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
      // 1. Validation: Ab hum payment fields ko bhi check karenge
      const values = await form.validateFields(['supplier_id', 'notes', 'amount_paid', 'payment_method']);
      
      if (purchaseItems.length === 0) { message.error("Please add at least one item."); return; }
      
      setIsSubmitting(true);

      // 2. Purchase ka data tayyar karna
      const purchasePayload = {
        p_supplier_id: values.supplier_id,
        p_notes: values.notes || null,
        p_inventory_items: purchaseItems.map(({ name, brand, categories, category_is_imei_based, ...item }) => item)
      };
      
      // 3. Online Invoice Banana (Supabase RPC)
      // Note: Hum koshish karenge ke RPC se ID mil jaye, warna hum server se latest ID mangwayenge
      const { data: rpcData, error } = await supabase.rpc('create_new_purchase', purchasePayload);
      
      if (error) throw error;

      // 4. Payment Record Karna (Agar paise diye gaye hain)
      const amountPaid = values.amount_paid || 0;
      
      if (amountPaid > 0) {
          // Hamein nayi Invoice ki ID chahiye. 
          // Agar RPC ne ID wapis nahi ki, to hum Supplier ki sab se aakhri purchase dhoond lenge.
          let newPurchaseId = rpcData;

          if (!newPurchaseId) {
              const { data: latestPurchase } = await supabase
                  .from('purchases')
                  .select('id')
                  .eq('supplier_id', values.supplier_id)
                  .order('created_at', { ascending: false })
                  .limit(1)
                  .single();
              newPurchaseId = latestPurchase?.id;
          }

          if (newPurchaseId) {
              // DataService use kar ke payment record karein (Offline-First style)
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

      // 5. Data Refresh Karna
      await syncAllData(); // Naya data download karein
      message.success("Purchase invoice created successfully!");
      refetchStockCount();
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
    { 
      title: 'Purchase Price', 
      dataIndex: 'purchase_price', 
      key: 'purchase_price', 
      align: 'right', 
      // YEH LINE TABDEEL HUI HAI
      render: (price) => formatCurrency(price, profile?.currency) 
    },
    { 
      title: 'Subtotal', 
      key: 'subtotal', 
      align: 'right', 
      // YEH LINE BHI TABDEEL HUI HAI
      render: (_, record) => formatCurrency((record.quantity || 0) * (record.purchase_price || 0), profile?.currency) 
    },
    { 
      title: 'Action', 
      key: 'action', 
      align: 'center', 
      render: (_, record, index) => ( // Note: index parameter add kiya hai
        <Space>
            <Button icon={<EditOutlined />} onClick={() => handleEditItem(record, index)} />
            <Button danger icon={<DeleteOutlined />} onClick={() => handleRemoveItem(record)} />
        </Space>
      )
    },
  ];

  return (
    <>
      <Modal
        title="Create New Purchase Invoice" open={visible} onCancel={onCancel} width={1000} destroyOnHidden={true}
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
                  <Table.Summary.Cell index={1} align="right"><Text strong type="danger">{formatCurrency(total, profile?.currency)}</Text></Table.Summary.Cell>
                  <Table.Summary.Cell index={2}></Table.Summary.Cell>
                </Table.Summary.Row>
              );
            }}
          />
          {/* --- NEW PAYMENT SECTION --- */}
          <Divider />
          <Title level={5}>Payment Record</Title>
          <Row gutter={16} style={{ background: 'transparent', padding: '16px', borderRadius: '8px' }}>
              <Col span={12}>
                  <Form.Item 
                      name="amount_paid" 
                      label="Amount Paid Now" 
                      rules={[{ required: true, message: 'Please enter amount (0 if unpaid)' }]}
                      help="Enter the amount you are paying right now. Default is Full Payment."
                  >
                      <InputNumber 
                          style={{ width: '100%' }} 
                          prefix={profile?.currency ? `${profile.currency} ` : ''}
                          min={0}
                          max={totalAmount} 
                      />
                  </Form.Item>
              </Col>
              <Col span={12}>
                  <Form.Item 
                      name="payment_method" 
                      label="Payment Method" 
                      rules={[{ required: true }]}
                      initialValue="Cash"
                  >
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
          onCancel={() => {
              setIsItemModalVisible(false);
              setEditingItemIndex(null); // Cancel par reset zaroor karein
          }} 
          onOk={handleItemDetailsOk} 
          product={selectedProduct}
          attributes={selectedProductAttributes}
          // Agar editingIndex null nahi hai, to us item ka data bhejein
          initialValues={editingItemIndex !== null ? purchaseItems[editingItemIndex] : null}
        />
      }
    </>
  );
};

export default AddPurchaseForm;