import React, { useState, useEffect, useRef } from 'react';
import {
  Typography, Row, Col, Input, List, Card, Button, Statistic, Empty, App, Select, Radio, InputNumber, Form, Modal, Space, Divider, Tooltip, Badge, Tag, Checkbox, theme
} from 'antd';
import { ShoppingCartOutlined, PlusOutlined, UserAddOutlined, DeleteOutlined, StarOutlined, BarcodeOutlined, SearchOutlined, FilterOutlined, WalletOutlined, BankOutlined, ClockCircleOutlined, PauseCircleOutlined, LockOutlined, PrinterOutlined, AppstoreOutlined, UnorderedListOutlined, CalendarOutlined, WarningOutlined } from '@ant-design/icons';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { generateSaleReceipt } from '../utils/receiptGenerator';
import { printThermalReceipt } from '../utils/thermalPrinter';
import SelectVariantModal from './SelectVariantModal';
import DraftBillsModal from '../components/DraftBillsModal';
import AddPurchaseForm from '../components/AddPurchaseForm';
import { formatCurrency } from '../utils/currencyFormatter';
import { db } from '../db';
import dayjs from 'dayjs';
import { useSync } from '../context/SyncContext';
import DataService from '../DataService';
import { generateInvoiceId } from '../utils/idGenerator';
import { useTheme } from '../context/ThemeContext';
import { getPlanLimits } from '../config/subscriptionPlans';
import { useStaff } from '../context/StaffContext';

const { Title, Text } = Typography;
// Global Countries List
const countries = [
  { label: 'Pakistan', value: 'Pakistan' },
  { label: 'India', value: 'India' },
  { label: 'United Arab Emirates', value: 'UAE' },
  { label: 'Saudi Arabia', value: 'Saudi Arabia' },
  { label: 'United Kingdom', value: 'UK' },
  { label: 'United States', value: 'USA' },
  { label: 'Australia', value: 'Australia' },
  { label: 'Canada', value: 'Canada' },
];
const { Search } = Input;

// --- HELPER: SMART SEARCH (Naram Mizaaj) ---
const isSmartMatch = (text, search) => {
  if (!text || !search) return false;
  const cleanText = text.toString().toLowerCase();
  const cleanSearch = search.toString().toLowerCase();
  if (cleanText.includes(cleanSearch)) return true; 
  if (cleanSearch.length < 3) return false; 
  
  let searchIndex = 0;
  for (let i = 0; i < cleanText.length; i++) {
    if (cleanText[i] === cleanSearch[searchIndex]) {
      searchIndex++;
    }
    if (searchIndex === cleanSearch.length) return true;
  }
  return false;
};

// --- HELPER: PRICE RANGE FORMATTER ---
const formatPriceRange = (min, max, currency) => {
  if (min === null || max === null) return 'N/A';
  if (min === max) return formatCurrency(min, currency);
  return `${formatCurrency(min, currency)} - ${formatCurrency(max, currency)}`;
};

