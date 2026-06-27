import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useLocation, Link } from 'react-router-dom';
import dayjs from 'dayjs';
import { Button, Table, Typography, Modal, Form, Input, InputNumber, App, Select, Tag, Row, Col, Card, List, Spin, Space, Collapse, Empty, Divider, Dropdown, Menu, Alert, AutoComplete, theme, DatePicker } from 'antd';
import { DatabaseOutlined, PlusOutlined, DeleteOutlined, ExclamationCircleOutlined, EditOutlined, FilterOutlined, SearchOutlined, BarcodeOutlined, MoreOutlined, ReloadOutlined, InboxOutlined, RollbackOutlined, AlertOutlined, LockOutlined, PrinterOutlined } from '@ant-design/icons';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { formatCurrency } from '../utils/currencyFormatter';
import DataService from '../DataService';
import { useSync } from '../context/SyncContext';
import { useStaff } from '../context/StaffContext';
import { db } from '../db';
import { useTheme } from '../context/ThemeContext';
import AddPurchaseForm from './AddPurchaseForm';
import ProductImageUpload from '../components/ProductImageUpload';
import BarcodePrinter from '../components/BarcodePrinter';
import { getPlanLimits } from '../config/subscriptionPlans';

const { Title, Text } = Typography;
const { Option } = Select;

// --- HELPER: NARAM (SMART) SEARCH ---
// Yeh function check karta hai ke agar spelling thodi ghalat bhi ho to match kar le
const isSmartMatch = (text, search) => {
  if (!text || !search) return false;
  const cleanText = text.toString().toLowerCase();
  const cleanSearch = search.toString().toLowerCase();

  // 1. Agar bilkul sahi match ho (Strict)
  if (cleanText.includes(cleanSearch)) return true;

  // 2. Agar search chota hai (3 letters se kam), to risk na lein
  if (cleanSearch.length < 3) return false;

  // 3. Naram Logic: Check karein ke search ke letters tartib se mojood hain ya nahi
  // Misal: "Samsng" dhoondne par "Samsung" mil jayega
  let searchIndex = 0;
  for (let i = 0; i < cleanText.length; i++) {
    if (cleanText[i] === cleanSearch[searchIndex]) {
      searchIndex++;
    }
    if (searchIndex === cleanSearch.length) return true; // Saare letters mil gaye
  }
  return false;
};

const formatPriceRange = (min, max, currency) => {
  if (min === null || max === null) return 'N/A';
  if (min === max) return formatCurrency(min, currency);
  return `${formatCurrency(min, currency)} - ${formatCurrency(max, currency)}`;
};

