import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Modal, Form, Select, Input, Button, Divider, Typography, Table, Space, App, Row, Col, InputNumber, Collapse, Tag, Tooltip, Tabs, Card, theme, ConfigProvider, Empty
} from 'antd';
import { DeleteOutlined, BarcodeOutlined, EditOutlined, UserAddOutlined, PauseCircleOutlined, ClockCircleOutlined, SearchOutlined, PlusOutlined } from '@ant-design/icons';
import DraftBillsModal from '../components/DraftBillsModal';
import DataService from '../DataService';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { useStaff } from '../context/StaffContext';
import { formatCurrency } from '../utils/currencyFormatter';
import { useSync } from '../context/SyncContext';
import { db } from '../db';
import { useTheme } from '../context/ThemeContext';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { useNavigate, useLocation } from 'react-router-dom';
import { getPlanLimits } from '../config/subscriptionPlans';

const { Title, Text } = Typography;
const { Option } = Select;

// --- ITEM DETAIL MODAL (Chota Modal) ---
const AddItemModal = ({ visible, onCancel, onOk, product, attributes, initialValues, existingItems, editingItemIndex }) => {
  const { token } = theme.useToken();
  const { profile } = useAuth();
  const { isDarkMode } = useTheme();
  const limits = getPlanLimits(profile?.subscription_tier);
  const isWholesaleActive = profile?.wholesale_pricing_enabled && limits.allow_wholesale_pricing;
  const isBatchExpiryEnabled = profile?.enable_batch_expiry;
  const { message, modal } = App.useApp();
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
              wholesale_price: initialValues.wholesale_price,
              quantity: initialValues.quantity || 1,
              barcode: initialValues.barcode,
              warranty_days: initialValues.warranty_days ?? product?.default_warranty_days ?? 0,
              batch_number: initialValues.batch_number,
              expiry_date: initialValues.expiry_date,
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
            wholesale_price: product.wholesale_price || '', 
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

      // NAYA IZAFA: Asal kaam ko ek alag function mein daal diya taake aage use kar sakein
      const proceedWithAdd = async () => {
        try {
          let finalItemsData = [];

          const item_attributes = {};
          attributes.forEach(attr => {
              if (values[attr.attribute_name] !== undefined) {
                  item_attributes[attr.attribute_name] = values[attr.attribute_name];
              }
          });
          
          if (isImeiCategory) {
            const finalImeis = imeis.map(imei => imei.trim()).filter(imei => imei);
            if (finalImeis.length === 0) {
                message.error("Please enter at least one IMEI/Serial.");
                return;
            }

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
                // Agar edit kar rahe hain to purani ID, warna NAYI ID
                id: initialValues?.id || crypto.randomUUID(), 
                status: initialValues?.status || 'Available',
                temp_id: crypto.randomUUID(),
                product_id: product.id,
                name: product.name,
                purchase_price: values.purchase_price,
                sale_price: values.sale_price,
                wholesale_price: values.wholesale_price,
                warranty_days: values.warranty_days || 0,
                batch_number: values.batch_number || null,
                expiry_date: values.expiry_date || null,
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
                id: initialValues?.id || crypto.randomUUID(),
                status: initialValues?.status || 'Available',
                temp_id: crypto.randomUUID(),
                product_id: product.id,
                name: product.name,
                purchase_price: values.purchase_price,
                sale_price: values.sale_price,
                wholesale_price: values.wholesale_price,
                warranty_days: values.warranty_days || 0,
                batch_number: values.batch_number || null,
                expiry_date: values.expiry_date || null,
                quantity: values.quantity,
                item_attributes: item_attributes,
                barcode: values.barcode || null
            }];
          }
          
          onOk(finalItemsData);
          form.resetFields();
        } catch (err) {
          console.error(err);
          message.error(err.message || "An error occurred.");
        }
      };

      // NAYA IZAFA: Soft Warning Check
      if (isBatchExpiryEnabled && !values.expiry_date) {
          modal.confirm({
              title: 'Missing Expiry Date',
              content: 'You have not entered an Expiry Date for this item. Are you sure you want to save it without an expiry date?',
              okText: 'Yes, I Understand',
              cancelText: 'Cancel',
              onOk: proceedWithAdd
          });
      } else {
          proceedWithAdd();
      }

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
      width={800}
      style={{ top: 20 }}
      destroyOnHidden
    >
      <Form form={form} layout="vertical" autoComplete="off" style={{ marginTop: '24px' }} onValuesChange={handleValuesChange}>
        {isImeiCategory ? (
            <>
                <Row gutter={16}>
                    <Col span={isWholesaleActive ? 8 : 12}><Form.Item name="purchase_price" label="Purchase Price" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} prefix={profile?.currency ? `${profile.currency} ` : ''} /></Form.Item></Col>
                    <Col span={isWholesaleActive ? 8 : 12}><Form.Item name="sale_price" label={isWholesaleActive ? "Retail Price" : "Sale Price"} rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} prefix={profile?.currency ? `${profile.currency} ` : ''} /></Form.Item></Col>
                    {isWholesaleActive && (
                        <Col span={8}><Form.Item name="wholesale_price" label="Wholesale Price"><InputNumber style={{ width: '100%' }} prefix={profile?.currency ? `${profile.currency} ` : ''} /></Form.Item></Col>
                    )}
                    
                    {isBatchExpiryEnabled && (
                        <>
                            <Col span={12}>
                                <Form.Item name="batch_number" label="Batch / Lot Number" tooltip="Optional: Enter batch number for tracking">
                                    <Input placeholder="e.g. BATCH-001" />
                                </Form.Item>
                            </Col>
                            <Col span={12}>
                                <Form.Item name="expiry_date" label="Expiry Date" tooltip="Optional: When does this item expire?">
                                    <Input type="date" style={{ width: '100%' }} />
                                </Form.Item>
                            </Col>
                        </>
                    )}

                    {/* --- NAYA CODE: IMEI Warranty Check --- */}
                    {profile?.warranty_system_enabled !== false && (
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
                    )}

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
                    {/* Row 1: Purchase Price, Sale Price, Wholesale (if enabled), aur Total Quantity */}
                    <Col xs={24} sm={isWholesaleActive ? 6 : 8}>
                        <Form.Item name="purchase_price" label="Purchase Price" rules={[{ required: true }]}>
                            <InputNumber style={{ width: '100%' }} prefix={profile?.currency ? `${profile.currency} ` : ''} />
                        </Form.Item>
                    </Col>
                    <Col xs={24} sm={isWholesaleActive ? 6 : 8}>
                        <Form.Item name="sale_price" label={isWholesaleActive ? "Retail Price" : "Sale Price"} rules={[{ required: true }]}>
                            <InputNumber style={{ width: '100%' }} prefix={profile?.currency ? `${profile.currency} ` : ''} />
                        </Form.Item>
                    </Col>
                    {isWholesaleActive && (
                        <Col xs={24} sm={6}>
                            <Form.Item name="wholesale_price" label="Wholesale Price">
                                <InputNumber style={{ width: '100%' }} prefix={profile?.currency ? `${profile.currency} ` : ''} />
                            </Form.Item>
                        </Col>
                    )}
                    <Col xs={24} sm={isWholesaleActive ? 6 : 8}>
                        <Form.Item 
                            name="quantity" 
                            label="Total Quantity" 
                            rules={[{ required: true }]}
                            help={(initialValues?.sold_qty > 0 || initialValues?.returned_qty > 0) ? 
                                <Text type="warning" style={{fontSize: '12px'}}>
                                    {`Min required: ${(initialValues.sold_qty || 0) + (initialValues.returned_qty || 0)} (Already sold/returned)`}
                                </Text> : null}
                        >
                            <InputNumber 
                                style={{ width: '100%' }} 
                                min={(initialValues?.sold_qty || 0) + (initialValues?.returned_qty || 0) || 1} 
                            />
                        </Form.Item>
                    </Col>

                    {/* Row 2: Barcode, Batch, Expiry, Warranty */}
                    <Col xs={24} sm={8}>
                        <Form.Item label="Variant Barcode" tooltip="Assign a unique barcode to this variant.">
                            <Space.Compact style={{ width: '100%' }}>
                                <Form.Item name="barcode" noStyle>
                                    <Input prefix={<BarcodeOutlined />} placeholder="Scan or type barcode" disabled={isBarcodeLocked} style={disabledInputStyle} />
                                </Form.Item>
                                <Button 
                                    onClick={() => {
                                        const catName = product?.category_name || 'ITM';
                                        const prefix = catName.substring(0, 3).toUpperCase();
                                        const randomNum = Math.floor(10000 + Math.random() * 90000);
                                        form.setFieldValue('barcode', `${prefix}-${randomNum}`);
                                    }}
                                    disabled={isBarcodeLocked}
                                >
                                    Generate
                                </Button>
                            </Space.Compact>
                        </Form.Item>
                    </Col>

                    {isBatchExpiryEnabled && (
                        <>
                            <Col xs={24} sm={8}>
                                <Form.Item name="batch_number" label="Batch / Lot Number" tooltip="Optional: Enter batch number for tracking">
                                    <Input placeholder="e.g. BATCH-001" />
                                </Form.Item>
                            </Col>
                            <Col xs={24} sm={8}>
                                <Form.Item name="expiry_date" label="Expiry Date" tooltip="Optional: When does this item expire?">
                                    <Input type="date" style={{ width: '100%' }} />
                                </Form.Item>
                            </Col>
                        </>
                    )}

                    {profile?.warranty_system_enabled !== false && (
                    <Col xs={24} sm={8}>
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
                    )}
                </Row>

                {/* Professional Title instead of "Attributes" */}
                {attributes && attributes.length > 0 && (
                    <>
                        <Divider style={{ margin: '16px 0 12px 0' }}>Product Specifications</Divider>
                        <Row gutter={16}>
                            {attributes.map(attr => <Col xs={24} sm={12} key={attr.id}>{renderAttributeField(attr)}</Col>)}
                        </Row>
                    </>
                )}
            </>
        )}
      </Form>
    </Modal>
  );
};