const POS = () => {
  const { token } = theme.useToken(); // Control Center Connection
  const { isDarkMode } = useTheme();
  const [viewMode, setViewMode] = useState('list'); // NAYA IZAFA: Ab Default List View kar diya gaya hai
  const [showFilters, setShowFilters] = useState(false);
  const [priceRange, setPriceRange] = useState([null, null]);
  const [filterAttributes, setFilterAttributes] = useState({});
  const [advancedFilters, setAdvancedFilters] = useState([]);
  const { message, modal } = App.useApp();
  const { user, profile, refetchStockCount } = useAuth();
  const { activeStaff, verifyMasterPin, activeSession, can } = useStaff(); // <--- can shamil kar diya
  const limits = getPlanLimits(profile?.subscription_tier);
  const isWholesaleActive = profile?.wholesale_pricing_enabled && limits.allow_wholesale_pricing;
  const { processSyncQueue } = useSync();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('Paid');
  const [cashOrBank, setCashOrBank] = useState('Cash');
  const [amountPaid, setAmountPaid] = useState(0);
  
  // --- NAYA IZAFA: Payment Accounts States ---
  const [paymentAccounts, setPaymentAccounts] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState('Cash'); // NAYA IZAFA: Default Cash set kar diya
  const [isAddCustomerModalOpen, setIsAddCustomerModalOpen] = useState(false);
  const [availableGroups, setAvailableGroups] = useState([]); // <--- NAYA IZAFA: Customer Groups ke liye
  const [addForm] = Form.useForm();
  const customerNameInputRef = useRef(null); // NAYA IZAFA: Auto-focus ke liye
  const [discount, setDiscount] = useState(0);
  const isMobile = useMediaQuery('(max-width: 768px)'); // <--- isMobile KO UPAR LE AAYE HAIN

  // NAYA IZAFA: Modal khulte hi cursor Full Name par lane ke liye
  useEffect(() => {
    if (isAddCustomerModalOpen && !isMobile) {
      setTimeout(() => {
        customerNameInputRef.current?.focus();
      }, 100);
    }
  }, [isAddCustomerModalOpen, isMobile]);
  const [discountType, setDiscountType] = useState('Amount');
  const [isMasterPinModalVisible, setIsMasterPinModalVisible] = useState(false);
  const [pendingDiscountValue, setPendingDiscountValue] = useState(0);
  const [masterPinInput, setMasterPinInput] = useState('');
  const [masterPinAction, setMasterPinAction] = useState(null); 
  const [auditRemark, setAuditRemark] = useState(''); // <--- NAYA IZAFA: Wajah likhne ke liye
  const [saleNotes, setSaleNotes] = useState(''); // <--- NAYA IZAFA: Bill ke sath save karne ke liye
  const [pendingCustomerValues, setPendingCustomerValues] = useState(null); // <--- NAYA IZAFA
  const [pendingPriceChange, setPendingPriceChange] = useState(null); // <--- NAYA IZAFA
  const [lastSaleData, setLastSaleData] = useState(null);
  const searchInputRef = useRef(null);
  const [isVariantModalOpen, setIsVariantModalOpen] = useState(false);
  const [productForVariantSelection, setProductForVariantSelection] = useState(null);
  const [isDraftModalOpen, setIsDraftModalOpen] = useState(false); 
  const [heldCount, setHeldCount] = useState(0);
  const [isPurchaseModalVisible, setIsPurchaseModalVisible] = useState(false);
  const [draftPurchaseItems, setDraftPurchaseItems] = useState([]);

  // Counter ko update karne wala function
  const refreshHeldCount = async () => {
    const bills = await DataService.getHeldBills();
    setHeldCount(bills.length);
  };

  // Page khulte hi ginti (count) aur adhoora cart (persistence) load karein
  useEffect(() => {
    refreshHeldCount();

    const loadActiveCart = async () => {
      const savedCart = await DataService.getActiveCart();
      if (savedCart && savedCart.cart.length > 0) {
        setCart(savedCart.cart);
        setSelectedCustomer(savedCart.selectedCustomer);
        setDiscount(savedCart.discount);
        setDiscountType(savedCart.discountType);
        message.info("Your previous unsaved bill has been restored.");
      }
    };
    loadActiveCart();
  }, []);
  const [allProducts, setAllProducts] = useState([]);
  const [displayedProducts, setDisplayedProducts] = useState([]);
  const [popularCategories, setPopularCategories] = useState([]);
  const [activeCategoryId, setActiveCategoryId] = useState(null);
  // --- NAYA IZAFA: Auto-Save Cart Persistence ---
  useEffect(() => {
    if (cart.length > 0) {
      DataService.saveActiveCart({
        cart,
        selectedCustomer,
        discount,
        discountType
      });
    } else {
      // Agar cart khali ho jaye to record mita dein
      DataService.clearActiveCart();
    }
  }, [cart, selectedCustomer, discount, discountType]);
  const [topSellingProducts, setTopSellingProducts] = useState([]);
  // --- NAYA: SILENT REFRESH LISTENER (Sahi Jagah) ---
  useEffect(() => {
    const handleRefresh = async () => {
      try {
        const { productsData } = await DataService.getInventoryData();
        setAllProducts(productsData);
        
        if (!searchTerm && !activeCategoryId) {
          setDisplayedProducts(productsData);
        }
      } catch (error) {
        console.error("Refresh failed:", error);
      }
    };
    window.addEventListener('local-db-updated', handleRefresh);
    return () => window.removeEventListener('local-db-updated', handleRefresh);
  }, [searchTerm, activeCategoryId]);

  // --- DATA PREPARATION FOR UI (Inventory Style) ---
  const productsWithVariants = React.useMemo(() => {
    if (!displayedProducts) return [];

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

    return displayedProducts.map(product => {
      // Variants grouping logic
      let groupedVariants = [];
      if (product.variants) {
        const itemsMap = new Map();
        for (const variant of product.variants) {
          const attributesKey = createStableAttributeKey(variant.item_attributes);
          // NAYA IZAFA: Batch aur Expiry ko key mein shamil kiya
          const key = `${attributesKey}-${variant.sale_price}-${variant.batch_number || 'nobatch'}-${variant.expiry_date || 'noexp'}`; 

          if (itemsMap.has(key)) {
            const existing = itemsMap.get(key);
          existing.display_quantity += (variant.available_qty || 0); 
          existing.ids.push(variant.id);
            if (variant.imei) existing.imeis.push(variant.imei);
          } else {
            itemsMap.set(key, {
            ...variant,
            display_quantity: variant.available_qty || 0, 
            ids: [variant.id],
              imeis: variant.imei ? [variant.imei] : [],
              product_id: product.id,
              product_name: product.name,
              variant_id: variant.variant_id || variant.id 
            });
          }
        }
        groupedVariants = Array.from(itemsMap.values());
      }

      return {
        ...product,
        min_sale_price: product.min_sale_price || product.sale_price,
        max_sale_price: product.max_sale_price || product.sale_price,
        groupedVariants: groupedVariants,
      };
    });
  }, [displayedProducts]);

  // --- QUICK ADD HANDLER (SMART LOGIC) ---
  const handleVariantQuickAdd = (variantItem) => {
    const isExpired = variantItem.expiry_date && new Date(variantItem.expiry_date) < new Date(new Date().setHours(0,0,0,0));

    // Ek chota function jo item add karne ka asal kaam karega
    const proceedWithAdd = () => {
        const isImeiItem = variantItem.category_is_imei_based || (variantItem.imeis && variantItem.imeis.length > 0);
        if (isImeiItem) {
            const parentProduct = allProducts.find(p => p.id === variantItem.product_id);
            if (parentProduct) {
                setProductForVariantSelection(parentProduct);
                setIsVariantModalOpen(true);
            }
        } else {
            handleVariantsSelected([{ ...variantItem, quantity: 1 }]);
        }
    };

    if (isExpired) {
        if (profile?.block_expired_sales) {
            message.error("Cannot add to cart. This item is expired!");
            return;
        } else {
            // --- NAYA IZAFA: Sakht Pop-up Modal ---
            modal.confirm({
                title: 'Expired Item Alert!',
                content: 'This item has expired. Are you sure you want to add it to the bill?',
                okText: 'Yes, Add it',
                okType: 'danger',
                cancelText: 'No, Cancel',
                onOk: proceedWithAdd // Agar user Yes dabaye, to add karo
            });
            return; // Yahan ruk jao aur user ke jawab ka intezar karo
        }
    }

    proceedWithAdd(); // Agar expire nahi hai to aam tareeqe se add karo
  };

  useEffect(() => {
  if (!user) return;

  const initialLoad = async () => {
    setLoading(true);
    try {
      // 1. Customers Local DB se layein
      const customersData = await db.customers.toArray();
      setCustomers(customersData.sort((a, b) => a.name.localeCompare(b.name)));
      
      // NAYA IZAFA: Customer Groups ki list nikalna
      const groups = [...new Set(customersData.map(c => c.customer_group).filter(Boolean))].sort();
      setAvailableGroups(groups);

      // 2. Products Local DB se layein (Wohi DataService jo Inventory mein use kiya tha)
      const { productsData } = await DataService.getInventoryData();
      setAllProducts(productsData);
      
      // 3. Categories Local DB se layein
      const categoriesData = await db.categories.toArray();
      // Pehle 4 categories ko "Popular" bana lein
      const popCats = categoriesData.slice(0, 4).map(c => ({ category_id: c.id, category_name: c.name }));
      setPopularCategories(popCats);

      // 4. Filhal "Top Selling" mein hum saare products dikhayenge (Offline mein calculation mushkil hai)
      setDisplayedProducts(productsData);
      setTopSellingProducts(productsData); 

      // 5. NAYA IZAFA: Payment Accounts Load Karein
      if (DataService.getPaymentAccounts) {
          const accountsData = await DataService.getPaymentAccounts();
          setPaymentAccounts(accountsData);
          // Cash ab default hai, is liye yahan se find wala logic hata diya
      }

    } catch (error) {
      message.error("Error loading initial data: " + error.message);
    } finally {
      setLoading(false);
      if (searchInputRef.current && !isMobile) {
        searchInputRef.current.focus();
      }
    }
  };

  initialLoad();

}, [user, message]);

// --- 1. DYNAMIC ATTRIBUTES OPTIONS (Jab Category Change ho) ---
  useEffect(() => {
    if (activeCategoryId && allProducts.length > 0) {
      // Sirf is category ke products lein
      const catProducts = allProducts.filter(p => p.category_id === activeCategoryId);
      
      // Saare attributes ikathe karein (RAM, ROM etc)
      const optionsMap = {};
      catProducts.forEach(p => {
        if (p.variants) {
          p.variants.forEach(v => {
            if (v.item_attributes) {
              Object.entries(v.item_attributes).forEach(([key, val]) => {
                if (key.toLowerCase().includes('imei') || key.toLowerCase().includes('serial')) return;
                if (!optionsMap[key]) optionsMap[key] = new Set();
                optionsMap[key].add(val);
              });
            }
          });
        }
      });

      // Dropdown format mein convert karein
      const filters = Object.keys(optionsMap).map(key => ({
        attribute_name: key,
        options: Array.from(optionsMap[key]).sort()
      }));
      setAdvancedFilters(filters);
    } else {
      setAdvancedFilters([]);
      setFilterAttributes({}); 
    }
  }, [activeCategoryId, allProducts]);

  // --- 2. MASTER FILTER LOGIC (Search + Price + Attributes) ---
  useEffect(() => {
    if (loading) return;

    let filtered = allProducts;

    // A. Category Filter
    if (activeCategoryId) {
      filtered = filtered.filter(p => p.category_id === activeCategoryId);
    }

    // B. Text Search (Smart Match & Tags)
    if (searchTerm) {
      filtered = filtered.filter(p => {
        // 1. Pehle Main Product Details check karein
        const mainMatch = isSmartMatch(p.name, searchTerm) ||
                          isSmartMatch(p.brand, searchTerm) ||
                          isSmartMatch(p.category_name, searchTerm);
        
        if (mainMatch) return true;

        // 2. Agar wahan nahi mila, to Variants ke Tags, Batch, aur Expiry check karein
        if (p.variants && p.variants.length > 0) {
            return p.variants.some(v => {
                // NAYA IZAFA: Batch Number se dhoondna
                if (isSmartMatch(v.batch_number, searchTerm)) return true;
                
                // NAYA IZAFA: Expiry Date se dhoondna
                if (v.expiry_date && isSmartMatch(new Date(v.expiry_date).toLocaleDateString(), searchTerm)) return true;

                if (!v.item_attributes) return false;
                return Object.values(v.item_attributes).some(val => 
                    isSmartMatch(val, searchTerm)
                );
            });
        }

        return false;
      });
    }

    // C. Price Range Filter (Updated for Variants)
    if (priceRange[0] !== null) {
      filtered = filtered.filter(p => {
        if (p.variants && p.variants.length > 0) {
           return p.variants.some(v => v.sale_price >= priceRange[0]);
        }
        return (p.sale_price || 0) >= priceRange[0];
      });
    }

    if (priceRange[1] !== null) {
      filtered = filtered.filter(p => {
        if (p.variants && p.variants.length > 0) {
           return p.variants.some(v => v.sale_price <= priceRange[1]);
        }
        return (p.sale_price || 0) <= priceRange[1];
      });
    }

    // D. Attribute Filter (RAM, ROM, Color)
    Object.keys(filterAttributes).forEach(attrKey => {
      const attrValue = filterAttributes[attrKey];
      if (attrValue) {
        filtered = filtered.filter(p => {
          return p.variants && p.variants.some(v => 
            v.item_attributes && v.item_attributes[attrKey] === attrValue
          );
        });
      }
    });

    setDisplayedProducts(filtered);

  }, [searchTerm, activeCategoryId, priceRange, filterAttributes, allProducts, loading]);

  const handleAddToCart = (product) => {
    if (product.quantity <= 0) { message.warning('This product is out of stock!'); return; }
    
    // NAYA IZAFA: Agar sirf 1 hi variant ho, to direct cart mein daal dein (Grid View speed ke liye)
    if (product.groupedVariants && product.groupedVariants.length === 1) {
       const singleVariant = product.groupedVariants[0];
       handleVariantQuickAdd(singleVariant);
    } else {
       // Agar 1 se zyada variants hon to modal khol dein
       setProductForVariantSelection(product);
       setIsVariantModalOpen(true);
    }
  };

  const handleVariantsSelected = (selectedItems) => {
    if (!selectedItems || selectedItems.length === 0) {
      setIsVariantModalOpen(false);
      return;
    }
  
    let newItemsAdded = false;
    let quantityUpdated = false;
    let alreadyInCart = false;
    let stockLimitReached = false;

    setCart(currentCart => {
      let updatedCart = [...currentCart];

      const isWholesale = isWholesaleActive && selectedCustomer && customers.find(c => c.id === selectedCustomer)?.customer_group?.includes('Wholesale');

              const imeiItemsToAdd = selectedItems.filter(i => i.category_is_imei_based || i.imei).map(i => ({
                  ...i,
                  retail_price: i.sale_price, // Asli qeemat mehfooz karein
                  sale_price: (isWholesale && i.wholesale_price) ? i.wholesale_price : i.sale_price
              }));
              const quantityItemsToAdd = selectedItems.filter(i => !i.category_is_imei_based && !i.imei).map(i => ({
                  ...i,
                  retail_price: i.sale_price, // Asli qeemat mehfooz karein
                  sale_price: (isWholesale && i.wholesale_price) ? i.wholesale_price : i.sale_price
              }));

      // 1. IMEI Items (Inki quantity hamesha 1 hoti hai)
      imeiItemsToAdd.forEach(item => {
        const isImeiAlreadyInCart = updatedCart.some(cartItem => cartItem.imei === item.imei);
        if (!isImeiAlreadyInCart) {
          updatedCart.push({ ...item, quantity: 1 });
          newItemsAdded = true;
        } else {
          alreadyInCart = true;
        }
      });

      // 2. Quantity Items (Yahan Stock Check Lagana Hai - ATTRIBUTE BASED)
          const groupedQuantityItems = {};
          quantityItemsToAdd.forEach(item => {
            // NAYA IZAFA: Batch aur Expiry ko key mein shamil kiya taake alag alag count hon
            const uniqueKey = `${item.variant_id}-${item.batch_number || 'nobatch'}-${item.expiry_date || 'noexp'}`;
            if (!groupedQuantityItems[uniqueKey]) {
              groupedQuantityItems[uniqueKey] = { item: item, count: 0 };
            }
            // FIX: Modal se aane wali asal quantity jama karein (count++ ke bajaye)
            groupedQuantityItems[uniqueKey].count += (item.quantity || 1);
          });

          for (const uniqueKey in groupedQuantityItems) {
            const { item, count } = groupedQuantityItems[uniqueKey];
        
        // --- STOCK CHECK LOGIC (FIXED) ---
        const parentProduct = allProducts.find(p => p.id === item.product_id);
        const realStockCount = parentProduct 
            ? parentProduct.variants
                .filter(v => 
                    JSON.stringify(v.item_attributes || {}) === JSON.stringify(item.item_attributes || {}) &&
                    (v.sale_price === item.sale_price || v.sale_price === item.retail_price) &&
                    (v.status || 'available').toLowerCase() === 'available' &&
                    (v.batch_number || null) === (item.batch_number || null) &&
                    (v.expiry_date || null) === (item.expiry_date || null)
                )
                .reduce((sum, v) => sum + (v.available_qty || 0), 0) 
            : 0;

        // NAYA IZAFA: Cart mein pehle se mojood item dhoondte waqt Batch aur Expiry bhi match karein
            const existingIndex = updatedCart.findIndex(ci => 
                ci.variant_id === item.variant_id &&
                (ci.batch_number || null) === (item.batch_number || null) &&
                (ci.expiry_date || null) === (item.expiry_date || null)
            );

        if (existingIndex > -1) {
          const existingItem = updatedCart[existingIndex];
          const newTotal = existingItem.quantity + count;

          if (newTotal > realStockCount) {
             stockLimitReached = true;
          } else {
             const updatedItem = { ...existingItem, quantity: newTotal };
             updatedCart[existingIndex] = updatedItem;
             quantityUpdated = true;
          }
        } else {
          if (count > realStockCount) {
             stockLimitReached = true;
          } else {
             updatedCart.push({ ...item, quantity: count });
             newItemsAdded = true;
          }
        }
      }
      
      return updatedCart;
    });

    setTimeout(() => {
      if (stockLimitReached) message.warning(`Cannot add more. Stock limit reached!`);
      else if (newItemsAdded) message.success(`New item(s) added to cart.`);
      else if (quantityUpdated) message.info(`Quantity updated.`);
      if (alreadyInCart) message.warning(`Item already in cart.`);
    }, 100);
  
    setIsVariantModalOpen(false);
    setProductForVariantSelection(null);
  };

  const handleSearch = async (value, source = 'input') => {
    const trimmedValue = value ? value.trim() : '';
    
    // Agar Barcode Scan hai (Enter dabaya gaya)
    if (source === 'search' && trimmedValue) {
      setLoading(true);
      try {
        // 1. Product Barcode Check
        const productByBarcode = allProducts.find(p => p.barcode === trimmedValue);
        if (productByBarcode) {
             handleAddToCart(productByBarcode);
             setSearchTerm(''); 
             return;
        }

        // 2. Variant Barcode Check
        const variantItem = await db.product_variants.where('barcode').equals(trimmedValue).first();
        if (variantItem) {
            const inventoryItem = await db.inventory
                .where('variant_id').equals(variantItem.id)
                .filter(i => (i.status || '').toLowerCase() === 'available') 
                .first();

            if (inventoryItem) {
                const parentProduct = allProducts.find(p => p.id === inventoryItem.product_id);
                if (parentProduct) {
                    const itemToAdd = {
                        ...inventoryItem,
                        product_name: parentProduct.name,
                        variant_id: inventoryItem.variant_id,
                        sale_price: inventoryItem.sale_price || parentProduct.sale_price,
                        wholesale_price: inventoryItem.wholesale_price, 
                        purchase_price: inventoryItem.purchase_price,
                        quantity: 1 // <--- FIX: Barcode scan karne par hamesha 1 add hoga
                    };
                    handleVariantsSelected([itemToAdd]);
                    setSearchTerm('');
                    return;
                }
            } else {
                 message.warning('Item found but out of stock!');
                 return;
            }
        }

        // 3. IMEI Check (YAHAN TABDEELI KI HAI)
        const inventoryItem = await db.inventory.where('imei').equals(trimmedValue).first();
        
        // Neeche wali line ghaur se dekhein, yahan 'toLowerCase()' add kiya hai
        if (inventoryItem && (inventoryItem.status || '').toLowerCase() === 'available') {
             const parentProduct = allProducts.find(p => p.id === inventoryItem.product_id);
             if (parentProduct) {
                 const itemToAdd = {
                     ...inventoryItem,
                     product_name: parentProduct.name,
                     variant_id: inventoryItem.variant_id || inventoryItem.id,
                     sale_price: inventoryItem.sale_price || parentProduct.sale_price,
                     wholesale_price: inventoryItem.wholesale_price, 
                     purchase_price: inventoryItem.purchase_price,
                     imei: trimmedValue,
                     quantity: 1 // <--- FIX: IMEI scan karne par hamesha 1 add hoga
                 };
                 handleVariantsSelected([itemToAdd]);
                 setSearchTerm('');
                 return;
             }
        }
        
        message.warning(`No Barcode or IMEI matched for: ${trimmedValue}`);

      } catch (error) {
        message.error("Search failed: " + error.message);
      } finally {
        setLoading(false);
      }
      return;
    }

    // Agar sirf type kar raha hai
    setSearchTerm(value || ''); 
  };

  const validatePriceDrop = (item) => {
    const originalPrice = item.retail_price || item.sale_price;
    
    // 1. Pehle Product ki apni limit check karein, warna Global limit
    const parentProduct = allProducts.find(p => p.id === item.product_id);
    const dropLimitPercent = (parentProduct?.price_drop_limit !== undefined && parentProduct?.price_drop_limit !== null)
                             ? parentProduct.price_drop_limit 
                             : (profile?.price_drop_limit !== undefined ? profile.price_drop_limit : 5);
    
    let minAllowedPrice = originalPrice - (originalPrice * dropLimitPercent / 100);

    // 2. ULTIMATE SAFETY: Khareed Qeemat (Purchase Price) se neechay kabhi na jaye!
    const purchasePrice = item.purchase_price || 0;
    if (minAllowedPrice < purchasePrice) {
        minAllowedPrice = purchasePrice; // Nuqsan se bachne ke liye limit ko purchase price par set kar diya
    }

    // Owner ho ya Staff, dono ke liye check taake typo se bacha ja sake
    if (item.sale_price < minAllowedPrice && !item.is_price_authorized) {
      setPendingPriceChange({ item, originalPrice }); // originalPrice save kar rahe hain taake cancel hone par wapis la sakein
      setMasterPinAction('price_drop');
      setIsMasterPinModalVisible(true);
    } else if (item.sale_price >= minAllowedPrice) {
      // Agar price theek kar di gayi hai, to authorization hata dein
      handleCartItemUpdate(item, 'is_price_authorized', false);
    }
  };

  const handleCartItemUpdate = (itemToUpdate, field, value) => {
    setCart(cart.map(item => {
      if (item.variant_id === itemToUpdate.variant_id && (item.batch_number || null) === (itemToUpdate.batch_number || null) && (item.expiry_date || null) === (itemToUpdate.expiry_date || null)) {
        if (field === 'quantity') {
          const parentProduct = allProducts.find(p => p.id === item.product_id);
          const realStockCount = parentProduct 
              ? parentProduct.variants
                  .filter(v => 
                      JSON.stringify(v.item_attributes || {}) === JSON.stringify(item.item_attributes || {}) &&
                      (v.sale_price === item.sale_price || v.sale_price === item.retail_price) &&
                      (v.status || 'available').toLowerCase() === 'available' &&
                      (v.batch_number || null) === (item.batch_number || null) &&
                      (v.expiry_date || null) === (item.expiry_date || null)
                  )
                  .reduce((sum, v) => sum + (v.available_qty || 0), 0) 
              : 0;

          if (value > realStockCount) {
            message.warning(`Stock limit reached! Only ${realStockCount} available.`);
            return { ...item, quantity: realStockCount };
          }
        }
        return { ...item, [field]: value };
      }
      return item;
    }));
  };
  
  const handleRemoveFromCart = (productId) => {
    const item = cart.find(item => item.id === productId);
    if (item && item.quantity <= 1) {
        setCart(cart.filter(cartItem => cartItem.id !== productId));
    } else {
        handleCartItemUpdate(productId, 'quantity', item.quantity - 1);
    }
  };

  // FINAL handleCompleteSale (With Debugging)
  const handleCompleteSale = async () => {
    if (cart.length === 0) return;
    let allSaleItemsToInsert = []; 
    if (paymentMethod === 'Unpaid' && !selectedCustomer) { message.error('Please select a customer for a credit (Pay Later) sale.'); return; }
    if (paymentMethod === 'Unpaid' && amountPaid > grandTotal) { message.error('Amount paid cannot be greater than the grand total.'); return; }
    
    // --- NAYA IZAFA: Final Price Drop Check on Checkout ---
    const unauthorizedItem = cart.find(item => {
        const originalPrice = item.retail_price || item.sale_price;
        
        const parentProduct = allProducts.find(p => p.id === item.product_id);
        const dropLimitPercent = (parentProduct?.price_drop_limit !== undefined && parentProduct?.price_drop_limit !== null)
                                 ? parentProduct.price_drop_limit 
                                 : (profile?.price_drop_limit !== undefined ? profile.price_drop_limit : 5);
        
        let minAllowedPrice = originalPrice - (originalPrice * dropLimitPercent / 100);
        
        const purchasePrice = item.purchase_price || 0;
        if (minAllowedPrice < purchasePrice) {
            minAllowedPrice = purchasePrice;
        }

        return item.sale_price < minAllowedPrice && !item.is_price_authorized;
    });

    if (unauthorizedItem) {
        const originalPrice = unauthorizedItem.retail_price || unauthorizedItem.sale_price;
        setPendingPriceChange({ item: unauthorizedItem, originalPrice });
        setMasterPinAction('price_drop');
        setIsMasterPinModalVisible(true);
        return; // Sale yahin rok dein, modal khul jayega
    }

    // --- NAYA IZAFA: Grand Audit Check for Bill Discount & Loss ---
    if (discount > 0 && !window.isDiscountAuthorized) {
        const totalCartCost = cart.reduce((sum, item) => sum + ((item.purchase_price || 0) * item.quantity), 0);
        const isBelowCost = totalAfterDiscount < totalCartCost;

        const limit = profile?.staff_discount_limit || 10;
        let finalDiscountPercent = discountType === 'Percentage' ? discount : (subtotal > 0 ? (discount / subtotal) * 100 : 0);
        const exceedsStaffLimit = activeStaff && finalDiscountPercent > limit;

        if (isBelowCost || exceedsStaffLimit) {
            setPendingDiscountValue(discount);
            setMasterPinAction(isBelowCost ? 'below_cost_bill' : 'discount');
            setIsMasterPinModalVisible(true);
            return; // Sale yahin rok dein
        }
    }
    // --------------------------------------------------------------

    const udhaarAmount = grandTotal - amountPaid;
    
    // --- NAYA IZAFA: Customer Credit Limit Check ---
    if (paymentMethod === 'Unpaid' && profile?.enable_customer_credit_limits && selectedCustomer) {
        const customer = customers.find(c => c.id === selectedCustomer);
        // Agar customer ki limit set hai (NULL nahi hai)
        if (customer && customer.credit_limit !== null && customer.credit_limit !== undefined) {
            const totalFutureDebt = (customer.balance || 0) + udhaarAmount;
            if (totalFutureDebt > customer.credit_limit) {
                if (!window.creditLimitAuthorizedForThisSale) {
                    setMasterPinAction('credit_limit');
                    setIsMasterPinModalVisible(true);
                    // Sale yahin rok dein, modal khul jayega
                    return;
                }
            }
        }
    }
    // Reset authorization for next sale
    window.creditLimitAuthorizedForThisSale = false;
    // -----------------------------------------------

    // Confirmation Modal hata diya gaya hai taake sale foran complete ho
    let saleDataForReceipt = null;
        
        try {
          setIsSubmitting(true);
          
          // --- CLEAN UUID LOGIC ---
          let finalCustomerId = selectedCustomer;
          if (!finalCustomerId) {
              const walkIn = await DataService.getOrCreateWalkInCustomer();
              finalCustomerId = walkIn.id;
          }
          
          const saleId = crypto.randomUUID();

          // --- NAYA IZAFA: FBR Edge Function Call ---
          let fbrInvoiceNumber = null;
          if (profile?.fbr_integration_enabled) {
              if (!navigator.onLine) {
                  message.error("FBR Integration is ON. Internet connection is required to complete this sale.");
                  setIsSubmitting(false);
                  return;
              }
              
              message.loading({ content: 'Reporting to FBR...', key: 'fbr_sync' });
              
              try {
                  const fbrCustomer = customers.find(c => c.id === finalCustomerId) || {};
                  
                  // Supabase Edge Function ko data bhejna
                  const { data, error } = await supabase.functions.invoke('fbr-integration', {
                      body: {
                          pos_id: profile?.fbr_pos_id,
                          ntn: profile?.fbr_ntn,
                          sale_data: {
                              saleId: saleId,
                              invoiceDate: new Date().toISOString().split('T')[0], // NAYA IZAFA: FBR ko Date chahiye YYYY-MM-DD format mein
                              sellerProvince: profile?.province || 'Sindh', // NAYA IZAFA: Dukandar ka Sooba
                              buyerRegistrationType: fbrCustomer.tax_id ? 'Registered' : 'Unregistered', // NAYA IZAFA: Khareedar ka status
                              customerNtn: fbrCustomer.tax_id || '',
                              customerName: fbrCustomer.name || 'Walk-in Customer',
                              customerPhone: fbrCustomer.phone_number || '',
                              customerAddress: fbrCustomer.address || 'Walk-in', // NAYA IZAFA: Khareedar ka pata
                              grandTotal: grandTotal,
                              subtotal: subtotal,
                              taxAmount: taxAmount,
                              discount: discountAmount,
                              payment_method: paymentMethod === 'Paid' ? cashOrBank : 'Cash',
                              taxRate: profile?.tax_rate || 0,
                              items: cart.map(item => {
                                  // NAYA IZAFA: Cart item se asal product dhoondna taake HS Code aur UOM mil sakay
                                  const parentProduct = allProducts.find(p => p.id === item.product_id);
                                  return {
                                      product_id: item.product_id,
                                      name: item.product_name || item.name,
                                      quantity: item.quantity || 1,
                                      price_at_sale: item.sale_price,
                                      hsCode: parentProduct?.hs_code || '', // Agar HS Code nahi hai, to khali bhej do taake FBR proper error de
                                      uoM: parentProduct?.uom || 'Numbers, pieces, units' // NAYA IZAFA: FBR UOM
                                  };
                              })
                          }
                      }
                  });

                  if (error) throw error;
                  if (!data.success) throw new Error(data.error || "Unknown FBR Error");

                  // Edge function se aane wala FBR Invoice Number
                  fbrInvoiceNumber = data.fbr_invoice_number;
                  message.success({ content: 'Reported to FBR successfully!', key: 'fbr_sync', duration: 2 });
                  
              } catch (fbrError) {
                  console.error("FBR Call Failed:", fbrError);
                  message.error({ content: 'FBR Reporting Failed: ' + fbrError.message, key: 'fbr_sync', duration: 3 });
                  setIsSubmitting(false);
                  return; // Sale rok dein agar FBR fail ho jaye
              }
          }
          // ------------------------------------------------------
          // Naya ID generate karein (e.g. A-1234)
          const shortInvoiceId = await generateInvoiceId(); 
          const saleDate = new Date().toISOString();

          const saleRecord = { 
              id: saleId, 
              local_id: saleId,
              invoice_id: shortInvoiceId, 
              customer_id: finalCustomerId, 
              subtotal: subtotal, 
              discount: discountAmount, 
              tax_amount: taxAmount, 
              tax_rate_applied: profile?.tax_enabled ? profile?.tax_rate : 0, 
              total_amount: grandTotal, 
              // NAYA IZAFA: Ab chahe Full payment ho ya Advance (Udhaar), dono suraton mein selected account ka naam save hoga
              payment_method: paymentAccounts.find(a => a.id === selectedAccountId)?.name || 'Cash',
              amount_paid_at_sale: paymentMethod === 'Paid' ? grandTotal : amountPaid, 
              payment_status: (paymentMethod === 'Unpaid' && (grandTotal - amountPaid > 0)) ? 'Unpaid' : 'Paid', 
              user_id: user.id,
              staff_id: activeStaff?.id || null,
              register_id: activeSession?.register_id || null, // NAYA
              session_id: activeSession?.id || null,           // NAYA
              created_at: saleDate,
              // --- NAYA IZAFA: FBR Data ---
              fbr_invoice_number: fbrInvoiceNumber,
              fbr_fee_applied: profile?.fbr_integration_enabled ? (profile?.fbr_fee || 1) : 0,
              notes: saleNotes // <--- NAYA IZAFA: Bill ke sath wajah save karein
              // ----------------------------
          };

          const inventoryIdsToUpdate = [];

          for (const cartItem of cart) {
            if (cartItem.imei) {
                const inventoryId = cartItem.inventory_id || cartItem.id;
                const parentProduct = allProducts.find(p => p.id === cartItem.product_id);
                const warrantyDays = parentProduct?.default_warranty_days || 0;
                let expiryDate = null;
                if (profile?.warranty_system_enabled !== false && !cartItem.no_warranty && warrantyDays > 0) {
                    const d = new Date();
                    d.setDate(d.getDate() + warrantyDays);
                    expiryDate = d.toISOString();
                }

                const itemLocalId = crypto.randomUUID();
                allSaleItemsToInsert.push({
                    id: itemLocalId,
                    local_id: itemLocalId, 
                    sale_id: saleId,
                    inventory_id: inventoryId,
                    product_id: cartItem.product_id,
                    product_name_snapshot: cartItem.product_name, 
                    quantity: 1,
                    price_at_sale: cartItem.sale_price,
                    // FIX: batchItem ki jagah cartItem use karein kyunke IMEI item ki details cart mein pehle se hain
                    purchase_price: cartItem.purchase_price || 0,
                    user_id: user.id,
                    warranty_expiry: expiryDate 
                });
                inventoryIdsToUpdate.push({ id: inventoryId, qtySold: 1 });
            } else {
                // --- FIFO LOGIC START (Updated for Multi-Batch Sales) ---
                let qtyNeeded = cartItem.quantity;

                // 1. Saare available batches dhoondein (Smart FEFO/FIFO Logic)
                const allBatchesRaw = await db.inventory
                    .where('product_id').equals(cartItem.product_id)
                    .filter(item => 
                        (item.status || '').toLowerCase() === 'available' && 
                        (item.available_qty || 0) > 0 &&
                        JSON.stringify(item.item_attributes || {}) === JSON.stringify(cartItem.item_attributes || {}) &&
                        (item.batch_number || null) === (cartItem.batch_number || null) &&
                        (item.expiry_date || null) === (cartItem.expiry_date || null)
                    )
                    .toArray();

                // Sort karein: Agar expiry hai to FEFO (Pehle expire hone wala pehle), warna FIFO (Pehle khareeda hua pehle)
                const allBatches = allBatchesRaw.sort((a, b) => {
                    if (a.expiry_date && b.expiry_date) return new Date(a.expiry_date) - new Date(b.expiry_date);
                    if (a.expiry_date) return -1;
                    if (b.expiry_date) return 1;
                    return new Date(a.created_at) - new Date(b.created_at);
                });

                // 2. Check: Kya total stock kaafi hai?
                const totalAvailable = allBatches.reduce((sum, b) => sum + (b.available_qty || 0), 0);
                if (totalAvailable < qtyNeeded) {
                     throw new Error(`Not enough stock locally for ${cartItem.product_name}. Required: ${qtyNeeded}, Available: ${totalAvailable}`);
                }

                // 3. Batches mein se stock nikalein (Loop)
                for (const batch of allBatches) {
                    if (qtyNeeded <= 0) break;

                    // Is batch se kitna le sakte hain? Ya to poora batch, ya jitna chahiye
                    const takeFromBatch = Math.min(qtyNeeded, batch.available_qty);

                    // Warranty Calculation (Har batch ke liye same rahegi)
                    const parentProductBulk = allProducts.find(p => p.id === cartItem.product_id);
                    const warrantyDaysBulk = parentProductBulk?.default_warranty_days || 0;
                    let expiryDateBulk = null;
                    
                    if (profile?.warranty_system_enabled !== false && !cartItem.no_warranty && warrantyDaysBulk > 0) {
                        const d = new Date();
                        d.setDate(d.getDate() + warrantyDaysBulk);
                        expiryDateBulk = d.toISOString();
                    }

                    // Sale Item Entry (Har batch ke liye alag entry banegi)
                    allSaleItemsToInsert.push({
                        id: crypto.randomUUID(),
                        sale_id: saleId,
                        inventory_id: batch.id,
                        product_id: cartItem.product_id,
                        product_name_snapshot: cartItem.product_name,
                        quantity: takeFromBatch, // Sirf utna jitna is batch se liya
                        price_at_sale: cartItem.sale_price,
                        purchase_price: batch.purchase_price || 0, // Asli khareed qeemat is batch ki
                        user_id: user.id,
                        warranty_expiry: expiryDateBulk
                    });

                    // Update List mein daalein
                    inventoryIdsToUpdate.push({ id: batch.id, qtySold: takeFromBatch });

                    // Baqi kitna chahiye?
                    qtyNeeded -= takeFromBatch;
                }
                // --- FIFO LOGIC END ---
            }
          }

          // Save Locally
          await db.sales.add(saleRecord);
          if (db.sale_items) await db.sale_items.bulkAdd(allSaleItemsToInsert);
          
          // B. Inventory Update (Bulk System Logic)
          for (const updateInfo of inventoryIdsToUpdate) {
              // Agar IMEI hai to updateInfo sirf ID hogi, agar Bulk hai to object hoga
              const invId = typeof updateInfo === 'object' ? updateInfo.id : updateInfo;
              const qtyToMinus = typeof updateInfo === 'object' ? updateInfo.qtySold : 1;

              const invItem = await db.inventory.get(invId);
              if (invItem) {
                  const newAvail = Math.max(0, (invItem.available_qty || 0) - qtyToMinus);
                  const newSold = (invItem.sold_qty || 0) + qtyToMinus;
                  
                  await db.inventory.update(invId, {
                      available_qty: newAvail,
                      sold_qty: newSold,
                      status: newAvail === 0 ? 'Sold' : 'Available'
                  });
              }
          }

          // Balance Update
          if (paymentMethod === 'Unpaid' && finalCustomerId) {
              const customer = await db.customers.get(finalCustomerId);
              if (customer) {
                  const newBalance = (customer.balance || 0) + udhaarAmount;
                  await db.customers.update(finalCustomerId, { balance: newBalance });
              }
          }

          // Add to Sync Queue
          await db.sync_queue.add({
              table_name: 'sales',
              action: 'create_full_sale',
              data: {
                  sale: saleRecord,
                  items: allSaleItemsToInsert,
                  inventory_ids: inventoryIdsToUpdate
              }
          });
          
          message.success(`Sale #${shortInvoiceId} completed successfully!`);
          saleDataForReceipt = saleRecord;
          
          // processSyncQueue(); <--- Yeh line hum ne hata di taake Receipt foran show ho. Auto-Sync isay khud sambhal lega.

        } catch (error) {
          console.error("Sale Error:", error);
          message.error('Sale failed: ' + error.message);
          setIsSubmitting(false);
          return;
        }

        // Print Receipt
        if (saleDataForReceipt) {
             
             // --- GROUPING LOGIC WITH ATTRIBUTES ---
             const groupedItemsMap = {};

             cart.forEach(c => {
                // Key: Name + Price
                const key = `${c.product_name}-${c.sale_price}`;

                // Attributes ko format karein (e.g., "8GB, Black")
                const attrValues = c.item_attributes 
                    ? Object.entries(c.item_attributes)
                        .filter(([k, v]) => !k.toLowerCase().includes('imei') && !k.toLowerCase().includes('serial'))
                        .map(([k, v]) => v)
                        .join(', ')
                    : '';

                if (!groupedItemsMap[key]) {
                    // Find the exact sale item record for this unit
                    const saleItemRecord = allSaleItemsToInsert.find(si => 
                        si.product_id === c.product_id && 
                        si.inventory_id === (c.inventory_id || c.id)
                    );
                    
                    const expiryDate = saleItemRecord?.warranty_expiry || null;

                    groupedItemsMap[key] = {
                        name: c.product_name,
                        quantity: 0,
                        price_at_sale: c.sale_price,
                        total: 0,
                        imeis: [],
                        attributes: attrValues,
                        warranty_expiry: expiryDate 
                    };
                }

                groupedItemsMap[key].quantity += (c.quantity || 1);
                groupedItemsMap[key].total += (c.quantity || 1) * c.sale_price;
                
                if (c.imei) {
                    groupedItemsMap[key].imeis.push(c.imei);
                }
             });

             const receiptItems = Object.values(groupedItemsMap);

             const receiptData = {
                 ...saleDataForReceipt,
                 shopName: profile?.shop_name || 'My Shop',
                 shopAddress: profile?.address || '',
                 shopPhone: profile?.phone_number || '',
                 shopLogo: profile?.shop_logo || null, // <--- NAYA IZAFA: Logo URL passed
                 saleId: saleDataForReceipt.id,
                 
                 items: receiptItems, 
                 
                 customerName: customers.find(c => c.id === saleDataForReceipt.customer_id)?.name || 'Walk-in Customer',
                 saleDate: new Date().toISOString(),
                 saleItems: allSaleItemsToInsert, 
                 amountPaid: saleDataForReceipt.amount_paid_at_sale,
                 paymentStatus: saleDataForReceipt.payment_status,
                 grandTotal: saleDataForReceipt.total_amount,
                 // --- NAYA IZAFA: Receipt ke liye Tax Data ---
                 taxAmount: saleDataForReceipt.tax_amount,
                 taxName: profile?.tax_name || 'Tax',
                 taxRate: saleDataForReceipt.tax_rate_applied,
                 // --- NAYA IZAFA: FBR Receipt Data ---
                 fbrInvoiceNumber: saleDataForReceipt.fbr_invoice_number,
                 fbrFeeApplied: saleDataForReceipt.fbr_fee_applied,
                 // --------------------------------------------
                 footerMessage: profile?.warranty_policy,
                 showQrCode: profile?.qr_code_enabled ?? true
             };

             if (profile?.receipt_format === 'none') {
                message.info('Sale completed. Receipt printing is disabled.');
             } else if (profile?.receipt_format === 'thermal') {
                printThermalReceipt(receiptData, profile?.currency);
             } else {
                generateSaleReceipt(receiptData, profile?.currency);
             }
             // Naya Izafa: Aakhri sale ka data yaad rakhein (Moved inside the bracket)
             setLastSaleData(receiptData);
        }

        // Reset
        setCart([]);
        setSelectedCustomer(null);
        setPaymentMethod('Paid');
        setAmountPaid(0);
        setDiscount(0);
        setDiscountType('Amount');
        setSaleNotes(''); // <--- NAYA IZAFA: Agli sale ke liye saaf kar dein
        await DataService.clearActiveCart(); // Persistence saaf karein
        
        const { productsData } = await DataService.getInventoryData();
        setAllProducts(productsData);
        setDisplayedProducts(productsData);

        if (searchInputRef.current && !isMobile) { searchInputRef.current.focus(); }
        setIsSubmitting(false);
  };

  const subtotal = cart.reduce((sum, item) => sum + (item.sale_price * item.quantity), 0);
  const isWalkIn = customers.find(c => c.id === selectedCustomer)?.name === 'Walk-in Customer';

  // --- NAYA IZAFA: Dynamic Wholesale Pricing ---
  useEffect(() => {
    if (cart.length > 0) {
      const customer = customers.find(c => c.id === selectedCustomer);
      const isWholesale = isWholesaleActive && customer?.customer_group?.includes('Wholesale');

      let priceChanged = false;
      const updatedCart = cart.map(item => {
        // Agar retail_price save nahi hai, to pehle usey save kar lein
        const retail = item.retail_price || item.sale_price;
        const newPrice = (isWholesale && item.wholesale_price) ? item.wholesale_price : retail;
        
        if (item.sale_price !== newPrice) {
          priceChanged = true;
          return { ...item, retail_price: retail, sale_price: newPrice };
        }
        return { ...item, retail_price: retail };
      });

      if (priceChanged) {
        setCart(updatedCart);
        message.info(`Prices updated to ${isWholesale ? 'Wholesale' : 'Retail'} for this customer.`);
      }
    }
  }, [selectedCustomer, customers]);
  // ---------------------------------------------
  // Agar Walk-in select ho jaye to payment method ko "Paid" par reset kar dein
  useEffect(() => {
    if (isWalkIn && paymentMethod === 'Unpaid') {
      setPaymentMethod('Paid');
      setAmountPaid(0);
    }
  }, [isWalkIn, paymentMethod]);
  let discountAmount = discountType === 'Amount' ? discount : (subtotal * discount) / 100;
  const totalAfterDiscount = Math.max(0, subtotal - discountAmount);
  
  // --- NAYA IZAFA: Tax Calculation ---
  let taxAmount = 0;
  if (profile?.tax_enabled && profile?.tax_rate > 0) {
      taxAmount = (totalAfterDiscount * profile.tax_rate) / 100;
  }
  
  // --- NAYA IZAFA: FBR Fee Calculation ---
  let fbrFeeAmount = 0;
  if (profile?.fbr_integration_enabled) {
      fbrFeeAmount = profile?.fbr_fee || 1;
  }
  
  const grandTotal = totalAfterDiscount + taxAmount + fbrFeeAmount;
  // -----------------------------------

  // --- NAYA IZAFA: Helper function taake code repeat na ho
  const processSaveCustomer = async (values) => {
      try {
          const newCustomer = { 
              ...values, 
              // Ab limit handleAddCustomer mein theek ho kar aayegi
              credit_limit: profile?.enable_customer_credit_limits ? values.credit_limit : null,
              id: crypto.randomUUID(), 
              local_id: crypto.randomUUID(),
              user_id: user.id, 
              balance: 0 
          };
          await db.customers.add(newCustomer);
          await db.sync_queue.add({ table_name: 'customers', action: 'create', data: newCustomer });
          message.success('Customer added successfully!');
          setIsAddCustomerModalOpen(false);
          addForm.resetFields();
          setCustomers(currentCustomers => [...currentCustomers, newCustomer].sort((a, b) => a.name.localeCompare(b.name)));
          setSelectedCustomer(newCustomer.id);
      } catch (error) {
          message.error('Error adding customer: ' + error.message);
      }
  };

  // NAYA handleAddCustomer (Offline-First)
  const handleAddCustomer = async (values) => {
    if (values.phone_number) {
      values.phone_number = values.phone_number.replace(/[^\d+]/g, '');
    }

    try {
      const existingCustomerName = await DataService.checkDuplicateCustomer(values.phone_number);
      if (existingCustomerName) {
        addForm.setFields([{ name: 'phone_number', errors: [`Registered to: ${existingCustomerName}`] }]);
        return;
      }

      // --- SMART LOGIC: Default Limit vs Unlimited ---
      let finalCreditLimit = values.credit_limit;
      const defaultLimit = profile?.default_credit_limit || 0;

      if (profile?.enable_customer_credit_limits) {
          if (finalCreditLimit === undefined || finalCreditLimit === null) {
              if (activeStaff && !can('can_set_credit_limit')) {
                  // Staff jiske paas permission nahi, usay chup-chap Default Limit de do
                  finalCreditLimit = defaultLimit;
              } else {
                  // Owner ya permission wala staff khali chhore to Unlimited (null)
                  finalCreditLimit = null;
              }
          }
      }

      // Values ko update kar dein taake processSaveCustomer ko sahi data mile
      const updatedValues = { ...values, credit_limit: finalCreditLimit };

      // --- OWNER PIN CHECK ---
      if (profile?.enable_customer_credit_limits && activeStaff) {
          const isUnlimited = finalCreditLimit === null;

          // Agar Limit Default se zyada hai, ya Unlimited hai, tab PIN mango
          if (isUnlimited || finalCreditLimit > defaultLimit) {
              setPendingCustomerValues(updatedValues);
              setMasterPinAction('customer_create_limit');
              setIsMasterPinModalVisible(true);
              return; 
          }
      }
      
      // Agar sab theek hai, ya Owner khud add kar raha hai
      processSaveCustomer(updatedValues);

    } catch (error) {
      message.error('Error validation: ' + error.message);
    }
  };
  
  const handleFullRemoveFromCart = (itemToRemove) => {
    setCart(cart.filter(item => !(item.variant_id === itemToRemove.variant_id && (item.batch_number || null) === (itemToRemove.batch_number || null) && (item.expiry_date || null) === (itemToRemove.expiry_date || null))));
  };

  const handleResetCart = () => { modal.confirm({ title: 'Reset Bill?', content: 'Are you sure you want to remove all items from the current bill?', okText: 'Yes, Reset', cancelText: 'No', onOk: async () => { setCart([]); setDiscount(0); setAmountPaid(0); setSelectedCustomer(null); await DataService.clearActiveCart(); message.success('Bill has been reset.'); } }); };

  const onDiscountChange = (value) => {
    setDiscount(value || 0);
    window.isDiscountAuthorized = false; // Value change hone par authorization reset karein
  };

  const validateBillDiscount = () => {
    if (cart.length === 0 || discount === 0) return;

    // 1. Check Total Cost vs Final Amount (Nuqsan se bachne ke liye)
    const totalCartCost = cart.reduce((sum, item) => sum + ((item.purchase_price || 0) * item.quantity), 0);
    let discountAmountCalc = discountType === 'Amount' ? discount : (subtotal * discount) / 100;
    const totalAfterDiscountCalc = Math.max(0, subtotal - discountAmountCalc);

    const isBelowCost = totalAfterDiscountCalc < totalCartCost;

    // 2. Check Staff Discount Limit
    const limit = profile?.staff_discount_limit || 10;
    let finalDiscountPercent = discountType === 'Percentage' ? discount : (subtotal > 0 ? (discount / subtotal) * 100 : 0);
    const exceedsStaffLimit = activeStaff && finalDiscountPercent > limit; // Staff limit sirf staff par lagti hai

    // Owner aur Staff dono ko nuqsan (below cost) par warning aayegi taake ghalti se bacha ja sake
    if (isBelowCost || exceedsStaffLimit) {
        setPendingDiscountValue(discount);
        setMasterPinAction(isBelowCost ? 'below_cost_bill' : 'discount');
        setIsMasterPinModalVisible(true);
    } else {
        window.isDiscountAuthorized = true; // Agar sab theek hai to pass kar dein
    }
  };

  const handleMasterPinVerify = () => {
    if (verifyMasterPin(masterPinInput)) {
      let newNote = ''; // <--- NAYA IZAFA

      if (masterPinAction === 'credit_limit') {
          window.creditLimitAuthorizedForThisSale = true;
          setIsMasterPinModalVisible(false);
          setMasterPinInput('');
          setMasterPinAction(null);
          message.success("Credit limit override approved by Admin.");
          handleCompleteSale(); // Sale dobara chalayein
      } else if (masterPinAction === 'customer_create_limit') {
          // NAYA IZAFA: Customer save karne do
          setIsMasterPinModalVisible(false);
          setMasterPinInput('');
          setMasterPinAction(null);
          message.success("Customer credit limit approved by Admin.");
          processSaveCustomer(pendingCustomerValues);
      } else if (masterPinAction === 'price_drop') {
          newNote = `[Price Drop on ${pendingPriceChange.item.product_name || 'Item'}: ${auditRemark || 'Approved by Admin'}]`;
          handleCartItemUpdate(pendingPriceChange.item, 'is_price_authorized', true);
          setIsMasterPinModalVisible(false);
          setMasterPinInput('');
          setAuditRemark('');
          setMasterPinAction(null);
          setPendingPriceChange(null);
          message.success("Price drop approved by Admin.");
      } else if (masterPinAction === 'below_cost_bill' || masterPinAction === 'discount') {
          newNote = `[Bill Discount: ${auditRemark || 'Approved by Admin'}]`;
          setDiscount(pendingDiscountValue);
          window.isDiscountAuthorized = true; 
          setIsMasterPinModalVisible(false);
          setMasterPinInput('');
          setAuditRemark('');
          setMasterPinAction(null);
          message.success("Bill discount approved by Admin.");
      } else {
          setDiscount(pendingDiscountValue);
          setIsMasterPinModalVisible(false);
          setMasterPinInput('');
          setAuditRemark('');
          setMasterPinAction(null);
          message.success("Approved by Admin.");
      }

      // NAYA IZAFA: Sale Notes mein wajah add karein
      if (newNote) {
          setSaleNotes(prev => prev ? `${prev} | ${newNote}` : newNote);
      }
    } else {
      message.error("Invalid Master PIN!");
      setMasterPinInput('');
    }
  };

  const handleReprintLastReceipt = () => {
    if (!lastSaleData) return;
    if (profile?.receipt_format === 'thermal') {
      printThermalReceipt(lastSaleData, profile?.currency);
    } else {
      generateSaleReceipt(lastSaleData, profile?.currency);
    }
    message.success("Reprinting last receipt...");
  };

  const handleHoldBill = async () => {
    if (cart.length === 0) return;
    try {
      const customerName = selectedCustomer ? customers.find(c => c.id === selectedCustomer)?.name : 'Walk-in Customer';
      await DataService.holdBill({ 
        cart, 
        customer_id: selectedCustomer, 
        discount, 
        discountType, 
        user_id: user.id,
        staff_id: activeStaff?.id || null,
        register_id: activeSession?.register_id || null, // NAYA
        note: `Draft for ${customerName}` 
      });
      setCart([]); setDiscount(0); setSelectedCustomer(null);
      await DataService.clearActiveCart(); // Hold hone par persistence saaf karein
      refreshHeldCount(); // Counter update karein
      message.success("Bill saved as draft!");
    } catch (error) { message.error("Failed to hold: " + error.message); }
  };

  const handleResumeFromDraft = async (heldBill, type) => {
    if (type === 'sale') {
      if (cart.length > 0) { message.warning("Please clear current cart first."); return; }
      setCart(heldBill.cart);
      setSelectedCustomer(heldBill.customer_id);
      setDiscount(heldBill.discount || 0);
      setDiscountType(heldBill.discount_type || 'Amount');
      message.success("Draft resumed for Sale!");
    } else {
      // Purchase Logic: Items ko bilkul NAYA bana kar bhejein (Safai)
      const formattedForPurchase = heldBill.cart.map(item => ({
        product_id: item.product_id,
        name: item.product_name,
        temp_id: crypto.randomUUID(), 
        quantity: item.quantity,
        purchase_price: item.purchase_price || 0,
        sale_price: item.sale_price || 0,
        item_attributes: item.item_attributes,
        imei: item.imei,
        warranty_days: item.warranty_days || 0,
        id: crypto.randomUUID(), // NAYI ID: Ab yeh khali nahi jayega
        status: 'Available',
        sold_qty: 0,
        returned_qty: 0,
        damaged_qty: 0
      }));
      
      // NAYA: Draft ID ko state mein save karein taake baad mein delete ho sakay
      setDraftPurchaseItems(formattedForPurchase);
      setIsPurchaseModalVisible(true);
      
      // Draft ko yahan delete karne ke bajaye, sirf band karein
      // Hum isay 'onPurchaseCreated' par delete karenge (Neeche wala step dekhein)
      window.currentDraftId = heldBill.id; 
      setIsDraftModalOpen(false);
      return; 
    }
    
    await DataService.deleteHeldBill(heldBill.id);
    setIsDraftModalOpen(false);
    refreshHeldCount();
  };

  return (
    <div style={{ padding: isMobile ? '4px 0' : '8px 0' }}>
    <style>
        {`
          /* Scrollbar ki churai (width) */
          ::-webkit-scrollbar {
            width: 8px;
            height: 8px;
          }
          /* Scrollbar ka peeche ka hissa (Track) */
          ::-webkit-scrollbar-track {
            background: ${token.colorBgLayout}; 
          }
          /* Scrollbar ka pakarne wala hissa (Thumb) */
          ::-webkit-scrollbar-thumb {
            background-color: ${token.colorTextQuaternary};
            border-radius: 4px;
          }
          /* Jab mouse upar layein */
          ::-webkit-scrollbar-thumb:hover {
            background-color: ${token.colorTextTertiary};
          }
        `}
      </style>
      {isMobile && (
        <Title level={2} style={{ marginBottom: '5px', marginLeft: '8px', fontSize: '23px' }}>
            <ShoppingCartOutlined /> Point of Sale
        </Title>
      )}
      <Row gutter={16}>
        <Col xs={24} md={13}>
          <Card variant="borderless" style={{ background: 'transparent', boxShadow: 'none' }} styles={{ body: { padding: isMobile ? '8px 0' : '0 0px 0 0', display: 'flex', flexDirection: 'column', height: isMobile ? 'auto' : 'calc(100vh - 110px)' } }}>
            {/* === ROW 1: SEARCH, CATEGORY, BUTTONS === */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
              
              {/* 1. Search & Scan Input */}
              <Input
                id="pos-search-input"
                placeholder="Scan Barcode or Search..."
                prefix={<BarcodeOutlined style={{ color: token.colorPrimary, fontSize: '18px' }} />}
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value, 'input')}
                onPressEnter={(e) => handleSearch(e.target.value, 'search')}
                allowClear
                style={{ flex: 1 }}
                ref={searchInputRef}
              />

              {/* 2. Category Select */}
              <Select
                placeholder="Category"
                value={activeCategoryId}
                onChange={(value) => { setActiveCategoryId(value); setSearchTerm(''); }}
                style={{ width: '140px' }}
                allowClear
                showSearch
                optionFilterProp="children"
              >
                {allProducts
                  .reduce((acc, current) => {
                    if (!acc.find(item => item.category_id === current.category_id)) {
                      acc.push({ category_id: current.category_id, category_name: current.category_name });
                    }
                    return acc;
                  }, [])
                  .sort((a,b) => a.category_name.localeCompare(b.category_name))
                  .map(cat => (<Select.Option key={cat.category_id} value={cat.category_id}>{cat.category_name}</Select.Option>))
                }
              </Select>

              {/* 3. Filter Toggle Button (Yeh Naya Hai) */}
              <Tooltip title="More Filters">
                <Button 
                  icon={<FilterOutlined />} 
                  type={showFilters ? 'primary' : 'default'}
                  onClick={() => setShowFilters(!showFilters)}
                />
              </Tooltip>

              {/* 3.5 View Mode Toggle (Naya Izafa) */}
              <Tooltip title={viewMode === 'grid' ? "Switch to List View" : "Switch to Grid View"}>
                <Button 
                  icon={viewMode === 'grid' ? <UnorderedListOutlined /> : <AppstoreOutlined />} 
                  onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                />
              </Tooltip>

              {/* 4. Top Selling Button */}
              <Tooltip title="Show Top Selling">
                <Button
                  icon={<StarOutlined />}
                  onClick={() => {
                    setActiveCategoryId(null);
                    setSearchTerm('');
                    setPriceRange([null, null]); 
                    setFilterAttributes({});     
                    setDisplayedProducts(topSellingProducts);
                    if (searchInputRef.current && !isMobile) searchInputRef.current.focus();
                  }}
                />
              </Tooltip>
            </div>

            {/* === ROW 2: HIDDEN FILTERS (Fixed for Dark Mode) === */}
            {showFilters && (
               <div style={{ marginBottom: '16px', marginTop: '4px' }}>
                  <Row gutter={[8, 8]} align="top">
                    {/* A. Price Range */}
                    <Col xs={24} sm={12} md={9}>
                       <Text type="secondary" style={{ display: 'block', marginBottom: '2px', fontSize: '11px', fontWeight: 500 }}>Price Range</Text>
                       <Space>
                          <InputNumber placeholder="Min" value={priceRange[0]} onChange={(v) => setPriceRange([v, priceRange[1]])} style={{ width: '90px' }} />
                          <span>-</span>
                          <InputNumber placeholder="Max" value={priceRange[1]} onChange={(v) => setPriceRange([priceRange[0], v])} style={{ width: '90px' }} />
                       </Space>
                    </Col>

                    {/* B. Dynamic Attributes (RAM, ROM etc) */}
                    {advancedFilters.map((filter) => (
                      <Col xs={12} sm={6} md={5} key={filter.attribute_name}>
                        <Text type="secondary" style={{ display: 'block', marginBottom: '2px', fontSize: '11px', fontWeight: 500 }}>{filter.attribute_name}</Text>
                        <Select
                          allowClear
                          showSearch
                          style={{ width: '100%' }}
                          placeholder="Any"
                          value={filterAttributes[filter.attribute_name]}
                          onChange={(val) => setFilterAttributes(prev => ({ ...prev, [filter.attribute_name]: val }))}
                        >
                          {filter.options.map(opt => <Select.Option key={opt} value={opt}>{opt}</Select.Option>)}
                        </Select>
                      </Col>
                    ))}
                  </Row>
               </div>
            )}
            
            {/* === NEW PRODUCT LIST (INVENTORY STYLE) === */}
            <style>{`.hide-scrollbar::-webkit-scrollbar { display: none; } .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }`}</style>
            
            <List
              // NAYA IZAFA: Grid View ke mutabiq columns adjust honge
              grid={viewMode === 'grid' ? { gutter: 12, xs: 2, sm: 3, md: 3, lg: 4, xl: 4 } : { gutter: 16, xs: 1, sm: 1, md: 1, lg: 1, xl: 1 }}
              dataSource={productsWithVariants}
              loading={loading}
              rowKey="id"
              style={{ 
                flex: 1, 
                overflowY: 'auto', 
                overflowX: 'hidden', 
                paddingLeft: '0px',  // Left side se padding
                paddingRight: '8px'  // Right side se thori padding taake scrollbar touch na ho
              }}
              renderItem={(product) => (
                <List.Item style={{ marginBottom: viewMode === 'grid' ? '12px' : '16px' }}>
                  {viewMode === 'grid' ? (
                    // --- GRID VIEW CARD (Naya Izafa) ---
                    <Card
                      hoverable
                      onClick={() => handleAddToCart(product)}
                      style={{ 
                        borderRadius: 8,
                        border: `1px solid ${token.colorCardBorder}`, 
                        boxShadow: `0 4px 12px ${token.colorCardShadow}`, 
                        transition: 'all 0.3s ease',
                        backgroundColor: token.colorCardBg || token.colorBgContainer,
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden'
                      }}
                      styles={{ body: { padding: '8px', display: 'flex', flexDirection: 'column', height: '100%' } }}
                    >
                      {/* Image Box */}
                      <div style={{ position: 'relative', width: '100%', paddingTop: '100%', marginBottom: '8px', backgroundColor: token.colorFillQuaternary, borderRadius: '6px', overflow: 'hidden' }}>
                        {product.image_url ? (
                          <img src={product.image_url} alt={product.name} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: token.colorTextTertiary }}>No Image</div>
                        )}
                        {/* Stock Badge */}
                        <div style={{ position: 'absolute', top: '4px', right: '4px', maxWidth: '90%' }}>
                           <Tooltip title={`Total Stock: ${product.quantity} (${product.groupedVariants?.length || 1} variants)`} placement="left">
                             <Tag 
                               style={{ 
                                 margin: 0, 
                                 fontWeight: 'bold', 
                                 display: 'block', 
                                 overflow: 'hidden', 
                                 textOverflow: 'ellipsis', 
                                 whiteSpace: 'nowrap',
                                 backgroundColor: 'transparent',
                                 color: product.quantity > 0 ? token.colorPrimary : token.colorAmountNegative,
                                 borderColor: product.quantity > 0 ? token.colorPrimary : token.colorAmountNegative,
                                 borderRadius: '4px',
                                 padding: '0 6px'
                               }}
                             >
                               {product.groupedVariants && product.groupedVariants.length > 1 
                                 ? product.groupedVariants.map(v => v.display_quantity).join(' / ') 
                                 : product.quantity}
                             </Tag>
                           </Tooltip>
                        </div>
                      </div>
                      
                      {/* Product Details */}
                      <div style={{ height: '36px', marginBottom: '4px', overflow: 'hidden' }}>
                        <Tooltip title={product.name} placement="topLeft" mouseEnterDelay={0.5}>
                          <Text strong style={{ fontSize: '13px', lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {product.name}
                          </Text>
                        </Tooltip>
                      </div>
                      <div style={{ marginBottom: '4px', overflow: 'hidden' }}>
                        <Tooltip title={product.brand || product.category_name} placement="topLeft" mouseEnterDelay={0.5}>
                          <Text style={{ fontSize: '11px', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: token.colorCardBrandText }}>
                            {product.brand || product.category_name}
                          </Text>
                        </Tooltip>
                        {/* --- NAYA IZAFA: Grid Card par Location --- */}
                        {limits.allow_stock_location && product.rack_location && (
                           <Text style={{ fontSize: '10px', display: 'block', color: token.colorCardLocationTag }}>
                             📍 {product.rack_location}
                           </Text>
                        )}
                      </div>
                      
                      {/* Price & Cart Icon (Bottom Aligned) */}
                      <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text strong style={{ fontSize: '13px', color: token.colorSuccess }}>
                          {formatPriceRange(product.min_sale_price, product.max_sale_price, profile?.currency)}
                        </Text>
                        
                        {/* NAYA IZAFA: Cart Icon Button */}
                        <Tooltip title={product.quantity > 0 ? "Add to Cart" : "Out of Stock"}>
                          <Button 
                            type="text" 
                            icon={<ShoppingCartOutlined style={{ fontSize: '18px', color: product.quantity > 0 ? token.colorPrimary : undefined }} />} 
                            size="small"
                            disabled={product.quantity <= 0} // Agar stock 0 hai to button gray (inactive) ho jayega
                            onClick={(e) => {
                              e.stopPropagation(); // Card ke click ko double fire hone se rokne ke liye
                              handleAddToCart(product);
                            }}
                          />
                        </Tooltip>
                      </div>
                    </Card>
                  ) : (
                    // --- LIST VIEW CARD (Purana Wala) ---
                    <Card
                    hoverable
                    style={{ 
                      borderRadius: 8,
                      border: `1px solid ${token.colorCardBorder}`, 
                      boxShadow: `0 4px 12px ${token.colorCardShadow}`, 
                      transition: 'all 0.3s ease',
                      backgroundColor: token.colorCardBg || token.colorBgContainer,
                      height: '100%'
                    }}
                    styles={{ body: { padding: '12px' } }}
                  >
                    {/* === HEADER: Name, Category, Price (SINGLE ROW) === */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                      
                      {/* Left Side: Name, Category, Brand */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', flex: 1 }}>
                        {product.image_url && (
                          <img src={product.image_url} alt={product.name} style={{ width: '32px', height: '32px', objectFit: 'cover', borderRadius: '4px', border: `1px solid ${token.colorBorder}` }} />
                        )}
                        <Text strong style={{ fontSize: '16px', lineHeight: 1, color: token.colorCardHeadingsText }}>
                          {product.name}
                        </Text>
                        <Tag style={{ margin: 0, fontSize: '13px', padding: '0 6px', backgroundColor: token.colorCardCategoryTag + '15', color: token.colorCardCategoryTag, border: `1px solid ${token.colorCardCategoryTag}33` }}>{product.category_name}</Tag>
                        {product.brand && <Text style={{ fontSize: '15px', color: token.colorCardBrandText }}>{product.brand}</Text>}
                        {/* --- NAYA IZAFA: List Card par Location --- */}
                        {limits.allow_stock_location && product.rack_location && (
                           <Tag style={{ margin: 0, fontSize: '13px', padding: '0 6px', backgroundColor: token.colorCardLocationTag + '15', color: token.colorCardLocationTag, border: `1px solid ${token.colorCardLocationTag}33` }}>
                             📍 {product.rack_location}
                           </Tag>
                        )}
                      </div>
                      
                      {/* Right Side: Price, Total Stock */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <Text strong style={{ fontSize: '15px', color: token.colorAmountPositive }}>
                          {formatPriceRange(product.min_sale_price, product.max_sale_price, profile?.currency)}
                        </Text>
                        <Tag style={{ margin: 0, fontSize: '14px', fontWeight: 'bold', backgroundColor: 'transparent', color: product.quantity > 0 ? token.colorPrimary : token.colorAmountNegative, borderColor: product.quantity > 0 ? token.colorPrimary : token.colorAmountNegative }}>
                           Total: {product.quantity}
                        </Tag>
                      </div>

                    </div>

                    <Divider style={{ margin: '8px 0', borderColor: token.colorBorderSecondary }} />

                    {/* === VARIANTS LIST (Full Height - No Scroll) === */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {product.groupedVariants.map((variant, index) => (
                        <div key={index} 
                          style={{ 
                            padding: '6px',
                            background: token.colorFillQuaternary,
                            borderRadius: '4px', 
                            border: 'none',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                          }}>
                          
                          <div style={{ display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
                            {/* Stock Count */}
                            <div style={{ marginRight: '8px', flexShrink: 0 }}>
                              <Tag 
                                style={{ 
                                  margin: 0, 
                                  fontSize: '15px', 
                                  padding: '1px 8px', 
                                  fontWeight: 'bold', 
                                  backgroundColor: 'transparent',
                                  color: variant.display_quantity > 0 ? token.colorPrimary : token.colorAmountNegative,
                                  borderColor: variant.display_quantity > 0 ? token.colorPrimary : token.colorAmountNegative
                                }}
                              >
                                {variant.display_quantity}
                              </Tag>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', overflow: 'hidden' }}>
                              
                              {/* ROW 1: Price and Item Attributes (Aligned horizontally with Pipe) */}
                              <div style={{ display: 'flex', alignItems: 'center', whiteSpace: 'nowrap', height: '20px' }}>
                                <Text strong style={{ color: token.colorAmountPositive, fontSize: '15px', lineHeight: '1.2', marginRight: '8px' }}>
                                   {formatCurrency(variant.sale_price, profile?.currency)}
                                </Text>
                                {(() => {
                                  const attrValues = [];
                                  if (variant.item_attributes) {
                                    Object.entries(variant.item_attributes).forEach(([key, value]) => {
                                      if (value && !key.toLowerCase().includes('imei') && !key.toLowerCase().includes('serial')) {
                                        attrValues.push(value);
                                      }
                                    });
                                  }
                                  const hasAttributes = attrValues.length > 0;
                                  return (
                                    <Text style={{ fontSize: '14px', lineHeight: '1.2', color: token.colorCardDetailsText }}>
                                      |   {hasAttributes ? attrValues.join('  |  ') : 'Standard'}
                                    </Text>
                                  );
                                })()}
                              </div>
                              
                              {/* ROW 2: Batch, Expiry, Warranty Tags (Scrollable) */}
                              {(variant.batch_number || variant.expiry_date || (profile?.warranty_system_enabled !== false && variant.warranty_days > 0)) && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap', height: '18px' }}>
                                  {variant.batch_number && <Tag color="blue" style={{ margin: 0, fontSize: '11px', padding: '1px 6px', color: token.colorText, border: 'none', background: token.colorFillAlter, lineHeight: '1.2' }}>B.No: {variant.batch_number}</Tag>}
                                  
                                  {variant.expiry_date && (() => {
                                      const expDate = new Date(variant.expiry_date);
                                      const todayZero = new Date(); todayZero.setHours(0,0,0,0);
                                      const alertDays = profile?.expiry_alert_days || 30;
                                      const alertLimitDate = new Date(); alertLimitDate.setDate(alertLimitDate.getDate() + alertDays);
                                      
                                      let iconColor = token.colorTextSecondary; // Normal color
                                      let tooltipText = "Valid Expiry";
                                      let Icon = CalendarOutlined;

                                      if (expDate < todayZero) {
                                          iconColor = token.colorError; // Lal rang
                                          tooltipText = "EXPIRED";
                                          Icon = WarningOutlined;
                                      } else if (expDate <= alertLimitDate) {
                                          iconColor = token.colorWarning; // Peela rang
                                          tooltipText = "Expiring Soon";
                                          Icon = WarningOutlined;
                                      }

                                      return (
                                          <Tooltip title={tooltipText}>
                                              <Tag style={{ margin: 0, fontSize: '11px', padding: '1px 6px', border: 'none', background: token.colorFillAlter, color: iconColor, display: 'flex', alignItems: 'center', gap: '4px', lineHeight: '1.2' }}>
                                                  <Icon style={{ fontSize: '11px' }} /> {expDate.toLocaleDateString()}
                                              </Tag>
                                          </Tooltip>
                                      );
                                  })()}

                                  {profile?.warranty_system_enabled !== false && variant.warranty_days > 0 && (
                                    <Tag color="cyan" style={{ margin: 0, fontSize: '11px', padding: '1px 6px', color: token.colorText, border: 'none', background: token.colorFillAlter, lineHeight: '1.2' }}>
                                      🛡️ {variant.warranty_days}
                                    </Tag>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* ADD TO CART BUTTON (Direct) */}
                          {(() => {
                              const isExpired = variant.expiry_date && new Date(variant.expiry_date) < new Date(new Date().setHours(0,0,0,0));
                              const isBlocked = profile?.block_expired_sales && isExpired;
                              
                              if (isBlocked) {
                                  return (
                                      <Tooltip title="Expired - Sale Blocked">
                                          <Button 
                                              type="primary" 
                                              shape="circle" 
                                              icon={<LockOutlined />} 
                                              size="small" 
                                              danger
                                              onClick={() => message.error("Cannot add to cart. This item is expired!")}
                                          />
                                      </Tooltip>
                                  );
                              }

                              return (
                                  <Button 
                                    type="primary" 
                                    shape="circle" 
                                    icon={<PlusOutlined />} 
                                    size="small" 
                                    disabled={variant.display_quantity <= 0}
                                    onClick={() => handleVariantQuickAdd(variant)}
                                  />
                              );
                          })()}
                        </div>
                      ))}

                      {/* Agar Variants nahi hain (Empty State) */}
                      {product.groupedVariants.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '8px' }}>
                            <Text type="secondary" style={{ fontSize: '12px' }}>Out of Stock</Text>
                        </div>
                      )}
                    </div>
                  </Card>
                  )}
                </List.Item>
              )}
            />
          </Card>
        </Col>
        <Col xs={24} md={11}>
          <Card variant="borderless" style={{ background: 'transparent', boxShadow: 'none' }} styles={{ body: { padding: isMobile ? '16px 0 0 0' : '0 0 0 16px', borderLeft: isMobile ? 'none' : `1px solid ${token.colorBorderSecondary}`, borderTop: isMobile ? `1px solid ${token.colorBorderSecondary}` : 'none', display: 'flex', flexDirection: 'column', height: isMobile ? 'auto' : 'calc(100vh - 110px)' } }}>
            {/* --- TOP ROW: Current Bill, Customer Select & Reset --- */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <Text strong style={{ fontSize: '15px', whiteSpace: 'nowrap' }}>Current Bill</Text>
              
              <Space.Compact style={{ flex: 1 }}>
                <Select 
                  id="pos-customer-select"
                  showSearch 
                  variant="borderless"
                  placeholder="Select customer..." 
                  style={{ width: '100%', background: token.colorFillAlter, borderRadius: '6px 0 0 6px' }} 
                  value={selectedCustomer} 
                  onChange={(value) => setSelectedCustomer(value)} 
                  filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())} 
                  options={customers.map(customer => ({ value: customer.id, label: `${customer.name} - ${customer.phone_number}` }))} 
                  allowClear 
                />
                {(() => {
                  const limits = getPlanLimits(profile?.subscription_tier);
                  const isFeatureLocked = !limits.allow_customer_management;
                  const currentCount = customers.length;
                  const isLimitReached = currentCount >= limits.max_customers;
                  const isLocked = isFeatureLocked || isLimitReached;

                  return (
                    <Tooltip title={isLocked ? (isFeatureLocked ? "Upgrade to add new customers" : "Customer limit reached") : "Add New Customer"}>
                      <Button 
                        id="pos-add-customer-btn"
                        icon={<UserAddOutlined />} 
                        type="text"
                        onClick={() => {
                          if (isLocked) {
                              modal.info({
                                  title: isFeatureLocked ? 'Customer Management Locked' : 'Customer Limit Reached',
                                  content: (
                                      <div>
                                          {isFeatureLocked ? (
                                              <>
                                                  <p>In Free Plan, you can only use the built-in <b>Walk-in Customer</b>.</p>
                                                  <p>To save customer details and maintain ledgers (Khata), please upgrade to Growth Plan.</p>
                                              </>
                                          ) : (
                                              <>
                                                  <p>You have reached your plan's limit of <b>{limits.max_customers} customers</b>.</p>
                                                  <p>Please upgrade your subscription to add more customers.</p>
                                              </>
                                          )}
                                      </div>
                                  ),
                                  okText: 'View Plans',
                                  onOk: () => window.location.href = '/subscription'
                              });
                          } else {
                              setIsAddCustomerModalOpen(true);
                          }
                        }}
                        disabled={isLocked}
                        style={{ opacity: isLocked ? 0.7 : 1, background: token.colorFillAlter, borderRadius: '0 6px 6px 0' }}
                      />
                    </Tooltip>
                  );
                })()}
              </Space.Compact>

              {/* 1. Quick Reprint (Always visible if data exists and enabled) */}
            {profile?.reprint_button_enabled !== false && lastSaleData && (
              <Tooltip title="Reprint Last Receipt">
                <Button type="text" icon={<PrinterOutlined style={{ color: token.colorInfo }} />} onClick={handleReprintLastReceipt} style={{ padding: '0 8px' }} />
              </Tooltip>
            )}

            {/* 2. Hold Bill (Only if cart has items) */}
            {cart.length > 0 && (
              <Tooltip title="Hold Bill / Quotation">
                <Button id="pos-hold-bill-btn" type="text" icon={<PauseCircleOutlined style={{ color: token.colorWarning }} />} onClick={handleHoldBill} style={{ padding: '0 8px' }} />
              </Tooltip>
            )}

            {/* 3. View Drafts (Always visible) */}
            <Tooltip title="View Drafts">
              <Badge count={heldCount} size="small" offset={[-5, 5]}>
                <Button id="pos-view-drafts-btn" type="text" icon={<ClockCircleOutlined />} onClick={() => setIsDraftModalOpen(true)} style={{ padding: '0 8px' }} />
              </Badge>
            </Tooltip>

            {/* 4. Reset Bill (Only if cart has items) */}
            {cart.length > 0 && (
              <Tooltip title="Reset Bill">
                <Button id="pos-reset-bill-btn" danger type="text" icon={<DeleteOutlined />} onClick={handleResetCart} style={{ padding: '0 8px' }} />
              </Tooltip>
            )}
            </div>
            {/* Payment Methods ko video design ke mutabiq neechay Totals ke paas muntaqil kar diya gaya hai */}
            {cart.length === 0 ? <Empty description="Cart is empty" style={{ margin: '40px 0' }} /> : 
              <List 
                dataSource={cart} 
                renderItem={(item, index) => { 
                  const productInStock = allProducts.find(p => p.id === item.product_id); 
                  return (
                    <List.Item style={{ padding: 0, borderBottom: 'none', marginBottom: '6px' }}> 
                      
                      {/* --- COMPACT VIDEO STYLE CARD --- */}
                      <div style={{ 
                        width: '100%', 
                        background: token.colorFillQuaternary, 
                        borderRadius: '8px',                   
                        padding: '8px 10px' /* <-- Yahan padding kam ki gayi hai */
                      }}>
                        
                        {/* --- TOP ROW: Name, Unit Price, x1, Total Price & Delete --- */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                          <div style={{ flex: 1, paddingRight: '8px', display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                            
                            {/* Index Number Circle */}
                            <div style={{ backgroundColor: token.colorTextSecondary, color: token.colorBgLayout, borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 'bold', flexShrink: 0 }}>
                              {index + 1}
                            </div>

                            {/* Item Name */}
                            <Text strong style={{ fontSize: '16px', lineHeight: 1.2 }}>
                              {productInStock ? productInStock.name : (item.product_name || item.name || 'Loading...')}
                            </Text>

                            {/* Unit Price (Moved to 1st Row) */}
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                              {profile?.allow_cart_price_change !== false ? (
                                <InputNumber 
                                  size="small" 
                                  variant="borderless" 
                                  style={{ width: '85px', background: token.colorBgContainer, borderRadius: '4px' }} 
                                  prefix={profile?.currency ? `${profile.currency} ` : ''} 
                                  value={item.sale_price} 
                                  onChange={(value) => handleCartItemUpdate(item, 'sale_price', value || 0)} 
                                  onBlur={() => validatePriceDrop(item)} 
                                  min={0} 
                                />
                              ) : (
                                <Text type="secondary" style={{ fontSize: '13px' }}>{formatCurrency(item.sale_price, profile?.currency)}</Text>
                              )}
                            </div>

                            {/* Quantity Multiplier (x1) */}
                            {!(item.category_is_imei_based || item.imei) && (
                               <span style={{ color: token.colorTextSecondary, fontWeight: 'normal' }}>x{item.quantity}</span>
                            )}
                          </div>
                          
                          {/* Total Price, Profit Tag & Delete Button (Single Row) */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                            {/* NAYA IZAFA: Live Profit Indicator (Item Level - Moved to same row) */}
                            {!activeStaff && profile?.show_live_profit_pos && (
                               (() => {
                                   const cost = (item.purchase_price || 0) * item.quantity;
                                   const revenue = item.sale_price * item.quantity;
                                   const profit = revenue - cost;
                                   const isLoss = profit < 0;
                                   return (
                                       <div style={{ backgroundColor: isLoss ? `${token.colorError}1A` : `${token.colorSuccess}1A`, padding: '2px 6px', borderRadius: '4px', display: 'flex', alignItems: 'center' }}>
                                           <Text style={{ fontSize: '11px', color: isLoss ? token.colorError : token.colorSuccess, fontWeight: 600 }}>
                                               {isLoss ? 'Loss:' : 'Profit:'} {formatCurrency(Math.abs(profit), profile?.currency)}
                                           </Text>
                                       </div>
                                   );
                               })()
                            )}

                            <Text strong style={{ fontSize: '17px' }}>
                              {formatCurrency(item.sale_price * item.quantity, profile?.currency)}
                            </Text>
                            <Button type="text" danger icon={<DeleteOutlined />} size="small" onClick={() => handleFullRemoveFromCart(item)} style={{ height: '26px', width: '26px' }} />
                          </div>
                        </div>
                        
                        {/* --- BOTTOM ROW: Attributes, IMEI, Warranty & Qty Control --- */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          
                          {/* Attributes, IMEI, Warranty */}
                          <div style={{ flex: 1, paddingRight: '8px' }}>
                            <Space wrap size={[0, 4]}>
                              {(() => {
                                const attrValues =[];
                                if (item.item_attributes) {
                                  Object.entries(item.item_attributes).forEach(([key, value]) => {
                                    if (value && !key.toLowerCase().includes('imei') && !key.toLowerCase().includes('serial')) {
                                      attrValues.push(value);
                                    }
                                  });
                                }
                                return attrValues.length > 0 ? (
                                  <Text type="secondary" style={{ fontSize: '14px', marginRight: '4px' }}>{attrValues.join(', ')}</Text>
                                ) : null;
                              })()}
                              {item.imei && <Tag color="default" key="imei" style={{ margin: 0, fontSize: '11px', border: 'none', background: token.colorFillTertiary, padding: '0 4px' }}>{item.imei}</Tag>}
                              {item.batch_number && <Tag color="blue" key="batch" style={{ margin: 0, fontSize: '11px', border: 'none', padding: '0 4px' }}>Batch: {item.batch_number}</Tag>}
                              {item.expiry_date && (() => {
                                  const expDate = new Date(item.expiry_date);
                                  const todayZero = new Date(); todayZero.setHours(0,0,0,0);
                                  const alertDays = profile?.expiry_alert_days || 30;
                                  const alertLimitDate = new Date(); alertLimitDate.setDate(alertLimitDate.getDate() + alertDays);
                                  
                                  let iconColor = token.colorTextSecondary;
                                  let tooltipText = "Valid Expiry";
                                  let Icon = CalendarOutlined;

                                  if (expDate < todayZero) {
                                      iconColor = token.colorError;
                                      tooltipText = "EXPIRED";
                                      Icon = WarningOutlined;
                                  } else if (expDate <= alertLimitDate) {
                                      iconColor = token.colorWarning;
                                      tooltipText = "Expiring Soon";
                                      Icon = WarningOutlined;
                                  }
                                  
                                  return (
                                      <Tooltip title={tooltipText} key="exp">
                                          <Tag style={{ margin: 0, fontSize: '11px', border: 'none', background: 'transparent', color: iconColor, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                              <Icon /> {expDate.toLocaleDateString()}
                                          </Tag>
                                      </Tooltip>
                                  );
                              })()}
                              
                              {profile?.warranty_system_enabled !== false && item.warranty_days > 0 && (
                                (() => {
                                  const expiry = new Date(item.created_at);
                                  expiry.setDate(expiry.getDate() + item.warranty_days);
                                  const isExpired = new Date() > expiry;
                                  return (
                                    <Space size={4} style={{ marginLeft: '4px' }}>
                                      <Tooltip title={`${isExpired ? "Supplier Warranty Expired" : "Supplier Warranty Active"} (Till: ${dayjs(expiry).format('DD-MMM-YYYY')})`}>
                                        <span style={{ cursor: 'pointer', fontSize: '13px', filter: isExpired ? 'grayscale(100%) opacity(0.5)' : 'none' }}>
                                          🛡️
                                        </span>
                                      </Tooltip>
                                      <Tooltip title="No Warranty">
                                        <Checkbox checked={item.no_warranty} onChange={(e) => handleCartItemUpdate(item, 'no_warranty', e.target.checked)} style={{ marginLeft: '4px' }} />
                                      </Tooltip>
                                    </Space>
                                  );
                                })()
                              )}
                            </Space>
                          </div>
                          
                          {/* Qty (+ / - Buttons) (Moved to 2nd Row) */}
                          <div>
                            {!(item.category_is_imei_based || item.imei) && (
                              <div style={{ display: 'flex', alignItems: 'center', background: token.colorBgContainer, borderRadius: '6px', border: `1px solid ${token.colorBorderSecondary}` }}>
                                <div 
                                  onClick={() => handleCartItemUpdate(item, 'quantity', Math.max(1, item.quantity - 1))} 
                                  style={{ width: '26px', height: '26px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '16px', color: item.quantity <= 1 ? token.colorTextDisabled : token.colorText }}
                                >
                                  -
                                </div>
                                <InputNumber
  min={1}
  variant="borderless"
  controls={false} // Default up/down arrows hata diye
  value={item.quantity}
  onChange={(val) => handleCartItemUpdate(item, 'quantity', val || 1)}
  onFocus={(e) => e.target.select()} // Click karte hi text select ho jaye taake foran type ho sakay
  style={{ 
    width: '45px', 
    textAlign: 'center', 
    fontWeight: 'bold', 
    height: '26px', 
    borderLeft: `1px solid ${token.colorBorderSecondary}`, 
    borderRight: `1px solid ${token.colorBorderSecondary}`,
    borderRadius: 0,
    display: 'flex',
    alignItems: 'center'
  }}
/>
                                <div 
                                  onClick={() => {
                                    const maxQty = allProducts.find(p => p.id === item.product_id)?.quantity || item.quantity;
                                    if(item.quantity < maxQty) handleCartItemUpdate(item, 'quantity', item.quantity + 1);
                                  }} 
                                  style={{ width: '26px', height: '26px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '16px', color: item.quantity >= (allProducts.find(p => p.id === item.product_id)?.quantity || item.quantity) ? token.colorTextDisabled : token.colorText }}
                                >
                                  +
                                </div>
                              </div>
                            )}
                          </div>

                        </div>
                      </div>
                    </List.Item>
                  ); 
                }} 
                style={{ flex: 1, overflowY: 'auto', marginBottom: '12px', paddingRight: '4px' }} 
                className="hide-scrollbar"
              />
            }
            {/* --- COMPACT SUBTOTAL & DISCOUNT SECTION --- */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px', marginTop: 'auto' }}>
              
              <Row justify="space-between" align="middle">
                <Text type="secondary" style={{ fontSize: '13px' }}>Subtotal</Text>
                <Text strong style={{ fontSize: '13px' }}>{formatCurrency(subtotal, profile?.currency)}</Text>
              </Row>

              {profile?.pos_discount_enabled !== false && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text type="secondary" style={{ fontSize: '13px' }}>Discount</Text>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <InputNumber 
  id="pos-discount-input"
  variant="borderless" 
  size="small" 
  style={{ width: '80px', background: token.colorFillAlter, borderRadius: '6px', border: `1px solid ${token.colorBorderSecondary}` }} 
  placeholder="0" 
  value={discount} 
  onChange={onDiscountChange} 
  onBlur={validateBillDiscount} // <--- NAYA IZAFA: Bahar click karne par check karega
  min={0} 
/>
                    <Radio.Group 
                      size="small" 
                      value={discountType} 
                      onChange={(e) => { 
                        setDiscountType(e.target.value); 
                        window.isDiscountAuthorized = false; 
                        setTimeout(validateBillDiscount, 100); // Type change hone par bhi check karein
                      }}
                      buttonStyle="solid"
                    >
                      <Radio.Button value="Amount" style={{ padding: '0 10px', borderRadius: '4px 0 0 4px' }}>{profile?.currency || '$'}</Radio.Button>
                      <Radio.Button value="Percentage" style={{ padding: '0 10px', borderRadius: '0 4px 4px 0' }}>%</Radio.Button>
                    </Radio.Group>
                  </div>
                </div>
              )}
              
              {profile?.pos_discount_enabled !== false && discountAmount > 0 && (
                <Row justify="space-between" align="middle">
                  <Text type="secondary" style={{ fontSize: '13px' }}>Discount Amount</Text>
                  <Text style={{ color: token.colorError, fontSize: '13px' }}>- {formatCurrency(discountAmount, profile?.currency)}</Text>
                </Row>
              )}
              
              {profile?.tax_enabled && profile?.tax_rate > 0 && (
                <Row justify="space-between">
                  <Text type="secondary" style={{ fontSize: '13px' }}>{profile.tax_name} ({profile.tax_rate}%)</Text>
                  <Text style={{ color: token.colorWarning, fontSize: '13px' }}>+ {formatCurrency(taxAmount, profile?.currency)}</Text>
                </Row>
              )}
              
              {/* --- NAYA IZAFA: FBR Fee UI --- */}
              {profile?.fbr_integration_enabled && (
                <Row justify="space-between">
                  <Text type="secondary" style={{ fontSize: '13px' }}>POS Service Fee (FBR)</Text>
                  <Text style={{ color: token.colorWarning, fontSize: '13px' }}>+ {formatCurrency(profile?.fbr_fee || 1, profile?.currency)}</Text>
                </Row>
              )}
              {/* ------------------------------ */}
            </div>
            {/* Divider hata diya gaya hai taake look aur clean ho */}
            
            {/* --- NEW VIDEO-STYLE TOTALS --- */}
            <div style={{ marginBottom: '8px' }}>
              <Row justify="space-between" align="middle" style={{ marginBottom: '8px' }}>
                 <Text style={{ fontSize: '18px', fontWeight: 500 }}>Total</Text>
                 <div style={{ textAlign: 'right' }}>
                    <Text style={{ fontSize: '24px', fontWeight: 'bold', display: 'block', lineHeight: '1' }}>{formatCurrency(grandTotal, profile?.currency)}</Text>
                    
                    {/* NAYA IZAFA: Grand Profit Indicator */}
                    {!activeStaff && profile?.show_live_profit_pos && cart.length > 0 && (
                        (() => {
                            const totalCartCost = cart.reduce((sum, item) => sum + ((item.purchase_price || 0) * item.quantity), 0);
                            // Profit is calculated on (Total After Discount) - Total Cost. Tax is excluded from profit.
                            const grandProfit = totalAfterDiscount - totalCartCost;
                            const isLoss = grandProfit < 0;
                            return (
                                <Text style={{ fontSize: '13px', color: isLoss ? token.colorError : token.colorSuccess, fontWeight: 500 }}>
                                    Net {isLoss ? 'Loss:' : 'Profit:'} {formatCurrency(Math.abs(grandProfit), profile?.currency)}
                                </Text>
                            );
                        })()
                    )}
                 </div>
              </Row>
            </div>

            {/* --- NEW VIDEO-STYLE PAYMENT & CHECKOUT ROW --- */}
            <div style={{ marginBottom: '0px' }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                
                {/* 1. Payment Type Toggle (Full vs Credit) */}
                <Radio.Group 
                  value={paymentMethod} 
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  buttonStyle="solid"
                  size="large"
                  style={{ flexShrink: 0, display: 'flex' }}
                  disabled={!selectedCustomer || isWalkIn}
                >
                  <Tooltip title="Pay Full Amount">
                    <Radio.Button value="Paid" style={{ padding: '0 12px', textAlign: 'center' }}>
                      <WalletOutlined /> Full
                    </Radio.Button>
                  </Tooltip>
                  <Tooltip title={(!selectedCustomer || isWalkIn) ? "Select customer for Credit Sale" : "Pay Later / Credit"}>
                    <Radio.Button value="Unpaid" style={{ padding: '0 12px', textAlign: 'center' }}>
                      <UserAddOutlined /> Credit
                    </Radio.Button>
                  </Tooltip>
                </Radio.Group>

                {/* 2. Unified Account Dropdown (Cash + Banks) */}
                <Select
                  id="pos-account-select"
                  size="large"
                  value={selectedAccountId}
                  onChange={(val) => setSelectedAccountId(val)}
                  style={{ flex: 1 }}
                  placeholder="Select Account"
                  options={[
                    {
                      value: 'Cash',
                      label: (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <WalletOutlined style={{ color: token.colorSuccess }} />
                          <span style={{ fontWeight: 500, fontSize: '13px' }}>Cash (Counter)</span>
                        </div>
                      )
                    },
                    ...paymentAccounts.map(acc => ({
                      value: acc.id,
                      label: (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <BankOutlined style={{ color: token.colorInfo }} />
                          <span style={{ fontWeight: 500, fontSize: '13px' }}>{acc.name}</span>
                        </div>
                      )
                    }))
                  ]}
                />

                {/* 3. Complete Sale Button */}
                <Tooltip title={!activeSession ? "Please open a register shift to complete sales." : ""}>
                  <Button 
                    id="pos-complete-sale-btn"
                    type="primary" 
                    disabled={cart.length === 0 || isSubmitting || !activeSession} 
                    loading={isSubmitting} 
                    onClick={handleCompleteSale}
                    style={{ flex: 1.5, height: '38px', fontSize: '15px', fontWeight: 'bold', borderRadius: '8px', padding: '0 4px' }}
                  >
                    Complete Sale
                  </Button>
                </Tooltip>

              </div>

              {/* Amount Paid Input (Sirf Pay Later par nazar aayega) */}
              {paymentMethod === 'Unpaid' && selectedCustomer && (
                <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: token.colorFillAlter, padding: '12px', borderRadius: '8px' }}>
                  <Text strong>Paid Now (Advance):</Text>
                  <InputNumber 
                    size="large"
                    style={{ width: '140px' }} 
                    prefix={profile?.currency ? `${profile.currency} ` : ''} 
                    min={0} 
                    max={grandTotal} 
                    value={amountPaid} 
                    onChange={(value) => setAmountPaid(value || 0)} 
                  />
                </div>
              )}
            </div>
          </Card>
        </Col>
      </Row>
      <Modal 
  title="Add a New Customer" 
  open={isAddCustomerModalOpen} 
  onCancel={() => setIsAddCustomerModalOpen(false)} 
  onOk={() => addForm.submit()} 
  okText="Save Customer"
  width={600}
>
  <Form form={addForm} layout="vertical" onFinish={handleAddCustomer} style={{ marginTop: '20px' }}>
    {/* NAYA IZAFA: Hidden submit button taake Enter dabane se form save ho jaye */}
    <button type="submit" style={{ display: 'none' }} />
    <Row gutter={16}>
      <Col span={12}>
        <Form.Item name="name" label="Full Name" rules={[{ required: true, message: 'Please enter name' }]}>
          <Input ref={customerNameInputRef} placeholder="e.g. John Doe" />
        </Form.Item>
      </Col>
      <Col span={12}>
        <Form.Item name="phone_number" label="Phone / Mobile" rules={[{ required: true, message: 'Please enter phone' }]}>
          <Input placeholder="e.g. +923001234567" />
        </Form.Item>
      </Col>
    </Row>

    <Row gutter={16}>
      <Col span={12}>
        <Form.Item name="email" label="Email Address" rules={[{ type: 'email', message: 'Invalid email format' }]}>
          <Input placeholder="e.g. customer@example.com" />
        </Form.Item>
      </Col>
      <Col span={12}>
        <Form.Item 
          name="tax_id" 
          label={profile?.fbr_integration_enabled ? "NTN / CNIC (FBR)" : "Tax ID / VAT #"} 
          tooltip={profile?.fbr_integration_enabled ? "FBR requires exact 7 digit NTN or 13 digit CNIC without dashes." : "Required for Business (B2B) invoices"}
          rules={profile?.fbr_integration_enabled ?[
            { 
              pattern: /^(\d{7}|\d{13})$/, 
              message: 'Must be exactly 7 (NTN) or 13 (CNIC) digits' 
            }
          ] :[]}
        >
          <Input 
            placeholder={profile?.fbr_integration_enabled ? "e.g. 1234567 or 4220112345671" : "e.g. TRN-123456"} 
            onChange={(e) => {
              if (profile?.fbr_integration_enabled) {
                addForm.setFieldsValue({ tax_id: e.target.value.replace(/[\s-]/g, '') });
              }
            }}
          />
        </Form.Item>
      </Col>
    </Row>

    <Row gutter={16}>
      <Col span={12}>
        <Form.Item name="address" label="Street Address">
          <Input placeholder="Building, Street, Area..." />
        </Form.Item>
      </Col>
      <Col span={12}>
        <Form.Item name="customer_group" label="Customer Group" tooltip="Assign to a specific route or category">
          <Select 
            mode="tags" 
            placeholder="e.g. Wholesale, Route A" 
            options={availableGroups.map(g => ({ label: g, value: g }))}
          />
        </Form.Item>
      </Col>
    </Row>

    <Row gutter={16}>
      <Col span={12}>
        <Form.Item name="city" label="City">
          <Input placeholder="e.g. Karachi / London" />
        </Form.Item>
      </Col>
      <Col span={12}>
        <Form.Item name="country" label="Country">
          <Select 
            showSearch 
            placeholder="Select Country" 
            options={countries}
            filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
          />
        </Form.Item>
      </Col>
    </Row>

    {/* --- NAYA IZAFA: Credit Limit Field --- */}
    {profile?.enable_customer_credit_limits && can('can_set_credit_limit') && (
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item 
            name="credit_limit" 
            label="Credit Limit (Rs)" 
            tooltip="Maximum allowed debt. Leave empty for unlimited, or enter 0 for NO CREDIT."
          >
            <InputNumber style={{ width: '100%' }} min={0} placeholder="e.g. 50000" />
          </Form.Item>
        </Col>
      </Row>
    )}

  </Form>
</Modal>
      {isVariantModalOpen && <SelectVariantModal visible={isVariantModalOpen} onCancel={() => setIsVariantModalOpen(false)} onOk={handleVariantsSelected} product={productForVariantSelection} cart={cart} />}
      
      <DraftBillsModal 
        visible={isDraftModalOpen} 
        onCancel={() => setIsDraftModalOpen(false)} 
        // Yahan 'type' ka izafa kiya taake function ko pata chale Sale hai ya Purchase
        onResume={(bill, type) => { handleResumeFromDraft(bill, type); refreshHeldCount(); }}
        onRefresh={refreshHeldCount} // Yeh naya prop hai
        profile={profile}
        customers={customers}
        allProducts={allProducts}
      />

      {/* NAYA IZAFA: Purchase Form Modal */}
      <AddPurchaseForm 
        visible={isPurchaseModalVisible}
        onCancel={() => setIsPurchaseModalVisible(false)}
        onPurchaseCreated={async () => {
          setIsPurchaseModalVisible(false);
          setDraftPurchaseItems([]);
          
          // NAYA: Agar yeh kisi draft se aaya tha, to ab delete karein
          if (window.currentDraftId) {
            await DataService.deleteHeldBill(window.currentDraftId);
            window.currentDraftId = null;
            refreshHeldCount();
          }
          
          refetchStockCount();
        }}
        editingItems={draftPurchaseItems} // Draft wale items yahan pass ho jayenge
      />

      {/* --- ADMIN PIN MODAL FOR DISCOUNT OVERRIDE --- */}
      <Modal
        title="Admin Approval Required"
        open={isMasterPinModalVisible}
        onOk={handleMasterPinVerify}
        onCancel={() => { 
          if (masterPinAction === 'price_drop' && pendingPriceChange) {
            handleCartItemUpdate(pendingPriceChange.item, 'sale_price', pendingPriceChange.originalPrice);
          } else if (masterPinAction === 'below_cost_bill' || masterPinAction === 'discount') {
            setDiscount(0); // Cancel karne par discount wapis 0 ho jaye
            window.isDiscountAuthorized = false;
          }
          setIsMasterPinModalVisible(false); 
          setMasterPinInput(''); 
          setAuditRemark(''); // <--- NAYA IZAFA
          setMasterPinAction(null); 
          setPendingPriceChange(null);
        }}
        okText="Approve"
        centered
        width={300}
      >
        <div style={{ textAlign: 'center' }}>
          <LockOutlined style={{ fontSize: '32px', color: token.colorWarning, marginBottom: '16px' }} />
          <p>
            {masterPinAction === 'credit_limit' 
              ? "Customer's credit limit exceeded! Please enter Master PIN to override and allow this sale." 
              : masterPinAction === 'customer_create_limit'
              ? `Credit limit exceeds the default allowed (${profile?.default_credit_limit || 0} Rs). Enter Master PIN to authorize.`
              : masterPinAction === 'price_drop'
              ? "Price drop exceeds the allowed limit. Please enter Master PIN to authorize."
              : masterPinAction === 'below_cost_bill'
              ? "WARNING: The total bill amount is below the purchase cost of these items! Enter Master PIN to authorize this loss-making sale."
              : "Discount exceeds staff limit. Please enter Master PIN to authorize."}
          </p>
          
          {/* NAYA IZAFA: Wajah Likhne ka Box */}
          {(masterPinAction === 'price_drop' || masterPinAction === 'below_cost_bill' || masterPinAction === 'discount') && (
            <Input.TextArea 
              placeholder="Reason for discount or price drop (Optional)" 
              value={auditRemark}
              onChange={e => setAuditRemark(e.target.value)}
              style={{ marginBottom: '16px' }}
              rows={2}
            />
          )}

          <Input.Password 
            placeholder="Enter Master PIN" 
            value={masterPinInput}
            onChange={e => setMasterPinInput(e.target.value.replace(/[^0-9]/g, ''))}
            onPressEnter={handleMasterPinVerify}
            autoFocus
          />
        </div>
      </Modal>

    </div>
  );
};

export default POS;