import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';
import { Button, Table, Typography, Modal, Form, Input, InputNumber, App, Select, Tag, Row, Col, Card, List, Spin, Space, Collapse, Empty, Divider, Dropdown, Menu, Alert, AutoComplete } from 'antd';
import { DatabaseOutlined, PlusOutlined, DeleteOutlined, ExclamationCircleOutlined, EditOutlined, FilterOutlined, SearchOutlined, BarcodeOutlined, MoreOutlined, ReloadOutlined, InboxOutlined, RollbackOutlined, AlertOutlined } from '@ant-design/icons';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { formatCurrency } from '../utils/currencyFormatter';
import DataService from '../DataService';
import { useSync } from '../context/SyncContext';
import { db } from '../db';
import { useTheme } from '../context/ThemeContext';
import AddPurchaseForm from './AddPurchaseForm';
import PageTour from '../components/PageTour';

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

const ProductList = ({ showArchived, products, categories, loading, onDelete, onAddStock, onQuickEdit, onEditProductModel, onMarkDamaged, refFirstStock }) => {
  const { profile } = useAuth();
  const { isDarkMode } = useTheme();
  
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
        const key = `${attributesKey}-${variant.sale_price}-${variant.purchase_price}`;

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
              style={{ border: isDarkMode ? '1px solid #424242' : '1px solid #d9d9d9', height: '100%' }}
              styles={{ body: { padding: '16px' } }}
            >
              {/* === HEADER AREA === */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1, paddingRight: '8px' }}>
                  {/* PRODUCT NAME - FONT SIZE INCREASED TO 20px */}
                  <Text strong style={{ fontSize: '20px', display: 'block', marginBottom: '6px' }}>{product.name}</Text>
                  
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                     {/* CATEGORY TAG - TRANSPARENT STYLE */}
                     <Tag 
                        style={{ 
                          margin: 0, 
                          fontSize: '12px', 
                          padding: '4px 8px',
                          background: 'transparent', // Aar-paar
                          border: '1px solid #2f54eb', // Blue Border
                          color: '#2f54eb' // Blue Text
                        }}
                     >
                        {product.category_name}
                     </Tag>
                     {/* BRAND NAME - FONT INCREASED */}
                     {product.brand && <Text type="secondary" style={{ fontSize: '14px' }}>{product.brand}</Text>}
                  </div>
                </div>

                {/* --- RIGHT SIDE (Price + Menu) --- */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '4px' }}>
                  
                  {/* Price Range */}
                  <Text strong style={{ fontSize: '18px', color: '#52c41a', whiteSpace: 'nowrap' }}>
                    {formatPriceRange(product.min_sale_price, product.max_sale_price, profile?.currency)}
                  </Text>
                  
                  {/* 3-DOTS MENU (Ab Price ke barabar mein) */}
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

                </div>
              </div>

              <Divider style={{ margin: '12px 0', borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.06)' }} />

              {/* === VARIANTS LIST === */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {product.groupedVariants.map((variant, index) => (
                  <div key={index} 
                    style={{ 
                      overflowX: 'auto', whiteSpace: 'nowrap', padding: '10px', // Padding increased slightly
                      background: isDarkMode ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)',
                      borderRadius: '6px', border: isDarkMode ? 'none' : '1px solid rgba(0,0,0,0.03)',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                    }} className="hide-scrollbar">
                    
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      {/* STOCK BADGE - FONT INCREASED TO 14px */}
                      <div style={{ marginRight: '12px', flexShrink: 0 }}>
                        {/* STOCK BADGE - TRANSPARENT STYLE */}
                      <div style={{ marginRight: '12px', flexShrink: 0 }}>
                        <Tag 
                          style={{ 
                            margin: 0, 
                            fontSize: '15px', 
                            padding: '4px 10px',
                            background: 'transparent',
                            // Agar stock hai to Blue Border, warna Red Border
                            border: variant.display_quantity > 0 ? '1px solid #1890ff' : '1px solid #ff4d4f',
                            // Text ka color bhi same
                            color: variant.display_quantity > 0 ? '#1890ff' : '#ff4d4f'
                          }}
                        >
                          {variant.display_quantity} Stock
                        </Tag>
                      </div>
                      </div>

                      <div style={{ marginRight: '16px', flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
                        {/* SALE PRICE - FONT INCREASED TO 15px */}
                        <Text strong style={{ color: '#52c41a', fontSize: '16px', lineHeight: '1.2' }}>
                           <span style={{ fontSize: '12px', opacity: 0.8, marginRight: '4px', color: isDarkMode ? '#aaa' : '#666' }}>Sale:</span>
                           {formatCurrency(variant.sale_price, profile?.currency)}
                        </Text>
                        {/* BUY PRICE - FONT INCREASED TO 12px */}
                        <Text type="secondary" style={{ fontSize: '12px', lineHeight: '1.2' }}>
                           <span style={{ fontSize: '10px', opacity: 0.8, marginRight: '4px' }}>Buy:</span>
                           {formatCurrency(variant.purchase_price, profile?.currency)}
                        </Text>
                      </div>

                      {/* ATTRIBUTES - FONT INCREASED TO 14px */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
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

                    {/* ADD STOCK BUTTON */}
<Button 
  type="text" 
  icon={<PlusOutlined />} 
  size="small" 
  style={{ marginLeft: '8px', color: '#52c41a', fontSize: '16px' }} 
  onClick={() => onAddStock(variant)} 
  title="Add Stock / Add New Variants"
/>
<Button 
  type="text" 
  icon={<EditOutlined />} 
  size="small" 
  style={{ marginLeft: '8px', color: '#1890ff', fontSize: '16px' }} 
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
                      <Button 
                        ref={refFirstStock}
                        type="dashed" 
                        icon={<PlusOutlined />} 
                        onClick={() => onAddStock(product)} // Yahan hum poora product pass kar rahe hain
                      >
                        Add First Stock
                      </Button>
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
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [purchaseInitialData, setPurchaseInitialData] = useState(null);
  const [globalSearchMap, setGlobalSearchMap] = useState({});
  
  const [products, setProducts] = useState([]);
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
          default_warranty_days: product.default_warranty_days // Nayi line
      });
      setIsProductEditModalOpen(true);
  };

  const handleProductModelUpdate = async (values) => {
      try {
          if (!editingProductModel) return;

          const updates = {
              name: values.name,
              brand: values.brand,
              default_warranty_days: values.default_warranty_days
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
  
  // --- NAYE MODALS KI STATE ---
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  
  const [productForm] = Form.useForm();
  
  const [editingProduct, setEditingProduct] = useState(null);
  const [nameSuggestions, setNameSuggestions] = useState([]);

  

  const [searchText, setSearchText] = useState('');
  const [filterCategory, setFilterCategory] = useState(null);
  const [priceRange, setPriceRange] = useState([null, null]);
  const [sortBy, setSortBy] = useState('name_asc');
  
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
    const timer = setTimeout(() => {
      searchInputRef.current?.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (isProductModalOpen) {
      const timer = setTimeout(() => {
        productNameInputRef.current?.focus();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isProductModalOpen]);

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
      setLoading(true);
      try {
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
          default_warranty_days: product.default_warranty_days
      });
      setIsProductModalOpen(true);
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
          sale_price: variant.sale_price
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
        sale_price: values.sale_price
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
      
      // Tamam IDs ki list bhejein (DataService ab loops handle kar lega)
      await DataService.markItemAsDamaged(damagedItem.ids, values.quantity, values.notes);
      
      message.success('Stock adjusted! Damaged quantity recorded.');
      setIsDamagedModalOpen(false);
      damagedForm.resetFields();
      setRefreshTrigger(prev => prev + 1); // List refresh karein
    } catch (error) {
      message.error(error.message);
    }
  };
  
  const isSmartPhoneCategorySelected = categories.find(c => c.id === selectedCategoryId)?.name === 'Smart Phones & Tablets';
  const hasSeenInitialTour = !!profile?.tours_completed?.inventory_empty;

  const tourSteps = [
    // Step 1: Product Model (Sirf pehli baar)
    ...(!hasSeenInitialTour ? [{
      title: 'Product Model Banayein',
      description: 'Sab se pehle yahan click karke product ka model banayein (maslan: Samsung A54). Model sirf ek baar banta hai.',
      target: () => refAddModel.current,
    }] : []),

    // Step 2: Stock Add (Sirf tab jab product ban jaye)
    ...(products.length > 0 ? [{
      title: 'Stock Add Karein',
      description: 'Mubarak ho! Aap ne model bana liya. Ab yahan click karke is ka asli stock (IMEI ya Quantity) add karein.',
      target: () => refFirstStock.current,
    }] : []),

    // Baqi Steps: Search, Filters, Archive (Sirf pehli baar)
    ...(!hasSeenInitialTour ? [
      {
        title: 'Smart Search',
        description: 'Apne stock mein se kuch bhi dhoondne ke liye naam, brand ya IMEI yahan scan/type karein.',
        target: () => refSearch.current,
      },
      {
        title: 'Advanced Filters',
        description: 'Price range ya attributes (RAM, ROM) ke hisab se stock dekhne ke liye yahan click karein.',
        target: () => refFilters.current,
      },
      {
        title: 'Archive (Hidden Items)',
        description: 'Jo items aap ne hide (archive) kiye hain, unhain yahan click karke dekh sakte hain.',
        target: () => refArchive.current,
      }
    ] : []),
  ].filter(step => step.target()); // Yeh line ghalat steps ko nikaal degi

  return (
    <div style={{ padding: isMobile ? '12px 0' : '4px 0' }}>
      <PageTour 
  key={products.length === 0 ? "empty" : "ready"} 
  pageKey={products.length === 0 ? "inventory_empty" : "inventory_ready"} 
  steps={tourSteps} 
/>
      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: isMobile ? 'space-between' : 'flex-end', alignItems: isMobile ? 'flex-start' : 'center', marginBottom: isMobile ? '16px' : '0' }}>
        {isMobile && (
          <Title level={2} style={{ margin: 0, marginLeft: '8px', fontSize: '23px' }}>
            <DatabaseOutlined /> {showLowStockOnly ? 'Low Stock Products' : 'Inventory'}
          </Title>
        )}
        {isMobile && (<Button ref={refAddModel} type="primary" size="middle" onClick={() => setIsProductModalOpen(true)} style={{ width: '100%', marginTop: '10px' }}>Add New Product Model</Button>)}
      </div>

      <div style={{ marginBottom: '18px', padding: isMobile ? '0 8px' : '0' }}>
        <Row gutter={[8, 8]} align="middle">
          {/* 1. Search Box (Sab se bada) */}
          <Col xs={24} sm={8} md={9}>
          <div ref={refSearch}>
            <Input 
              ref={searchInputRef}
              placeholder="Search or Scan..." 
              prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
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
                icon={<ReloadOutlined />} 
                onClick={handleResetFilters} 
                title="Reset All Filters" 
             />
             {!isMobile && (
               <Button 
                 ref={refAddModel} 
                 type="primary" 
                 icon={<PlusOutlined />}
                 onClick={() => setIsProductModalOpen(true)}
               >
                 New Product Model
               </Button>
             )}
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
                      <span style={{ color: '#999' }}>-</span>
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
        ProductList showArchived={showArchived}
      />

      {/* MODAL 1: PRODUCT MODEL EDIT/CREATE */}
      <Modal 
        title={editingProduct ? "Edit Product Model" : "Add a New Product Model"} 
        open={isProductModalOpen} 
        onOk={productForm.submit} 
        onCancel={() => { setIsProductModalOpen(false); setEditingProduct(null); productForm.resetFields(); }} 
        okText="Save Model"
      >
        <Form form={productForm} layout="vertical" onFinish={handleProductOk} style={{marginTop: '24px'}}>
          <Form.Item name="name" label="Product Name" rules={[{ required: true }]}>
            <Input 
              ref={productNameInputRef} 
              placeholder="e.g. Apple 17" 
            />
          </Form.Item>
          <Form.Item name="category_id" label="Category" rules={[{ required: true }]}><Select placeholder="Select...">{categories.map(c => (<Option key={c.id} value={c.id}>{c.name}</Option>))}</Select></Form.Item>
          <Form.Item name="brand" label="Brand" rules={[{ required: true }]}><Input /></Form.Item>
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
            <Col span={24}>
                <Form.Item name="default_warranty_days" label="Default Customer Warranty (Days)" tooltip="How many days warranty do you usually give to customers for this product?">
                    <InputNumber style={{ width: '100%' }} min={0} placeholder="e.g. 330 (for 11 months)" />
                </Form.Item>
            </Col>
          </Row>
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
    {/* Agar Item IMEI Based NAHI hai, tab hi Barcode dikhao */}
    {!editingItem?.is_imei_based && (
        <Form.Item 
            name="barcode" 
            label="Barcode" 
            help="Scan new barcode or type to correct it."
        >
            <Input prefix={<BarcodeOutlined />} placeholder="Scan Barcode" />
        </Form.Item>
    )}
    
    <Form.Item 
        name="sale_price" 
        label="Sale Price" 
        rules={[{ required: true }]}
    >
        <InputNumber style={{ width: '100%' }} />
    </Form.Item>
  </Form>
</Modal>

      <Modal
        title="Edit Product Details"
        open={isProductEditModalOpen}
        onOk={productEditForm.submit}
        onCancel={() => setIsProductEditModalOpen(false)}
        okText="Update"
      >
        <Form form={productEditForm} layout="vertical" onFinish={handleProductModelUpdate}>
          <Form.Item name="name" label="Product Name" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="brand" label="Brand"><Input /></Form.Item>
          <Form.Item name="default_warranty_days" label="Default Customer Warranty (Days)">
            <InputNumber style={{ width: '100%' }} min={0} placeholder="e.g. 330" />
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
        title={<span><AlertOutlined style={{color: 'red'}} /> Mark Stock as Damaged</span>}
        open={isDamagedModalOpen}
        onOk={damagedForm.submit}
        onCancel={() => setIsDamagedModalOpen(false)}
        okText="Confirm Adjustment"
        okButtonProps={{ danger: true }}
      >
        <Form form={damagedForm} layout="vertical" onFinish={handleMarkDamagedOk}>
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
    </div>
  );
};

export default Inventory;