// --- MAIN FORM COMPONENT ---
const AddPurchaseForm = () => {
  const { token } = theme.useToken();
  const isMobile = useMediaQuery('(max-width: 768px)');
  const location = useLocation();
  // Ab data props ki bajaye URL state se aayega
  const { 
    initialData, 
    editingPurchase, 
    editingItems 
  } = location.state || {};
  
  const visible = true; // Page hamesha visible hota hai
  
  const { profile } = useAuth();
  const { activeStaff } = useStaff(); // <--- NAYA IZAFA
  const limits = getPlanLimits(profile?.subscription_tier);
  const isWholesaleActive = profile?.wholesale_pricing_enabled && limits.allow_wholesale_pricing;
  const { message, modal } = App.useApp();
  const navigate = useNavigate();
  
  const onCancel = () => {
    navigate(-1); // Pichle page par wapis jane ke liye
  };

  const onPurchaseCreated = () => {
    navigate(-1); // Pichle page par wapis jane ke liye
  };
  const { refetchStockCount } = useAuth();
  const { syncAllData, processSyncQueue } = useSync();
  const [form] = Form.useForm();
  
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [purchaseItems, setPurchaseItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isItemModalVisible, setIsItemModalVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const[isAddSupplierModalOpen, setIsAddSupplierModalOpen] = useState(false);
  const [supplierForm] = Form.useForm();
  const [selectedProductAttributes, setSelectedProductAttributes] = useState([]);
  const [editingItemIndex, setEditingItemIndex] = useState(null);

  // --- NAYA IZAFA: Catalog States ---
  const [catalogSearch, setCatalogSearch] = useState('');
  const [selectedCatalogVariant, setSelectedCatalogVariant] = useState(null);

  // Jab user left side catalog se kisi item par click karega
  const handleCatalogItemClick = async (product, variant = null) => {
      try {
          const data = await fetchInheritedAttributes(product.category_id);
          setSelectedProductAttributes(data || []);
          setSelectedProduct(product);
          
          if (variant) {
              // FIX: Modal 'item_attributes' expect karta hai, is liye hum 'attributes' ko map kar rahe hain
              const formattedVariant = {
                  ...variant,
                  variant_id: variant.id,
                  item_attributes: variant.attributes || {}
              };
              
              // --- NAYA IZAFA: Purani Variant ID ko delete karein taake Inventory item ko bilkul NAYI ID mile ---
              delete formattedVariant.id;
              delete formattedVariant.local_id;
              // -------------------------------------------------------------------------------------------------

              setSelectedCatalogVariant(formattedVariant);
          } else {
              setSelectedCatalogVariant(null);
          }
          
          setIsItemModalVisible(true);
      } catch (error) {
          message.error("Error: " + error.message);
      }
  };
  // ----------------------------------
  // --- NAYA IZAFA: Draft Modal States ---
  const [isDraftModalOpen, setIsDraftModalOpen] = useState(false);
  const [heldCount, setHeldCount] = useState(0);

  const refreshHeldCount = async () => {
    const bills = await DataService.getHeldBills();
    // Sirf purchase drafts count karein
    const purchaseDrafts = bills.filter(b => b.bill_type === 'purchase');
    setHeldCount(purchaseDrafts.length);
  };

  useEffect(() => {
    refreshHeldCount();
  }, []);
  // --------------------------------------

  const selectedSupplierId = Form.useWatch('supplier_id', form);
  const selectedWarehouseId = Form.useWatch('warehouse_id', form);
  const currentNotes = Form.useWatch('notes', form);
  const currentInvoiceId = Form.useWatch('invoice_id', form);
  
  // --- NAYA IZAFA: Auto-Save Purchase Cart Persistence ---
  useEffect(() => {
    // Jab user page band kare to flag wapis false kar dein
    return () => { window.isPurchaseCartRestored = false; };
  }, []);

  useEffect(() => {
    // FIX: Jab tak purana data restore na ho jaye, auto-save ya clear mat karo (Race condition fix)
    if (!window.isPurchaseCartRestored) return;

    if (!editingPurchase && (purchaseItems.length > 0 || currentNotes || currentInvoiceId)) {
      DataService.saveActivePurchaseCart({
        cart: purchaseItems,
        supplier_id: selectedSupplierId,
        warehouse_id: selectedWarehouseId,
        notes: currentNotes,
        invoice_id: currentInvoiceId
      });
    } else if (!editingPurchase && purchaseItems.length === 0) {
      DataService.clearActivePurchaseCart();
    }
  }, [purchaseItems, selectedSupplierId, selectedWarehouseId, currentNotes, currentInvoiceId, editingPurchase]);
  // -------------------------------------------------------
  
  const totalAmount = purchaseItems.reduce((sum, item) => sum + ((item.quantity || 0) * (item.purchase_price || 0)), 0);

  // --- NAYA IZAFA: Parent aur Child dono ke attributes lane ka function ---
  const fetchInheritedAttributes = async (categoryId) => {
    let currentId = categoryId;
    const hierarchyIds = [];
    const allCategories = await db.categories.toArray();

    // Jab tak parent milta rahe, ID save karte raho (Neeche se Upar ki taraf)
    while (currentId) {
        hierarchyIds.push(currentId);
        const currentCat = allCategories.find(c => c.id === currentId);
        currentId = currentCat ? currentCat.parent_id : null;
    }

    let combinedAttributes = [];
    // Har ID ke attributes Local DB se mangwayein
    for (const id of hierarchyIds) {
        const attrs = await db.category_attributes.where('category_id').equals(id).toArray();
        combinedAttributes = [...combinedAttributes, ...attrs];
    }
    return combinedAttributes;
  };

  const getProductsWithCategory = useCallback(async () => {
    try {
      const localProducts = await db.products.toArray();
      const localCategories = await db.categories.toArray();
      const localVariants = await db.product_variants.toArray(); // <--- NAYA IZAFA: Variants table
      
      const categoryMap = {};
      localCategories.forEach(c => { categoryMap[c.id] = c.is_imei_based; });

      return localProducts.map(p => {
        // Is product ke variants dhoondein
        const pVariants = localVariants.filter(v => v.product_id === p.id);
        return {
          ...p,
          variants: pVariants, // <--- NAYA IZAFA: Variants attach kar diye
          category_is_imei_based: categoryMap[p.category_id] ?? false
        };
      });
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
          const [suppliersData, productsData, warehousesData] = await Promise.all([
            DataService.getSuppliers(),
            getProductsWithCategory(),
            DataService.getWarehouses ? DataService.getWarehouses() : []
          ]);
          setWarehouses(warehousesData || []);

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

              // NAYA IZAFA: Agar bahar se items bheje gaye hain (e.g. from Draft), to load karein
              if (editingItems && editingItems.length > 0) {
                  setPurchaseItems(editingItems);
                  window.isPurchaseCartRestored = true; // <--- FLAG SET
              } else {
                  // --- NAYA IZAFA: Restore Auto-Saved Cart ---
                  const savedCart = await DataService.getActivePurchaseCart();
                  if (savedCart && (savedCart.cart?.length > 0 || savedCart.supplier_id)) {
                      setPurchaseItems(savedCart.cart || []);
                      window.isPurchaseCartRestored = true; // <--- FLAG SET
                      setTimeout(() => {
                          form.setFieldsValue({
                              supplier_id: savedCart.supplier_id || cashSupplier?.id,
                              warehouse_id: savedCart.warehouse_id || (warehousesData?.find(w => w.is_default)?.id || null),
                              notes: savedCart.notes,
                              invoice_id: savedCart.invoice_id
                          });
                      }, 200);
                      // React StrictMode double render fix
                      if (!window.hasShownRestoreMsg) {
                          message.info("Your previous unsaved purchase has been restored.");
                          window.hasShownRestoreMsg = true;
                      }
                  } else if (cashSupplier) {
                      window.isPurchaseCartRestored = true; // <--- FLAG SET
                      setTimeout(() => { 
                          const defaultWh = warehousesData?.find(w => w.is_default);
                          form.setFieldsValue({ 
                              supplier_id: cashSupplier.id,
                              warehouse_id: defaultWh ? defaultWh.id : null
                          }); 
                      }, 100);
                  } else {
                      window.isPurchaseCartRestored = true; // <--- FLAG SET
                  }
              }
          } else {
              // EDIT MODE: Load Existing Data
              setSuppliers(allSuppliers);
              setProducts(productsData || []);
              
              // Draft mein agar purana data hai jisme warehouse nahi tha, to usay default shop par set karein
              const defaultWh = warehousesData?.find(w => w.is_default);
              const draftWhId = (editingItems && editingItems.length > 0 && editingItems[0].warehouse_id) 
                                ? editingItems[0].warehouse_id 
                                : (defaultWh ? defaultWh.id : null);

              form.setFieldsValue({
                  supplier_id: editingPurchase.supplier_id,
                  invoice_id: editingPurchase.invoice_id,
                  warehouse_id: draftWhId,
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
             // NAYA IZAFA: Ab hum parent aur child dono ke attributes layenge
             const data = await fetchInheritedAttributes(targetProduct.category_id);
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
      // NAYA IZAFA: Ab hum parent aur child dono ke attributes layenge
      const data = await fetchInheritedAttributes(selectedProdInfo.category_id);
      
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

        // NAYA IZAFA: Ab hum parent aur child dono ke attributes layenge
        const attrs = await fetchInheritedAttributes(originalProduct.category_id);

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
    setSelectedCatalogVariant(null);
    form.setFieldsValue({ product_id: null });
  };

  const handleRemoveItem = (recordToRemove, index) => {
     // Index se remove karein taake duplicate items mein masla na ho
     const updatedList = [...purchaseItems];
     updatedList.splice(index, 1);
     setPurchaseItems(updatedList);
  };

  // --- NAYA IZAFA: Subscription Limit Check for New Supplier ---
  const handleAddNewSupplierClick = async () => {
    const limits = getPlanLimits(profile?.subscription_tier);
    const isFeatureLocked = !limits.allow_supplier_management;
    
    const totalCount = await db.suppliers.count(); // Asli ginti database se
    const isLimitReached = totalCount >= limits.max_suppliers;
    const isLocked = isFeatureLocked || isLimitReached;
    
    if (isLocked) {
        modal.confirm({
            title: isFeatureLocked ? 'Supplier Management Locked' : 'Supplier Limit Reached',
            content: (
                <div>
                    {isFeatureLocked ? (
                        <>
                            <p>Free Plan only supports <b>Cash Purchases</b>.</p>
                            <p>To manage Supplier Ledgers (Udhaar/Khata) and Payments, please upgrade to Growth or Pro Plan.</p>
                        </>
                    ) : (
                        <>
                            <p>You have reached your plan's limit of <b>{limits.max_suppliers} suppliers</b>.</p>
                            <p>Please upgrade your subscription to add more suppliers.</p>
                        </>
                    )}
                </div>
            ),
            okText: 'View Plans',
            cancelText: 'Close',
            onOk: () => navigate('/subscription')
        });
        return;
    }
    setIsAddSupplierModalOpen(true);
  };

  // --- NAYA IZAFA: Add New Supplier ---
  const handleAddSupplier = async (values) => {
    if (values.phone) {
      values.phone = values.phone.replace(/[^\d+]/g, '');
    }
    try {
      setIsSubmitting(true);
      // Duplicate check
      const duplicate = await DataService.checkDuplicateSupplier(values.phone, values.name);
      if (duplicate) {
        if (duplicate.type === 'phone') {
          supplierForm.setFields([{ name: 'phone', errors: [`Registered to: ${duplicate.name}`] }]);
        } else {
          supplierForm.setFields([{ name: 'name', errors: ['Company name already exists!'] }]);
        }
        setIsSubmitting(false);
        return;
      }

      const newSupplier = await DataService.addSupplier(values);
      message.success('Supplier added successfully!');
      setIsAddSupplierModalOpen(false);
      supplierForm.resetFields();
      
      // Dropdown list ko update karein aur naye supplier ko select karein
      setSuppliers(prev => [...prev, newSupplier].sort((a, b) => a.name.localeCompare(b.name)));
      form.setFieldsValue({ supplier_id: newSupplier.id });
      
      // Sync queue ko background mein chalayein
      processSyncQueue();
    } catch (error) {
      message.error('Error adding supplier: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- NAYA IZAFA: Hold Purchase Bill (Save as Draft) ---
  const handleHoldBill = async () => {
      if (purchaseItems.length === 0) {
          message.warning("Please add at least one item to save as draft.");
          return;
      }
      try {
          const values = form.getFieldsValue();
          const supplierName = suppliers.find(s => s.id === values.supplier_id)?.name || 'Unknown Supplier';
          const { data: { user } } = await supabase.auth.getUser();
          
          // NAYA IZAFA: Cart items ke sath selected warehouse bhi attach kar dein taake restore hone par yaad rahe
          const cartWithWarehouse = purchaseItems.map(item => ({
              ...item,
              warehouse_id: values.warehouse_id
          }));

          await DataService.holdBill({
              cart: cartWithWarehouse,
              supplier_id: values.supplier_id,
              bill_type: 'purchase', // <--- NAYA IZAFA: Taake modal ko pata chale yeh purchase hai
              user_id: user?.id,
              staff_id: activeStaff?.id || null,
              note: `Purchase Draft for ${supplierName}`
          });
          
          setPurchaseItems([]);
          form.resetFields();

          // --- NAYA IZAFA: Form reset hone ke baad Default values wapis lagana ---
          const cashSup = suppliers.find(s => s.name.toLowerCase() === 'cash purchase');
          const defaultWh = warehouses.find(w => w.is_default);
          
          setTimeout(() => {
              form.setFieldsValue({
                  supplier_id: cashSup ? cashSup.id : null,
                  warehouse_id: defaultWh ? defaultWh.id : null
              });
          }, 100);
          // -----------------------------------------------------------------------

          await DataService.clearActivePurchaseCart();
          message.success("Purchase saved as draft!");
          refreshHeldCount(); // Draft count update karein
          // navigate(-1); <--- HATA DIYA GAYA HAI TAAKE USER ISI PAGE PAR RAHE
      } catch (error) {
          message.error("Failed to save draft: " + error.message);
      }
  };

  // --- SAVE LOGIC (UPDATED FOR EDITING) ---
  const handleSavePurchase = async () => {
    try {
      // Hum ne 'warehouse_id' ko validation list mein add kiya hai
      const values = await form.validateFields(['supplier_id', 'invoice_id', 'warehouse_id', 'notes']);
      if (purchaseItems.length === 0) { message.error("Please add at least one item."); return; }
      
      setIsSubmitting(true);
      const purchaseId = editingPurchase ? editingPurchase.id : crypto.randomUUID();

      // --- NAYA IZAFA: Draft / Null Fallback Logic ---
      let finalWarehouseId = values.warehouse_id;
      if (!finalWarehouseId) {
          const defaultWh = warehouses.find(w => w.is_default);
          finalWarehouseId = defaultWh ? defaultWh.id : null;
      }

      // Har item ke sath warehouse_id attach karein
      const itemsWithLocation = purchaseItems.map(({ name, brand, categories, category_is_imei_based, ...item }) => ({
          ...item,
          warehouse_id: finalWarehouseId
      }));

      const payload = {
        p_local_id: purchaseId,
        p_supplier_id: values.supplier_id,
        p_invoice_id: values.invoice_id || null,
        p_notes: values.notes || null,
        p_inventory_items: itemsWithLocation,
        staff_id: activeStaff?.id
      };

      if (editingPurchase) {
          // --- EDIT MODE (Offline Ready) ---
          await DataService.updatePurchaseFully(editingPurchase.id, {
              supplier_id: values.supplier_id,
              invoice_id: values.invoice_id,
              notes: values.notes,
              amount_paid: editingPurchase.amount_paid || 0, // Purani payment mehfooz rakhein
              items: itemsWithLocation,
              staff_id: activeStaff?.id 
          });
          message.success("Purchase updated successfully!");
      } else {
          // --- CREATE MODE (Offline Ready) ---
          const rpcData = await DataService.createNewPurchase(payload);

          // Payment record karne ka hissa yahan se hata diya gaya hai
          
          message.success("Purchase invoice created successfully!");
      }

      // Sync process background mein chalta rahega
      processSyncQueue();
      refetchStockCount();
      await DataService.clearActivePurchaseCart(); // <--- NAYA IZAFA: Successful save par cart saaf karein
      // Signal bhejein taake Dashboard aur Header foran update hon
      window.dispatchEvent(new CustomEvent('local-db-updated'));
      
      // --- NAYA IZAFA: Naye bill par usi page par rahein, Edit par wapis jayen ---
      if (editingPurchase) {
          navigate(-1); // Edit ke baad wapis purane page par
      } else {
          // Naye bill ke baad form saaf karein aur Default values lagayen
          setPurchaseItems([]);
          form.resetFields();

          const cashSup = suppliers.find(s => s.name.toLowerCase() === 'cash purchase');
          const defaultWh = warehouses.find(w => w.is_default);
          
          setTimeout(() => {
              form.setFieldsValue({
                  supplier_id: cashSup ? cashSup.id : null,
                  warehouse_id: defaultWh ? defaultWh.id : null
              });
          }, 100);
      }
      // -------------------------------------------------------------------------

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
    
    // --- NAYA IZAFA: Batch aur Expiry ko naam ke sath dikhana ---
    if (record.batch_number) details.push(`Batch: ${record.batch_number}`);
    if (record.expiry_date) details.push(`Exp: ${new Date(record.expiry_date).toLocaleDateString()}`);
    
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
                
                {/* Case 1: Agar Item BIK CHUKA hai (Sirf Edit mode mein dikhao) */}
                {editingPurchase && (record.sold_qty > 0 || record.returned_qty > 0) && (
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
   <ConfigProvider theme={{ components: { Table: { colorBgContainer: token.colorTableBg, headerBg: token.colorTableHeaderBg, headerColor: token.colorCardColumnsTitleText, colorText: token.colorCardDetailsText } } }}>
    <>
      <div style={{ padding: isMobile ? '12px 0' : '4px 0', width: '100%' }}>
      <Form form={form} layout="vertical" style={{ marginTop: '0px' }}>
        
        {/* --- TOP ROW: SUPPLIER & DETAILS (FULL WIDTH) --- */}
        <Card
          styles={{ body: { padding: isMobile ? '12px' : '16px' } }}
          style={{ borderRadius: '8px', background: token.colorCardBg, border: `1px solid ${token.colorCardBorder}`, boxShadow: `0 4px 12px ${token.colorCardShadow}`, marginBottom: '16px' }}
        >
          <Row gutter={16}>
            <Col xs={24} md={12} lg={6}>
                <Form.Item label="Supplier" required style={{ marginBottom: isMobile ? '12px' : '0' }}>
                    <Space.Compact style={{ width: '100%' }}>
                        <Form.Item name="supplier_id" noStyle rules={[{ required: true, message: 'Please select a supplier' }]}>
                            <Select 
                                placeholder="Select a supplier" 
                                loading={loading}
                                showSearch
                                filterOption={(input, option) => (option?.children ?? '').toLowerCase().includes(input.toLowerCase())}
                                disabled={editingPurchase && editingPurchase.amount_paid > 0}
                            >
                                {(suppliers ||[]).map(s => <Option key={s.id} value={s.id}>{s.name}</Option>)}
                            </Select>
                        </Form.Item>
                        <Tooltip title="Add New Supplier">
                            <Button 
                                icon={<UserAddOutlined />} 
                                onClick={handleAddNewSupplierClick}
                                disabled={editingPurchase && editingPurchase.amount_paid > 0}
                            />
                        </Tooltip>
                    </Space.Compact>
                </Form.Item>
                {editingPurchase && editingPurchase.amount_paid > 0 && (
                    <div style={{ marginTop: '-12px', marginBottom: '12px' }}>
                        <Text type="secondary" style={{ fontSize: '11px' }}>
                            Note: Supplier cannot be changed because payments are already recorded.
                        </Text>
                    </div>
                )}
            </Col>
            <Col xs={24} md={12} lg={6}>
                <Form.Item name="invoice_id" label="Supplier Invoice #" tooltip="Enter the bill number from your supplier. If left empty, a unique ID will be generated." style={{ marginBottom: isMobile ? '12px' : '0' }}>
                    <Input placeholder="e.g. INV-9988" />
                </Form.Item>
            </Col>
            <Col xs={24} md={12} lg={6}>
                <Form.Item name="warehouse_id" label="Receive To (Location)" rules={[{ required: true, message: 'Please select a location' }]} style={{ marginBottom: isMobile ? '12px' : '0' }}>
                    <Select placeholder="Select Godown / Shop">
                        {warehouses.map(wh => (
                            <Option key={wh.id} value={wh.id}>
                                {wh.name} {wh.is_default ? '(Default)' : ''}
                            </Option>
                        ))}
                    </Select>
                </Form.Item>
            </Col>
            <Col xs={24} md={12} lg={6}>
                <Form.Item name="notes" label="Internal Notes" style={{ marginBottom: '0' }}>
                    <Input placeholder="Any extra information about this purchase..." />
                </Form.Item>
            </Col>
          </Row>
        </Card>

      <Row gutter={[16, 16]}>
        
        {/* --- LEFT SIDE: PRODUCT CATALOG --- */}
        <Col xs={24} lg={8}>
          <Card
            styles={{ body: { padding: '12px', display: 'flex', flexDirection: 'column', height: isMobile ? '400px' : 'calc(100vh - 220px)' } }}
            style={{ borderRadius: '8px', background: token.colorCardBg, border: `1px solid ${token.colorCardBorder}`, boxShadow: `0 4px 12px ${token.colorCardShadow}`, height: '100%' }}
          >
            <Input 
              placeholder="Search products or variants..." 
              prefix={<SearchOutlined style={{ color: token.colorTextSecondary }} />} 
              value={catalogSearch}
              onChange={(e) => setCatalogSearch(e.target.value)}
              allowClear
            />
            <div style={{ flex: 1, overflowY: 'auto', marginTop: '12px', paddingRight: '4px' }} className="hide-scrollbar">
              <style>{`.hide-scrollbar::-webkit-scrollbar { display: none; } .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }`}</style>
              
              {products.filter(p => {
                  if (!catalogSearch) return true;
                  const lowerSearch = catalogSearch.toLowerCase();
                  const matchName = p.name?.toLowerCase().includes(lowerSearch);
                  const matchBrand = p.brand?.toLowerCase().includes(lowerSearch);
                  const matchVariant = p.variants?.some(v => 
                      JSON.stringify(v.item_attributes || {}).toLowerCase().includes(lowerSearch) ||
                      v.barcode?.toLowerCase().includes(lowerSearch)
                  );
                  return matchName || matchBrand || matchVariant;
              }).map(product => (
                  <div key={product.id} style={{ marginBottom: '12px' }}>
                      {/* Main Product Name */}
                      <Text strong style={{ fontSize: '14px', color: token.colorCardHeadingsText, display: 'block', marginBottom: '4px' }}>
                          {product.name} {product.brand ? `(${product.brand})` : ''}
                      </Text>
                      
                      {/* Variants List */}
                      {product.variants && product.variants.length > 0 ? (
                          product.variants.map((variant, idx) => {
                              let attrStr = '';
                              // FIX: product_variants table mein column ka naam 'attributes' hai
                              const variantAttrs = variant.attributes || variant.item_attributes; 
                              if (variantAttrs) {
                                  const attrs = Object.entries(variantAttrs)
                                      .filter(([k, val]) => val && !k.toLowerCase().includes('imei') && !k.toLowerCase().includes('serial'))
                                      .map(([k, val]) => val);
                                  if (attrs.length > 0) attrStr = attrs.join(', ');
                              }
                              return (
                                  <div 
                                      key={variant.id || idx}
                                      onClick={() => handleCatalogItemClick(product, variant)}
                                      style={{ 
                                          padding: '8px', 
                                          background: token.colorFillQuaternary, 
                                          borderRadius: '6px', 
                                          marginBottom: '4px',
                                          cursor: 'pointer',
                                          border: `1px solid ${token.colorBorderSecondary}`,
                                          display: 'flex',
                                          justifyContent: 'space-between',
                                          alignItems: 'center'
                                      }}
                                  >
                                      <Text style={{ fontSize: '13px' }}>{attrStr || 'Standard'}</Text>
                                      <Button size="small" type="text" icon={<PlusOutlined />} style={{ color: token.colorPrimary }} />
                                  </div>
                              );
                          })
                      ) : (
                          /* No variants, just the product */
                          <div 
                              onClick={() => handleCatalogItemClick(product, null)}
                              style={{ 
                                  padding: '8px', 
                                  background: token.colorFillQuaternary, 
                                  borderRadius: '6px', 
                                  marginBottom: '4px',
                                  cursor: 'pointer',
                                  border: `1px solid ${token.colorBorderSecondary}`,
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center'
                              }}
                          >
                              <Text style={{ fontSize: '13px' }}>Standard</Text>
                              <Button size="small" type="text" icon={<PlusOutlined />} style={{ color: token.colorPrimary }} />
                          </div>
                      )}
                  </div>
              ))}
              {products.length === 0 && <Empty description="No products found." style={{ marginTop: '20px' }} />}
            </div>
          </Card>
        </Col>

        {/* --- RIGHT SIDE: INVOICE & CART --- */}
        <Col xs={24} lg={16}>
          <Card
            styles={{ body: { padding: isMobile ? '12px' : '20px', display: 'flex', flexDirection: 'column', height: isMobile ? 'auto' : 'calc(100vh - 220px)' } }}
            style={{ borderRadius: '8px', background: token.colorCardBg, border: `1px solid ${token.colorCardBorder}`, boxShadow: `0 4px 12px ${token.colorCardShadow}`, height: '100%' }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0px', marginBottom: '8px' }}>
              <Title level={5} style={{ margin: 0, color: token.colorCardHeadingsText }}>Items in this Purchase</Title>
              <Text type="secondary" style={{ fontSize: '12px' }}>Click items from the left catalog to add</Text>
          </div>
          <Table
            columns={columns} 
            dataSource={purchaseItems}
            rowKey={(record) => record.id || record.temp_id}
            pagination={false}
            scroll={{ x: 'max-content', y: isMobile ? undefined : 'calc(100vh - 380px)' }}
            style={{ flex: 1 }}
            size={isMobile ? "small" : "middle"}
            summary={pageData => {
              const total = pageData.reduce((sum, item) => sum + ((item.quantity || 0) * (item.purchase_price || 0)), 0);
              return (
                <Table.Summary.Row style={{ background: token.colorFillAlter }}>
                  <Table.Summary.Cell index={0} colSpan={3}><Text strong style={{ color: token.colorCardHeadingsText }}>Total Amount</Text></Table.Summary.Cell>
                  <Table.Summary.Cell index={1} align="right"><Text strong style={{ color: token.colorAmountNegative }}>{formatCurrency(total, profile?.currency)}</Text></Table.Summary.Cell>
                  <Table.Summary.Cell index={2}></Table.Summary.Cell>
                </Table.Summary.Row>
              );
            }}
          />
          {/* Payment Record UI yahan se hata diya gaya hai */}
          
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px', flexWrap: 'wrap' }}>
            <Button key="back" onClick={onCancel}>{isMobile ? "Back" : "Cancel"}</Button>
            
            {/* --- NAYA IZAFA: View Drafts Button --- */}
            {!editingPurchase && (
                <Button key="view_drafts" onClick={() => setIsDraftModalOpen(true)} icon={<ClockCircleOutlined />}>
                    {isMobile ? `(${heldCount})` : `View Drafts (${heldCount})`}
                </Button>
            )}

            {/* --- NAYA IZAFA: Save as Draft Button --- */}
            {!editingPurchase && (
                <Button key="hold" onClick={handleHoldBill} disabled={purchaseItems.length === 0} icon={<PauseCircleOutlined />}>
                    {isMobile ? "" : "Save as Draft"}
                </Button>
            )}

            <Button key="submit" type="primary" loading={isSubmitting} onClick={handleSavePurchase}>
              {editingPurchase ? (isMobile ? "Update" : "Update Purchase") : (isMobile ? "Save" : "Save Purchase")}
            </Button>
          </div>
        </div>
      </Card>
      </Col>
      </Row>
      </Form>
      </div>
      {isItemModalVisible && 
        <AddItemModal 
          visible={isItemModalVisible} 
          onCancel={() => { setIsItemModalVisible(false); setEditingItemIndex(null); }} 
          onOk={handleItemDetailsOk} 
          product={selectedProduct}
          attributes={selectedProductAttributes}
          existingItems={purchaseItems}
          editingItemIndex={editingItemIndex}
          initialValues={editingItemIndex !== null ? purchaseItems[editingItemIndex] : selectedCatalogVariant ? { ...selectedCatalogVariant, quantity: 1 } : (initialData && !editingPurchase ? { ...initialData, quantity: 1 } : null)}
        />
      }

      {/* --- NAYA IZAFA: Add Supplier Modal (Full Tabs Version) --- */}
      <Modal 
        title="Add a New Supplier" 
        open={isAddSupplierModalOpen} 
        onCancel={() => { setIsAddSupplierModalOpen(false); supplierForm.resetFields(); }} 
        onOk={() => supplierForm.submit()} 
        okText="Save Supplier"
        confirmLoading={isSubmitting}
        destroyOnHidden
      >
        <Form form={supplierForm} layout="vertical" onFinish={handleAddSupplier} style={{ marginTop: 10 }}>
          <Tabs defaultActiveKey="1" items={[
            {
              key: '1',
              label: 'General',
              children: (
                <Row gutter={16}>
                  <Col span={24}>
                    <Form.Item name="name" label="Company" rules={[{ required: true, message: 'Please enter name' }]} tooltip="Supplier or Business legal name">
                      <Input placeholder="e.g. Samsung Global" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="contact_person" label="Contact" tooltip="Primary person to contact">
                      <Input placeholder="John Doe" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="tax_id" label="Tax ID" tooltip="VAT, GST, or NTN Number">
                      <Input placeholder="Tax Registration #" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="email" label="Email" rules={[{ type: 'email', message: 'Invalid email format' }]} tooltip="Business email address">
                      <Input placeholder="supplier@email.com" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="phone" label="Phone" rules={[{ required: true, message: 'Please enter phone' }]} tooltip="Mobile or Landline number">
                      <Input placeholder="+123456789" />
                    </Form.Item>
                  </Col>
                </Row>
              )
            },
            {
              key: '2',
              label: 'Location',
              children: (
                <Row gutter={16}>
                  <Col span={24}>
                    <Form.Item name="address" label="Address" tooltip="Street and area details">
                      <Input.TextArea rows={2} placeholder="Building, Street..." />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="city" label="City" tooltip="City name">
                      <Input placeholder="New York" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="country" label="Country" tooltip="Country name">
                      <Input placeholder="USA" />
                    </Form.Item>
                  </Col>
                </Row>
              )
            },
            {
              key: '3',
              label: 'Banking',
              children: (
                <Row gutter={16}>
                  <Col span={24}>
                    <Form.Item name="bank_name" label="Bank" tooltip="Supplier's bank name">
                      <Input placeholder="e.g. HBL, Barclays..." />
                    </Form.Item>
                  </Col>
                  <Col span={24}>
                    <Form.Item name="bank_account_title" label="A/C Title" tooltip="Account holder name">
                      <Input placeholder="Account Title" />
                    </Form.Item>
                  </Col>
                  <Col span={24}>
                    <Form.Item name="bank_account_no" label="A/C or IBAN" tooltip="Bank account number or International IBAN">
                      <Input placeholder="Account Number / IBAN" />
                    </Form.Item>
                  </Col>
                </Row>
              )
            }
          ]} />
        </Form>
      </Modal>

      {/* --- NAYA IZAFA: Drafts Modal for Purchases --- */}
      <DraftBillsModal 
        visible={isDraftModalOpen} 
        onCancel={() => setIsDraftModalOpen(false)} 
        onResume={async (heldBill) => {
          if (purchaseItems.length > 0) {
            message.warning("Please clear current items first or save them as a draft.");
            return;
          }
          
          // Draft items ko wapis form mein load karna
          const formattedForPurchase = heldBill.cart.map(item => ({
            ...item,
            id: crypto.randomUUID(), 
            status: 'Available',
            sold_qty: 0,
            returned_qty: 0,
            damaged_qty: 0
          }));
          
          setPurchaseItems(formattedForPurchase);
          form.setFieldsValue({
            supplier_id: heldBill.supplier_id,
            // NAYA IZAFA: Agar draft mein warehouse hai to wo lagao, warna default Main Shop set kardo
            warehouse_id: heldBill.cart[0]?.warehouse_id || (warehouses?.find(w => w.is_default)?.id || null),
          });
          
          await DataService.deleteHeldBill(heldBill.id);
          setIsDraftModalOpen(false);
          refreshHeldCount();
          message.success("Purchase Draft resumed!");
        }}
        onRefresh={refreshHeldCount} 
        profile={profile}
        customers={[]} // Purchase mein customers nahi chahiye
        allProducts={products}
        filterType="purchase" // <--- Modal ko batane ke liye ke sirf purchase drafts dikhaye
      />
    </>
    </ConfigProvider>
  );
};

export default AddPurchaseForm;