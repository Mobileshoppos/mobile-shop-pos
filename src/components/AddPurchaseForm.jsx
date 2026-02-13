import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Modal, Form, Select, Input, Button, Divider, Typography, Table, Space, App, Row, Col, InputNumber, Radio, Collapse, Tag
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
const AddItemModal = ({ visible, onCancel, onOk, product, attributes, initialValues, existingItems, editingItemIndex }) => {
  const { profile } = useAuth();
  const { isDarkMode } = useTheme();
  const { message } = App.useApp(); 
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
              warranty_days: initialValues.warranty_days ?? product?.default_warranty_days ?? 0,
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
            purchase_price: product.purchase_price || '', 
            sale_price: product.sale_price || '', 
            warranty_days: product.default_warranty_days || 0,
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

        // --- SMART DOUBLE-LOCK CHECK ---
        for (const imei of finalImeis) {
            const lowerImei = imei.toLowerCase();

            // 1. Check in Current Bill (Jo screen par list hai)
            const duplicateInList = existingItems?.some((item, idx) => 
                item.imei?.toLowerCase() === lowerImei && idx !== editingItemIndex
            );

            // 2. Check in Database (Jo pehle se dukan mein hai)
            const existingInDb = await db.inventory
                .filter(item => item.imei?.toLowerCase() === lowerImei && item.id !== initialValues?.id)
                .first();

            if (duplicateInList || existingInDb) {
                message.error(`IMEI/Serial "${imei}" is already in this bill or in stock!`);
                return;
            }
        }
        // --- CHECK KHATAM ---

        finalItemsData = finalImeis.map(imei => ({
            // Agar edit kar rahe hain to purani ID sath rakhein (Server Safety)
            id: initialValues?.id || null, 
            status: initialValues?.status || 'Available',
            temp_id: crypto.randomUUID(),
            product_id: product.id,
            name: product.name,
            purchase_price: values.purchase_price,
            sale_price: values.sale_price,
            warranty_days: values.warranty_days || 0,
            quantity: 1,
            imei: imei,
            item_attributes: { ...item_attributes, 'Serial / IMEI': imei },
            barcode: null
        }));

      } else {
        // --- PERFECT VARIANT IDENTITY CHECK (Barcode) ---
        if (values.barcode) {
            const lowerBarcode = values.barcode.toLowerCase();
            
            // Attributes ko sort karke string banana taake comparison sahi ho
            const currentAttrsJson = JSON.stringify(Object.entries(item_attributes).sort());

            // 1. Check in Database (Existing Products)
            const variantInDb = await db.product_variants
                .filter(v => v.barcode?.toLowerCase() === lowerBarcode)
                .first();

            if (variantInDb) {
                const dbAttrsJson = JSON.stringify(Object.entries(variantInDb.attributes || {}).sort());
                
                // Agar Product ID mukhtalif hai YA Attributes mukhtalif hain, to yeh Duplicate hai
                const isExactMatch = variantInDb.product_id === product.id && dbAttrsJson === currentAttrsJson;

                if (!isExactMatch) {
                    message.error(`Barcode "${values.barcode}" is already owned by a different product or variant. Each variant must have a unique barcode.`);
                    return;
                }
            }

            // 2. Check in Current Bill (List)
            const itemInList = existingItems?.find((item, idx) => 
                item.barcode?.toLowerCase() === lowerBarcode && idx !== editingItemIndex
            );

            if (itemInList) {
                const listAttrsJson = JSON.stringify(Object.entries(item_list?.item_attributes || {}).sort());
                const isExactMatchInList = itemInList.product_id === product.id && listAttrsJson === currentAttrsJson;

                if (!isExactMatchInList) {
                    message.error(`Barcode "${values.barcode}" is being used by a different variant in this bill.`);
                    return;
                }
            }
        }
        // --- CHECK KHATAM ---

        finalItemsData = [{
            id: initialValues?.id || null,
            status: initialValues?.status || 'Available',
            temp_id: crypto.randomUUID(),
            product_id: product.id,
            name: product.name,
            purchase_price: values.purchase_price,
            sale_price: values.sale_price,
            warranty_days: values.warranty_days || 0,
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
                    <Col span={12}>
    <Form.Item shouldUpdate={(prev, curr) => prev.warranty_days !== curr.warranty_days}>
        {({ getFieldValue }) => {
            const supplierDays = getFieldValue('warranty_days') || 0;
            const customerDays = product?.default_warranty_days || 0;
            const isRisky = supplierDays < customerDays;
            return (
                <Form.Item 
                    name="warranty_days" 
                    label="Supplier Warranty (Days)" 
                    validateStatus={isRisky ? "warning" : ""}
                    help={isRisky ? `Risk: Less than Customer Warranty (${customerDays} Days)` : ""}
                    tooltip="Enter warranty in number of days"
                >
                    <InputNumber style={{ width: '100%' }} min={0} placeholder="e.g. 365" />
                </Form.Item>
            );
        }}
    </Form.Item>
</Col>
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
                    <Col span={12}>
    <Form.Item shouldUpdate={(prev, curr) => prev.warranty_days !== curr.warranty_days}>
        {({ getFieldValue }) => {
            const supplierDays = getFieldValue('warranty_days') || 0;
            const customerDays = product?.default_warranty_days || 0;
            const isRisky = supplierDays < customerDays;
            return (
                <Form.Item 
                    name="warranty_days" 
                    label="Supplier Warranty (Days)" 
                    validateStatus={isRisky ? "warning" : ""}
                    help={isRisky ? `Risk: Less than Customer Warranty (${customerDays} Days)` : ""}
                    tooltip="Enter warranty in number of days"
                >
                    <InputNumber style={{ width: '100%' }} min={0} />
                </Form.Item>
            );
        }}
    </Form.Item>
</Col>
                    <Col span={12}>
    <Form.Item 
        name="quantity" 
        label="Total Quantity" 
        rules={[{ required: true }]}
        // User ko batane ke liye ke kitne bik chuke hain
        help={(initialValues?.sold_qty > 0 || initialValues?.returned_qty > 0) ? 
            <Text type="warning" style={{fontSize: '12px'}}>
                {`Min required: ${(initialValues.sold_qty || 0) + (initialValues.returned_qty || 0)} (Already sold/returned)`}
            </Text> : null}
    >
        <InputNumber 
            style={{ width: '100%' }} 
            // Safety Lock: Bikay hue maal se kam nahi karne dega
            min={(initialValues?.sold_qty || 0) + (initialValues?.returned_qty || 0) || 1} 
        />
    </Form.Item>
</Col>
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
  const { syncAllData, processSyncQueue } = useSync();
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
  const selectedSupplierId = Form.useWatch('supplier_id', form);
  const selectedSupplier = suppliers.find(s => s.id === selectedSupplierId);
  const isCashPurchase = selectedSupplier?.name?.toLowerCase() === 'cash purchase';
  
  const totalAmount = purchaseItems.reduce((sum, item) => sum + ((item.quantity || 0) * (item.purchase_price || 0)), 0);

  // Amount Paid Smart Logic (Updated for Edit Mode)
  useEffect(() => {
    if (visible) {
        if (isCashPurchase) {
            // Wapis 'Bank' kar diya gaya taake poori app consistent rahe
            form.setFieldsValue({ amount_paid: totalAmount, payment_method: 'Bank' });
        } else if (!editingPurchase) {
            // Naye bill ke liye default
            form.setFieldsValue({ amount_paid: 0, payment_method: 'Bank' });
        }
    }
  }, [totalAmount, visible, form, editingPurchase, isCashPurchase]);

  const getProductsWithCategory = useCallback(async () => {
    try {
      const localProducts = await db.products.toArray();
      const localCategories = await db.categories.toArray();
      
      const categoryMap = {};
      localCategories.forEach(c => { categoryMap[c.id] = c.is_imei_based; });

      return localProducts.map(p => ({
        ...p,
        category_is_imei_based: categoryMap[p.category_id] ?? false
      }));
    } catch (error) {
      throw new Error("Error fetching products from local storage: " + error.message);
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
              // DOUBLE CHECK: Agar list mein nahi mila, to DB mein check karein
              if (!cashSupplier) {
                  cashSupplier = await db.suppliers.filter(s => s.name.trim().toLowerCase() === 'cash purchase').first();
                  if (cashSupplier) {
                      allSuppliers.push(cashSupplier);
                  }
              }

              // Agar ab bhi nahi mila, tab hi naya banayein
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
                  invoice_id: editingPurchase.invoice_id, // <--- Added
                  notes: editingPurchase.notes,
                  amount_paid: editingPurchase.amount_paid,
                  payment_method: 'Cash' 
              });

              // Items ko format karein (Bulk fields ke sath)
              if (editingItems) {
                  const formattedItems = editingItems.map(item => ({
                      ...item,
                      name: item.product_name,
                      quantity: item.quantity || 1,
                      // Safety Lock ke liye used quantity columns
                      sold_qty: item.sold_qty || 0,
                      returned_qty: item.returned_qty || 0,
                      damaged_qty: item.damaged_qty || 0
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
             // Internet (Supabase) ke bajaye local DB se attributes uthayein
             const data = await db.category_attributes.where('category_id').equals(targetProduct.category_id).toArray();
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
      // Internet (Supabase) ke bajaye local DB se attributes uthayein
      const data = await db.category_attributes.where('category_id').equals(selectedProdInfo.category_id).toArray();
      
      setSelectedProductAttributes(data || []);
      setSelectedProduct(selectedProdInfo);
      setIsItemModalVisible(true);
    } catch (error) {
      message.error("Could not fetch attributes from local storage: " + error.message);
    }
  };

  const handleEditItem = async (record, index) => {
    try {
        setLoading(true);
        const originalProduct = products.find(p => p.id === record.product_id);
        if (!originalProduct) return;

        // Local DB use karein
        const attrs = await db.category_attributes.where('category_id').equals(originalProduct.category_id).toArray();

        setSelectedProductAttributes(attrs || []);
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
      // Hum ne 'invoice_id' ko validation list mein add kiya hai
      const values = await form.validateFields(['supplier_id', 'invoice_id', 'notes', 'amount_paid', 'payment_method']);
      if (purchaseItems.length === 0) { message.error("Please add at least one item."); return; }
      
      setIsSubmitting(true);
      const purchaseId = editingPurchase ? editingPurchase.id : crypto.randomUUID();

      const payload = {
        p_local_id: purchaseId,
        p_supplier_id: values.supplier_id,
        p_invoice_id: values.invoice_id || null, // <--- Added
        p_notes: values.notes || null,
        p_inventory_items: purchaseItems.map(({ name, brand, categories, category_is_imei_based, ...item }) => item)
      };

      if (editingPurchase) {
          // --- EDIT MODE (Offline Ready) ---
          await DataService.updatePurchaseFully(editingPurchase.id, {
              supplier_id: values.supplier_id,
              invoice_id: values.invoice_id, // <--- Added
              notes: values.notes,
              amount_paid: values.amount_paid,
              items: purchaseItems
          });
          message.success("Purchase updated successfully!");
      } else {
          // --- CREATE MODE (Offline Ready) ---
          const rpcData = await DataService.createNewPurchase(payload);

          const amountPaid = values.amount_paid || 0;
          if (amountPaid > 0) {
              await DataService.recordPurchasePayment({
                  local_id: crypto.randomUUID(),
                  supplier_id: values.supplier_id,
                  purchase_id: purchaseId,
                  amount: amountPaid,
                  payment_method: values.payment_method,
                  payment_date: new Date().toISOString(),
                  notes: `Initial payment for Purchase`
              });
          }
          message.success("Purchase invoice created successfully!");
      }

      // Sync process background mein chalta rahega
      processSyncQueue();
      refetchStockCount();
      // Signal bhejein taake Dashboard aur Header foran update hon
      window.dispatchEvent(new CustomEvent('local-db-updated'));
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
            if (value) {
                const upperKey = key.toUpperCase();
                // IMEI ya Serial wale labels ko attributes se nikaal dein taake double na ho
                if (upperKey.includes('IMEI') || upperKey.includes('SERIAL')) return;
                
                // Sirf value add karein (e.g., "New" ya "8"), label nahi
                details.push(value);
            }
        });
    }
    // IMEI ko aakhir mein alag se add karein agar mojood ho
    if (record.imei) details.push(record.imei);
    
    return (
        <span>
            <Text strong>{record.name}</Text>
            {details.length > 0 && (
                <Text type="secondary" style={{ fontSize: '12px', marginLeft: '8px' }}>
                    {`(${details.join(', ')})`}
                </Text>
            )}
        </span>
    );
  }

  const columns = [
    { 
        title: 'Product', 
        key: 'name', 
        render: (_, record) => (
            <Space direction="vertical" size={0}>
                <Text>{renderItemName(record)}</Text>
                
                {/* Case 1: Agar Item BIK CHUKA hai */}
                {/* Bulk Status Info */}
                {(record.sold_qty > 0 || record.returned_qty > 0) && (
                    <Text type="warning" style={{ fontSize: '12px', display: 'block' }}>
                        {`(${record.sold_qty || 0} Sold, ${record.returned_qty || 0} Returned)`}
                    </Text>
                )}
                {record.status && record.status.toLowerCase() === 'sold' && record.available_qty <= 0 && (
                    <Text type="danger" style={{ fontSize: '12px' }}>
                        (Fully Sold - Cannot Delete)
                    </Text>
                )}

                {/* Case 2: Agar Item WAPIS (Return) ho chuka hai */}
                {record.status && record.status.toLowerCase() === 'returned' && (
                    <Text type="warning" style={{ fontSize: '12px' }}>
                        (Returned - Price Editable)
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
        const status = record.status ? record.status.toLowerCase() : 'available';
        const isSold = status === 'sold';
        const isReturned = status === 'returned';
        
        return (
            <Space>
                <Button 
                    icon={<EditOutlined />} 
                    // Sold item edit nahi ho sakta, lekin Returned item ki price edit ho sakti hai
                    disabled={isSold} 
                    onClick={() => handleEditItem(record, index)} 
                />
                <Button 
                    danger 
                    icon={<DeleteOutlined />} 
                    // Sold aur Returned dono delete nahi ho sakte (History kharab hogi)
                    disabled={isSold || isReturned} 
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
        title={editingPurchase ? `Edit Purchase #${editingPurchase.invoice_id || editingPurchase.id.slice(0, 8)}` : "Create New Purchase Invoice"} 
        open={visible} onCancel={onCancel} width={1000}
        footer={[ <Button key="back" onClick={onCancel}>Cancel</Button>, <Button key="submit" type="primary" loading={isSubmitting} onClick={handleSavePurchase}>{editingPurchase ? "Update Purchase" : "Save Purchase"}</Button> ]}
      >
        <Form form={form} layout="vertical" style={{ marginTop: '24px' }}>
          <Row gutter={16}>
            <Col span={12}><Form.Item name="supplier_id" label="Supplier" rules={[{ required: true }]}><Select placeholder="Select a supplier" loading={loading}>{(suppliers || []).map(s => <Option key={s.id} value={s.id}>{s.name}</Option>)}</Select></Form.Item></Col>
            <Col span={12}>
                <Form.Item name="invoice_id" label="Supplier Invoice #" tooltip="Enter the bill number from your supplier. If left empty, a unique ID will be generated.">
                    <Input placeholder="e.g. INV-9988" />
                </Form.Item>
            </Col>
            <Col span={24}>
                <Form.Item name="notes" label="Internal Notes">
                    <Input.TextArea rows={1} placeholder="Any extra information about this purchase..." />
                </Form.Item>
            </Col>
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
            rowKey={(record) => record.id || record.temp_id}
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
          <Collapse 
            ghost 
            defaultActiveKey={isCashPurchase ? [] : ['1']} // Cash purchase par band rahega, doosron par khula
            items={[{
              key: '1',
              label: <Text strong style={{ fontSize: '16px' }}>Payment Record {isCashPurchase && <Tag color="green" style={{marginLeft: '10px'}}>Automatic Paid</Tag>}</Text>,
              children: (
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item 
                      name="amount_paid" 
                      label="Amount Paid Now" 
                      help={isCashPurchase ? "Locked for Cash Purchase" : `Max allowed: ${formatCurrency(totalAmount, profile?.currency)}`}
                      rules={[
                        { required: true, message: 'Please enter amount' },
                        // === SECURITY FIX: Yeh rule ghalat raqam save nahi hone dega ===
                        {
                          validator: (_, value) => {
                            // Agar Cash Purchase hai to check skip karein (kyunke hum auto-sync kar rahe hain)
                            if (isCashPurchase) return Promise.resolve();
                            
                            if (value > totalAmount) {
                              return Promise.reject(`Amount cannot be more than ${formatCurrency(totalAmount, profile?.currency)}`);
                            }
                            return Promise.resolve();
                          },
                        }
                      ]}
                    >
                      <InputNumber 
                        style={{ width: '100%' }} 
                        prefix={profile?.currency ? `${profile.currency} ` : ''} 
                        min={0} 
                        // max hata diya gaya hai taake auto-correction na ho
                        disabled={!!editingPurchase || isCashPurchase} 
                        placeholder="Enter amount paid"
                      />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="payment_method" label="Paid From" rules={[{ required: true }]}>
                      <Radio.Group buttonStyle="solid">
                        <Radio.Button value="Cash">Cash</Radio.Button>
                        <Radio.Button value="Bank">Bank / Online</Radio.Button>
                      </Radio.Group>
                    </Form.Item>
                  </Col>
                </Row>
              )
            }]}
          />
        </Form>
      </Modal>
      {isItemModalVisible && 
        <AddItemModal 
          visible={isItemModalVisible} 
          onCancel={() => { setIsItemModalVisible(false); setEditingItemIndex(null); }} 
          onOk={handleItemDetailsOk} 
          product={selectedProduct}
          attributes={selectedProductAttributes}
          existingItems={purchaseItems}
          editingItemIndex={editingItemIndex}
          initialValues={editingItemIndex !== null ? purchaseItems[editingItemIndex] : (initialData && !editingPurchase ? { ...initialData, quantity: 1 } : null)}
        />
      }
    </>
  );
};

export default AddPurchaseForm;