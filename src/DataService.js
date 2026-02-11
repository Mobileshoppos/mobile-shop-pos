import { supabase } from './supabaseClient';
import { db } from './db';
import { generateInvoiceId } from './utils/idGenerator';

// --- DEFAULT CATEGORIES BLUEPRINT ---
const DEFAULT_CATEGORIES = [
  {
    name: 'Smartphones',
    is_imei_based: true,
    attributes: [
      { attribute_name: 'Condition', attribute_type: 'select', options: 'New,Certified Pre-Owned,Used', is_required: true },
      { attribute_name: 'Network Status', attribute_type: 'select', options: 'Unlocked,Carrier Locked', is_required: true },
      { attribute_name: 'Storage', attribute_type: 'select', options: '64GB,128GB,256GB,512GB,1TB', is_required: true },
      { attribute_name: 'RAM', attribute_type: 'select', options: '4GB,6GB,8GB,12GB,16GB', is_required: true },
      { attribute_name: 'Color', attribute_type: 'text', options: null, is_required: false }
    ]
  },
  {
    name: 'Tablets',
    is_imei_based: true,
    attributes: [
      { attribute_name: 'Connectivity', attribute_type: 'select', options: 'Wi-Fi Only,Wi-Fi + Cellular', is_required: true },
      { attribute_name: 'Storage', attribute_type: 'select', options: '64GB,128GB,256GB,512GB,1TB', is_required: true },
      { attribute_name: 'Condition', attribute_type: 'select', options: 'New,Used', is_required: true }
    ]
  },
  {
    name: 'Wearables',
    is_imei_based: true,
    attributes: [
      { attribute_name: 'Type', attribute_type: 'select', options: 'Smartwatch,Fitness Tracker', is_required: true },
      { attribute_name: 'Case Size', attribute_type: 'text', options: null, is_required: false },
      { attribute_name: 'Connectivity', attribute_type: 'select', options: 'GPS,GPS + Cellular', is_required: false }
    ]
  },
  {
    name: 'Audio',
    is_imei_based: false,
    attributes: [
      { attribute_name: 'Type', attribute_type: 'select', options: 'TWS Earbuds,Headphones,Bluetooth Speakers', is_required: true },
      { attribute_name: 'Warranty', attribute_type: 'text', options: null, is_required: false }
    ]
  },
  {
    name: 'Power & Cables',
    is_imei_based: false,
    attributes: [
      { attribute_name: 'Type', attribute_type: 'select', options: 'Wall Charger,Power Bank,Wireless Charger,Cable', is_required: true },
      { attribute_name: 'Interface', attribute_type: 'select', options: 'USB-C,Lightning,Micro-USB', is_required: false }
    ]
  },
  {
    name: 'Protection & Style',
    is_imei_based: false,
    attributes: [
      { attribute_name: 'Type', attribute_type: 'select', options: 'Protective Case,Screen Protector,Lens Protector', is_required: true }
    ]
  }
];

// --- DEFAULT EXPENSE CATEGORIES BLUEPRINT ---
const DEFAULT_EXPENSE_CATEGORIES = [
  { name: 'Rent or Lease' },
  { name: 'Utilities' },
  { name: 'Salaries & Wages' },
  { name: 'Marketing & Advertising' },
  { name: 'Office Supplies' },
  { name: 'Maintenance & Repairs' },
  { name: 'Software & Subscriptions' },
  { name: 'Miscellaneous' }
];

// Hisaab kitaab ko durust rakhne ke liye helper function
const precise = (num) => Math.round((num + Number.EPSILON) * 100) / 100;

// --- SUBSCRIPTION HELPER (Limit Checker) ---
const checkSubscriptionLimit = async (newItemsCount = 0) => {
  // --- OFFLINE-FIRST FIX ---
  // Supabase ke bajaye seedha local settings se profile uthayein
  const profile = await db.user_settings.toCollection().first();
  
  // Agar profile nahi mila (maslan pehli baar login), to check skip karein
  if (!profile) return;

  // 1. Agar Pro hai to koi pabandi nahi
  if (profile.subscription_tier === 'pro') return;

  // 2. Mojooda stock ginein (Available items)
  const allInventory = await db.inventory.where('status').anyOf('Available', 'available').toArray();
  const currentStock = allInventory.reduce((sum, item) => sum + (Number(item.available_qty) || 0), 0);

  // 3. Agar limit (50) cross ho rahi ho to Error throw karein
  if (currentStock + newItemsCount > 50) {
    const errorMsg = `Subscription Limit: You currently have ${currentStock} items in stock. Adding ${newItemsCount} more would exceed the 50-item limit of the Free Plan. Please upgrade to Pro to add more stock.`;
    
    // Yeh error message user ko screen par nazar aayega
    throw new Error(errorMsg);
  }
};