const ProductList = ({ showArchived, products, categories, loading, onDelete, onAddStock, onQuickEdit, onEditProductModel, onMarkDamaged, refFirstStock, onPrintBarcode }) => {
  const { token } = theme.useToken(); // Control Center Connection
  const { profile } = useAuth();
  const limits = getPlanLimits(profile?.subscription_tier); // <--- NAYA IZAFA: Yahan limits ko define kar diya
  const { isDarkMode } = useTheme();
  const { can } = useStaff(); // <--- Naya Guard
  
  const memoizedProducts = React.useMemo(() => {
    if (!products) return [];

    const createStableAttributeKey = (attributes) => {
      if (!attributes || typeof attributes !== 'object') return '{}';
      const filteredAttributes = {};
      Object.keys(attributes).forEach(key => {
        const lowerKey = key.toLowerCase();
        if (!lowerKey.includes('imei') && !lowerKey.includes('serial')) {
          filteredAttributes[key] = attributes[key];
        }
      });
      const sortedKeys = Object.keys(filteredAttributes).sort();
      const sortedAttributes = {};
      for (const key of sortedKeys) {
        sortedAttributes[key] = filteredAttributes[key];
      }
      return JSON.stringify(sortedAttributes);
    };

    const getGroupedVariants = (variants) => {
      if (!variants) return [];
      const itemsMap = new Map();

      for (const variant of variants) {
        const attributesKey = createStableAttributeKey(variant.item_attributes);
        // NAYA IZAFA: Batch aur Expiry ko key mein shamil kiya taake alag alag rows banein
        const key = `${attributesKey}-${variant.sale_price}-${variant.purchase_price}-${variant.batch_number || 'nobatch'}-${variant.expiry_date || 'noexp'}`;

        if (itemsMap.has(key)) {
          const existing = itemsMap.get(key);
          existing.display_quantity += (variant.available_qty || 0); // 1 ki jagah available_qty jama karein
          existing.ids.push(variant.id);
          if (variant.imei) existing.imeis.push(variant.imei);
        } else {
          itemsMap.set(key, {
            ...variant,
            display_quantity: variant.available_qty || 0, // 1 ki jagah available_qty rakhein
            ids: [variant.id],
            imeis: variant.imei ? [variant.imei] : [],
          });
        }
      }
      return Array.from(itemsMap.values());
    };

    return products.map(product => ({
      ...product,
      groupedVariants: getGroupedVariants(product.variants),
    }));

  }, [products]);

  if (loading) return <div style={{ textAlign: 'center', padding: '50px' }}><Spin size="large" /></div>;

  if (!memoizedProducts || memoizedProducts.length === 0) {
    return <div style={{ marginTop: '40px' }}><Empty description="No products found matching your filters." /></div>;
  }

  return (
    <>
      <style>{`.hide-scrollbar::-webkit-scrollbar { display: none; } .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }`}</style>

      <List
        grid={{ gutter: 16, xs: 1, sm: 1, md: 2, lg: 2, xl: 2 }}
        dataSource={memoizedProducts}
        rowKey="id"
        renderItem={(product) => (
          <List.Item>
            <Card
              hoverable
              style={{ 
                borderRadius: 8,
                border: `1px solid ${token.colorPrimary}33`, 
                boxShadow: `0 4px 12px ${token.colorPrimary}15`, 
                transition: 'all 0.3s ease',
                backgroundColor: token.colorCardBg || token.colorBgContainer, 
                height: '100%' 
              }}
              styles={{ body: { padding: '16px' } }}
            >
              {/* === HEADER AREA (SINGLE ROW) === */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                
                {/* Left Side: Name, Category, Brand */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', flex: 1 }}>
                  {product.image_url && (
                    <img src={product.image_url} alt={product.name} style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px', border: `1px solid ${token.colorBorder}` }} />
                  )}
                  <Text strong style={{ fontSize: '18px', lineHeight: 1 }}>
                    {product.name}
                  </Text>
                  <Tag color="cyan" style={{ margin: 0, fontSize: '11px', padding: '2px 6px' }}>
                    {product.category_name}
                  </Tag>
                  {product.brand && <Text type="secondary" style={{ fontSize: '13px' }}>{product.brand}</Text>}
                  {limits.allow_stock_location && product.rack_location && (
                    <Tag color="blue" style={{ margin: 0, fontSize: '11px', padding: '2px 6px' }}>
                      📍 {product.rack_location}
                    </Tag>
                  )}
                </div>

                {/* --- RIGHT SIDE (Price + Menu) --- */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  
                  {/* Price Range */}
                  <Text strong style={{ fontSize: '17px', color: token.colorSuccess, whiteSpace: 'nowrap' }}>
                    {formatPriceRange(product.min_sale_price, product.max_sale_price, profile?.currency)}
                  </Text>
                  
                  {/* 3-DOTS MENU (Sirf Ijazat walo ke liye) */}
                  {can('can_edit_inventory') && (
                  <Dropdown 
                    trigger={['click']}
                    menu={{
                      items: [
                        {
                          key: 'edit',
                          label: 'Edit Details',
                          icon: <EditOutlined />,
                          onClick: () => onEditProductModel(product)
                        },
                        {
                          key: 'archive',
                          // Agar showArchived true hai to "Unarchive", warna "Archive"
                          label: showArchived ? 'Unarchive (Restore)' : 'Archive (Hide)',
                          icon: <span style={{ fontSize: '16px' }}>{showArchived ? '♻️' : '📦'}</span>,
                          // Agar Unarchive karna hai to 'false' bhejein, Archive ke liye 'true'
                          onClick: () => onDelete(product, !showArchived) 
                        },
                        {
                          key: 'delete',
                          label: 'Delete Model',
                          icon: <DeleteOutlined />,
                          danger: true,
                          onClick: () => onDelete(product)
                        }
                      ]
                    }}
                  >
                    {/* Style thora adjust kiya taake icon upar align ho */}
                    <Button 
                        type="text" 
                        size="small"
                        icon={<MoreOutlined style={{ fontSize: '20px', fontWeight: 'bold' }} />} 
                        style={{ marginTop: '-2px' }} 
                    />
                  </Dropdown>
                  )}

                </div>
              </div>

              <Divider style={{ margin: '12px 0', borderColor: token.colorBorderSecondary }} />

              {/* === VARIANTS LIST === */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {product.groupedVariants.map((variant, index) => (
                  <div key={index} 
                    style={{ 
                      overflowX: 'auto', whiteSpace: 'nowrap', padding: '10px',
                      background: token.colorFillQuaternary, // Control Center se halka background
                      borderRadius: '6px', border: 'none',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                    }} className="hide-scrollbar">
                    
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      {/* STOCK BADGE - FONT INCREASED TO 14px */}
                      <div style={{ marginRight: '12px', flexShrink: 0 }}>
                        {/* STOCK BADGE - TRANSPARENT STYLE */}
                      <div style={{ marginRight: '12px', flexShrink: 0 }}>
                        <Tag 
                          color={variant.display_quantity > 0 ? "processing" : "error"}
                          style={{ margin: 0, fontSize: '15px', padding: '4px 10px' }}
                        >
                          {variant.display_quantity} Stock
                        </Tag>
                      </div>
                      </div>

                      <div style={{ marginRight: '16px', flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
                        {/* SALE PRICE - FONT INCREASED TO 15px */}
                        <Text strong style={{ color: token.colorSuccess, fontSize: '16px', lineHeight: '1.2' }}>
                           <span style={{ fontSize: '12px', opacity: 0.8, marginRight: '4px', color: token.colorTextSecondary }}>Sale:</span>
                           {formatCurrency(variant.sale_price, profile?.currency)}
                        </Text>
                        {/* BUY PRICE - Sirf Owner ya Report dekhne wale ko dikhega */}
                        {can('can_view_reports') && (
                          <Text type="secondary" style={{ fontSize: '12px', lineHeight: '1.2' }}>
                             <span style={{ fontSize: '10px', opacity: 0.8, marginRight: '4px' }}>Buy:</span>
                             {formatCurrency(variant.purchase_price, profile?.currency)}
                          </Text>
                        )}
                      </div>

                      {/* ATTRIBUTES - FONT INCREASED TO 14px */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {/* NAYA IZAFA: Batch aur Expiry Tags */}
                        {variant.batch_number && <Tag color="blue" style={{ margin: 0, fontSize: '14px', padding: '4px 8px' }}>Batch: {variant.batch_number}</Tag>}
                        {variant.expiry_date && <Tag color={new Date(variant.expiry_date) < new Date() ? "red" : "orange"} style={{ margin: 0, fontSize: '14px', padding: '4px 8px' }}>Exp: {new Date(variant.expiry_date).toLocaleDateString()}</Tag>}
                        
                        {variant.item_attributes && Object.entries(variant.item_attributes).map(([key, value]) => {
                          if (!value || key.toLowerCase().includes('imei') || key.toLowerCase().includes('serial')) return null;
                          return <Tag key={key} style={{ margin: 0, opacity: 0.8, fontSize: '14px', padding: '4px 8px' }}>{value}</Tag>;
                        })}
                        
                        {(!variant.item_attributes || Object.keys(variant.item_attributes).length === 0) && (
                          <Tag style={{ margin: 0, opacity: 0.5, fontSize: '12px' }}>Standard</Tag>
                        )}

                        {variant.imeis && variant.imeis.length > 0 && (
                          <span style={{ display: 'flex', alignItems: 'center', marginLeft: '8px' }}>
                            <Text type="secondary" style={{ fontSize: '13px', marginRight: '4px' }}>IMEI:</Text>
                            <Text style={{ fontSize: '13px', color: isDarkMode ? '#aaa' : '#666' }}>{variant.imeis.join(', ')}</Text>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* ADD STOCK BUTTON (Sirf Ijazat walo ke liye) */}
{can('can_edit_inventory') && (
  <>
    <Button 
      type="text" 
      icon={<PlusOutlined />} 
      size="small" 
      style={{ marginLeft: '8px', color: token.colorSuccess, fontSize: '16px' }} 
      onClick={() => onAddStock(variant)} 
      title="Add Stock / Add New Variants"
    />
    <Button 
      type="text" 
      icon={<EditOutlined />} 
      size="small" 
      style={{ marginLeft: '8px', color: 'token.colorPrimary', fontSize: '16px' }} 
      onClick={() => {
          const cat = categories?.find(c => c.id === product.category_id);
          const isImei = cat ? cat.is_imei_based : false;
          onQuickEdit(variant, isImei); 
      }}
      title="Edit Barcode/Price"
    />
    
    <Button 
      type="text" 
      danger
      icon={<AlertOutlined />} 
      size="small" 
      style={{ marginLeft: '8px', fontSize: '16px' }} 
      onClick={() => onMarkDamaged(variant)} 
      title="Mark as Damaged/Defective"
    />
  </>
)}
                  </div>
                ))}
                {/* AGAR PRODUCT KHALI HAI TO YEH DIKHAO */}
                {product.groupedVariants.length === 0 && (
                  <div style={{ 
                      padding: '16px', 
                      textAlign: 'center', 
                      background: isDarkMode ? 'rgba(255, 255, 255, 0.03)' : '#f9f9f9',
                      borderRadius: '6px',
                      border: '1px dashed #d9d9d9'
                  }}>
                      <Text type="secondary" style={{ display: 'block', marginBottom: '8px' }}>No stock added yet</Text>
                      
                      {/* Sirf Owner stock add kar sake */}
                      {can('can_edit_inventory') && (
                        <Button 
                          ref={refFirstStock}
                          type="dashed" 
                          icon={<PlusOutlined />} 
                          onClick={() => onAddStock(product)} 
                        >
                          Add First Stock
                        </Button>
                      )}
                  </div>
                )}
              </div>
            </Card>
          </List.Item>
        )}
      />
    </>
  );
};

const Inventory = () => {
  const { token } = theme.useToken(); // Control Center Connection
  const { can, activeStaff } = useStaff(); // <--- activeStaff ka izafa
  const refAddModel = useRef(null);
  const refSearch = useRef(null);
  const refFilters = useRef(null);
  const refArchive = useRef(null);
  const refFirstStock = useRef(null); 
  const [showArchived, setShowArchived] = useState(false);
  const searchInputRef = useRef(null);
  const productNameInputRef = useRef(null);

  const { isDarkMode } = useTheme();
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [searchParams] = useSearchParams();
  const { processSyncQueue } = useSync();
  const showLowStockOnly = searchParams.get('low_stock') === 'true';
  const location = useLocation();
  const { message, modal, notification } = App.useApp();
  const { user, profile } = useAuth();
  const limits = getPlanLimits(profile?.subscription_tier);
  const isWholesaleActive = profile?.wholesale_pricing_enabled && limits.allow_wholesale_pricing;
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [purchaseInitialData, setPurchaseInitialData] = useState(null);
  const [globalSearchMap, setGlobalSearchMap] = useState({});
  
  const [products, setProducts] = useState([]);
  const [totalModelCount, setTotalModelCount] = useState(0); // <--- NAYA: Total Models ki ginti
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [advancedFilters, setAdvancedFilters] = useState([]);
  const [filterAttributes, setFilterAttributes] = useState({}); 
  // --- PRODUCT MODEL EDIT STATE ---
  const [isProductEditModalOpen, setIsProductEditModalOpen] = useState(false);
  const [editingProductModel, setEditingProductModel] = useState(null);
  const [productEditForm] = Form.useForm();

  // --- EDIT PRODUCT MODEL FUNCTION ---
  const handleEditProductModelClick = (product) => {
      setEditingProductModel(product);
      productEditForm.setFieldsValue({
          name: product.name,
          brand: product.brand,
          category_id: product.category_id,
          default_warranty_days: product.default_warranty_days, // Nayi line
          hs_code: product.hs_code, // NAYA IZAFA: FBR
          uom: product.uom, // NAYA IZAFA: FBR
          image_url: product.image_url, // NAYA IZAFA: Image
          rack_location: product.rack_location // <--- NAYA IZAFA: Location
      });
      setIsProductEditModalOpen(true);
  };

  const handleProductModelUpdate = async (values) => {
      try {
          if (!editingProductModel) return;

          const updates = {
              name: values.name,
              brand: values.brand,
              default_warranty_days: values.default_warranty_days,
              hs_code: values.hs_code, // NAYA IZAFA: FBR
              uom: values.uom, // NAYA IZAFA: FBR
              image_url: values.image_url, // NAYA IZAFA: Image
              rack_location: values.rack_location // <--- NAYA IZAFA: Location
          };

          // Professional Way: DataService ka function use karein jo local DB + Sync Queue dono handle karta hai
          await DataService.updateProduct(editingProductModel.id, updates);

          message.success('Product details updated (Syncing...)!');
          setIsProductEditModalOpen(false);
          setEditingProductModel(null);
          
          // Sync process shuru karein taake console mein log nazar aaye
          processSyncQueue();
          
          // List refresh
          setRefreshTrigger(prev => prev + 1);

      } catch (error) {
          message.error("Update failed: " + error.message);
      }
  };

  // --- QUICK EDIT STATE ---
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [editForm] = Form.useForm();

  // Damaged Stock States
  const [isDamagedModalOpen, setIsDamagedModalOpen] = useState(false);
  const [damagedItem, setDamagedItem] = useState(null);
  const [damagedForm] = Form.useForm();

  // NAYA IZAFA: Barcode Printer State
  const [isBarcodePrinterOpen, setIsBarcodePrinterOpen] = useState(false);
  const [barcodeProduct, setBarcodeProduct] = useState(null);
  const [barcodeVariant, setBarcodeVariant] = useState(null);
  
  // --- NAYE MODALS KI STATE ---
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  
  const [productForm] = Form.useForm();
  
  const [editingProduct, setEditingProduct] = useState(null);
  const [nameSuggestions, setNameSuggestions] = useState([]);
  const [isImageUploading, setIsImageUploading] = useState(false); // NAYA IZAFA: Image upload status

  const [searchText, setSearchText] = useState('');
  const [filterCategory, setFilterCategory] = useState(null);
  const [priceRange, setPriceRange] = useState([null, null]);
  const [sortBy, setSortBy] = useState('name_asc');
  // --- NAYA: SILENT REFRESH LISTENER (Inventory ko chupke se update karne ke liye) ---
  useEffect(() => {
    const handleRefresh = () => {
      // Hum sirf refreshTrigger ko badha denge taake list khud refresh ho jaye
      setRefreshTrigger(prev => prev + 1);
    };
    window.addEventListener('local-db-updated', handleRefresh);
    return () => window.removeEventListener('local-db-updated', handleRefresh);
  }, []);
  
  const selectedCategoryId = Form.useWatch('category_id', productForm);
  const selectedBrand = Form.useWatch('brand', productForm);

  // Jab bhi products load hon ya filters badlein, suggestions tayyar karein
  useEffect(() => {
    // 1. Pehle saare products lein
    let filtered = products;

    // 2. Agar Category select hai, to sirf us category ke products dikhao
    if (selectedCategoryId) {
      filtered = filtered.filter(p => p.category_id === selectedCategoryId);
    }

    // 3. Agar Brand likha hai, to sirf us brand ke products dikhao
    if (selectedBrand) {
      filtered = filtered.filter(p => p.brand?.toLowerCase().includes(selectedBrand.toLowerCase()));
    }

    // 4. Unique naamo ki list banayein (khali naamo ko nikaal kar)
    const uniqueNames = Array.from(new Set(filtered.map(p => p.name)))
      .filter(name => name) // Sirf wo jin ka naam majood ho
      .map(name => ({ value: name }));
      
    setNameSuggestions(uniqueNames);
  }, [selectedCategoryId, selectedBrand, products]);
  // --- FOCUS LOGIC (Corrected Position) ---
  useEffect(() => {
    if (!isMobile) {
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isMobile]);

  useEffect(() => {
    if (isProductModalOpen && !isMobile) {
      const timer = setTimeout(() => {
        productNameInputRef.current?.focus();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isProductModalOpen, isMobile]);

  useEffect(() => {
    if (!user) return;
    const fetchDropdownData = async () => {
      try {
        const vMap = {};
        
        // 1. Variant Barcodes load karein
        const allVariants = await db.product_variants.toArray();
        allVariants.forEach(v => {
            if (v.barcode) vMap[v.barcode.toLowerCase()] = v.product_id;
        });

        // 2. Saaray IMEIs load karein (Available + Sold sab)
        // Taake agar item bik bhi gaya ho, tab bhi product dhoonda ja sake
        const allInventory = await db.inventory.toArray();
        allInventory.forEach(item => {
            if (item.imei) vMap[item.imei.toLowerCase()] = item.product_id;
        });

        setGlobalSearchMap(vMap);
        const localCategories = await db.categories.toArray();
        if (localCategories.length > 0) {
            const visibleCategories = localCategories.filter(cat => cat.is_visible !== false);
            setCategories(visibleCategories);
        } else if (navigator.onLine) {
            const { data: categoriesData, error: categoriesError } = await supabase.rpc('get_user_categories_with_settings');
            if (!categoriesError && categoriesData) {
                const visibleCategories = categoriesData.filter(cat => cat.is_visible);
                setCategories(visibleCategories);
            }
        }
        if (filterCategory && navigator.onLine) {
          const { data: attributes, error: attributesError } = await supabase.from('category_attributes').select('attribute_name').eq('category_id', filterCategory);
          if (!attributesError && attributes) {
            const filtersPromises = attributes.map(async (attr) => {
              const { data: options } = await supabase.rpc('get_distinct_attribute_values', { p_category_id: filterCategory, p_attribute_name: attr.attribute_name });
              return { attribute_name: attr.attribute_name, options: options || [] };
            });
            const resolvedFilters = await Promise.all(filtersPromises);
            setAdvancedFilters(resolvedFilters.filter(f => f.options.length > 0));
          }
        } else { setAdvancedFilters([]); }
      } catch (error) { console.log('Offline: Filters skipped'); }
    };
    fetchDropdownData();

    const searchHandler = setTimeout(async () => {
      // Naya: Agar pehle se data mojud hai to loading spinner mat dikhao (Silent Refresh)
      if (products.length === 0) setLoading(true);
      try {
        // NAYA: Pehle database se total models ginein (Active + Archive)
        const allModelsCount = await db.products.count();
        setTotalModelCount(allModelsCount);

        const { productsData } = await DataService.getInventoryData(showArchived);
        let filteredProducts = productsData;

        // === CHANGE 1: UPDATED SEARCH (Tags & Attributes bhi dhoondega) ===
        if (searchText) {
          const lowerSearch = searchText.toLowerCase();
          
          // Check karein ke kya yeh Search Text hamare Global Map mein hai?
          // Yani kya yeh koi Barcode ya IMEI hai?
          const matchedProductId = globalSearchMap[lowerSearch];

          filteredProducts = filteredProducts.filter(p => {
            // 1. Agar Map mein Product ID mil gaya, to seedha wohi product dikhao
            if (matchedProductId && p.id === matchedProductId) return true;

            // 2. Warna wahi purani Smart Search (Name, Brand, Tags)
            const mainMatch = isSmartMatch(p.name, searchText) ||
                              isSmartMatch(p.brand, searchText) ||
                              (p.barcode && p.barcode.toLowerCase().includes(lowerSearch));
            
            if (mainMatch) return true;

            // 3. Variants Tags Check (A10, Silicone etc.)
            if (p.variants && p.variants.length > 0) {
                return p.variants.some(v => {
                    return v.item_attributes && Object.values(v.item_attributes).some(val => 
                        isSmartMatch(val, searchText)
                    );
                });
            }
            return false;
          });
        }
        if (filterCategory) filteredProducts = filteredProducts.filter(p => p.category_id === filterCategory);
        // === CHANGE 2: UPDATED PRICE RANGE (Variants ki price bhi check karega) ===
        if (priceRange[0] !== null) {
            filteredProducts = filteredProducts.filter(p => {
                // Agar variants hain to unki price check karo, warna main product ki
                if (p.variants && p.variants.length > 0) return p.variants.some(v => v.sale_price >= priceRange[0]);
                return (p.sale_price || 0) >= priceRange[0];
            });
        }
        if (priceRange[1] !== null) {
            filteredProducts = filteredProducts.filter(p => {
                if (p.variants && p.variants.length > 0) return p.variants.some(v => v.sale_price <= priceRange[1]);
                return (p.sale_price || 0) <= priceRange[1];
            });
        }

        // --- NEW: Attribute Filtering (RAM, ROM, Color, etc.) ---
        Object.keys(filterAttributes).forEach(attrKey => {
          const attrValue = filterAttributes[attrKey];
          if (attrValue) {
            filteredProducts = filteredProducts.filter(p => {
              // Check karein ke kya is product ka koi bhi variant is attribute se match karta hai?
              return p.variants && p.variants.some(v => 
                v.item_attributes && v.item_attributes[attrKey] === attrValue
              );
            });
          }
        });
        // -------------------------------------------------------

        const formattedForUI = filteredProducts.map(p => ({
          ...p,
          min_sale_price: p.min_sale_price || p.sale_price,
          max_sale_price: p.max_sale_price || p.sale_price,
          quantity: p.quantity || 0,
          variants: p.variants || [] 
        }));

        formattedForUI.sort((a, b) => {
          if (sortBy === 'name_asc') return a.name.localeCompare(b.name);
          if (sortBy === 'price_asc') return (a.min_sale_price || 0) - (b.min_sale_price || 0);
          if (sortBy === 'price_desc') return (b.min_sale_price || 0) - (a.min_sale_price || 0);
          if (sortBy === 'quantity_desc') return (b.quantity || 0) - (a.quantity || 0);
          if (sortBy === 'quantity_asc') return (a.quantity || 0) - (b.quantity || 0);
          return 0;
        });
        setProducts(formattedForUI);
      } catch (error) { message.error("Error fetching products: " + error.message); setProducts([]); } finally { setLoading(false); }
    }, 300);
    return () => clearTimeout(searchHandler);
  }, [user, searchText, filterCategory, filterAttributes, priceRange, sortBy, message, showLowStockOnly, location, refreshTrigger, showArchived]);

  const handleResetFilters = () => {
    setSearchText(''); setFilterCategory(null); setFilterAttributes({}); setPriceRange([null, null]); setSortBy('name_asc');
  };

  // --- ADD STOCK HANDLER (Updated to fetch Barcode) ---
  const handleAddStockClick = async (item) => {

    // Check karein ke kya yeh Variant hai ya Main Product?
    const isVariant = item.product_id ? true : false;
    
    let fetchedBarcode = null;

    // Agar yeh Variant hai, to iska Barcode dhoondein
    if (isVariant && item.variant_id) {
        const variantRecord = await db.product_variants.get(item.variant_id);
        if (variantRecord) {
            fetchedBarcode = variantRecord.barcode;
        }
    } 
    // Agar Main Product hai (aur variant nahi), to uska barcode
    else if (!isVariant && item.barcode) {
        fetchedBarcode = item.barcode;
    }

    const dataToPass = {
        product_id: isVariant ? item.product_id : item.id,
        sale_price: item.sale_price,
        purchase_price: item.purchase_price,
        warranty_days: item.default_warranty_days, // Yeh line shamil ki
        item_attributes: item.item_attributes || {},
        imei: item.imei || null,
        
        // Ab yahan dhoonda hua barcode jayega
        barcode: fetchedBarcode || null 
    };
    
    setPurchaseInitialData(dataToPass);
    setIsPurchaseModalOpen(true);
  };

  // --- 1. PRODUCT EDIT HANDLERS ---
  const handleEditProductClick = (product) => {
      setEditingProduct(product);
      productForm.setFieldsValue({
          name: product.name,
          category_id: product.category_id,
          brand: product.brand,
          barcode: product.barcode,
          purchase_price: product.purchase_price,
          sale_price: product.sale_price,
          default_warranty_days: product.default_warranty_days,
          hs_code: product.hs_code, // NAYA IZAFA: FBR
          uom: product.uom, // NAYA IZAFA: FBR
          image_url: product.image_url, // NAYA IZAFA: Image
          rack_location: product.rack_location // <--- NAYA IZAFA: Location
      });
      setIsProductModalOpen(true);
  };

  const handleProductModalCancel = async () => {
    // Check karein ke form mein abhi kaunsi tasveer hai
    const currentImageUrl = productForm.getFieldValue('image_url');
    // Check karein ke shuru mein kaunsi tasveer thi
    const originalImageUrl = editingProduct ? editingProduct.image_url : null;

    // Agar nayi tasveer upload hui hai aur user ne cancel kar diya hai, to usay Supabase se ura dein
    if (currentImageUrl && currentImageUrl !== originalImageUrl) {
      const fileName = currentImageUrl.split('/').pop();
      if (fileName) {
        supabase.storage.from('product-images').remove([fileName]).catch(e => console.error(e));
      }
    }
    
    setIsProductModalOpen(false);
    setEditingProduct(null);
    productForm.resetFields();
  };

  const handleProductEditModalCancel = async () => {
    const currentImageUrl = productEditForm.getFieldValue('image_url');
    const originalImageUrl = editingProductModel ? editingProductModel.image_url : null;

    if (currentImageUrl && currentImageUrl !== originalImageUrl) {
      const fileName = currentImageUrl.split('/').pop();
      if (fileName) {
        supabase.storage.from('product-images').remove([fileName]).catch(e => console.error(e));
      }
    }
    
    setIsProductEditModalOpen(false);
  };

  const handleProductOk = async (values) => {
    try {
      // --- DUPLICATE CHECK LOGIC ---
      const duplicateInfo = await DataService.checkDuplicateProduct(
        values.name, 
        values.brand, 
        values.category_id, 
        editingProduct?.id
      );

      if (duplicateInfo) {
        if (duplicateInfo.isActive) {
          message.error(`"${values.name}" already exists in your active inventory!`);
        } else {
          message.warning(`"${values.name}" is in your Archived list. Please restore it from there instead of creating a new one.`);
        }
        return; 
      }
      // -----------------------------
      const productData = {
        ...values,
        barcode: values.barcode || null,
        min_sale_price: values.sale_price,
        max_sale_price: values.sale_price,
        default_warranty_days: values.default_warranty_days || 0
      };

      if (editingProduct) {
          // UPDATE
          await DataService.updateProduct(editingProduct.id, productData);
          message.success('Product updated successfully!');
      } else {
          // CREATE
          productData.user_id = user.id;
          productData.quantity = 0;
          await DataService.addProduct(productData);
          message.success('Product added successfully!');
      }
      
      setIsProductModalOpen(false);
      setEditingProduct(null);
      productForm.resetFields();
      processSyncQueue();
      setSearchText(prev => prev ? prev + ' ' : ' ');
      setTimeout(() => setSearchText(prev => prev.trim()), 10);
    } catch (error) { message.error('Error: ' + error.message); }
  };

  // --- UPDATED HANDLER: Delete ya Archive ---
  const handleDeleteProduct = (product, isArchiveRequest = null) => {
    // Agar Archive/Unarchive ki request hai (yani null nahi hai)
    if (isArchiveRequest !== null) {
        const isHiding = isArchiveRequest; // True = Hide, False = Restore
        
        modal.confirm({
            title: isHiding ? 'Archive Product?' : 'Restore Product?',
            icon: <ExclamationCircleOutlined />,
            content: isHiding 
                ? `Hide "${product.name}" from the main list?` 
                : `Restore "${product.name}" to the main list?`,
            okText: isHiding ? 'Yes, Archive' : 'Yes, Restore',
            onOk: async () => {
                try {
                    // DataService ko batayen (True = Hide, False = Show)
                    await DataService.toggleArchiveProduct(product.id, isHiding); 
                    message.success(isHiding ? 'Product archived' : 'Product restored');
                    // List refresh karein
                    setRefreshTrigger(prev => prev + 1); 
                } catch (error) { message.error(error.message); }
            }
        });
        return;
    }

    // Agar Delete ki request hai (Purana Logic)
    modal.confirm({
      title: 'Delete Product Model?',
      icon: <ExclamationCircleOutlined />,
      content: `Are you sure you want to delete "${product.name}"?`,
      okText: 'Yes, Delete', okType: 'danger', cancelText: 'No',
      onOk: async () => {
        try {
          await DataService.deleteProduct(product.id);
          message.success('Deleted successfully');
          setSearchText(prev => prev ? prev + ' ' : ' '); setTimeout(() => setSearchText(prev => prev.trim()), 10);
        } catch (error) { message.error(error.message); }
      },
    });
  };

  // --- UPDATED QUICK EDIT CLICK (Barcode Show Karne Ke Liye) ---
  const handleQuickEditClick = async (variant, isImeiBased) => {
      // 1. Modal foran khol dein. Hum is_imei_based flag bhi save kar rahe hain.
      setEditingItem({ ...variant, is_imei_based: isImeiBased });
      setIsEditModalOpen(true);

      // 2. Pehle wo value set karein jo abhi hamare paas hai (Temporary)
      editForm.setFieldsValue({
          barcode: variant.barcode || '', 
          sale_price: variant.sale_price,
          wholesale_price: variant.wholesale_price, // <--- NAYA IZAFA
          batch_number: variant.batch_number,       // <--- NAYA IZAFA
          expiry_date: variant.expiry_date ? dayjs(variant.expiry_date) : null // <--- NAYA IZAFA
      });

      // 3. ASAL DATA: Local Database se confirm karein (Taake 100% sahi Barcode nazar aaye)
      // Baaz dafa UI mein barcode missing hota hai, isliye DB se mangwana behtar hai.
      try {
          let targetVariantId = variant.variant_id;

          // Agar variant_id seedha nahi mila, to inventory item se dhoondein
          if (!targetVariantId && variant.ids && variant.ids.length > 0) {
             const invItem = await db.inventory.get(variant.ids[0]);
             if (invItem) targetVariantId = invItem.variant_id;
          }

          // Agar ID mil gayi, to Product Variants table se Barcode layein
          if (targetVariantId) {
              const dbVariant = await db.product_variants.get(targetVariantId);
              if (dbVariant) {
                  // Form ko update karein taake user ko Barcode nazar aaye
                  editForm.setFieldsValue({
                      barcode: dbVariant.barcode || ''
                  });
              }
          }
      } catch (error) {
          console.log("Error fetching existing barcode:", error);
      }
  };

    const handleQuickEditOk = async (values) => {
    try {
      if (!editingItem || !editingItem.ids) return;

      // 1. ID Dhoondna
      let variantId = editingItem.variant_id;
      if (!variantId && editingItem.ids.length > 0) {
        const localItem = await db.inventory.get(editingItem.ids[0]);
        if (localItem) variantId = localItem.variant_id;
      }

      if (!variantId) throw new Error("Item ID not found.");

      // 2. OFFLINE DUPLICATE BARCODE CHECK (Smart Case-Insensitive)
      // 2. OFFLINE DUPLICATE BARCODE CHECK (Smart, Case-Insensitive & Trimmed)
      if (values.barcode) {
        const lowerBarcode = values.barcode.trim().toLowerCase();
        
        const duplicateItem = await db.product_variants
          .filter(item => 
            item.barcode?.trim().toLowerCase() === lowerBarcode && 
            item.id !== variantId
          )
          .first();

        if (duplicateItem) {
          message.error(`Barcode "${values.barcode}" is already assigned to a different product or variant.`);
          return; // Yahin rok dein
        }
      }

      // 3. OFFLINE-FIRST UPDATE (Dexie + Queue)
      // Hum naya DataService function use kar rahe hain jo Barcode aur Price dono handle karega
      await DataService.updateQuickEdit(variantId, editingItem.ids, {
        barcode: values.barcode || null,
        sale_price: values.sale_price,
        wholesale_price: values.wholesale_price, // <--- NAYA IZAFA
        batch_number: values.batch_number || null,                                      // <--- NAYA IZAFA
        expiry_date: values.expiry_date ? values.expiry_date.format('YYYY-MM-DD') : null // <--- NAYA IZAFA
      });

      // 4. UI SUCCESS
      message.success('Item updated successfully!');
      setIsEditModalOpen(false);
      setEditingItem(null);
      
      // Sync process karein agar internet ho
      if (navigator.onLine) processSyncQueue();
      
      // List Refresh signal
      setRefreshTrigger(prev => prev + 1);

    } catch (error) {
      message.error(error.message);
    }
  };

  const handleMarkDamagedOk = async (values) => {
    try {
      if (!damagedItem || !damagedItem.ids) return;
      
      // Tamam IDs ki list bhejein (DataService ab loops handle kar lega aur staffId bhi save karega)
      await DataService.markItemAsDamaged(damagedItem.ids, values.quantity, values.notes, activeStaff?.id);
      
      message.success('Stock adjusted! Damaged quantity recorded.');
      setIsDamagedModalOpen(false);
      damagedForm.resetFields();
      setRefreshTrigger(prev => prev + 1); // List refresh karein
    } catch (error) {
      message.error(error.message);
    }
  };
  
  const isSmartPhoneCategorySelected = categories.find(c => c.id === selectedCategoryId)?.name === 'Smart Phones & Tablets';

  return (
    <div style={{ padding: isMobile ? '12px 0' : '4px 0' }}>
      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: isMobile ? 'space-between' : 'flex-end', alignItems: isMobile ? 'flex-start' : 'center', marginBottom: isMobile ? '16px' : '0' }}>
        {isMobile && (
        <Title level={2} style={{ margin: 0, marginLeft: '8px', fontSize: '23px' }}>
          <DatabaseOutlined /> {showLowStockOnly ? 'Low Stock Products' : 'Inventory'}
        </Title>
      )}
      {(() => {
        const limits = getPlanLimits(profile?.subscription_tier);
        const currentModelCount = totalModelCount; // <--- NAYA: Ab yeh Total ginega
        const isLimitReached = currentModelCount >= limits.max_models;

        return isMobile && can('can_edit_inventory') && (
          <Button 
            id="inv-add-btn-mobile"
            ref={refAddModel} 
            type="primary" 
            size="middle" 
            icon={isLimitReached ? <LockOutlined /> : null}
            onClick={() => {
              if (isLimitReached) {
                modal.confirm({
                  title: 'Product Model Limit Reached',
                  content: (
                    <div>
                      <p>You have reached your plan's limit of <b>{limits.max_models} product models</b>.</p>
                      <p>Please upgrade your subscription to add more models.</p>
                    </div>
                  ),
                  okText: 'View Plans',
                  cancelText: 'Close',
                  onOk: () => window.location.href = '/subscription'
                });
              } else {
                setIsProductModalOpen(true);
              }
            }} 
            style={{ 
              width: '100%', 
              marginTop: '10px',
              // Naya: Glow logic agar koi product na ho
              boxShadow: (!isLimitReached && products.length === 0) ? `0 0 15px ${token.colorPrimary}` : 'none',
              animation: (!isLimitReached && products.length === 0) ? 'navGlow 1.5s infinite ease-in-out' : 'none',
              ...(isLimitReached ? { 
                  color: token.colorTextDisabled, 
                  backgroundColor: token.colorFillTertiary, 
                  borderColor: token.colorBorder 
              } : {})
            }}
          >
            Add New Product Model
          </Button>
        );
      })()}
    </div>

      <div style={{ marginBottom: '18px', padding: isMobile ? '0 8px' : '0' }}>
        <Row gutter={[8, 8]} align="middle">
          {/* 1. Search Box (Sab se bada) */}
          <Col xs={24} sm={8} md={9}>
          <div ref={refSearch}>
            <Input 
              id="inv-search-input"
              ref={searchInputRef}
              placeholder="Search or Scan..." 
              prefix={<SearchOutlined style={{ color: token.colorTextSecondary }} />}
              value={searchText} 
              onChange={(e) => setSearchText(e.target.value)} 
              allowClear 
            />
            </div>
          </Col>

          {/* 2. Category Select */}
          <Col xs={12} sm={6} md={4}>
            <Select 
              placeholder="Category" 
              style={{ width: '100%' }} 
              value={filterCategory} 
              onChange={(value) => setFilterCategory(value)} 
              allowClear
              showSearch
              optionFilterProp="children"
            >
              {categories.map(cat => (<Option key={cat.id} value={cat.id}>{cat.name}</Option>))}
            </Select>
          </Col>

          {/* 3. Sort Select */}
          <Col xs={12} sm={6} md={4}>
            <Select value={sortBy} onChange={(v) => setSortBy(v)} style={{ width: '100%' }}>
                <Option value="name_asc">Name (A-Z)</Option>
                <Option value="price_asc">Price: Low to High</Option>
                <Option value="price_desc">Price: High to Low</Option>
                <Option value="quantity_desc">Stock: High to Low</Option>
                <Option value="quantity_asc">Stock: Low to High</Option>
            </Select>
          </Col>

          {/* 4. Action Buttons (Filter Toggle & Reset) */}
          <Col xs={24} sm={4} md={7} style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          
             
             {/* Filter Toggle Button */}
             <Button 
               ref={refFilters}
               icon={<FilterOutlined />} 
               onClick={() => setShowFilters(!showFilters)} 
               type={showFilters ? 'primary' : 'default'}
               title="More Filters" // Mouse rakhne par naam aayega
             />

             {/* Archive Toggle Button (Icon Only) */}
             <Button 
               ref={refArchive}
               icon={showArchived ? <RollbackOutlined /> : <InboxOutlined />} 
               onClick={() => setShowArchived(!showArchived)} 
               type={showArchived ? 'primary' : 'default'}
               danger={showArchived}
               // Tooltip: Taake user ko pata chale yeh button kya karta hai
               title={showArchived ? 'Back to Active Items' : 'View Archived Items'}
             />

             {/* Reset Button (Icon Only) */}
             <Button 
                id="inv-reset-btn"
                icon={<ReloadOutlined />} 
                onClick={handleResetFilters} 
                title="Reset All Filters" 
             />
             {(() => {
               const limits = getPlanLimits(profile?.subscription_tier);
               const currentModelCount = totalModelCount; // <--- NAYA: Ab yeh Total ginega
               const isLimitReached = currentModelCount >= limits.max_models;

               return !isMobile && can('can_edit_inventory') && (
                 <Button 
                   id="inv-add-btn-desktop"
                   ref={refAddModel} 
                   type="primary" 
                   icon={isLimitReached ? <LockOutlined /> : <PlusOutlined />}
                   onClick={() => {
                     if (isLimitReached) {
                       modal.confirm({
                         title: 'Product Model Limit Reached',
                         content: (
                           <div>
                             <p>You have reached your plan's limit of <b>{limits.max_models} product models</b>.</p>
                             <p>Please upgrade your subscription to add more models.</p>
                           </div>
                         ),
                         okText: 'View Plans',
                         cancelText: 'Close',
                         onOk: () => window.location.href = '/subscription'
                       });
                     } else {
                       setIsProductModalOpen(true);
                     }
                   }}
                   style={{
                       // Naya: Glow logic agar koi product na ho
                       boxShadow: (!isLimitReached && products.length === 0) ? `0 0 15px ${token.colorPrimary}` : 'none',
                       animation: (!isLimitReached && products.length === 0) ? 'navGlow 1.5s infinite ease-in-out' : 'none',
                       ...(isLimitReached ? { 
                           color: token.colorTextDisabled, 
                           backgroundColor: token.colorFillTertiary, 
                           borderColor: token.colorBorder 
                       } : {})
                   }}
                 >
                   New Product Model
                 </Button>
               );
             })()}
          </Col>
        </Row>

        {/* === HIDDEN FILTERS (Price Range & Attributes) === */}
        {showFilters && (
           <div style={{ marginTop: '8px' }}>
              <Row gutter={[8, 8]} align="top">
                {/* Price Range */}
                <Col xs={24} sm={12} md={6} lg={5}>
                  <Text type="secondary" style={{ display: 'block', marginBottom: '2px', fontSize: '11px', fontWeight: 500 }}>Price Range</Text>
                   <Space>
                      <InputNumber placeholder="Min" value={priceRange[0]} onChange={(v) => setPriceRange([v, priceRange[1]])} min={0} style={{ width: '100%' }} formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} parser={(v) => v.replace(/,/g, '')} />
                      <span style={{ color: token.colorTextSecondary }}>-</span>
                      <InputNumber placeholder="Max" value={priceRange[1]} onChange={(v) => setPriceRange([priceRange[0], v])} min={0} style={{ width: '100%' }} formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} parser={(v) => v.replace(/,/g, '')} />
                   </Space>
                </Col>

                {/* Dynamic Attributes (RAM, ROM, Color etc.) - Sirf tab dikhenge jab Category select hogi */}
                {advancedFilters.map((filter) => (
                  <Col xs={12} sm={6} md={4} lg={3} key={filter.attribute_name}>
                    <Text type="secondary" style={{ display: 'block', marginBottom: '2px', fontSize: '11px', fontWeight: 500 }}>{filter.attribute_name}</Text>
                    <Select
                      allowClear
                      showSearch // <-- Yeh search box on karega
                      style={{ width: '100%' }}
                      placeholder="Any"
                      value={filterAttributes[filter.attribute_name]}
                      onChange={(val) => setFilterAttributes(prev => ({ ...prev, [filter.attribute_name]: val }))}
                      // Yeh line batati hai ke search kaise karna hai (Small/Capital letters ignore karke)
                      filterOption={(input, option) =>
                        (option?.children ?? '').toLowerCase().includes(input.toLowerCase())
                      }
                    >
                      {filter.options.map(opt => <Option key={opt} value={opt}>{opt}</Option>)}
                    </Select>
                  </Col>
                ))}
                
                {/* Agar Category select nahi hai to user ko batayein */}
                {!filterCategory && (
                   <Col xs={24} md={12}>
                     <Text type="secondary" style={{ fontStyle: 'italic', fontSize: '11px', marginTop: '26px', display: 'block' }}>
                       * Select a Category to see more filters like RAM, ROM, Color.
                     </Text>
                   </Col>
                )}
              </Row>
           </div>
        )}
      </div>

      <ProductList 
        products={products} 
        categories={categories}
        loading={loading} 
        onDelete={handleDeleteProduct} 
        onAddStock={handleAddStockClick}
        onQuickEdit={handleQuickEditClick}
        onEditProductModel={handleEditProductModelClick}
        onMarkDamaged={(variant) => {
            setDamagedItem(variant);
            damagedForm.setFieldsValue({ quantity: 1 });
            setIsDamagedModalOpen(true);
        }}
        refFirstStock={refFirstStock}
        showArchived={showArchived}
        onPrintBarcode={async (product, variant) => {
            let fetchedBarcode = variant.barcode;
            
            // Database se asal barcode dhoondna
            if (!fetchedBarcode) {
                try {
                    let targetVariantId = variant.variant_id;
                    if (!targetVariantId && variant.ids && variant.ids.length > 0) {
                       const invItem = await db.inventory.get(variant.ids[0]);
                       if (invItem) targetVariantId = invItem.variant_id;
                    }
                    if (targetVariantId) {
                        const dbVariant = await db.product_variants.get(targetVariantId);
                        if (dbVariant) fetchedBarcode = dbVariant.barcode;
                    }
                } catch (error) {
                    console.error("Error fetching barcode:", error);
                }
            }

            // Agar barcode nahi mila, to error dikhayein
            if (!fetchedBarcode) {
                message.warning("No barcode found! Please click 'Edit' (pencil icon) to generate a barcode first.");
                return;
            }

            setBarcodeProduct(product);
            setBarcodeVariant({ ...variant, barcode: fetchedBarcode });
            setIsBarcodePrinterOpen(true);
        }}
      />

      {/* MODAL 1: PRODUCT MODEL EDIT/CREATE */}
      <Modal 
        title={editingProduct ? "Edit Product Model" : "Add a New Product Model"} 
        open={isProductModalOpen} 
        onOk={productForm.submit} 
        onCancel={handleProductModalCancel} 
        okText={isImageUploading ? "Uploading..." : "Save Model"}
        okButtonProps={{ disabled: isImageUploading }}
      >
        <Form form={productForm} layout="vertical" onFinish={handleProductOk} style={{marginTop: '24px'}}>
          {/* NAYA IZAFA: Hidden submit button taake Enter dabane se form save ho jaye */}
          <button type="submit" style={{ display: 'none' }} />
          <Form.Item name="name" label="Product Name" rules={[{ required: true }]}>
            <Input 
              ref={productNameInputRef} 
              placeholder="e.g. Apple 17" 
            />
          </Form.Item>
          <Form.Item 
            name="category_id" 
            label="Category" 
            rules={[{ required: true }]}
            extra={<span>Can't find your category? <Link to="/categories">Create a new one here</Link></span>}
          >
            <Select placeholder="Select...">{categories.map(c => (<Option key={c.id} value={c.id}>{c.name}</Option>))}</Select>
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="brand" label="Brand" rules={[{ required: true }]}><Input /></Form.Item>
            </Col>
            {limits.allow_stock_location && (
              <Col span={12}>
                <Form.Item name="rack_location" label="Stock Location (Rack/Shelf)" tooltip="e.g. Shelf A, Counter 2">
                  <Input placeholder="e.g. Shelf A" />
                </Form.Item>
              </Col>
            )}
          </Row>
          
          {profile?.fbr_integration_enabled && (
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item 
                  name="hs_code" 
                  label="HS Code (FBR)" 
                  tooltip="Must be exactly 4 digits, a dot, and 4 digits (e.g., 8517.1219)"
                  rules={[
                    { required: true, message: 'HS Code is required for FBR' },
                    { pattern: /^\d{4}\.\d{4}$/, message: 'Format must be XXXX.XXXX (e.g. 0101.2100)' }
                  ]}
                  help={<a href="https://www.fbr.gov.pk/customs-tariff/131175" target="_blank" rel="noopener noreferrer">Find your HS Code here</a>}
                >
                  <Input placeholder="0000.0000" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item 
                  name="uom" 
                  label="Unit of Measure (FBR)"
                  rules={[{ required: true, message: 'UOM is required for FBR' }]}
                >
                  <Select placeholder="Select UOM">
                    <Option value="Numbers, pieces, units">Numbers, pieces, units</Option>
                    <Option value="KG">KG</Option>
                    <Option value="MT">MT (Metric Ton)</Option>
                    <Option value="SqY">SqY (Square Yard)</Option>
                    <Option value="Liters">Liters</Option>
                    <Option value="Meters">Meters</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>
          )}

          <Row gutter={16}>
            <Col span={12}>
                <Form.Item name="purchase_price" label="Default Purchase Price">
                    <InputNumber style={{ width: '100%' }} formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} parser={(v) => v.replace(/,/g, '')} />
                </Form.Item>
            </Col>
            <Col span={12}>
                <Form.Item name="sale_price" label="Default Sale Price">
                    <InputNumber style={{ width: '100%' }} formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} parser={(v) => v.replace(/,/g, '')} />
                </Form.Item>
            </Col>
            {profile?.warranty_system_enabled !== false && (
                <Col span={24}>
                    <Form.Item name="default_warranty_days" label="Default Customer Warranty (Days)" tooltip="How many days warranty do you usually give to customers for this product?">
                        <InputNumber style={{ width: '100%' }} min={0} placeholder="e.g. 330 (for 11 months)" />
                    </Form.Item>
                </Col>
            )}
          </Row>

          <Form.Item name="image_url" label="Product Image">
            <ProductImageUpload onUploading={setIsImageUploading} />
          </Form.Item>
        </Form>
      </Modal>

      {/* --- QUICK EDIT MODAL --- */}
<Modal
  title="Quick Edit Item"
  open={isEditModalOpen}
  onOk={editForm.submit}
  onCancel={() => setIsEditModalOpen(false)}
  okText="Update"
>
  <Form form={editForm} layout="vertical" onFinish={handleQuickEditOk}>
    {/* NAYA IZAFA: Hidden submit button taake Enter dabane se form save ho jaye */}
    <button type="submit" style={{ display: 'none' }} />
    {/* Agar Item IMEI Based NAHI hai, tab hi Barcode dikhao */}
    {!editingItem?.is_imei_based && (
        <Form.Item label="Barcode" help="Generate a new barcode and print sticker instantly.">
            <Space.Compact style={{ width: '100%' }}>
                <Form.Item name="barcode" noStyle>
                    <Input prefix={<BarcodeOutlined />} placeholder="Scan Barcode" />
                </Form.Item>
                <Button 
                    onClick={() => {
                        const parentProduct = products.find(p => p.id === editingItem?.product_id);
                        const catName = parentProduct?.category_name || 'ITM';
                        const prefix = catName.substring(0, 3).toUpperCase();
                        const randomNum = Math.floor(10000 + Math.random() * 90000);
                        editForm.setFieldValue('barcode', `${prefix}-${randomNum}`);
                    }}
                >
                    Generate
                </Button>
                <Button 
                    type="primary"
                    icon={<PrinterOutlined />} 
                    onClick={() => {
                        const currentBarcode = editForm.getFieldValue('barcode');
                        if (!currentBarcode) {
                            message.warning("Please generate or enter a barcode first!");
                            return;
                        }
                        const parentProduct = products.find(p => p.id === editingItem.product_id);
                        setBarcodeProduct(parentProduct || { name: 'Item' });
                        setBarcodeVariant({ ...editingItem, barcode: currentBarcode, sale_price: editForm.getFieldValue('sale_price') });
                        setIsBarcodePrinterOpen(true);
                    }}
                    title="Print Sticker"
                />
            </Space.Compact>
        </Form.Item>
    )}
    
    <Form.Item 
        name="sale_price" 
        label={isWholesaleActive ? "Retail Price (Sale)" : "Sale Price"} 
        rules={[{ required: true }]}
    >
        <InputNumber style={{ width: '100%' }} />
    </Form.Item>
    
    {/* --- NAYA IZAFA: Wholesale Price in Quick Edit --- */}
    {isWholesaleActive && (
        <Form.Item 
            name="wholesale_price" 
            label="Wholesale Price" 
        >
            <InputNumber style={{ width: '100%' }} />
        </Form.Item>
    )}
    
    {/* --- NAYA IZAFA: Batch & Expiry in Quick Edit --- */}
    {profile?.enable_batch_expiry && (
        <Row gutter={16}>
            <Col span={12}>
                <Form.Item name="batch_number" label="Batch Number">
                    <Input placeholder="e.g. BAT-001" />
                </Form.Item>
            </Col>
            <Col span={12}>
                <Form.Item name="expiry_date" label="Expiry Date">
                    <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
                </Form.Item>
            </Col>
        </Row>
    )}
  </Form>
</Modal>

      <Modal
        title="Edit Product Details"
        open={isProductEditModalOpen}
        onOk={productEditForm.submit}
        onCancel={handleProductEditModalCancel}
        okText={isImageUploading ? "Uploading..." : "Update"}
        okButtonProps={{ disabled: isImageUploading }}
      >
        <Form form={productEditForm} layout="vertical" onFinish={handleProductModelUpdate}>
          {/* NAYA IZAFA: Hidden submit button taake Enter dabane se form save ho jaye */}
          <button type="submit" style={{ display: 'none' }} />
          <Form.Item name="name" label="Product Name" rules={[{ required: true }]}><Input /></Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="brand" label="Brand"><Input /></Form.Item>
            </Col>
            {limits.allow_stock_location && (
              <Col span={12}>
                <Form.Item name="rack_location" label="Stock Location (Rack/Shelf)" tooltip="e.g. Shelf A, Counter 2">
                  <Input placeholder="e.g. Shelf A" />
                </Form.Item>
              </Col>
            )}
          </Row>
          
          {profile?.fbr_integration_enabled && (
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item 
                  name="hs_code" 
                  label="HS Code (FBR)"
                  tooltip="Must be exactly 4 digits, a dot, and 4 digits (e.g., 8517.1219)"
                  rules={[
                    { required: true, message: 'HS Code is required for FBR' },
                    { pattern: /^\d{4}\.\d{4}$/, message: 'Format must be XXXX.XXXX (e.g. 0101.2100)' }
                  ]}
                  help={<a href="https://www.fbr.gov.pk/customs-tariff/131175" target="_blank" rel="noopener noreferrer">Find your HS Code here</a>}
                >
                  <Input placeholder="0000.0000" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item 
                  name="uom" 
                  label="Unit of Measure (FBR)"
                  rules={[{ required: true, message: 'UOM is required for FBR' }]}
                >
                  <Select placeholder="Select UOM">
                    <Option value="Numbers, pieces, units">Numbers, pieces, units</Option>
                    <Option value="KG">KG</Option>
                    <Option value="MT">MT (Metric Ton)</Option>
                    <Option value="SqY">SqY (Square Yard)</Option>
                    <Option value="Liters">Liters</Option>
                    <Option value="Meters">Meters</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>
          )}

          {profile?.warranty_system_enabled !== false && (
              <Form.Item name="default_warranty_days" label="Default Customer Warranty (Days)">
                <InputNumber style={{ width: '100%' }} min={0} placeholder="e.g. 330" />
              </Form.Item>
          )}

          <Form.Item name="image_url" label="Product Image">
            <ProductImageUpload onUploading={setIsImageUploading} />
          </Form.Item>
        </Form>
      </Modal>
      
      {/* MODAL 3: ADD STOCK (PURCHASE FORM) */}
{isPurchaseModalOpen && (
  <AddPurchaseForm 
    visible={isPurchaseModalOpen}
    onCancel={() => { setIsPurchaseModalOpen(false); setPurchaseInitialData(null); }}
    onPurchaseCreated={() => { 
        setIsPurchaseModalOpen(false); 
        setPurchaseInitialData(null);
        // Stock update karne ke liye queue process karein
        processSyncQueue(); 
        setRefreshTrigger(prev => prev + 1);
    }}
    initialData={purchaseInitialData}
  />
)}

{/* DAMAGED STOCK MODAL */}
      <Modal
        title={<span><AlertOutlined style={{color: token.colorError}} /> Mark Stock as Damaged</span>}
        open={isDamagedModalOpen}
        onOk={damagedForm.submit}
        onCancel={() => setIsDamagedModalOpen(false)}
        okText="Confirm Adjustment"
        okButtonProps={{ danger: true }}
      >
        <Form form={damagedForm} layout="vertical" onFinish={handleMarkDamagedOk}>
          {/* NAYA IZAFA: Hidden submit button taake Enter dabane se form save ho jaye */}
          <button type="submit" style={{ display: 'none' }} />
          <Text type="secondary" style={{display: 'block', marginBottom: '15px'}}>
            Product: <b>{damagedItem?.product_name}</b><br/>
            Available: <b>{damagedItem?.display_quantity} units</b>
          </Text>
          
          <Form.Item name="quantity" label="Quantity to mark as Damaged" rules={[{ required: true }]}>
            <InputNumber min={1} max={damagedItem?.display_quantity} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="notes" 
            label="Reason" 
            rules={[{ required: true, message: 'Please provide a reason for adjustment' }]}
          >
            <Input.TextArea placeholder="e.g. Screen broken, Water damage..." />
          </Form.Item>
          
          <Alert
            message="This will reduce your available stock. You can revert this action from the Damaged Stock Report page if needed." 
            type="info" 
            showIcon
         />
        </Form>
      </Modal>

      {/* NAYA IZAFA: Barcode Printer Component */}
      <BarcodePrinter 
        visible={isBarcodePrinterOpen}
        onClose={() => setIsBarcodePrinterOpen(false)}
        product={barcodeProduct}
        variant={barcodeVariant}
      />

    </div>
  );
};

export default Inventory;