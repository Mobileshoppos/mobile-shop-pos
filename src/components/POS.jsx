import React, { useState, useEffect, useRef } from 'react';
import {
  Typography, Row, Col, Input, List, Card, Button, Statistic, Empty, App, Select, Radio, InputNumber, Form, Modal, Space, Divider, Tooltip, Badge, Tag, Checkbox
} from 'antd';
import { ShoppingCartOutlined, PlusOutlined, UserAddOutlined, DeleteOutlined, StarOutlined, BarcodeOutlined, SearchOutlined, FilterOutlined } from '@ant-design/icons';
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

const { Title, Text } = Typography;
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
  const { isDarkMode } = useTheme();
  const [showFilters, setShowFilters] = useState(false);
  const [priceRange, setPriceRange] = useState([null, null]);
  const [filterAttributes, setFilterAttributes] = useState({});
  const [advancedFilters, setAdvancedFilters] = useState([]);
  const { message, modal } = App.useApp();
  const { user, profile, refetchStockCount } = useAuth();
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
                        sale_price: inventoryItem.sale_price || parentProduct.sale_price
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
              total_amount: grandTotal, 
              payment_method: paymentMethod === 'Paid' ? cashOrBank : 'Cash',
              amount_paid_at_sale: paymentMethod === 'Paid' ? grandTotal : amountPaid, 
              payment_status: (paymentMethod === 'Unpaid' && (grandTotal - amountPaid > 0)) ? 'Unpaid' : 'Paid', 
              user_id: user.id,
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
                    user_id: user.id,
                    warranty_expiry: expiryDate 
                });
                inventoryIdsToUpdate.push({ id: inventoryId, qtySold: 1 });
            } else {
                // Bulk Item: Sirf wo row dhoondein jis mein kafi quantity ho
                const batchItem = await db.inventory
                    .where('product_id').equals(cartItem.product_id)
                    .filter(item => 
                        (item.status || '').toLowerCase() === 'available' && 
                        (item.available_qty || 0) >= cartItem.quantity &&
                        JSON.stringify(item.item_attributes || {}) === JSON.stringify(cartItem.item_attributes || {})
                    )
                    .first();

                if (!batchItem) {
                     throw new Error(`Not enough stock locally for ${cartItem.product_name}.`);
                }

                // Warranty Calculation for Bulk
                const parentProductBulk = allProducts.find(p => p.id === cartItem.product_id);
                const warrantyDaysBulk = parentProductBulk?.default_warranty_days || 0;
                let expiryDateBulk = null;
                
                if (profile?.warranty_system_enabled !== false && !cartItem.no_warranty && warrantyDaysBulk > 0) {
                    const d = new Date();
                    d.setDate(d.getDate() + warrantyDaysBulk);
                    expiryDateBulk = d.toISOString();
                }

                allSaleItemsToInsert.push({
                    id: crypto.randomUUID(),
                    sale_id: saleId,
                    inventory_id: batchItem.id,
                    product_id: cartItem.product_id,
                    product_name_snapshot: cartItem.product_name,
                    quantity: cartItem.quantity,
                    price_at_sale: cartItem.sale_price,
                    user_id: user.id,
                    warranty_expiry: expiryDateBulk // Naya Column
                });
                // Hum ID aur bechi gayi quantity dono save kar rahe hain
                inventoryIdsToUpdate.push({ id: batchItem.id, qtySold: cartItem.quantity });
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
          
          message.success(`Sale #${saleId} completed successfully!`);
          saleDataForReceipt = saleRecord;
          
          processSyncQueue();

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
                 footerMessage: profile?.warranty_policy,
                 showQrCode: profile?.qr_code_enabled ?? true
             };

             if (profile?.receipt_format === 'thermal') {
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
  const grandTotal = Math.max(0, subtotal - discountAmount);

  // NAYA handleAddCustomer (Offline-First)
  const handleAddCustomer = async (values) => {
    try {
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
      processSyncQueue();

    } catch (error) {
      message.error('Error adding customer: ' + error.message);
    }
  };
  
  const handleFullRemoveFromCart = (variantId) => {
    setCart(cart.filter(item => item.variant_id !== variantId));
  };

  const handleResetCart = () => { modal.confirm({ title: 'Reset Bill?', content: 'Are you sure you want to remove all items from the current bill?', okText: 'Yes, Reset', cancelText: 'No', onOk: () => { setCart([]); setDiscount(0); setAmountPaid(0); setSelectedCustomer(null); message.success('Bill has been reset.'); } }); };

  return (
    <div style={{ padding: isMobile ? '12px 4px' : '24px' }}>
    <style>
        {`
          /* Scrollbar ki churai (width) */
          ::-webkit-scrollbar {
            width: 8px;
            height: 8px;
          }
          /* Scrollbar ka peeche ka hissa (Track) */
          ::-webkit-scrollbar-track {
            background: ${isDarkMode ? '#1f1f1f' : '#f0f0f0'}; 
          }
          /* Scrollbar ka pakarne wala hissa (Thumb) */
          ::-webkit-scrollbar-thumb {
            background-color: ${isDarkMode ? '#424242' : '#c1c1c1'};
            border-radius: 4px;
          }
          /* Jab mouse upar layein */
          ::-webkit-scrollbar-thumb:hover {
            background-color: ${isDarkMode ? '#666' : '#a8a8a8'};
          }
        `}
      </style>
      <Title level={2} style={{ marginBottom: '5px', marginLeft: isMobile ? '8px' : '48px', fontSize: '23px' }}>
            <ShoppingCartOutlined /> Point of Sale
          </Title>
      <Row gutter={24}>
        <Col xs={24} md={14}>
          <Card styles={{ body: { padding: '12px' } }}>
            {/* === ROW 1: SEARCH, CATEGORY, BUTTONS === */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
              
              {/* 1. Search & Scan Input */}
              <Input
                placeholder="Scan Barcode or Search..."
                prefix={<BarcodeOutlined style={{ color: '#1890ff', fontSize: '18px' }} />}
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
               <div style={{ 
                  marginBottom: '12px', 
                  padding: '12px', 
                  // Agar Dark Mode hai to halka transparent background, warna light gray
                  background: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : '#f9f9f9', 
                  borderRadius: '6px', 
                  // Border bhi theme ke hisaab se
                  border: isDarkMode ? '1px solid #424242' : '1px solid #f0f0f0' 
               }}>
                  <Row gutter={[8, 8]} align="middle">
                    {/* A. Price Range */}
                    <Col xs={24} md={10}>
                       <Space>
                          <Text type="secondary" style={{fontSize: '12px'}}>Price:</Text>
                          <InputNumber placeholder="Min" value={priceRange[0]} onChange={(v) => setPriceRange([v, priceRange[1]])} style={{ width: '90px' }} />
                          <span>-</span>
                          <InputNumber placeholder="Max" value={priceRange[1]} onChange={(v) => setPriceRange([priceRange[0], v])} style={{ width: '90px' }} />
                       </Space>
                    </Col>

                    {/* B. Dynamic Attributes (RAM, ROM etc) */}
                    {advancedFilters.map((filter) => (
                      <Col xs={12} md={6} key={filter.attribute_name}>
                        <Select
                          allowClear
                          showSearch
                          style={{ width: '100%' }}
                          placeholder={filter.attribute_name}
                          value={filterAttributes[filter.attribute_name]}
                          onChange={(val) => setFilterAttributes(prev => ({ ...prev, [filter.attribute_name]: val }))}
                        >
                          {filter.options.map(opt => <Select.Option key={opt} value={opt}>{opt}</Select.Option>)}
                        </Select>
                      </Col>
                    ))}

                    {/* C. Message agar Category select na ho */}
                    {!activeCategoryId && (
                       <Col xs={24} md={14}>
                         <Text type="secondary" style={{ fontSize: '12px', fontStyle: 'italic' }}>
                           * Select a Category (e.g. Mobile) to see RAM/ROM filters.
                         </Text>
                       </Col>
                    )}
                  </Row>
               </div>
            )}
            
            {/* === NEW PRODUCT LIST (INVENTORY STYLE) === */}
            <style>{`.hide-scrollbar::-webkit-scrollbar { display: none; } .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }`}</style>
            
            <List
              grid={{ gutter: 16, xs: 1, sm: 1, md: 1, lg: 2, xl: 2 }} // 2 Columns on large screens
              dataSource={productsWithVariants}
              loading={loading}
              rowKey="id"
              style={{ height: '60vh', overflowY: 'auto', overflowX: 'hidden', paddingRight: '5px' }}
              renderItem={(product) => (
                <List.Item style={{ marginBottom: '16px' }}>
                  <Card
                    hoverable
                    style={{ 
                      border: isDarkMode ? '1px solid #424242' : '1px solid #d9d9d9', 
                      height: '100%',
                      background: isDarkMode ? '#1f1f1f' : '#fff'
                    }}
                    styles={{ body: { padding: '12px' } }}
                  >
                    {/* === HEADER: Name, Category, Price === */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1, paddingRight: '4px' }}>
                        <Text strong style={{ fontSize: '16px', display: 'block', marginBottom: '4px', lineHeight: 1.2 }}>
                          {product.name}
                        </Text>
                        <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flexWrap: 'wrap' }}>
                           <Tag style={{ margin: 0, fontSize: '10px', padding: '0 4px' }}>{product.category_name}</Tag>
                           {product.brand && <Text type="secondary" style={{ fontSize: '11px' }}>{product.brand}</Text>}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <Text strong style={{ fontSize: '14px', color: '#52c41a', display: 'block' }}>
                          {formatPriceRange(product.min_sale_price, product.max_sale_price, profile?.currency)}
                        </Text>
                        {/* Main Stock Badge */}
                        <Tag color={product.quantity > 0 ? "blue" : "red"} style={{ margin: '4px 0 0 0', fontSize: '10px' }}>
                           Total: {product.quantity}
                        </Tag>
                      </div>
                    </div>

                    <Divider style={{ margin: '8px 0', borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.06)' }} />

                    {/* === VARIANTS LIST (Scrollable) === */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '150px', overflowY: 'auto' }} className="hide-scrollbar">
                      {product.groupedVariants.map((variant, index) => (
                        <div key={index} 
                          style={{ 
                            padding: '6px',
                            background: isDarkMode ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)',
                            borderRadius: '4px', 
                            border: isDarkMode ? 'none' : '1px solid rgba(0,0,0,0.05)',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                          }}>
                          
                          <div style={{ display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
                            {/* Stock Count */}
                            <div style={{ marginRight: '8px', flexShrink: 0 }}>
                              <Space size={4}>
                                <Tag 
                                  style={{ margin: 0, fontSize: '11px', padding: '0 6px' }}
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
                              <Text strong style={{ color: '#52c41a', fontSize: '13px' }}>
                                 {formatCurrency(variant.sale_price, profile?.currency)}
                              </Text>
                              
                              {/* Attributes (RAM/ROM etc) */}
                              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                {variant.item_attributes && Object.entries(variant.item_attributes).map(([key, value]) => {
                                  if (!value || key.toLowerCase().includes('imei') || key.toLowerCase().includes('serial')) return null;
                                  return <Text key={key} type="secondary" style={{ fontSize: '11px' }}>{value}</Text>;
                                })}
                                {(!variant.item_attributes || Object.keys(variant.item_attributes).length === 0) && (
                                  <Text type="secondary" style={{ fontSize: '11px' }}>Standard</Text>
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
          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <Title level={4} style={{ margin: 0 }}>Current Bill</Title>
              {cart.length > 0 && (<Button danger type="text" icon={<DeleteOutlined />} onClick={handleResetCart}>Reset Cart</Button>)}
            </div>
            <Form.Item label="Customer">
              <Space.Compact style={{ width: '100%' }}>
                <Select showSearch placeholder="Select a customer (optional)" style={{ width: '100%' }} value={selectedCustomer} onChange={(value) => setSelectedCustomer(value)} filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())} options={customers.map(customer => ({ value: customer.id, label: `${customer.name} - ${customer.phone_number}` }))} allowClear />
                <Button icon={<UserAddOutlined />} onClick={() => setIsAddCustomerModalOpen(true)} />
              </Space.Compact>
            </Form.Item>
            <Radio.Group onChange={(e) => setPaymentMethod(e.target.value)} value={paymentMethod} style={{ marginBottom: '16px' }}>
              <Radio value={'Paid'}>Paid</Radio>
              <Radio value={'Unpaid'} disabled={!selectedCustomer || isWalkIn}>Pay Later (Credit)</Radio>
            </Radio.Group>
            {paymentMethod === 'Paid' && (
              <div style={{ marginBottom: '16px' }}>
                <Text type="secondary" style={{ display: 'block', marginBottom: '8px' }}>Receive Money In:</Text>
                <Radio.Group onChange={(e) => setCashOrBank(e.target.value)} value={cashOrBank} buttonStyle="solid">
                  <Radio.Button value="Cash">Cash</Radio.Button>
                  <Radio.Button value="Bank">Bank / Online</Radio.Button>
                  </Radio.Group>
              </div>
              )}
            {paymentMethod === 'Unpaid' && selectedCustomer && (<Form.Item label="Amount Paid Now (optional)"><InputNumber style={{ width: '100%' }} prefix={profile?.currency ? `${profile.currency} ` : ''} min={0} max={grandTotal} value={amountPaid} onChange={(value) => setAmountPaid(value || 0)} /></Form.Item>)}
            {cart.length === 0 ? <Empty description="Cart is empty" /> : 
              <List 
                dataSource={cart} 
                renderItem={(item) => { 
                  const productInStock = allProducts.find(p => p.id === item.product_id); 
                  return (
                    <List.Item style={{ paddingInline: 0 }}> 
                      <div style={{ width: '100%' }}>
                        <Row justify="space-between" align="top">
                          <Col flex="auto">
                            {/* === BUG FIX START === */}
                            {/* item.product_name ke bajaye productInStock se naam hasil kiya gaya hai */}
                            <Text strong>{productInStock ? productInStock.name : 'Unknown Product'}</Text>
                            {/* === BUG FIX END === */}
                            
                            <div style={{ marginTop: '4px' }}>
                              <Space wrap size={[0, 4]}>
                                {/* General attributes (sirf value dikhayein) */}
                                {item.item_attributes && Object.entries(item.item_attributes).map(([key, value]) => {
                                  if (!value || key.toLowerCase().includes('imei') || key.toLowerCase().includes('serial')) {
                                    return null;
                                  }
                                  return <Tag key={key}>{value}</Tag>;
                                })}
                                {/* IMEI/Serial ke liye alag se Tag (sirf value dikhayein) */}
                                {item.imei && <Tag color="purple" key="imei">{item.imei}</Tag>}
                                
                                {/* Global Switch Check */}
                            {profile?.warranty_system_enabled !== false && item.warranty_days > 0 && (
                                  (() => {
                                    const expiry = new Date(item.created_at);
                                    expiry.setDate(expiry.getDate() + item.warranty_days);
                                    const isExpired = new Date() > expiry;
                                    return (
                                      <Space size={8} style={{ marginLeft: '8px' }}>
                                        <Tooltip title={`${isExpired ? "Supplier Warranty Expired" : "Supplier Warranty Active"} (Till: ${dayjs(expiry).format('DD-MMM-YYYY')})`}>
                                          <span style={{ cursor: 'pointer' }}>
                                            <Badge status={isExpired ? "error" : "success"} />
                                          </span>
                                        </Tooltip>
                                        
                                        {/* Individual Override Checkbox */}
                                        <Checkbox 
                                          checked={item.no_warranty} 
                                          onChange={(e) => handleCartItemUpdate(item.variant_id, 'no_warranty', e.target.checked)}
                                        >
                                          <Text type="secondary" style={{fontSize: '10px'}}>No Warranty</Text>
                                        </Checkbox>
                                      </Space>
                                    );
                                  })()
                                )}
                              </Space>
                            </div>
                          </Col>
                          <Col><Button type="text" danger icon={<DeleteOutlined />} onClick={() => handleFullRemoveFromCart(item.variant_id)} /></Col>
                        </Row>
                        
                        {(item.category_is_imei_based || item.imei) ? (
  <Row justify="space-between" align="middle" style={{ marginTop: '8px' }}>
    <Col><Text type="secondary">Price:</Text></Col>
    <Col><Text strong>{formatCurrency(item.sale_price, profile?.currency)}</Text></Col>
  </Row>
) : (
  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
    <InputNumber size="small" style={{ flex: 1 }} prefix={profile?.currency ? `${profile.currency} ` : ''} value={item.sale_price} 
      onChange={(value) => handleCartItemUpdate(item.variant_id, 'sale_price', value || 0)} 
      min={0} 
    />
    <InputNumber 
      size="small" 
      style={{ width: '60px' }}
      value={item.quantity} 
      onChange={(value) => handleCartItemUpdate(item.variant_id, 'quantity', value || 1)} 
      min={1} 
      max={allProducts.find(p => p.id === item.product_id)?.quantity || item.quantity} 
    />
    <Text strong style={{ flex: 1, textAlign: 'right', minWidth: '80px' }}>
  {formatCurrency(item.sale_price * item.quantity, profile?.currency)}
</Text>
  </div>
)}
                      </div>
                    </List.Item>
                  ); 
                }} 
                style={{ maxHeight: '30vh', overflowY: 'auto', marginBottom: '16px' }} 
              />
            }
            <Divider />
            <Row gutter={16} style={{ marginBottom: '16px' }}>
              <Col span={14}><InputNumber style={{ width: '100%' }} placeholder="Total Bill Discount" value={discount} onChange={(val) => setDiscount(val || 0)} min={0} /></Col>
              <Col span={10}><Radio.Group value={discountType} onChange={(e) => setDiscountType(e.target.value)}><Radio.Button value="Amount">{profile?.currency || 'Rs.'}</Radio.Button><Radio.Button value="Percentage">%</Radio.Button></Radio.Group></Col>
            </Row>
            <Row justify="space-between"><Text>Subtotal</Text><Text>{formatCurrency(subtotal, profile?.currency)}</Text></Row>
            <Row justify="space-between"><Text>Discount</Text><Text style={{ color: '#ff4d4f' }}>- {formatCurrency(discountAmount, profile?.currency)}</Text></Row>
            <Divider style={{ margin: '8px 0' }}/>
            <Row justify="space-between" align="middle">
              <Col><Statistic title={<Title level={5} style={{ margin: 0 }}>Grand Total</Title>} value={grandTotal} precision={2} prefix={profile?.currency ? `${profile.currency} ` : ''} /></Col>
              <Col><Button type="primary" size="large" disabled={cart.length === 0 || isSubmitting} loading={isSubmitting} onClick={handleCompleteSale}>Complete Sale</Button></Col>
            </Row>
          </Card>
        </Col>
      </Row>
      <Modal title="Add a New Customer" open={isAddCustomerModalOpen} onCancel={() => setIsAddCustomerModalOpen(false)} onOk={() => addForm.submit()} okText="Save Customer"><Form form={addForm} layout="vertical" onFinish={handleAddCustomer}><Form.Item name="name" label="Full Name" rules={[{ required: true }]}><Input /></Form.Item><Form.Item name="phone_number" label="Phone Number" rules={[{ required: true }]}><Input /></Form.Item><Form.Item name="address" label="Address (Optional)"><Input.TextArea rows={3} /></Form.Item></Form></Modal>
      {isVariantModalOpen && <SelectVariantModal visible={isVariantModalOpen} onCancel={() => setIsVariantModalOpen(false)} onOk={handleVariantsSelected} product={productForVariantSelection} cart={cart} />}
    </div>
  );
};

export default POS;