const DataService = {
  isInitializing: false,
  async initializeUserCategories(userId) {
    if (!userId || this.isInitializing) return;
    this.isInitializing = true;

    try {
      // 1. SAB SE PEHLE SERVER SE POOCHEIN: Kya initialization ho chuki hai?
      const { data: profile, error: profError } = await supabase
        .from('profiles')
        .select('categories_initialized')
        .eq('user_id', userId)
        .single();

      // Agar server keh raha hai ke pehle hi ho chuka hai, to yahin ruk jao
      if (profError || profile?.categories_initialized) {
        return;
      }

      console.log("Checking for missing standard categories...");

      // 2. Local Database se check karein (Duplicate protection)
      const existingCats = await db.categories.where('user_id').equals(userId).toArray();
      const existingExpCats = await db.expense_categories.where('user_id').equals(userId).toArray();

      const existingCatNames = existingCats.map(c => c.name.toLowerCase().trim());
      const existingExpCatNames = existingExpCats.map(c => c.name.toLowerCase().trim());

      // 3. PRODUCT CATEGORIES LOOP
      for (const catTemplate of DEFAULT_CATEGORIES) {
        if (existingCatNames.includes(catTemplate.name.toLowerCase().trim())) continue;

        const categoryId = crypto.randomUUID();
        const categoryData = {
          id: categoryId, // Asli UUID ID
          name: catTemplate.name,
          is_imei_based: catTemplate.is_imei_based,
          user_id: userId,
          updated_at: new Date().toISOString()
        };

        await db.categories.add(categoryData);
        await db.sync_queue.add({ table_name: 'categories', action: 'create', data: categoryData });

        for (const attrTemplate of catTemplate.attributes) {
          const attributeData = {
            id: crypto.randomUUID(),
            category_id: categoryId,
            attribute_name: attrTemplate.attribute_name,
            attribute_type: attrTemplate.attribute_type,
            options: attrTemplate.options ? attrTemplate.options.split(',') : null,
            is_required: attrTemplate.is_required,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          await db.category_attributes.add(attributeData);
          await db.sync_queue.add({ table_name: 'category_attributes', action: 'create', data: attributeData });
        }
      }

      // 4. EXPENSE CATEGORIES LOOP
      for (const expCat of DEFAULT_EXPENSE_CATEGORIES) {
        if (existingExpCatNames.includes(expCat.name.toLowerCase().trim())) continue;

        const expCatId = crypto.randomUUID();
        const expCatData = {
          id: expCatId,
          name: expCat.name,
          user_id: userId,
          updated_at: new Date().toISOString()
        };
        await db.expense_categories.add(expCatData);
        await db.sync_queue.add({ table_name: 'expense_categories', action: 'create', data: expCatData });
      }

      // 5. Server par flag update kar dein (Islaah ke saath)
      await supabase.from('profiles').update({ categories_initialized: true }).eq('user_id', userId).select();
      
      console.log("Smart Initialization complete.");
    } catch (error) {
      console.error("Initialization failed:", error);
    } finally {
      this.isInitializing = false;
    }
  },

  // Hum ne parameter 'showArchivedOnly' add kiya hai
  async getInventoryData(showArchivedOnly = false) { 
    const allProducts = await db.products.toArray();
    const categories = await db.categories.toArray();
    
    // Agar showArchivedOnly true hai, to sirf 'false' wale dikhao. Warna 'true' wale.
    const products = allProducts.filter(p => showArchivedOnly ? p.is_active === false : p.is_active !== false);
    
        const availableItems = await db.inventory
        .where('status').anyOf('Available', 'available')
        .filter(item => item.available_qty > 0)
        .toArray();

    // 2. Categories Map
    const categoryMap = {};
    categories.forEach(cat => { categoryMap[cat.id] = cat.name; });

    // 3. Inventory Items ko Product ID ke hisaab se group karein
    const variantsMap = {};
    const stockCountMap = {}; 

    availableItems.forEach(item => {
        // Variants group karna
        if (!variantsMap[item.product_id]) {
            variantsMap[item.product_id] = [];
        }
        variantsMap[item.product_id].push(item);

        // Stock ginnana (Bulk system ke mutabiq available_qty ko jama karein)
        if (!stockCountMap[item.product_id]) {
            stockCountMap[item.product_id] = 0;
        }
        stockCountMap[item.product_id] += (item.available_qty || 0);
    });

    // 4. Products ko format karein
    const formattedProducts = products.map(product => {
      const catName = categoryMap[product.category_id] || 'Uncategorized';
      const productVariants = variantsMap[product.id] || [];

      // Hum dekhenge ke stock mein jo items pare hain, unki khareed qeemat kya thi
      let totalPurchaseVal = 0;
      let count = 0;
      productVariants.forEach(v => {
          if (v.purchase_price) {
              totalPurchaseVal += Number(v.purchase_price);
              count++;
          }
      });
      // Agar stock hai to average nikaalo, warna 0
      const avgPurchasePrice = count > 0 ? (totalPurchaseVal / count) : 0;

      // Sale Price Calculation
      let minPrice = product.min_sale_price;
      let maxPrice = product.max_sale_price;

      if (productVariants.length > 0) {
          const prices = productVariants.map(v => v.sale_price).filter(p => p > 0);
          if (prices.length > 0) {
              minPrice = Math.min(...prices);
              maxPrice = Math.max(...prices);
          }
      }

      const finalMinPrice = minPrice ?? product.sale_price ?? 0;
      const finalMaxPrice = maxPrice ?? product.sale_price ?? 0;

      // Stock Count
      const realTimeStock = stockCountMap[product.id] || 0;

      return {
        ...product,
        category_name: catName,
        categories: { name: catName },
        min_sale_price: finalMinPrice,
        max_sale_price: finalMaxPrice,
        
        // Yeh wo field hai jo Reports dhoond raha tha
        avg_purchase_price: avgPurchasePrice, 
        
        quantity: realTimeStock, 
        variants: productVariants 
      };
    });

    return { productsData: formattedProducts, categoriesData: categories };
  },

  async checkDuplicateProduct(name, brand, categoryId, excludeId = null) {
    const allProducts = await db.products.toArray();
    
    // Duplicate dhoondein
    const duplicate = allProducts.find(p => 
      p.name?.toLowerCase().trim() === name?.toLowerCase().trim() &&
      p.brand?.toLowerCase().trim() === brand?.toLowerCase().trim() &&
      p.category_id === categoryId &&
      p.id !== excludeId
    );
    
    if (!duplicate) return null;
    
    // Batayein ke status kya hai
    return {
      exists: true,
      isActive: duplicate.is_active !== false
    };
  },

  async checkDuplicateCategory(name, excludeId = null) {
    const allCategories = await db.categories.toArray();
    const duplicate = allCategories.find(c => 
      c.name?.toLowerCase().trim() === name?.toLowerCase().trim() &&
      c.id !== excludeId
    );
    return duplicate ? true : false;
  },

  async checkDuplicateCustomer(phone, excludeId = null) {
    if (!phone) return null;
    
    // 1. Sirf numbers nikalein (e.g. +92 300-1234567 -> 923001234567)
    const cleanNewPhone = phone.replace(/\D/g, '');
    // 2. Aakhri 10 digits lein (e.g. 3001234567)
    const suffixNew = cleanNewPhone.slice(-10);

    const allCustomers = await db.customers.toArray();
    
    const duplicate = allCustomers.find(c => {
      if (!c.phone_number) return false;
      const cleanExistingPhone = c.phone_number.replace(/\D/g, '');
      const suffixExisting = cleanExistingPhone.slice(-10);
      
      // Agar aakhri 10 digits match kar jayen aur ID mukhtalif ho to duplicate hai
      return suffixNew === suffixExisting && c.id !== excludeId;
    });

    return duplicate ? duplicate.name : null;
  },

  async checkDuplicateSupplier(phone, name, excludeId = null) {
    const allSuppliers = await db.suppliers.toArray();
    
    // 1. Phone Check (Smart Suffix - Aakhri 10 digits)
    let phoneDuplicate = null;
    if (phone) {
      const suffixNew = phone.replace(/\D/g, '').slice(-10);
      phoneDuplicate = allSuppliers.find(s => {
        if (!s.phone) return false;
        return s.phone.replace(/\D/g, '').slice(-10) === suffixNew && s.id !== excludeId;
      });
    }

    // 2. Name Check (Case-insensitive)
    const nameDuplicate = allSuppliers.find(s => 
      s.name?.toLowerCase().trim() === name?.toLowerCase().trim() && 
      s.id !== excludeId
    );

    if (phoneDuplicate) return { type: 'phone', name: phoneDuplicate.name };
    if (nameDuplicate) return { type: 'name', name: nameDuplicate.name };
    return null;
  },

  async addProduct(productData) {
    if (!productData.id) productData.id = crypto.randomUUID();

    // Local DB mein save karein
    await db.products.put(productData);
    
    // Sync Queue mein daalein
    await db.sync_queue.add({
      table_name: 'products',
      action: 'create',
      data: productData
    });

    return true;
  },

 // Product Model Update
  async updateProduct(id, updates) {
    await db.products.update(id, updates);
    await db.sync_queue.add({ table_name: 'products', action: 'update', data: { id, ...updates } });
    return true;
  },

  // Inventory Item Update (Supplier Ledger Safe)
  async updateInventoryItem(id, updates) {
    await db.inventory.update(id, updates);
    await db.sync_queue.add({ table_name: 'inventory', action: 'update', data: { id, ...updates } });
    return true;
  },

  // Quick Edit: Barcode aur Sale Price ko aik saath offline-first update karne ke liye
  async updateQuickEdit(variantId, inventoryIds, updates) {
    // A. Master Variant update karein (Dexie + Queue)
    await db.product_variants.update(variantId, { 
      barcode: updates.barcode, 
      sale_price: updates.sale_price 
    });
    await db.sync_queue.add({ 
      table_name: 'product_variants', 
      action: 'update', 
      data: { id: variantId, barcode: updates.barcode, sale_price: updates.sale_price } 
    });

    // B. Mojooda Stock (Inventory) ki Sale Price update karein (Dexie + Queue)
    for (const invId of inventoryIds) {
      await db.inventory.update(invId, { sale_price: updates.sale_price });
      await db.sync_queue.add({ 
        table_name: 'inventory', 
        action: 'update', 
        data: { id: invId, sale_price: updates.sale_price } 
      });
    }
    return true;
  },

  // --- INVENTORY ADJUSTMENT (DAMAGED STOCK) - SMART VERSION ---
  async markItemAsDamaged(inventoryIds, totalQtyToMark, notes = "") {
    let remainingToMark = totalQtyToMark;

    // Hum un tamam IDs par loop chalayenge jo is product ki hain
    for (const invId of inventoryIds) {
      if (remainingToMark <= 0) break;

      const item = await db.inventory.get(invId);
      if (!item || item.available_qty <= 0) continue;

      // Is line mein se kitna stock nikaal sakte hain?
      const takeFromThisRow = Math.min(remainingToMark, item.available_qty);
      
      const newAvailable = item.available_qty - takeFromThisRow;
      const newDamaged = (item.damaged_qty || 0) + takeFromThisRow;
      
      let newStatus = item.status;
      if (newAvailable === 0 && (item.sold_qty || 0) === 0 && (item.returned_qty || 0) === 0) {
        newStatus = 'Damaged';
      }

      const updates = {
        available_qty: newAvailable,
        damaged_qty: newDamaged,
        adjustment_notes: notes,
        status: newStatus,
        updated_at: new Date().toISOString()
      };

      // Local Update
      await db.inventory.update(invId, updates);

      // Sync Queue
      await db.sync_queue.add({
        table_name: 'inventory',
        action: 'update',
        data: { id: invId, ...updates }
      });

      remainingToMark -= takeFromThisRow;
    }

    return true;
  },

// --- NAYA DELETE FUNCTION ---
  async deleteProduct(id) {
    // 1. Check: Kya Stock (Inventory) mein yeh product majood hai?
    const hasInventory = await db.inventory.where('product_id').equals(id).count();
    if (hasInventory > 0) {
      throw new Error("Cannot delete: This product has stock items (Active or Sold).");
    }

    // 2. Check: Kya yeh kabhi Sale hua hai?
    if (db.sale_items) {
        const hasSales = await db.sale_items.where('product_id').equals(id).count();
        if (hasSales > 0) {
             throw new Error("Cannot delete: This product has sales history.");
        }
    }

    // 3. Check: Kya yeh kabhi Khareeda gaya tha?
    if (db.purchase_items) {
        const hasPurchases = await db.purchase_items.where('product_id').equals(id).count();
        if (hasPurchases > 0) {
            throw new Error("Cannot delete: This product is part of a purchase history.");
        }
    }

    // 4. Check: Kya yeh kabhi Supplier ko Wapis (Return) kiya gaya?
    if (db.purchase_return_items) {
        const hasReturns = await db.purchase_return_items.where('product_id').equals(id).count();
        if (hasReturns > 0) {
             throw new Error("Cannot delete: This product has been returned to a supplier (Purchase Return History).");
        }
    }

    // 5. Agar charon (4) checks pass ho gaye, tab hi delete karein.
    await db.products.delete(id);

    // 6. Sync Queue mein 'delete' action daalein
    await db.sync_queue.add({
      table_name: 'products',
      action: 'delete',
      data: { id }
    });

    return true;
  },

  // --- NAYA FUNCTION: Archive / Unarchive ---
  async toggleArchiveProduct(id, shouldArchive) {
    // Local DB Update
    // Agar shouldArchive true hai, to is_active false hoga (yani chupana hai)
    const newStatus = !shouldArchive; 
    
    await db.products.update(id, { is_active: newStatus });

    // Sync Queue (Server Update)
    await db.sync_queue.add({
      table_name: 'products',
      action: 'update',
      data: { id, is_active: newStatus }
    });

    return true;
  },
  
  async getSuppliers(showArchivedOnly = false) {
    const allSuppliers = await db.suppliers.toArray();
    // Filter: Agar showArchivedOnly true hai to is_active === false wale dikhao
    const suppliers = allSuppliers.filter(s => {
      if (showArchivedOnly) {
        // Sirf wo dikhao jin ka is_active saaf tor par 'false' ho
        return s.is_active === false;
      } else {
        // Wo dikhao jo 'false' nahi hain (yani true hain ya jin ka abhi set nahi hua)
        return s.is_active !== false;
      }
    });
    return suppliers.sort((a, b) => a.name.localeCompare(b.name));
  },

  async addSupplier(supplierData) {
    const newSupplier = { ...supplierData, id: crypto.randomUUID(), balance_due: 0, credit_balance: 0 };
    
    await db.suppliers.put(newSupplier);
    
    await db.sync_queue.add({
        table_name: 'suppliers',
        action: 'create',
        data: newSupplier
    });
    
    return newSupplier;
  },

  async updateSupplier(id, updatedData) {
    await db.suppliers.update(id, updatedData);
    
    await db.sync_queue.add({
        table_name: 'suppliers',
        action: 'update',
        data: { id, ...updatedData }
    });
    
    return { id, ...updatedData };
  },

  async toggleArchiveSupplier(id, shouldArchive) {
    const newStatus = !shouldArchive; 
    await db.suppliers.update(id, { is_active: newStatus });

    await db.sync_queue.add({
      table_name: 'suppliers',
      action: 'update',
      data: { id, is_active: newStatus }
    });
    return true;
  },

  async deleteSupplier(id) {
    // 1. Check: Kya is supplier ki koi Purchase History hai?
    const hasPurchases = await db.purchases.where('supplier_id').equals(id).count();
    if (hasPurchases > 0) {
      throw new Error("Cannot delete: This supplier has purchase records. Please Archive them instead.");
    }

    // 2. Check: Kya is ki koi Payment History hai?
    const hasPayments = await db.supplier_payments.where('supplier_id').equals(id).count();
    if (hasPayments > 0) {
      throw new Error("Cannot delete: This supplier has payment records in the ledger. Use Archive.");
    }

    // 3. Check: Kya is ka koi Refund record hai?
    const hasRefunds = await db.supplier_refunds.where('supplier_id').equals(id).count();
    if (hasRefunds > 0) {
      throw new Error("Cannot delete: This supplier has refund records. Use Archive.");
    }

    // Agar saare checks pass ho jayein, tab hi delete karein
    await db.suppliers.delete(id);
    
    await db.sync_queue.add({
        table_name: 'suppliers',
        action: 'delete',
        data: { id }
    });
    
    return true;
  },

  async getSupplierLedgerDetails(supplierId) {
    // Ab IDs hamesha String/UUID hain, is liye parseInt ki zaroorat nahi
    const supplier = await db.suppliers.get(supplierId);

    // Data layein
    const purchases = await db.purchases.where('supplier_id').equals(supplierId).toArray();
    
    let payments = [];
    if (db.supplier_payments) {
        payments = await db.supplier_payments.where('supplier_id').equals(supplierId).toArray();
    }

    let refunds = [];
    if (db.supplier_refunds) {
        refunds = await db.supplier_refunds.where('supplier_id').equals(supplierId).toArray();
    }
    
    // 1. Total Business: Saari kharidari (Purchases) ko jama karein
    const calculatedTotalBusiness = purchases.reduce((sum, p) => sum + (p.total_amount || 0), 0);

    // 2. Total Paid: Ledger mein jitni payments hain, un sab ko jama karein
    const calculatedTotalPaid = payments.reduce((sum, p) => sum + (p.amount || 0), 0);

    // 3. NAYA HISSA: Smart Calculation (Offline consistency ke liye)
    const totalRefundsAmount = (refunds || []).reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
    const netPaid = calculatedTotalPaid - totalRefundsAmount;
    const diff = netPaid - calculatedTotalBusiness;

    const supplierWithStats = {
        ...supplier,
        total_purchases: calculatedTotalBusiness,
        total_payments: calculatedTotalPaid,
        total_refunds: totalRefundsAmount,
        // Agar payment zyada hai to Credit, agar business zyada hai to Balance Due
        credit_balance: diff > 0 ? diff : 0,
        balance_due: diff < 0 ? Math.abs(diff) : 0
    };

    return { supplier: supplierWithStats, purchases, payments, refunds };
  },

  async getAccountsPayable() {
    const { data, error } = await supabase
      .from('suppliers_with_balance')
      .select('name, contact_person, phone, balance_due')
      .gt('balance_due', 0)
      .order('balance_due', { ascending: false });

    if (error) {
      console.error('DataService Error:', error);
      throw error;
    }
    return data;
  },

  async getSupplierPurchaseReport(startDate, endDate) {
    const { data, error } = await supabase.rpc('get_supplier_purchase_report', {
      start_date: startDate,
      end_date: endDate,
    });
    if (error) {
      console.error('DataService Error:', error);
      throw error;
    }
    return data;
  },
  
  async getPurchaseDetails(purchaseId) {
    // 1. Purchase dhoondein (Seedha ID se)
    const purchase = await db.purchases.get(purchaseId);
    if (!purchase) throw new Error("Purchase not found locally");

    // 2. Supplier dhoondein
    const supplier = await db.suppliers.get(purchase.supplier_id);
    
    // 3. Items dhoondein
    const itemsData = await db.inventory.where('purchase_id').equals(purchase.id).toArray();

    // 4. Product Names jorein
    const formattedItems = await Promise.all(itemsData.map(async (item) => {
        const product = await db.products.get(item.product_id);
        return {
            ...item,
            product_name: product ? product.name : 'Unknown Product',
            product_brand: product ? product.brand : '',
            purchase_price: item.purchase_price,
            sale_price: item.sale_price,
            imei: item.imei,
            item_attributes: item.item_attributes
        };
    }));

    return { 
        purchase: { ...purchase, suppliers: supplier || { name: 'Unknown Supplier' } }, 
        items: formattedItems 
    };
  },

  async getPurchases() {
    // 1. Purchases aur Suppliers Local DB se layein
    const purchases = await db.purchases.toArray();
    const suppliers = await db.suppliers.toArray();
    
    // Supplier Map banayein
    const supplierMap = {};
    suppliers.forEach(s => { supplierMap[s.id] = s.name; });

    // Data jorein
    return purchases.map(p => ({
      ...p,
      supplier_name: supplierMap[p.supplier_id] || 'Unknown Supplier'
    })).sort((a, b) => new Date(b.purchase_date) - new Date(a.purchase_date));
  },

async createNewPurchase(purchasePayload) {
    // Subscription Limit Check
    const incomingQty = purchasePayload.p_inventory_items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
    await checkSubscriptionLimit(incomingQty);

    const purchaseId = purchasePayload.p_local_id || crypto.randomUUID();
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id;

    // Agar user ne Invoice ID diya hai to wo, warna Auto Generate (PUR-A1234)
    let finalInvoiceId = purchasePayload.p_invoice_id;
    if (!finalInvoiceId) {
        const autoId = await generateInvoiceId();
        finalInvoiceId = `PUR-${autoId}`;
    }

    const totalAmount = purchasePayload.p_inventory_items.reduce((sum, item) => 
        sum + (Number(item.quantity) * Number(item.purchase_price)), 0);

    const purchaseData = {
        id: purchaseId,
        local_id: purchaseId,
        invoice_id: finalInvoiceId, // <--- SAVE HERE
        user_id: userId,
        supplier_id: purchasePayload.p_supplier_id,
        purchase_date: new Date().toISOString(),
        total_amount: totalAmount,
        amount_paid: 0,
        balance_due: totalAmount,
        status: 'unpaid',
        notes: purchasePayload.p_notes,
        updated_at: new Date().toISOString()
    };

    const itemsData = purchasePayload.p_inventory_items.map(item => {
        const itemId = item.id || crypto.randomUUID();
        return {
            ...item,
            id: itemId,
            local_id: item.local_id || itemId, 
            purchase_id: purchaseId,
            user_id: userId,
            status: 'Available',
            available_qty: item.quantity,
            sold_qty: 0,
            returned_qty: 0,
            damaged_qty: 0,
            updated_at: new Date().toISOString()
        };
    });

    // Local DB mein save karein
    await db.purchases.put(purchaseData);
    await db.inventory.bulkPut(itemsData);
    // Signal bhejein taake Header update ho jaye
    window.dispatchEvent(new CustomEvent('local-db-updated'));

    // Supplier ka balance local update karein
    const supplier = await db.suppliers.get(purchasePayload.p_supplier_id);
    if (supplier) {
        await db.suppliers.update(purchasePayload.p_supplier_id, {
            balance_due: (supplier.balance_due || 0) + totalAmount
        });
    }

    // Sync Queue mein dalein taake internet aane par server update ho
    await db.sync_queue.add({
        table_name: 'purchases',
        action: 'create_full_purchase',
        data: { purchase: purchaseData, items: itemsData }
    });

    return purchaseId;
},

async addCustomer(customerData) {
    if (!customerData.id) customerData.id = crypto.randomUUID();
    
    // Local Save
    await db.customers.put(customerData);
    
    // Queue
    await db.sync_queue.add({
      table_name: 'customers',
      action: 'create',
      data: customerData
    });
    
    return customerData;
  },

  async updateCustomer(id, updates) {
    // 1. Local database update karein
    await db.customers.update(id, updates);
    
    // 2. Sync queue mein 'update' ka action daalein
    await db.sync_queue.add({
      table_name: 'customers',
      action: 'update',
      data: { id, ...updates }
    });
    return true;
  },

  // --- NAYA FUNCTION: Customer Archive / Unarchive ---
  async toggleArchiveCustomer(id, shouldArchive) {
    const newStatus = !shouldArchive; 
    await db.customers.update(id, { is_active: newStatus });

    await db.sync_queue.add({
      table_name: 'customers',
      action: 'update',
      data: { id, is_active: newStatus }
    });
    return true;
  },

  // --- BULLETPROOF CUSTOMER DELETE (With Full History Checks) ---
  async deleteCustomer(id) {
    // 1. Check: Kya customer ka balance bilkul 0 hai?
    const customer = await db.customers.get(id);
    if (customer && Math.abs(customer.balance || 0) > 0.01) {
      throw new Error("Cannot delete: This customer has a pending balance (Udhaar).");
    }

    // 2. Check: Kya iski koi Sales History hai?
    const hasSales = await db.sales.where('customer_id').equals(id).count();
    if (hasSales > 0) {
      throw new Error("Cannot delete: This customer has sales records. Please Archive them instead.");
    }

    // 3. Check: Kya iski koi Payment History hai?
    const hasPayments = await db.customer_payments.where('customer_id').equals(id).count();
    if (hasPayments > 0) {
      throw new Error("Cannot delete: This customer has payment records in the ledger. Use Archive.");
    }

    // 4. Check: Kya iski koi Returns History hai?
    const hasReturns = await db.sale_returns.where('customer_id').equals(id).count();
    if (hasReturns > 0) {
      throw new Error("Cannot delete: This customer has sales return history. Use Archive.");
    }

    // 5. Check: Kya iska koi Payout (Refund) record hai?
    const hasPayouts = await db.credit_payouts.where('customer_id').equals(id).count();
    if (hasPayouts > 0) {
      throw new Error("Cannot delete: This customer has credit payout records. Use Archive.");
    }

    // Agar upar wale saare checks PASS ho jayein (yani customer bilkul naya hai aur koi kaam nahi hua)
    // Sirf tab hi delete karein.
    await db.customers.delete(id);
    await db.sync_queue.add({
      table_name: 'customers',
      action: 'delete',
      data: { id }
    });
    return true;
  },

  async processSale(salePayload) {
    const saleId = crypto.randomUUID();
    const saleDate = new Date().toISOString();

    const saleData = {
      id: saleId,
      user_id: salePayload.user_id,
      customer_id: salePayload.customer_id,
      subtotal: salePayload.subtotal,
      discount: salePayload.discount,
      total_amount: salePayload.total_amount,
      amount_paid_at_sale: salePayload.amount_paid_at_sale,
      payment_status: salePayload.payment_status,
      payment_method: salePayload.payment_method,
      created_at: saleDate
    };

    const saleItemsData = salePayload.items.map(item => ({
      id: crypto.randomUUID(),
      sale_id: saleId,
      inventory_id: item.inventory_id,
      product_id: item.product_id,
      product_name_snapshot: item.product_name,
      quantity: item.quantity || 1,
      price_at_sale: item.price_at_sale,
      purchase_price: item.purchase_price || 0,
      user_id: salePayload.user_id,
      warranty_expiry: item.warranty_expiry || null
    }));

    const inventoryUpdates = salePayload.items.map(i => ({
      id: i.inventory_id,
      qtySold: i.quantity || 1
    }));

    // A. Local DB mein Save karein
    await db.sales.add(saleData);
    if (db.sale_items) await db.sale_items.bulkAdd(saleItemsData);
    // Signal bhejein taake Header update ho jaye
    window.dispatchEvent(new CustomEvent('local-db-updated'));

    // B. Local Inventory update karein
    for (const item of salePayload.items) {
        const invItem = await db.inventory.get(item.inventory_id);
        if (invItem) {
            const qtySold = item.quantity || 1;
            const newAvail = Math.max(0, (invItem.available_qty || 0) - qtySold);
            const newSold = (invItem.sold_qty || 0) + qtySold;
            
            await db.inventory.update(item.inventory_id, {
                available_qty: newAvail,
                sold_qty: newSold,
                status: newAvail === 0 ? 'Sold' : 'Available'
            });
        }
    }

    // C. Sync Queue mein dalein
    await db.sync_queue.add({
      table_name: 'sales',
      action: 'create_full_sale',
      data: {
        sale: saleData,
        items: saleItemsData,
        inventory_ids: inventoryUpdates
      }
    });

    return saleData;
  },

  async recordPurchasePayment(paymentData) {
    // ID set karein agar nahi hai
    const paymentId = paymentData.id || crypto.randomUUID();
    const finalPaymentData = {
        ...paymentData,
        id: paymentId,
        local_id: paymentId,
        created_at: paymentData.created_at || new Date().toISOString()
    };

    // 1. NAYA HISSA: Local Ledger Table mein save karein taake foran nazar aaye
    if (db.supplier_payments) {
        await db.supplier_payments.put(finalPaymentData);
    }

    // 2. Queue mein daalein (Server ke liye)
    await db.sync_queue.add({
        table_name: 'supplier_payments',
        action: 'create_purchase_payment',
        data: finalPaymentData
    });

    // 3. Local Purchase aur Supplier Update
    const purchase = await db.purchases.get(finalPaymentData.purchase_id);
    if (purchase) {
        const newAmountPaid = (purchase.amount_paid || 0) + Number(finalPaymentData.amount);
        const newBalance = (purchase.total_amount || 0) - newAmountPaid;
        
        let newStatus = 'unpaid';
        if (newBalance <= 0) newStatus = 'paid';
        else if (newAmountPaid > 0) newStatus = 'partially_paid';

        await db.purchases.update(finalPaymentData.purchase_id, {
            amount_paid: newAmountPaid,
            balance_due: newBalance,
            status: newStatus
        });

        const supplier = await db.suppliers.get(finalPaymentData.supplier_id);
        if (supplier) {
            await db.suppliers.update(finalPaymentData.supplier_id, {
                balance_due: Math.max(0, (supplier.balance_due || 0) - Number(finalPaymentData.amount)),
                // Ledger ke stats theek karne ke liye total_payments bhi update karein
                total_payments: (supplier.total_payments || 0) + Number(finalPaymentData.amount)
            });
        }
    }
    return true;
  },

  async updatePurchase(purchaseId, updatedData) {
    // Local DB update karein
    await db.purchases.update(purchaseId, { notes: updatedData.notes });
    
    // Queue mein daalein
    await db.sync_queue.add({
        table_name: 'purchases',
        action: 'update',
        data: { id: purchaseId, ...updatedData }
    });
    return true;
  },

  // --- Offline-First Purchase Edit (UUID COMPATIBLE) ---
  async updatePurchaseFully(purchaseId, payload) {
    const { supplier_id, invoice_id, notes, amount_paid, items } = payload;

    // Subscription Limit Check (Sirf naye izafay par)
    const newTotalQty = items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
    const oldItems = await db.inventory.where('purchase_id').equals(purchaseId).toArray();
    const oldTotalQty = oldItems.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
    
    if (newTotalQty > oldTotalQty) {
        await checkSubscriptionLimit(newTotalQty - oldTotalQty);
    }

    // 1. Database se mojooda items layein
    const dbItems = await db.inventory
        .where('purchase_id').equals(purchaseId)
        .toArray();
    
    const statusMap = {};
    dbItems.forEach(i => { statusMap[i.id] = i.status; });

    // 2. Naya Total Calculate karein
    const newTotal = items.reduce((sum, item) => {
        const realStatus = (item.id && statusMap[item.id]) ? statusMap[item.id] : (item.status || 'Available');
        if (realStatus && realStatus.toLowerCase() === 'returned') return sum;
        return sum + ((item.quantity || 1) * (item.purchase_price || 0));
    }, 0);

    const newBalance = newTotal - (amount_paid || 0);
    let newStatus = 'unpaid';
    if (newBalance <= 0) newStatus = 'paid';
    else if (amount_paid > 0) newStatus = 'partially_paid';

    // 3. Purana Data layein
    const purchaseToUpdate = await db.purchases.get(purchaseId);
    if (!purchaseToUpdate) throw new Error("Purchase not found locally");
    const oldTotal = purchaseToUpdate.total_amount || 0;

    // 4. Purchase Record Update (Local)
    await db.purchases.update(purchaseId, {
        supplier_id,
        invoice_id,
        notes,
        total_amount: newTotal,
        amount_paid,
        balance_due: newBalance,
        status: newStatus
    });

    // --- NAYA ACCOUNTING FIX: Payment Record Update ---
    // Agar ye Cash Purchase hai ya is bill ki koi payment pehle ho chuki hai, 
    // to us payment record ko bhi naye "amount_paid" ke mutabiq theek karein.
    const linkedPayment = await db.supplier_payments.where('purchase_id').equals(purchaseId).first();
    if (linkedPayment && linkedPayment.amount !== amount_paid) {
        // A. Local DB mein payment ki raqam theek karein (Dashboard isi se chalta hai)
        await db.supplier_payments.update(linkedPayment.id, { amount: amount_paid });

        // B. Sync Queue mein dalein taake server par bhi hisaab theek ho jaye
        await db.sync_queue.add({
            table_name: 'supplier_payments',
            action: 'edit_supplier_payment',
            data: {
                p_payment_id: linkedPayment.id,
                p_new_amount: amount_paid,
                p_new_notes: (notes || '') + ' (Auto-adjusted on purchase edit)'
            }
        });
    }

    // 5. Inventory Handle Karein (Local)
    const existingItems = await db.inventory.where('purchase_id').equals(purchaseId).toArray();
    const existingIds = existingItems.map(i => i.id);
    const keptIds = []; 

    const itemsToCreate = [];
    
    for (const item of items) {
        // Check karein ke kya yeh ID waqayi hamare inventory table mein pehle se hai?
        const isExisting = item.id ? await db.inventory.get(item.id) : null;

        if (isExisting) {
            keptIds.push(item.id);
            
            // Hisaab lagayein ke kitne bik chuke hain taake available sahi nikal sakay
            const soldQty = isExisting.sold_qty || 0;
            const returnedQty = isExisting.returned_qty || 0;
            const damagedQty = isExisting.damaged_qty || 0;
            const alreadyUsed = soldQty + returnedQty + damagedQty;

            // Purane item ko update karein (Quantity ke saath)
            await db.inventory.update(item.id, {
                product_id: item.product_id,
                quantity: Number(item.quantity),
                available_qty: Number(item.quantity) - alreadyUsed, // Nayi quantity mein se bikay hue nikaal dein
                purchase_price: item.purchase_price,
                sale_price: item.sale_price,
                imei: item.imei,
                item_attributes: item.item_attributes,
                status: (Number(item.quantity) - alreadyUsed) <= 0 ? 'Sold' : 'Available'
            });
        } else {
            // Naya item create
            itemsToCreate.push({
                id: crypto.randomUUID(),
                local_id: crypto.randomUUID(),
                purchase_id: purchaseId,
                product_id: item.product_id,
                quantity: 1,
                purchase_price: item.purchase_price,
                sale_price: item.sale_price,
                imei: item.imei,
                item_attributes: item.item_attributes,
                user_id: purchaseToUpdate.user_id,
                status: 'Available',
                supplier_id: supplier_id
            });
        }
    }

    if (itemsToCreate.length > 0) {
        await db.inventory.bulkAdd(itemsToCreate);
    }

    // Delete Removed Items (Sirf Available wale)
    const idsToDelete = existingIds.filter(id => !keptIds.includes(id));
    if (idsToDelete.length > 0) {
        // Safety: Check karein ke kahin Returned item to delete nahi ho raha
        const safeToDelete = [];
        for (const delId of idsToDelete) {
            const itemToCheck = existingItems.find(i => i.id === delId);
            if (itemToCheck && itemToCheck.status !== 'Returned') {
                safeToDelete.push(delId);
            }
        }
        if (safeToDelete.length > 0) await db.inventory.bulkDelete(safeToDelete);
    // Signal bhejein taake Header update ho jaye
    window.dispatchEvent(new CustomEvent('local-db-updated'));
    }

    // 5. Supplier Balance Update
    const supplier = await db.suppliers.get(supplier_id);
    if (supplier) {
        const updatedSupplierBalance = (supplier.balance_due || 0) - oldTotal + newTotal;
        await db.suppliers.update(supplier_id, { balance_due: updatedSupplierBalance });
    }

    // 6. Sync Queue
    await db.sync_queue.add({
        table_name: 'purchases',
        action: 'update_full_purchase',
        data: {
            id: purchaseId,
            p_local_id: crypto.randomUUID(),
            p_invoice_id: invoice_id, // <--- SEND TO SERVER
            supplier_id,
            notes,
            amount_paid,
            items: items
        }
    });

    return true;
  },

  async recordBulkSupplierPayment(paymentData) {
    // 1. Ek aarzi (temporary) ID banayein
    const localId = crypto.randomUUID();
    paymentData.local_id = localId;
    const paymentWithId = { ...paymentData, id: localId, local_id: localId };

    // 2. Local DB mein save karein (Taake Ledger mein foran nazar aaye)
    if (db.supplier_payments) {
        await db.supplier_payments.add(paymentWithId);
    }

    // 3. Queue mein daalein (Upload ke liye)
    await db.sync_queue.add({
        table_name: 'supplier_payments',
        action: 'create_bulk_payment',
        data: paymentWithId
    });

    // 4. Supplier ka Balance aur Total Paid update karein
    const supplier = await db.suppliers.get(paymentData.supplier_id);
    if (supplier) {
        const newBalance = (supplier.balance_due || 0) - paymentData.amount;
        // Total Paid ko bhi update karein taake stats sahi rahein
        const newTotalPaid = (supplier.total_payments || 0) + paymentData.amount;
        
        await db.suppliers.update(paymentData.supplier_id, { 
            balance_due: newBalance,
            total_payments: newTotalPaid
        });
    }

    return true;
  },

  // --- Edit Supplier Payment (Local FIFO Re-calculation) ---
  async editSupplierPayment(paymentId, newAmount, newNotes) {
    // 1. Payment dhoondein
    const payment = await db.supplier_payments.get(paymentId);
    if (!payment) throw new Error("Payment not found locally");
    
    const supplierId = payment.supplier_id;

    // 2. Local Payment Update karein
    await db.supplier_payments.update(paymentId, { 
        amount: newAmount, 
        notes: newNotes 
    });

    // 3. LOCAL RE-CALCULATION (FIFO Logic)
    // Hum saari purchases aur payments ko dobara calculate karenge taake local UI sahi ho jaye
    const allPurchases = await db.purchases.where('supplier_id').equals(supplierId).sortBy('purchase_date');
    const allPayments = await db.supplier_payments.where('supplier_id').equals(supplierId).toArray();
    const allRefunds = (db.supplier_refunds) ? await db.supplier_refunds.where('supplier_id').equals(supplierId).toArray() : [];

    // Total raqam jo bills pay karne ke liye majood hai
    let totalAvailableToPay = allPayments.reduce((sum, p) => sum + (p.amount || 0), 0) - 
                             allRefunds.reduce((sum, r) => sum + (r.amount || 0), 0);

    // Har bill ko dobara settle karein (FIFO)
    for (const pur of allPurchases) {
        const payForThisBill = Math.min(totalAvailableToPay, pur.total_amount);
        const newBalance = pur.total_amount - payForThisBill;
        
        await db.purchases.update(pur.id, {
            amount_paid: payForThisBill,
            balance_due: newBalance,
            status: newBalance <= 0 ? 'paid' : (payForThisBill > 0 ? 'partially_paid' : 'unpaid')
        });
        
        totalAvailableToPay -= payForThisBill;
    }

    // 4. Supplier Table Update (Sirf Credit update karein)
    // balance_due likhne ki zaroorat nahi kyunke wo View se khud aata hai
    await db.suppliers.update(supplierId, {
        credit_balance: Math.max(0, totalAvailableToPay),
        balance_due: allPurchases.reduce((sum, p) => sum + (p.total_amount - (p.amount_paid || 0)), 0)
    });

    // 5. Sync Queue mein daalein (Server ke liye)
    await db.sync_queue.add({
        table_name: 'supplier_payments',
        action: 'edit_supplier_payment',
        data: {
            p_payment_id: paymentId,
            p_new_amount: newAmount,
            p_new_notes: newNotes
        }
    });

    return true;
  },

  // --- Professional Bulk Return Function (UUID Compatible) ---
  async createPurchaseReturn(returnData) {
    const { purchase_id, items_with_qty, return_date, notes } = returnData;

    // 1. Purchase dhoondein
    const purchase = await db.purchases.get(purchase_id);
    if (!purchase) throw new Error("Purchase not found locally.");

    const realPurchaseId = purchase.id;
    let totalReturnAmount = 0;

    // 2. Local DB Updates (Loop through each item being returned)
    for (const item of items_with_qty) {
        const invItem = await db.inventory.get(item.inventory_id);
        if (invItem) {
            const itemTotal = (invItem.purchase_price || 0) * item.qty;
            totalReturnAmount += itemTotal;

            if (invItem.imei) {
                // IMEI Based: Poori row returned
                await db.inventory.update(invItem.id, { 
                    status: 'Returned', available_qty: 0, returned_qty: 1 
                });
            } else {
                // Bulk Based: Quantity adjust karein
                const newAvail = Math.max(0, (invItem.available_qty || 0) - item.qty);
                const newRet = (invItem.returned_qty || 0) + item.qty;
                await db.inventory.update(invItem.id, { 
                    available_qty: newAvail, 
                    returned_qty: newRet,
                    status: (newAvail === 0 && (invItem.sold_qty || 0) <= 0) ? 'Returned' : invItem.status
                });
            }
        }
    }

    // 3. Purchase Balance Update
    const currentBalance = purchase.balance_due || 0;
    const returnToClearDebt = Math.min(totalReturnAmount, currentBalance);
    const creditToAdd = totalReturnAmount - returnToClearDebt;

    await db.purchases.update(realPurchaseId, { 
        total_amount: (purchase.total_amount || 0) - totalReturnAmount,
        balance_due: currentBalance - returnToClearDebt,
        status: (currentBalance - returnToClearDebt) <= 0 ? 'paid' : 'partially_paid'
    });

    // 4. Queue mein daalein (Server ke liye)
    const returnId = crypto.randomUUID();
    
    await db.sync_queue.add({
        table_name: 'purchase_returns',
        action: 'process_purchase_return',
        data: {
            p_return_id: returnId,
            p_purchase_id: realPurchaseId, 
            p_return_items: items_with_qty, 
            p_return_date: return_date,
            p_notes: notes
        }
    });

    return true;
  },


  async recordSupplierRefund(refundData) {
    // FIX: Aik hi ID banayein jo har jagah use ho
    const refundId = refundData.id || crypto.randomUUID();
    const finalRefundData = { 
        ...refundData, 
        id: refundId, 
        local_id: refundId,
        created_at: refundData.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString()
    };

    // 1. Local Table mein save karein
    if (db.supplier_refunds) {
        await db.supplier_refunds.put(finalRefundData);
    }

    // 2. Local Supplier ka Credit Balance update karein
    const supplier = await db.suppliers.get(finalRefundData.supplier_id);
    if (supplier) {
        const newCredit = (supplier.credit_balance || 0) - Number(finalRefundData.amount);
        await db.suppliers.update(finalRefundData.supplier_id, {
            credit_balance: Math.max(0, newCredit)
        });
    }

    // 3. Queue mein daalein (Server ke liye)
    await db.sync_queue.add({
        table_name: 'supplier_refunds',
        action: 'create_refund',
        data: finalRefundData
    });

    return true;
  },

// --- REPORTS SECTION (OFFLINE COMPATIBLE) ---

  // 1. Accounts Payable (Jin suppliers ke paise dene hain)
  async getAccountsPayable() {
    // Local suppliers se data layein
    const suppliers = await db.suppliers.toArray();
    
    // Sirf wo suppliers jin ka balance 0 se zyada hai
    const payable = suppliers
      .filter(s => (s.balance_due || 0) > 0)
      .map(s => ({
        name: s.name,
        contact_person: s.contact_person || '',
        phone: s.phone || '',
        balance_due: s.balance_due || 0
      }))
      .sort((a, b) => b.balance_due - a.balance_due); // Zayada udhaar wale upar

    return payable;
  },

  // 2. Supplier Purchase Report (Date range ke hisaab se)
  async getSupplierPurchaseReport(startDateStr, endDateStr) {
    const start = new Date(startDateStr).getTime();
    const end = new Date(endDateStr).getTime();

    // Local purchases layein
    const allPurchases = await db.purchases.toArray();
    const suppliers = await db.suppliers.toArray();
    const supplierMap = {};
    suppliers.forEach(s => supplierMap[s.id] = s.name);

    // Date filter karein
    const filteredPurchases = allPurchases.filter(p => {
      const pDate = new Date(p.purchase_date).getTime();
      return pDate >= start && pDate <= end;
    });

    // Supplier wise group karein
    const report = {};
    
    filteredPurchases.forEach(p => {
      const sName = supplierMap[p.supplier_id] || 'Unknown';
      if (!report[sName]) {
        report[sName] = { supplier_name: sName, purchase_count: 0, total_purchase_amount: 0 };
      }
      report[sName].purchase_count += 1;
      report[sName].total_purchase_amount += (p.total_amount || 0);
    });

    return Object.values(report);
  },

  // 3. Profit & Loss Summary (Sab se ahem function)
  async getProfitLossSummary(startDateStr, endDateStr) {
    const start = new Date(startDateStr).getTime();
    const end = new Date(endDateStr).getTime();

    // A. Revenue (Sales)
    const allSales = await db.sales.toArray();
    const filteredSales = allSales.filter(s => {
      const d = new Date(s.sale_date || s.created_at).getTime();
      return d >= start && d <= end;
    });
    const totalRevenueFromSales = precise(filteredSales.reduce((sum, s) => sum + (s.total_amount || 0), 0));

    // B. Returns (Refunds)
    const allReturns = await db.sale_returns.toArray();
    const filteredReturns = allReturns.filter(r => {
      const d = new Date(r.created_at).getTime();
      return d >= start && d <= end;
    });
    const totalRefunds = precise(filteredReturns.reduce((sum, r) => sum + (r.total_refund_amount || 0), 0));
    
    // Net Revenue
    const totalRevenue = precise(totalRevenueFromSales - totalRefunds);

    // C. Cost of Goods Sold (COGS) - Bechi gayi cheezon ki khareed qeemat
    // Hamein sale_items aur inventory ko check karna hoga
    let totalCostOfGoodsSold = 0;
    
    // Jin sales ko filter kiya hai, unke items dhoondein
    const saleIds = filteredSales.map(s => s.id);
    const saleItems = await db.sale_items.where('sale_id').anyOf(saleIds).toArray();
    
    // Ab har item ki inventory dhoond kar uski purchase_price layein
    // Performance ke liye pehle inventory items ko memory mein layein
    const inventoryIds = saleItems.map(i => i.inventory_id);
    const inventoryItems = await db.inventory.where('id').anyOf(inventoryIds).toArray();
    const inventoryMap = {};
    inventoryItems.forEach(inv => { inventoryMap[inv.id] = inv; });

    saleItems.forEach(item => {
      // Naya Professional Tareeqa: Pehle sale_item mein freeze hui price check karein
      if (item.purchase_price !== undefined && item.purchase_price !== null && Number(item.purchase_price) !== 0) {
        totalCostOfGoodsSold += (Number(item.purchase_price) * (item.quantity || 1));
      } 
      // Fallback: Purana tareeqa (Sirf purani sales ke liye jab ye column nahi tha)
      else {
        const inv = inventoryMap[item.inventory_id];
        if (inv) {
          totalCostOfGoodsSold += (inv.purchase_price || 0);
        }
      }
    });

    // D. Cost of Returns (Wapis aayi cheezon ki khareed qeemat minus karein)
    let totalCostOfReturns = 0;
    const returnIds = filteredReturns.map(r => r.id);
    if (returnIds.length > 0) {
        const returnItems = await db.sale_return_items.where('return_id').anyOf(returnIds).toArray();
        
        for (const rItem of returnItems) {
            // Smart Lookup: Pehle dekho ke is sale item mein purchase_price freeze hui thi?
            const sItem = await db.sale_items
                .where('[sale_id+inventory_id]')
                .equals([rItem.sale_id || '', rItem.inventory_id]) // Note: Agar sale_id return record mein hai
                .first();

            if (sItem && sItem.purchase_price) {
                totalCostOfReturns += Number(sItem.purchase_price) * (rItem.quantity || 1);
            } else {
                // Fallback: Agar purana data hai to inventory se lo
                const inv = await db.inventory.get(rItem.inventory_id);
                if (inv) totalCostOfReturns += (inv.purchase_price || 0);
            }
        }
    }

    const totalCost = totalCostOfGoodsSold - totalCostOfReturns;

    // E. Expenses
    const allExpenses = await db.expenses.toArray();
    const filteredExpenses = allExpenses.filter(e => {
      const d = new Date(e.expense_date).getTime();
      return d >= start && d <= end;
    });
    const totalExpenses = filteredExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);

    // F. Final Calculation
    const grossProfit = totalRevenue - totalCost;
    const netProfit = grossProfit - totalExpenses;

    return {
      totalRevenue,
      totalCost,
      grossProfit,
      totalExpenses,
      netProfit
    };
  },

  // 4. Chart Data (Graph ke liye)
  async getDashboardCharts(startDateStr, endDateStr) {
    const start = new Date(startDateStr).getTime();
    const end = new Date(endDateStr).getTime();

    // Sales aur Expenses layein
    const allSales = await db.sales.toArray();
    const filteredSales = allSales.filter(s => {
        const d = new Date(s.sale_date || s.created_at).getTime();
        return d >= start && d <= end;
    });

    // Date wise grouping
    const dailyMap = {};

    filteredSales.forEach(s => {
        // Date format: YYYY-MM-DD
        const dateKey = new Date(s.sale_date || s.created_at).toISOString().split('T')[0];
        if (!dailyMap[dateKey]) dailyMap[dateKey] = 0;
        dailyMap[dateKey] += (s.total_amount || 0);
    });

    // Chart format mein convert karein
    const chartData = Object.keys(dailyMap).map(date => ({
        date: date,
        value: dailyMap[date],
        category: 'Revenue'
    })).sort((a, b) => new Date(a.date) - new Date(b.date));

    return chartData;
  },

  // 5. Expense Chart Data (Pie Chart ke liye)
  async getExpenseChartData(startDateStr, endDateStr) {
    const start = new Date(startDateStr).getTime();
    const end = new Date(endDateStr).getTime();

    const allExpenses = await db.expenses.toArray();
    const filteredExpenses = allExpenses.filter(e => {
        const d = new Date(e.expense_date).getTime();
        return d >= start && d <= end;
    });

    // Categories ke naam chahiye honge
    const categories = await db.expense_categories.toArray();
    const catMap = {};
    categories.forEach(c => catMap[c.id] = c.name);

    // Grouping
    const groupMap = {};
    filteredExpenses.forEach(e => {
        const catName = catMap[e.category_id] || 'Uncategorized';
        if (!groupMap[catName]) groupMap[catName] = 0;
        groupMap[catName] += (e.amount || 0);
    });

    return Object.keys(groupMap).map(key => ({
        category: key,
        amount: groupMap[key]
    }));
  },

// --- EXPENSES SECTION ---

  async getExpenses() {
    // 1. Expenses aur Categories Local DB se layein
    const expenses = await db.expenses.orderBy('expense_date').reverse().toArray();
    const categories = await db.expense_categories.toArray();

    // 2. Category ka naam jorne ke liye Map banayein
    const catMap = {};
    categories.forEach(c => { catMap[c.id] = c.name; });

    // 3. Data format karein (Ant Design table ke liye)
    return expenses.map(e => ({
      ...e,
      expense_categories: { name: catMap[e.category_id] || 'Uncategorized' }
    }));
  },

  async getExpenseCategories() {
    // Check karein aur initialize karein agar zaroorat ho
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await this.initializeUserCategories(user.id);
    }
    return await db.expense_categories.toArray();
  },

  async addExpense(expenseData) {
    // ID aur User ID set karein
    if (!expenseData.id) expenseData.id = crypto.randomUUID();
    expenseData.local_id = expenseData.id;
    
    // Local Save
    await db.expenses.add(expenseData);
    
    // Queue for Upload
    await db.sync_queue.add({
      table_name: 'expenses',
      action: 'create',
      data: expenseData
    });
    return expenseData;
  },

  async updateExpense(id, updates) {
    // Local Update
    await db.expenses.update(id, updates);
    
    // Queue for Upload
    await db.sync_queue.add({
      table_name: 'expenses',
      action: 'update',
      data: { id, ...updates }
    });
    return true;
  },

  async deleteExpense(id) {
    // Local Delete
    await db.expenses.delete(id);
    
    // Queue for Upload
    await db.sync_queue.add({
      table_name: 'expenses',
      action: 'delete',
      data: { id }
    });
    return true;
  },

  // --- EXPENSE CATEGORIES SECTION ---

  async addExpenseCategory(categoryData) {
    if (!categoryData.id) categoryData.id = crypto.randomUUID();
    
    // Local DB mein save karein
    await db.expense_categories.put(categoryData);
    
    // Upload Queue mein dalein
    await db.sync_queue.add({
      table_name: 'expense_categories', 
      action: 'create',
      data: categoryData
    });
    return categoryData;
  },

  async updateExpenseCategory(id, name) {
    // Local Update
    await db.expense_categories.update(id, { name });
    
    // Queue
    await db.sync_queue.add({
      table_name: 'expense_categories',
      action: 'update',
      data: { id, name }
    });
    return true;
  },

  async deleteExpenseCategory(id) {
    // Pehle check karein ke kya yeh category kisi expense mein use ho rahi hai?
    const usedCount = await db.expenses.where('category_id').equals(id).count();
    if (usedCount > 0) {
        throw new Error("This category cannot be deleted as it is currently in use.");
    }

    // Local Delete
    await db.expense_categories.delete(id);
    
    // Queue
    await db.sync_queue.add({
      table_name: 'expense_categories',
      action: 'delete',
      data: { id }
    });
    return true;
  },

  // --- PRODUCT CATEGORIES & ATTRIBUTES SECTION ---

  async getProductCategories() {
    // --- NAYA INITIALIZATION CHECK ---
    // Pehle check karein ke kya user logged in hai?
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      // Agar user hai, to initialization function ko call karein
      // Ye function khud hi check kar lega ke agar categories pehle se hain to kuch nahi karega
      await this.initializeUserCategories(user.id);
    }

    // 1. Local Categories layein (Ab is mein initialization ke baad naye records honge)
    const categories = await db.categories.orderBy('name').toArray();
    
    return categories;
  },

  async addProductCategory(categoryData) {
    if (!categoryData.id) categoryData.id = crypto.randomUUID();
    
    await db.categories.add(categoryData);
    
    await db.sync_queue.add({
      table_name: 'categories',
      action: 'create',
      data: categoryData
    });
    return categoryData;
  },

  async updateProductCategory(id, updates) {
    await db.categories.update(id, updates);
    
    await db.sync_queue.add({
      table_name: 'categories',
      action: 'update',
      data: { id, ...updates }
    });
    return true;
  },

  async deleteProductCategory(id) {
    // Check karein ke kya yeh category kisi product mein use ho rahi hai?
    const usedCount = await db.products.where('category_id').equals(id).count();
    if (usedCount > 0) {
        throw new Error("This category cannot be deleted as it is assigned to products.");
    }

    await db.categories.delete(id);
    
    await db.sync_queue.add({
      table_name: 'categories',
      action: 'delete',
      data: { id }
    });
    return true;
  },

  // --- ATTRIBUTES ---

  async getCategoryAttributes(categoryId) {
    // Attributes layein jo is category ke hain
    const attrs = await db.category_attributes
        .where('category_id')
        .equals(categoryId)
        .toArray();
    
    // Created At ke hisaab se sort karein (agar field hai)
    return attrs.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  },

  async addCategoryAttribute(attrData) {
    if (!attrData.id) attrData.id = crypto.randomUUID();
    if (!attrData.created_at) attrData.created_at = new Date().toISOString();

    await db.category_attributes.add(attrData);
    
    await db.sync_queue.add({
      table_name: 'category_attributes',
      action: 'create',
      data: attrData
    });
    return attrData;
  },

  async updateCategoryAttribute(id, updates) {
    await db.category_attributes.update(id, updates);
    
    await db.sync_queue.add({
      table_name: 'category_attributes',
      action: 'update',
      data: { id, ...updates }
    });
    return true;
  },

  async deleteCategoryAttribute(id) {
    await db.category_attributes.delete(id);
    
    await db.sync_queue.add({
      table_name: 'category_attributes',
      action: 'delete',
      data: { id }
    });
    return true;
  },

  // --- DASHBOARD FUNCTIONS ---

  async getDashboardStats(threshold = 5, timeRange = 'today') {
    // 1. Date Ranges (Wohi purana logic)
    const now = new Date();
    let currentStart = new Date();
    let previousStart = new Date();
    let previousEnd = new Date();

    if (timeRange === 'week') {
        const day = currentStart.getDay() || 7; 
        if (day !== 1) currentStart.setHours(-24 * (day - 1));
        else currentStart.setHours(0,0,0,0);
        previousStart = new Date(currentStart);
        previousStart.setDate(previousStart.getDate() - 7);
        previousEnd = new Date(currentStart); 
    } 
    else if (timeRange === 'month') {
        currentStart.setDate(1);
        currentStart.setHours(0,0,0,0);
        previousStart = new Date(currentStart);
        previousStart.setMonth(previousStart.getMonth() - 1);
        previousEnd = new Date(currentStart);
    } 
    else {
        currentStart.setHours(0, 0, 0, 0);
        previousStart = new Date(currentStart);
        previousStart.setDate(previousStart.getDate() - 1);
        previousEnd = new Date(currentStart);
    }

    // 2. Data Fetching (Optimized with Indexed Queries)
    const lastClosing = await db.daily_closings.orderBy('created_at').reverse().first();
    const cashFilterDate = lastClosing ? new Date(lastClosing.created_at) : new Date(0);
    const startingCash = lastClosing ? (lastClosing.actual_cash || 0) : 0;

    // Hum sirf utna data uthayenge jitna dashboard ke filters ya cash calculation ke liye zaroori hai
    const earliestNeededDate = new Date(Math.min(previousStart.getTime(), cashFilterDate.getTime())).toISOString();

    // Parallel Fetch: Optimized (Sales aur Returns ko memory-safe process karne ke liye nikaal diya gaya hai)
    const [
      expenses, 
      customerPayments, 
      supplierPayments, 
      creditPayouts, 
      supplierRefunds, 
      cashAdjustments
    ] = await Promise.all([
      db.expenses.where('expense_date').aboveOrEqual(earliestNeededDate.split('T')[0]).toArray(),
      db.customer_payments.where('updated_at').aboveOrEqual(earliestNeededDate).toArray(),
      db.supplier_payments.where('updated_at').aboveOrEqual(earliestNeededDate).toArray(),
      db.credit_payouts.where('updated_at').aboveOrEqual(earliestNeededDate).toArray(),
      db.supplier_refunds.where('updated_at').aboveOrEqual(earliestNeededDate).toArray(),
      db.cash_adjustments.where('created_at').aboveOrEqual(earliestNeededDate).toArray()
    ]);
    
    const expenseCategories = await db.expense_categories.toArray();
    let totalReceivables = 0;
    let totalCustomerCredits = 0;
    const customerNameMap = {}; 

    await db.customers.each(c => {
        const bal = c.balance || 0;
        if (bal > 0) totalReceivables += bal;
        else if (bal < 0) totalCustomerCredits += Math.abs(bal);
        customerNameMap[c.id] = c.name;
    });

    const suppliers = await db.suppliers.toArray();
    const products = await db.products.toArray();

    const inventoryMap = {}; 
    const stockCounts = {};
    let runningInventoryTotal = 0;

    await db.inventory
        .where('status').equals('Available')
        .each(item => {
            const qty = Number(item.available_qty) || 0;
            const price = Number(item.purchase_price) || 0;
            if (qty > 0) {
                runningInventoryTotal += (price * qty);
                const pid = item.product_id;
                stockCounts[pid] = (stockCounts[pid] || 0) + qty;
                inventoryMap[item.id] = item;
            }
        });
    const totalInventoryValue = precise(runningInventoryTotal);

    // --- SALES & RETURNS OPTIMIZATION (Big Data Safe) ---
    let sales = []; 
    let returns = [];
    let rawSalesCurrent = 0;
    let rawSalesPrevious = 0;
    let rawReturnsCurrent = 0;
    let rawReturnsPrevious = 0;
    let totalReturnFeesCurrent = 0;
    
    // Cash Calculation ke liye naye variables
    let cashSalesTotal = 0;
    let bankSalesTotal = 0;

    const currentSalesData = [];
    const previousSalesData = [];
    const currentReturnsData = [];
    let saleItems = [];

    // 1. Sales Loop: Ek hi dafa database se guzrein
    await db.sales.where('created_at').aboveOrEqual(earliestNeededDate).each(s => {
        sales.push(s); // Crash bachane ke liye data yahan save karein
        const sDate = new Date(s.sale_date || s.created_at);
        
        // Stats aur Growth ke liye
        if (sDate >= currentStart) {
            rawSalesCurrent += (s.total_amount || 0);
            currentSalesData.push(s);
        } else if (sDate >= previousStart && sDate < (timeRange === 'today' ? previousEnd : currentStart)) {
            rawSalesPrevious += (s.total_amount || 0);
            previousSalesData.push(s);
        }

        // Cash/Bank calculation (Jo pehle filter se hoti thi)
        if (sDate > cashFilterDate) {
            if (s.payment_method === 'Cash') cashSalesTotal += (s.amount_paid_at_sale || 0);
        }
        if (s.payment_method === 'Bank') bankSalesTotal += (s.amount_paid_at_sale || 0);
    });

    // 2. Returns Loop
    await db.sale_returns.where('created_at').aboveOrEqual(earliestNeededDate).each(r => {
        returns.push(r); // Crash bachane ke liye data yahan save karein
        const rDate = new Date(r.created_at);
        if (rDate >= currentStart) {
            rawReturnsCurrent += (r.total_refund_amount || 0);
            totalReturnFeesCurrent += (Number(r.return_fee) || 0);
            currentReturnsData.push(r);
        } else if (rDate >= previousStart && rDate < (timeRange === 'today' ? previousEnd : currentStart)) {
            rawReturnsPrevious += (r.total_refund_amount || 0);
        }
    });

    const currentExpensesData = expenses.filter(e => new Date(e.expense_date) >= currentStart);
    const previousExpensesData = expenses.filter(e => {
        const d = new Date(e.expense_date);
        return d >= previousStart && d < (timeRange === 'today' ? previousEnd : currentStart);
    });

    // Net Sales calculation (Variables upar loop mein pehle hi calculate ho chuke hain)
    const netSalesCurrent = rawSalesCurrent - rawReturnsCurrent;
    const netSalesPrevious = rawSalesPrevious - rawReturnsPrevious;
    
    const totalExpensesCurrent = currentExpensesData.reduce((sum, e) => sum + (e.amount || 0), 0);
    const totalExpensesPrevious = previousExpensesData.reduce((sum, e) => sum + (e.amount || 0), 0);

    // 5. Growth
    const calculateGrowth = (current, previous) => {
        if (previous === 0) return current > 0 ? 100 : 0;
        return ((current - previous) / previous) * 100;
    };
    const salesGrowth = calculateGrowth(netSalesCurrent, netSalesPrevious);
    const expensesGrowth = calculateGrowth(totalExpensesCurrent, totalExpensesPrevious);

    const expenseCatMap = {};
    expenseCategories.forEach(c => expenseCatMap[c.id] = c.name);
    const expenseBreakdown = [];
    const breakdownMap = {};
    currentExpensesData.forEach(e => {
        const catName = expenseCatMap[e.category_id] || 'Other';
        breakdownMap[catName] = (breakdownMap[catName] || 0) + (e.amount || 0);
    });
    Object.keys(breakdownMap).forEach(name => {
        expenseBreakdown.push({ type: name, value: breakdownMap[name] });
    });

    // 6. Profit Calculation (Optimized Fetch)
    const currentSaleIds = currentSalesData.map(s => s.id);
    saleItems = await db.sale_items.where('sale_id').anyOf(currentSaleIds).toArray();
    const currentSoldItems = saleItems;

    let totalCostOfSold = 0;
    currentSoldItems.forEach(item => {
        // Naya Professional Tareeqa: Direct sale_item se cost uthayein
        if (item.purchase_price !== undefined && item.purchase_price !== null && Number(item.purchase_price) !== 0) {
            totalCostOfSold += (Number(item.purchase_price) * (item.quantity || 1));
        }
        // Fallback: Purana tareeqa
        else {
            const invItem = inventoryMap[item.inventory_id];
            if (invItem) totalCostOfSold += (invItem.purchase_price || 0);
        }
    });

    const currentReturnIds = currentReturnsData.map(r => r.id);
    // Professional Way: Sirf wahi items load karein jo in returns se talluq rakhte hain
    const currentReturnedItems = currentReturnIds.length > 0 
        ? await db.sale_return_items.where('return_id').anyOf(currentReturnIds).toArray()
        : [];

    let totalCostOfReturns = 0;
    for (const rItem of currentReturnedItems) {
        // Hum inventoryMap se hi cost le rahe hain kyunke dashboard par inventory pehle se load hoti hai
        const invItem = inventoryMap[rItem.inventory_id];
        if (invItem) {
            // FIX: Quantity se multiply karna zaroori hai taake bulk items (cables waghera) ka hisaab sahi ho
            const qty = Number(rItem.quantity) || 1;
            totalCostOfReturns += (Number(invItem.purchase_price) || 0) * qty;
        }
    }

    const netCost = totalCostOfSold - totalCostOfReturns;
    const grossProfitCurrent = netSalesCurrent - netCost;
    const netProfitCurrent = grossProfitCurrent - totalExpensesCurrent;

    // --- CASH IN HAND & BANK BALANCE CALCULATION ---
    
    // A. Cash Calculation (Loop se hasil karda value use karein)
    const cashSales = cashSalesTotal;
    const cashReceived = customerPayments.filter(p => p.payment_method === 'Cash' && new Date(p.created_at) > cashFilterDate).reduce((sum, p) => sum + (p.amount_paid || 0), 0);
    const cashExpenses = expenses.filter(e => e.payment_method === 'Cash' && new Date(e.expense_date) > cashFilterDate).reduce((sum, e) => sum + (e.amount || 0), 0);
    const cashPaidToSuppliers = supplierPayments.filter(p => p.payment_method === 'Cash' && new Date(p.payment_date || p.created_at) > cashFilterDate).reduce((sum, p) => sum + (p.amount || 0), 0);
    const cashPayouts = creditPayouts.filter(p => p.payment_method === 'Cash' && new Date(p.created_at) > cashFilterDate).reduce((sum, p) => sum + (p.amount_paid || 0), 0);
    const cashRefunds = supplierRefunds.filter(r => 
      (r.payment_method === 'Cash' || r.refund_method === 'Cash') && 
      new Date(r.refund_date || r.created_at) > cashFilterDate
    ).reduce((sum, r) => sum + (r.amount || 0), 0);

    const totalCashIn = cashAdjustments.filter(a => a.type === 'In' && a.payment_method === 'Cash' && new Date(a.created_at) > cashFilterDate).reduce((sum, a) => sum + (a.amount || 0), 0);
    const totalCashOut = cashAdjustments.filter(a => a.type === 'Out' && a.payment_method === 'Cash' && new Date(a.created_at) > cashFilterDate).reduce((sum, a) => sum + (a.amount || 0), 0);
    const cashTransfersIn = cashAdjustments.filter(a => a.type === 'Transfer' && a.transfer_to === 'Cash' && new Date(a.created_at) > cashFilterDate).reduce((sum, a) => sum + (a.amount || 0), 0);
    const cashTransfersOut = cashAdjustments.filter(a => a.type === 'Transfer' && a.payment_method === 'Cash' && new Date(a.created_at) > cashFilterDate).reduce((sum, a) => sum + (a.amount || 0), 0);

    const cashInHand = precise(startingCash + (cashSales + cashReceived + cashRefunds + totalCashIn + cashTransfersIn) - (cashExpenses + cashPaidToSuppliers + cashPayouts + totalCashOut + cashTransfersOut));

    // --- BANK LOGIC (Bank/EasyPaisa) ---
    const bankSales = bankSalesTotal;
    const bankReceived = customerPayments.filter(p => p.payment_method === 'Bank').reduce((sum, p) => sum + (p.amount_paid || 0), 0);
    const bankExpenses = expenses.filter(e => e.payment_method === 'Bank').reduce((sum, e) => sum + (e.amount || 0), 0);
    const bankPaidToSuppliers = supplierPayments.filter(p => p.payment_method === 'Bank').reduce((sum, p) => sum + (p.amount || 0), 0);
    const bankPayouts = creditPayouts.filter(p => p.payment_method === 'Bank').reduce((sum, p) => sum + (p.amount_paid || 0), 0);
    const bankRefunds = supplierRefunds.filter(r => 
      (r.payment_method === 'Bank' || r.refund_method === 'Bank' || r.payment_method === 'Bank Transfer' || r.refund_method === 'Bank Transfer')
    ).reduce((sum, r) => sum + (r.amount || 0), 0);

    const totalBankIn = cashAdjustments.filter(a => a.type === 'In' && a.payment_method === 'Bank').reduce((sum, a) => sum + (a.amount || 0), 0);
    const totalBankOut = cashAdjustments.filter(a => a.type === 'Out' && a.payment_method === 'Bank').reduce((sum, a) => sum + (a.amount || 0), 0);
    
    // NAYA: Cash se Bank mein aaya (Bank barhega)
    const bankTransfersIn = cashAdjustments.filter(a => a.type === 'Transfer' && a.transfer_to === 'Bank').reduce((sum, a) => sum + (a.amount || 0), 0);
    // NAYA: Bank se Cash mein gaya (Bank kam hoga)
    const bankTransfersOut = cashAdjustments.filter(a => a.type === 'Transfer' && a.payment_method === 'Bank').reduce((sum, a) => sum + (a.amount || 0), 0);

    const bankBalance = precise((bankSales + bankReceived + bankRefunds + totalBankIn + bankTransfersIn) - (bankExpenses + bankPaidToSuppliers + bankPayouts + totalBankOut + bankTransfersOut));


    // Suppliers ka udhaar (Payables)
    const totalSupplierPayables = suppliers.reduce((sum, s) => sum + (s.balance_due || 0), 0);

    // Total Payables (Suppliers + Customers jinko wapis karna hai)
    // Business mein yeh dono "Liabilities" hain.
    const totalLiabilities = totalSupplierPayables + totalCustomerCredits;

    // stockCounts upar Step 1 mein pehle hi calculate ho chuka hai.

    const lowStockItems = products
        .map(product => ({
            ...product,
            quantity: stockCounts[product.id] || 0 
        }))
        .filter(p => p.quantity <= threshold)
        .slice(0, 5);

    // 9. Recent Sales (Optimized Lookup)
    const recentSales = sales
        .sort((a, b) => new Date(b.sale_date || b.created_at) - new Date(a.sale_date || a.created_at))
        .slice(0, 5)
        .map(s => ({
            key: s.id,
            id: s.id,
            date: s.sale_date || s.created_at,
            amount: s.total_amount,
            payment_status: s.payment_status || 'paid',
            customer: customerNameMap[s.customer_id] || 'Walk-in Customer'
        }));

    // 10. Top Selling & Most Profitable (Optimized: Using Frozen Purchase Price)
    const productSalesMap = {};

    saleItems.forEach(item => {
        const pid = item.product_id;
        
        // Professional Tareeqa: Seedha sale_item mein mojud purchase_price use karein
        // Is se database par bojh khatam ho jata hai aur profit hamesha sahi rehta hai
        const costOfThisItem = Number(item.purchase_price) || 0;
        const profit = (Number(item.price_at_sale) - costOfThisItem) * (item.quantity || 1);

        if (!productSalesMap[pid]) {
            productSalesMap[pid] = { qty: 0, profit: 0 };
        }
        productSalesMap[pid].qty += (item.quantity || 1);
        productSalesMap[pid].profit += profit;
    });

    // Tezi ke liye pehle hi Products ki ek list (Map) bana lein
    const productMap = {};
    products.forEach(p => { productMap[String(p.id)] = p; });

    const topSellingProducts = Object.keys(productSalesMap)
        .map(pid => {
            // Poore table mein dhoondne ke bajaye seedha list (Map) se uthayen
            const prod = productMap[String(pid)];
            return {
                name: prod ? prod.name : 'Unknown Item',
                totalSold: productSalesMap[pid].qty,
                totalProfit: productSalesMap[pid].profit
            };
        });
        // Note: Sorting ab hum Dashboard.jsx mein filter ke mutabiq karenge

    return {
        totalSales: netSalesCurrent,
        totalReturnFees: totalReturnFeesCurrent,
        salesGrowth,
        cashInHand,
        bankBalance,
        totalExpenses: totalExpensesCurrent,
        expensesGrowth,
        expenseBreakdown,
        grossProfit: grossProfitCurrent,
        netProfit: netProfitCurrent,
        profitMargin: netSalesCurrent > 0 ? (netProfitCurrent / netSalesCurrent) * 100 : 0,
        
        totalReceivables, 
        totalPayables: totalLiabilities, 
        totalInventoryValue,
        totalCustomerCredits, 
        
        lowStockItems,
        totalProducts: products.length,
        recentSales,
        topSellingProducts
    };
  },

  async getLast7DaysSales() {
    // 1. Sirf pichle 7 din ka data mangwayenge
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const dateLimit = sevenDaysAgo.toISOString();

    const sales = await db.sales.where('created_at').aboveOrEqual(dateLimit).toArray();
    const returns = await db.sale_returns.where('created_at').aboveOrEqual(dateLimit).toArray();
    
    const map = {};
    
    // 2. Pichle 7 din ka map banayein
    for(let i=6; i>=0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        map[dateStr] = 0;
    }

    // 3. Sales Jama (Add) karein
    sales.forEach(s => {
        const dateStr = (s.sale_date || s.created_at).split('T')[0];
        if (map[dateStr] !== undefined) {
            map[dateStr] += (s.total_amount || 0);
        }
    });

    // 4. Returns Manfi (Subtract) karein <--- NAYA STEP
    returns.forEach(r => {
        const dateStr = (r.created_at).split('T')[0];
        if (map[dateStr] !== undefined) {
            map[dateStr] -= (r.total_refund_amount || 0);
        }
    });

    // 5. Data wapis karein (Math.max use kiya taake graph negative mein na jaye)
    return Object.keys(map).sort().map(date => ({
        date, 
        amount: Math.max(0, map[date]) 
    }));
  },

  async getOrCreateWalkInCustomer() {
    // 1. Pehle Local DB mein check karein
    let walkIn = await db.customers
        .filter(c => c.name === 'Walk-in Customer')
        .first();

    // 2. Agar nahi mila, to naya banayein
    if (!walkIn) {
        const newCustomer = {
            name: 'Walk-in Customer',
            phone_number: '0000000000',
            address: 'General Customer',
            balance: 0
        };
        // Hum apna hi addCustomer function use karenge jo Sync Queue handle karta hai
        walkIn = await this.addCustomer(newCustomer);
    }
    
    return walkIn;
  },

  // --- WARRANTY & CLAIMS FUNCTIONS ---

  // 1. Saare claims ki list mangwana
  async getWarrantyClaims() {
    const claims = await db.warranty_claims.toArray();
    // local_id ke zariye duplicates khatam karein (Deduplication)
    const uniqueMap = {};
    claims.forEach(c => { uniqueMap[c.local_id] = c; });
    
    return Object.values(uniqueMap).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  },

  // 2. Naya claim register karna
  async addWarrantyClaim(claimData) {
    if (!claimData.id) claimData.id = crypto.randomUUID();
    claimData.local_id = claimData.id;
    claimData.created_at = new Date().toISOString();
    claimData.updated_at = new Date().toISOString();

    await db.warranty_claims.add(claimData);
    await db.sync_queue.add({
      table_name: 'warranty_claims',
      action: 'create',
      data: claimData
    });
    return claimData;
  },

  // 3. Claim ka status tabdeel karna (e.g. Sent to Supplier)
  async updateWarrantyClaimStatus(id, newStatus) {
    const updatedAt = new Date().toISOString();
    await db.warranty_claims.update(id, { status: newStatus, updated_at: updatedAt });
    const updatedClaim = await db.warranty_claims.get(id);
    
    await db.sync_queue.add({
      table_name: 'warranty_claims',
      action: 'update',
      data: updatedClaim
    });
    return true;
  },

  // 4. IMEI scan karke mobile ki history nikalna (UPDATED LOGIC)
  async lookupItemByIMEI(imei) {
    // A. Inventory mein mobile dhoondein
    const item = await db.inventory.where('imei').equals(imei).first();
    if (!item) return null;

    // B. Product ka naam aur brand layein
    const product = await db.products.get(item.product_id);
    
    // C. Supplier ki maloomat
    const supplier = item.supplier_id ? await db.suppliers.get(item.supplier_id) : null;

    // D. Check karein ke Item ka Status kya hai?
    let saleItem = null;
    let saleDetails = null;
    let customer = null;

    // Agar item 'Sold' hai, tab hi hum Sale dhoondenge.
    // Agar 'Available' hai (yani return ho chuka hai), to hum sale nahi dikhayenge.
    if (item.status === 'Sold') {
        saleItem = await db.sale_items
            .filter(si => String(si.inventory_id) === String(item.id))
            .reverse() // Aakhri sale uthayen
            .first();
            
        if (saleItem) {
            saleDetails = await db.sales.get(saleItem.sale_id);
            if (saleDetails && saleDetails.customer_id) {
                customer = await db.customers.get(saleDetails.customer_id);
            }
        }
    }

    // Agar item Available hai, to Customer null hona chahiye
    if (item.status === 'Available') {
        customer = null;
        saleDetails = null;
    }

    return { item, product, saleItem, saleDetails, supplier, customer };
  },

  // 5. Claim delete karna
  async deleteWarrantyClaim(id) {
    await db.warranty_claims.delete(id);
    await db.sync_queue.add({
      table_name: 'warranty_claims',
      action: 'delete',
      data: { id }
    });
    return true;
  },

  // 6. Invoice ID se warranty check karna (Bulk items ke liye)
  async lookupByInvoice(invoiceId) {
    // Pehle Short ID (A-1234) se dhoondein
    let sale = await db.sales.where('invoice_id').equals(invoiceId).first();
    
    // Agar na mile, to UUID se dhoondein
    if (!sale) {
        sale = await db.sales.get(invoiceId);
    }
    
    if (!sale) return null;

    const customer = await db.customers.get(sale.customer_id);
    const saleItems = await db.sale_items.where('sale_id').equals(sale.id).toArray();

    const itemsWithDetails = await Promise.all(saleItems.map(async (si) => {
        const product = await db.products.get(si.product_id);
        const inv = await db.inventory.get(si.inventory_id);
        // Supplier details bhi nikaalain
        const supplier = inv?.supplier_id ? await db.suppliers.get(inv.supplier_id) : null;
        return { saleItem: si, product, inventory: inv, supplier };
    }));

    return { sale, customer, items: itemsWithDetails };
  },

  // 7. Damaged Stock Report mangwana
  async getDamagedStockReport() {
    // Yehi woh line thi jo Dexie ko ghalat ID bhej rahi thi.
    // Hum sirf filter kar rahe hain, is liye yeh code theek hai.
    const damagedItems = await db.inventory.filter(i => (i.damaged_qty || 0) > 0).toArray();
    
    // Pehle hi saare products aur suppliers fetch kar lete hain
    const productIds = damagedItems.map(i => i.product_id).filter(id => id);
    const supplierIds = damagedItems.map(i => i.supplier_id).filter(id => id);
    
    // Batch fetching logic (UUIDs ke saath)
    const [allProducts, allSuppliers] = await Promise.all([
        db.products.where('id').anyOf(productIds).toArray(),
        db.suppliers.where('id').anyOf(supplierIds).toArray()
    ]);

    const productMap = {};
    allProducts.forEach(p => productMap[p.id] = p);
    const supplierMap = {};
    allSuppliers.forEach(s => supplierMap[s.id] = s);

    const report = damagedItems.map((item) => {
      const product = productMap[item.product_id];
      const supplier = supplierMap[item.supplier_id];
      
      return {
        ...item,
        product_name: product?.name || 'Unknown',
        brand: product?.brand || '',
        supplier_name: supplier?.name || 'N/A',
        invoice_id: item.purchase_id, // Purchase ID bhi ab UUID hai
        total_loss: (item.damaged_qty || 0) * (item.purchase_price || 0)
      };
    });
    return report.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
  },

  // 8. Damaged Stock ko wapis theek karna (Undo Adjustment)
  async revertDamagedStock(inventoryId, qtyToRevert) {
    // 1. Local DB se item nikalain (ID ab UUID hai, parseInt ki zaroorat nahi)
    const item = await db.inventory.get(inventoryId);
    if (!item) throw new Error("Item not found.");

    // 2. Check karein ke kya itni quantity bachi bhi hai?
    if (qtyToRevert > item.damaged_qty) {
      throw new Error("Invalid revert quantity.");
    }

    const updates = {
      available_qty: (item.available_qty || 0) + qtyToRevert,
      damaged_qty: (item.damaged_qty || 0) - qtyToRevert,
      status: 'Available', // Wapis bechne ke liye tayyar
      updated_at: new Date().toISOString()
    };

    // 5. Local Update
    await db.inventory.update(inventoryId, updates);

    // 6. Sync Queue mein daalain (Server update ke liye)
    await db.sync_queue.add({
      table_name: 'inventory',
      action: 'update',
      data: { id: inventoryId, ...updates }
    });

    return true;
  },

};

export default DataService;