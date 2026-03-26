import React, { useState, useEffect, useRef } from 'react';
import {
  Typography, Row, Col, Input, List, Card, Button, Statistic, Empty, App, Select, Radio, InputNumber, Form, Modal, Space, Divider, Tooltip, Badge, Tag, Checkbox, theme
} from 'antd';
import { ShoppingCartOutlined, PlusOutlined, UserAddOutlined, DeleteOutlined, StarOutlined, BarcodeOutlined, SearchOutlined, FilterOutlined, WalletOutlined, BankOutlined } from '@ant-design/icons';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { generateSaleReceipt } from '../utils/receiptGenerator';
import { printThermalReceipt } from '../utils/thermalPrinter';
import SelectVariantModal from './SelectVariantModal';
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
  const [showFilters, setShowFilters] = useState(false);
  const [priceRange, setPriceRange] = useState([null, null]);
  const [filterAttributes, setFilterAttributes] = useState({});
  const [advancedFilters, setAdvancedFilters] = useState([]);
  const { message, modal } = App.useApp();
  const { user, profile, refetchStockCount } = useAuth();
  const { activeStaff } = useStaff(); // <--- NAYA IZAFA (AUDIT TRAIL)
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
  const [isAddCustomerModalOpen, setIsAddCustomerModalOpen] = useState(false);
  const [addForm] = Form.useForm();
  const [discount, setDiscount] = useState(0);
  const [discountType, setDiscountType] = useState('Amount');
  const searchInputRef = useRef(null);
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [isVariantModalOpen, setIsVariantModalOpen] = useState(false);
  const [productForVariantSelection, setProductForVariantSelection] = useState(null);
  const [allProducts, setAllProducts] = useState([]);
  const [displayedProducts, setDisplayedProducts] = useState([]);
  const [popularCategories, setPopularCategories] = useState([]);
  const [activeCategoryId, setActiveCategoryId] = useState(null);
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
          const key = `${attributesKey}-${variant.sale_price}`; 

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
              variant_id: variant.id 
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
    const isImeiItem = variantItem.category_is_imei_based || (variantItem.imeis && variantItem.imeis.length > 0);

    if (isImeiItem) {
        
        const parentProduct = allProducts.find(p => p.id === variantItem.product_id);
        
        if (parentProduct) {
            setProductForVariantSelection(parentProduct);
            setIsVariantModalOpen(true);
        }
    } else {
        handleVariantsSelected([variantItem]);
    }
  };

  useEffect(() => {
  if (!user) return;

  const initialLoad = async () => {
    setLoading(true);
    try {
      // 1. Customers Local DB se layein
      const customersData = await db.customers.toArray();
      setCustomers(customersData.sort((a, b) => a.name.localeCompare(b.name)));

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

    } catch (error) {
      message.error("Error loading initial data: " + error.message);
    } finally {
      setLoading(false);
      if (searchInputRef.current) {
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

        // 2. Agar wahan nahi mila, to Variants ke Tags (Attributes) check karein
        if (p.variants && p.variants.length > 0) {
            return p.variants.some(v => {
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
    setProductForVariantSelection(product);
    setIsVariantModalOpen(true);
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

      const imeiItemsToAdd = selectedItems.filter(i => i.category_is_imei_based || i.imei);
      const quantityItemsToAdd = selectedItems.filter(i => !i.category_is_imei_based && !i.imei);

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
        if (!groupedQuantityItems[item.variant_id]) {
          groupedQuantityItems[item.variant_id] = { item: item, count: 0 };
        }
        groupedQuantityItems[item.variant_id].count++;
      });

      for (const variantId in groupedQuantityItems) {
        const { item, count } = groupedQuantityItems[variantId];
        
        // --- STOCK CHECK LOGIC (FIXED) ---
        const parentProduct = allProducts.find(p => p.id === item.product_id);
        const realStockCount = parentProduct 
            ? parentProduct.variants
                .filter(v => 
                    JSON.stringify(v.item_attributes || {}) === JSON.stringify(item.item_attributes || {}) &&
                    v.sale_price === item.sale_price &&
                    (v.status || 'available').toLowerCase() === 'available'
                )
                .reduce((sum, v) => sum + (v.available_qty || 0), 0) 
            : 0;

        const existingIndex = updatedCart.findIndex(ci => ci.variant_id === item.variant_id);

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
                        purchase_price: inventoryItem.purchase_price,
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
                     purchase_price: inventoryItem.purchase_price,
                     imei: trimmedValue 
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

  const handleCartItemUpdate = (variantId, field, value) => {
    setCart(cart.map(item => {
      if (item.variant_id === variantId) {
        if (field === 'quantity') {
          const parentProduct = allProducts.find(p => p.id === item.product_id);
          const realStockCount = parentProduct 
              ? parentProduct.variants
                  .filter(v => 
                      JSON.stringify(v.item_attributes || {}) === JSON.stringify(item.item_attributes || {}) &&
                      v.sale_price === item.sale_price &&
                      (v.status || 'available').toLowerCase() === 'available'
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
    
    const udhaarAmount = grandTotal - amountPaid;
    
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
              payment_method: paymentMethod === 'Paid' ? cashOrBank : 'Cash',
              amount_paid_at_sale: paymentMethod === 'Paid' ? grandTotal : amountPaid, 
              payment_status: (paymentMethod === 'Unpaid' && (grandTotal - amountPaid > 0)) ? 'Unpaid' : 'Paid', 
              user_id: user.id,
              staff_id: activeStaff?.id || null, // <--- NAYA IZAFA (AUDIT TRAIL)
              created_at: saleDate
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

                // 1. Saare available batches dhoondein (Purane se naye ki taraf sorted)
                const allBatches = await db.inventory
                    .where('product_id').equals(cartItem.product_id)
                    .filter(item => 
                        (item.status || '').toLowerCase() === 'available' && 
                        (item.available_qty || 0) > 0 &&
                        JSON.stringify(item.item_attributes || {}) === JSON.stringify(cartItem.item_attributes || {})
                    )
                    .sortBy('created_at'); // FIFO: Oldest first

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
        }

        // Reset
        setCart([]);
        setSelectedCustomer(null);
        setPaymentMethod('Paid');
        setAmountPaid(0);
        setDiscount(0);
        setDiscountType('Amount');
        
        const { productsData } = await DataService.getInventoryData();
        setAllProducts(productsData);
        setDisplayedProducts(productsData);

        if (searchInputRef.current) { searchInputRef.current.focus(); }
        setIsSubmitting(false);
  };

  const subtotal = cart.reduce((sum, item) => sum + (item.sale_price * item.quantity), 0);
  const isWalkIn = customers.find(c => c.id === selectedCustomer)?.name === 'Walk-in Customer';
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
  const grandTotal = totalAfterDiscount + taxAmount;
  // -----------------------------------

  // NAYA handleAddCustomer (Offline-First)
  const handleAddCustomer = async (values) => {
    // 1. Phone number ki safai (Normalize)
    if (values.phone_number) {
      values.phone_number = values.phone_number.replace(/[^\d+]/g, '');
    }

    try {
      // 2. SMART DUPLICATE CHECK
      const existingCustomerName = await DataService.checkDuplicateCustomer(values.phone_number);
      if (existingCustomerName) {
        addForm.setFields([
          {
            name: 'phone_number',
            errors: [`Registered to: ${existingCustomerName}`],
          },
        ]);
        return;
      }
      // 1. Naya Customer Object banayein
      const newCustomer = { 
          ...values, 
          id: crypto.randomUUID(), 
          local_id: crypto.randomUUID(),
          user_id: user.id, 
          balance: 0 
      };

      // 2. Local DB mein save karein
      await db.customers.add(newCustomer);
      
      // 3. Sync Queue mein daalein (Taake internet aane par upload ho)
      await db.sync_queue.add({
          table_name: 'customers',
          action: 'create',
          data: newCustomer
      });

      message.success('Customer added successfully!');
      setIsAddCustomerModalOpen(false);
      addForm.resetFields();

      // 4. Dropdown list ko update karein
      setCustomers(currentCustomers => 
        [...currentCustomers, newCustomer].sort((a, b) => a.name.localeCompare(b.name))
      );
      setSelectedCustomer(newCustomer.id);
      
      // 5. Upload Trigger karein (Agar internet hua to foran chala jayega)
      // processSyncQueue(); <--- Hata diya, Auto-Sync zindabad!

    } catch (error) {
      message.error('Error adding customer: ' + error.message);
    }
  };
  
  const handleFullRemoveFromCart = (variantId) => {
    setCart(cart.filter(item => item.variant_id !== variantId));
  };

  const handleResetCart = () => { modal.confirm({ title: 'Reset Bill?', content: 'Are you sure you want to remove all items from the current bill?', okText: 'Yes, Reset', cancelText: 'No', onOk: () => { setCart([]); setDiscount(0); setAmountPaid(0); setSelectedCustomer(null); message.success('Bill has been reset.'); } }); };

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
        <Col xs={24} md={14}>
          <Card variant="borderless" style={{ background: 'transparent', boxShadow: 'none' }} styles={{ body: { padding: isMobile ? '8px 0' : '0 12px 0 0', display: 'flex', flexDirection: 'column', height: isMobile ? 'auto' : 'calc(100vh - 110px)' } }}>
            {/* === ROW 1: SEARCH, CATEGORY, BUTTONS === */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
              
              {/* 1. Search & Scan Input */}
              <Input
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
              <Button 
                icon={<FilterOutlined />} 
                type={showFilters ? 'primary' : 'default'}
                onClick={() => setShowFilters(!showFilters)}
                title="More Filters"
              />

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
                    if (searchInputRef.current) searchInputRef.current.focus();
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
              grid={{ gutter: 16, xs: 1, sm: 1, md: 1, lg: 1, xl: 1 }} // Ab har screen par sirf 1 column dikhega
              dataSource={productsWithVariants}
              loading={loading}
              rowKey="id"
              style={{ 
                flex: 1, 
                overflowY: 'auto', 
                overflowX: 'hidden', 
                paddingLeft: '0px',  // Left side se padding
                paddingRight: '0px'  // Right side se padding
              }}
              renderItem={(product) => (
                <List.Item style={{ marginBottom: '16px' }}>
                  <Card
                    hoverable
                    style={{ 
                      border: `1px solid ${token.colorBorder}`, 
                      height: '100%',
                      background: token.colorBgContainer
                    }}
                    styles={{ body: { padding: '12px' } }}
                  >
                    {/* === HEADER: Name, Category, Price (SINGLE ROW) === */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                      
                      {/* Left Side: Name, Category, Brand */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', flex: 1 }}>
                        <Text strong style={{ fontSize: '16px', lineHeight: 1 }}>
                          {product.name}
                        </Text>
                        <Tag style={{ margin: 0, fontSize: '11px', padding: '0 4px' }}>{product.category_name}</Tag>
                        {product.brand && <Text type="secondary" style={{ fontSize: '12px' }}>{product.brand}</Text>}
                      </div>
                      
                      {/* Right Side: Price, Total Stock */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <Text strong style={{ fontSize: '15px', color: token.colorSuccess }}>
                          {formatPriceRange(product.min_sale_price, product.max_sale_price, profile?.currency)}
                        </Text>
                        <Tag color={product.quantity > 0 ? "processing" : "error"} style={{ margin: 0, fontSize: '14px', fontWeight: 'bold' }}>
                           Total: {product.quantity}
                        </Tag>
                      </div>

                    </div>

                    <Divider style={{ margin: '8px 0', borderColor: token.colorBorderSecondary }} />

                    {/* === VARIANTS LIST (Scrollable) === */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '150px', overflowY: 'auto' }} className="hide-scrollbar">
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
                              <Space size={4}>
                                <Tag 
                                  style={{ margin: 0, fontSize: '17px', padding: '0 6px', fontWeight: 'bold' }}
                                  color={variant.display_quantity > 0 ? "cyan" : "red"}
                                >
                                  {variant.display_quantity}
                                </Tag>
                                
                                {variant.warranty_days > 0 && (
                                  (() => {
                                    const purchaseDate = new Date(variant.created_at);
                                    const expiryDate = new Date(purchaseDate);
                                    expiryDate.setDate(expiryDate.getDate() + variant.warranty_days);
                                    const isExpired = new Date() > expiryDate;
                                    
                                    return (
                                      <Tooltip title={`${isExpired ? "Supplier Warranty Expired" : "Supplier Warranty Active"} (Till: ${dayjs(expiryDate).format('DD-MMM-YYYY')})`}>
                                        <span style={{ marginLeft: '4px', cursor: 'pointer' }}>
                                          <Badge status={isExpired ? "error" : "success"} />
                                        </span>
                                      </Tooltip>
                                    );
                                  })()
                                )}
                              </Space>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                              {/* Price */}
                              <Text strong style={{ color: token.colorSuccess, fontSize: '15px' }}>
                                 {formatCurrency(variant.sale_price, profile?.currency)}
                              </Text>
                              
                              {/* Attributes (RAM/ROM etc) */}
                              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                {variant.item_attributes && Object.entries(variant.item_attributes).map(([key, value]) => {
                                  if (!value || key.toLowerCase().includes('imei') || key.toLowerCase().includes('serial')) return null;
                                  return (
                                    <Text key={key} type="secondary" style={{ fontSize: isMobile ? '13px' : '15px' }}>
                                      {value}
                                    </Text>
                                  );
                                })}
                                {(!variant.item_attributes || Object.keys(variant.item_attributes).length === 0) && (
                                  <Text type="secondary" style={{ fontSize: isMobile ? '13px' : '15px' }}>
                                    Standard
                                  </Text>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* ADD TO CART BUTTON (Direct) */}
                          <Button 
                            type="primary" 
                            shape="circle" 
                            icon={<PlusOutlined />} 
                            size="small" 
                            disabled={variant.display_quantity <= 0}
                            onClick={() => handleVariantQuickAdd(variant)}
                          />
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
                </List.Item>
              )}
            />
          </Card>
        </Col>
        <Col xs={24} md={10}>
          <Card variant="borderless" style={{ background: 'transparent', boxShadow: 'none' }} styles={{ body: { padding: isMobile ? '16px 0 0 0' : '0 0 0 12px', borderLeft: isMobile ? 'none' : `1px solid ${token.colorBorderSecondary}`, borderTop: isMobile ? `1px solid ${token.colorBorderSecondary}` : 'none', display: 'flex', flexDirection: 'column', height: isMobile ? 'auto' : 'calc(100vh - 110px)' } }}>
            {/* --- TOP ROW: Current Bill, Customer Select & Reset --- */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <Text strong style={{ fontSize: '15px', whiteSpace: 'nowrap' }}>Current Bill</Text>
              
              <Space.Compact style={{ flex: 1 }}>
                <Select 
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

              {cart.length > 0 && (
                <Tooltip title="Reset Bill">
                  <Button danger type="text" icon={<DeleteOutlined />} onClick={handleResetCart} style={{ padding: '0 8px' }} />
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
                              {productInStock ? productInStock.name : 'Unknown Product'}
                            </Text>

                            {/* Unit Price (Moved to 1st Row) */}
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                              {profile?.allow_cart_price_change !== false ? (
                                <InputNumber size="small" variant="borderless" style={{ width: '85px', background: token.colorBgContainer, borderRadius: '4px' }} prefix={profile?.currency ? `${profile.currency} ` : ''} value={item.sale_price} onChange={(value) => handleCartItemUpdate(item.variant_id, 'sale_price', value || 0)} min={0} />
                              ) : (
                                <Text type="secondary" style={{ fontSize: '13px' }}>{formatCurrency(item.sale_price, profile?.currency)}</Text>
                              )}
                            </div>

                            {/* Quantity Multiplier (x1) */}
                            {!(item.category_is_imei_based || item.imei) && (
                               <span style={{ color: token.colorTextSecondary, fontWeight: 'normal' }}>x{item.quantity}</span>
                            )}
                          </div>
                          
                          {/* Total Price & Delete Button (Moved to 1st Row) */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
                            <Text strong style={{ fontSize: '17px' }}>
                              {formatCurrency(item.sale_price * item.quantity, profile?.currency)}
                            </Text>
                            <Button type="text" danger icon={<DeleteOutlined />} size="small" onClick={() => handleFullRemoveFromCart(item.variant_id)} style={{ height: '26px', width: '26px' }} />
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
                              
                              {profile?.warranty_system_enabled !== false && item.warranty_days > 0 && (
                                (() => {
                                  const expiry = new Date(item.created_at);
                                  expiry.setDate(expiry.getDate() + item.warranty_days);
                                  const isExpired = new Date() > expiry;
                                  return (
                                    <Space size={4} style={{ marginLeft: '4px' }}>
                                      <Tooltip title={`${isExpired ? "Supplier Warranty Expired" : "Supplier Warranty Active"} (Till: ${dayjs(expiry).format('DD-MMM-YYYY')})`}>
                                        <span style={{ cursor: 'pointer' }}><Badge status={isExpired ? "error" : "success"} /></span>
                                      </Tooltip>
                                      <Tooltip title="No Warranty">
                                        <Checkbox checked={item.no_warranty} onChange={(e) => handleCartItemUpdate(item.variant_id, 'no_warranty', e.target.checked)} style={{ marginLeft: '4px' }} />
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
                                  onClick={() => handleCartItemUpdate(item.variant_id, 'quantity', Math.max(1, item.quantity - 1))} 
                                  style={{ width: '26px', height: '26px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '16px', color: item.quantity <= 1 ? token.colorTextDisabled : token.colorText }}
                                >
                                  -
                                </div>
                                <div style={{ minWidth: '28px', padding: '0 4px', textAlign: 'center', fontSize: '13px', fontWeight: 'bold', borderLeft: `1px solid ${token.colorBorderSecondary}`, borderRight: `1px solid ${token.colorBorderSecondary}`, height: '26px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  {item.quantity}
                                </div>
                                <div 
                                  onClick={() => {
                                    const maxQty = allProducts.find(p => p.id === item.product_id)?.quantity || item.quantity;
                                    if(item.quantity < maxQty) handleCartItemUpdate(item.variant_id, 'quantity', item.quantity + 1);
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
                      variant="borderless" 
                      size="small" 
                      style={{ width: '80px', background: token.colorFillAlter, borderRadius: '6px', border: `1px solid ${token.colorBorderSecondary}` }} 
                      placeholder="0" 
                      value={discount} 
                      onChange={(val) => setDiscount(val || 0)} 
                      min={0} 
                    />
                    <Radio.Group 
                      size="small" 
                      value={discountType} 
                      onChange={(e) => setDiscountType(e.target.value)}
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
            </div>
            {/* Divider hata diya gaya hai taake look aur clean ho */}
            
            {/* --- NEW VIDEO-STYLE TOTALS --- */}
            <div style={{ marginBottom: '8px' }}>
              <Row justify="space-between" align="middle" style={{ marginBottom: '8px' }}>
                 <Text style={{ fontSize: '18px', fontWeight: 500 }}>Total</Text>
                 <Text style={{ fontSize: '24px', fontWeight: 'bold' }}>{formatCurrency(grandTotal, profile?.currency)}</Text>
              </Row>
            </div>

            {/* --- NEW VIDEO-STYLE PAYMENT & CHECKOUT ROW --- */}
            <div style={{ marginBottom: '0px' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                
                {/* 1. Cash Button */}
                <Card 
                  hoverable 
                  onClick={() => { setPaymentMethod('Paid'); setCashOrBank('Cash'); }}
                  style={{ 
                    flex: 1, 
                    height: '38px',
                    borderColor: paymentMethod === 'Paid' && cashOrBank === 'Cash' ? token.colorPrimary : token.colorBorder,
                    background: paymentMethod === 'Paid' && cashOrBank === 'Cash' ? token.controlItemBgActive : 'transparent'
                  }}
                  styles={{ body: { padding: '0', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' } }}
                >
                  <div title="Cash" style={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <WalletOutlined style={{ fontSize: '18px', color: paymentMethod === 'Paid' && cashOrBank === 'Cash' ? token.colorPrimary : token.colorTextSecondary }} />
                  </div>
                </Card>

                {/* 2. Bank/Card Button */}
                <Card 
                  hoverable 
                  onClick={() => { setPaymentMethod('Paid'); setCashOrBank('Bank'); }}
                  style={{ 
                    flex: 1, 
                    height: '38px',
                    borderColor: paymentMethod === 'Paid' && cashOrBank === 'Bank' ? token.colorPrimary : token.colorBorder,
                    background: paymentMethod === 'Paid' && cashOrBank === 'Bank' ? token.controlItemBgActive : 'transparent'
                  }}
                  styles={{ body: { padding: '0', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' } }}
                >
                  <div title="Card / Bank" style={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <BankOutlined style={{ fontSize: '18px', color: paymentMethod === 'Paid' && cashOrBank === 'Bank' ? token.colorPrimary : token.colorTextSecondary }} />
                  </div>
                </Card>

                {/* 3. Pay Later (Credit) Button */}
                <Card 
                  hoverable 
                  onClick={() => { if(selectedCustomer && !isWalkIn) setPaymentMethod('Unpaid'); }}
                  style={{ 
                    flex: 1, 
                    height: '38px',
                    opacity: (!selectedCustomer || isWalkIn) ? 0.5 : 1,
                    cursor: (!selectedCustomer || isWalkIn) ? 'not-allowed' : 'pointer',
                    borderColor: paymentMethod === 'Unpaid' ? token.colorPrimary : token.colorBorder,
                    background: paymentMethod === 'Unpaid' ? token.controlItemBgActive : 'transparent'
                  }}
                  styles={{ body: { padding: '0', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' } }}
                >
                  <div title="Pay Later" style={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <UserAddOutlined style={{ fontSize: '18px', color: paymentMethod === 'Unpaid' ? token.colorPrimary : token.colorTextSecondary }} />
                  </div>
                </Card>

                {/* 4. Complete Sale Button */}
                <Button 
                  type="primary" 
                  disabled={cart.length === 0 || isSubmitting} 
                  loading={isSubmitting} 
                  onClick={handleCompleteSale}
                  style={{ flex: 2.5, height: '38px', fontSize: '16px', fontWeight: 'bold', borderRadius: '8px', padding: '0 4px', whiteSpace: 'normal', lineHeight: 1.2 }}
                >
                  Complete Sale
                </Button>

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
    <Row gutter={16}>
      <Col span={12}>
        <Form.Item name="name" label="Full Name" rules={[{ required: true, message: 'Please enter name' }]}>
          <Input placeholder="e.g. John Doe" />
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
        <Form.Item name="tax_id" label="Tax ID / VAT #" tooltip="Required for Business (B2B) invoices">
          <Input placeholder="e.g. TRN-123456" />
        </Form.Item>
      </Col>
    </Row>

    <Form.Item name="address" label="Street Address">
      <Input placeholder="Building, Street, Area..." />
    </Form.Item>

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
  </Form>
</Modal>
      {isVariantModalOpen && <SelectVariantModal visible={isVariantModalOpen} onCancel={() => setIsVariantModalOpen(false)} onOk={handleVariantsSelected} product={productForVariantSelection} cart={cart} />}
    </div>
  );
};

export default POS;