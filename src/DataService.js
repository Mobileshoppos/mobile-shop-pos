import { supabase } from './supabaseClient';
import { db } from './db';
import { generateInvoiceId } from './utils/idGenerator';
import { checkSupabaseConnection } from './utils/connectionCheck';
import { getPlanLimits } from './config/subscriptionPlans';
import dayjs from 'dayjs';
import bcrypt from 'bcryptjs';
import { encryptData, decryptData } from './utils/cryptoUtils'; // <--- NAYA IZAFA

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
  // 1. Local settings se profile uthayein
  const profile = await db.user_settings.toCollection().first();
  if (!profile) return; // Profile nahi to check skip

  // 2. Control Center se Limits mangwayein
  const limits = getPlanLimits(profile.subscription_tier);

  // 3. Mojooda stock ginein (Available items)
  const allInventory = await db.inventory.where('status').anyOf('Available', 'available').toArray();
  const currentStock = allInventory.reduce((sum, item) => sum + (Number(item.available_qty) || 0), 0);
  const totalAfterAdd = currentStock + newItemsCount;

  // 4. Check karein ke kya limit cross ho rahi hai?
  if (totalAfterAdd > limits.max_items) {
    const errorMsg = `Subscription Limit Reached: Your plan (${limits.name}) allows ${limits.max_items} items. You currently have ${currentStock}. Adding ${newItemsCount} more will exceed the limit. Please upgrade.`;
    throw new Error(errorMsg);
  }
};

const DataService = {
  isInitializing: false,
  isInitializing: false,
  async initializeUserCategories(userId) {
    if (!userId || DataService.isInitializing) return;
    DataService.isInitializing = true; // Lock lag gaya

    // Li-Fi Fix: Connection check
    const hasInternet = await checkSupabaseConnection();
    if (!hasInternet) {
      DataService.isInitializing = false;
      return;
    }

    try {
      // 1. Server se check karein ke kya pehle hi setup ho chuka hai?
      const { data: profile, error: profError } = await supabase
        .from('profiles')
        .select('categories_initialized')
        .eq('user_id', userId)
        .single();

      if (profError || profile?.categories_initialized) {
        DataService.isInitializing = false; // Kaam ho chuka hai, lock khol dein
        return;
      }

      console.log("Starting safe initialization...");

      // 2. PRODUCT CATEGORIES SETUP
      for (const catTemplate of DEFAULT_CATEGORIES) {
        // [IMPORTANT]: Har category ko add karne se pehle DB mein check karein
        const alreadyExists = await db.categories
          .where('name').equals(catTemplate.name)
          .and(c => c.user_id === userId)
          .first();

        if (alreadyExists) continue; // Agar Call 1 ne bana di hai, to Call 2 yahan ruk jayegi

        const categoryId = crypto.randomUUID();
        const categoryData = {
          id: categoryId,
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

      // 3. EXPENSE CATEGORIES SETUP
      for (const expCat of DEFAULT_EXPENSE_CATEGORIES) {
        // [IMPORTANT]: Dobara check karein taake duplicate na ho
        const alreadyExists = await db.expense_categories
          .filter(c => c.name === expCat.name && c.user_id === userId)
          .first();

        if (alreadyExists) continue;

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

      // 4. Server par flag update kar dein
      await supabase.from('profiles').update({ categories_initialized: true }).eq('user_id', userId);
      console.log("Safe Initialization complete.");
      
    } catch (error) {
      console.error("Initialization failed:", error);
    } finally {
      DataService.isInitializing = false; // Aakhir mein lock khol dein
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
  async markItemAsDamaged(inventoryIds, totalQtyToMark, notes = "", staffId = null) {
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
        staff_id: staffId, // <--- NAYA IZAFA
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
    
    // Har supplier ka asli balance ledger se nikaalna
    const suppliersWithCalculatedBalance = await Promise.all(allSuppliers.map(async (s) => {
        const purchases = await db.purchases.where('supplier_id').equals(s.id).toArray();
        const payments = await db.supplier_payments.where('supplier_id').equals(s.id).toArray();
        const refunds = await db.supplier_refunds.where('supplier_id').equals(s.id).toArray();

        const totalBusiness = purchases.reduce((sum, p) => sum + (p.total_amount || 0), 0);
        const totalPaid = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
        const totalRefunds = refunds.reduce((sum, r) => sum + (r.amount || 0), 0);

        const netPaid = totalPaid - totalRefunds;
        const diff = totalBusiness - netPaid;

        return {
            ...s,
            balance_due: diff > 0 ? diff : 0,
            credit_balance: diff < 0 ? Math.abs(diff) : 0
        };
    }));

    const suppliers = suppliersWithCalculatedBalance.filter(s => {
      if (showArchivedOnly) {
        return s.is_active === false;
      } else {
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
        staff_id: purchasePayload.staff_id, // <--- NAYA IZAFA
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
      staff_id: salePayload.staff_id,
      register_id: salePayload.register_id,
      session_id: salePayload.session_id,
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
        // Multi-Counter Binding (NAYA)
        register_id: paymentData.register_id || (localStorage.getItem('active_register_session') ? JSON.parse(localStorage.getItem('active_register_session')).register_id : null),
        session_id: paymentData.session_id || (localStorage.getItem('active_register_session') ? JSON.parse(localStorage.getItem('active_register_session')).id : null),
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
    // Agar Edit karte waqt ID khali ho jaye, to purani ID hi istemal karein
    const finalInvoiceId = invoice_id || purchaseToUpdate.invoice_id;

    await db.purchases.update(purchaseId, {
        supplier_id,
        invoice_id: finalInvoiceId,
        notes,
        total_amount: newTotal,
        amount_paid,
        balance_due: newBalance,
        status: newStatus,
        staff_id: payload.staff_id // <--- NAYA IZAFA
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
            const newItemId = item.id || crypto.randomUUID();
            itemsToCreate.push({
                id: newItemId,
                local_id: item.local_id || newItemId,
                purchase_id: purchaseId,
                product_id: item.product_id,
                quantity: Number(item.quantity) || 1,
                available_qty: Number(item.quantity) || 1,
                sold_qty: 0,
                returned_qty: 0,
                damaged_qty: 0,
                purchase_price: item.purchase_price,
                sale_price: item.sale_price,
                imei: item.imei,
                item_attributes: item.item_attributes,
                user_id: purchaseToUpdate.user_id,
                status: 'Available',
                supplier_id: supplier_id
            });
            // Sync queue ke liye ID update kar dein taake mismatch na ho
            item.id = newItemId;
            item.local_id = item.local_id || newItemId;
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
        let updatedBalance = (supplier.balance_due || 0) - oldTotal + newTotal;
        let updatedCredit = supplier.credit_balance || 0;
        
        // Agar balance negative ho jaye, to usay credit (advance) mein shift karein
        if (updatedBalance < 0) {
            updatedCredit += Math.abs(updatedBalance);
            updatedBalance = 0;
        }
        
        await db.suppliers.update(supplier_id, { 
            balance_due: updatedBalance,
            credit_balance: updatedCredit
        });
    }

    // 6. Sync Queue
    await db.sync_queue.add({
        table_name: 'purchases',
        action: 'update_full_purchase',
        data: {
            id: purchaseId,
            p_local_id: crypto.randomUUID(),
            invoice_id: finalInvoiceId, 
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
    const paymentWithId = { 
        ...paymentData, 
        id: localId, 
        local_id: localId,
        // Multi-Counter Binding (NAYA)
        register_id: paymentData.register_id || (localStorage.getItem('active_register_session') ? JSON.parse(localStorage.getItem('active_register_session')).register_id : null),
        session_id: paymentData.session_id || (localStorage.getItem('active_register_session') ? JSON.parse(localStorage.getItem('active_register_session')).id : null)
    };

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
        // Multi-Counter Binding (NAYA)
        register_id: refundData.register_id || (localStorage.getItem('active_register_session') ? JSON.parse(localStorage.getItem('active_register_session')).register_id : null),
        session_id: refundData.session_id || (localStorage.getItem('active_register_session') ? JSON.parse(localStorage.getItem('active_register_session')).id : null),
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
        let refundAmt = Number(finalRefundData.amount);
        let newCredit = (supplier.credit_balance || 0);
        let newBalance = (supplier.balance_due || 0);

        // Pehle Credit balance se raqam nikaalein
        if (newCredit > 0) {
            const takeFromCredit = Math.min(newCredit, refundAmt);
            newCredit -= takeFromCredit;
            refundAmt -= takeFromCredit;
        }

        // Agar ab bhi refund bacha hai aur koi negative balance (noise) hai, to usay saaf karein
        if (refundAmt > 0 && newBalance < 0) {
            newBalance = Math.min(0, newBalance + refundAmt);
        }

        await db.suppliers.update(finalRefundData.supplier_id, {
            credit_balance: Math.max(0, newCredit),
            balance_due: newBalance
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
    // --- PLAN GUARD: Free users ko dummy data do (Marketing) ---
    const settings = await db.user_settings.toCollection().first();
    if (!settings || settings.subscription_tier === 'free') return { totalRevenue: 155000, totalRefunds: 5000, totalCost: 95000, damagedLoss: 2000, grossProfit: 55000, totalExpenses: 15000, netProfit: 40000 };
    // --------------------------------------------
    const start = new Date(startDateStr).getTime();
    // End date ko us din ke bilkul aakhir (23:59:59) tak set kiya taake aaj ka data mis na ho
    const end = new Date(endDateStr).setHours(23, 59, 59, 999);

    // A. Revenue (Sales)
    const allSales = await db.sales.toArray();
    const filteredSales = allSales.filter(s => {
      const d = new Date(s.sale_date || s.created_at).getTime();
      return d >= start && d <= end;
    });
    // --- NAYA IZAFA: Tax ko munafay (revenue) se nikalna ---
    const totalRevenueFromSales = precise(filteredSales.reduce((sum, s) => sum + ((s.total_amount || 0) - (s.tax_amount || 0)), 0));

    // B. Returns (Refunds)
    const allReturns = await db.sale_returns.toArray();
    const filteredReturns = allReturns.filter(r => {
      const d = new Date(r.created_at).getTime();
      return d >= start && d <= end;
    });
    // --- NAYA IZAFA: Tax refund ko bhi nikalna ---
    const totalRefunds = precise(filteredReturns.reduce((sum, r) => sum + ((r.total_refund_amount || 0) - (r.tax_refunded || 0)), 0));
    
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
            // [FIX]: Schema Error theek kiya. Pehle sale_id se dhoondein phir filter karein.
        const sItem = await db.sale_items
            .where('sale_id').equals(rItem.sale_id || '')
            .filter(si => si.inventory_id === rItem.inventory_id)
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

    // --- NAYA IZAFA: Date-wise Damaged Stock Loss ---
    const allInventory = await db.inventory.toArray();
    const damagedInRange = allInventory.filter(i => {
        const d = new Date(i.updated_at).getTime();
        return Number(i.damaged_qty || 0) > 0 && d >= start && d <= end;
    });
    const damagedLoss = precise(damagedInRange.reduce((sum, i) => sum + (Number(i.purchase_price || 0) * Number(i.damaged_qty || 0)), 0));

    // F. Final Calculation (Damaged Loss ko Net Profit se minus kiya gaya)
    const grossProfit = totalRevenue - totalCost;
    const netProfit = precise(grossProfit - totalExpenses - damagedLoss);

    return {
      totalRevenue,
      totalRefunds,
      totalCost,
      damagedLoss, // <--- Reports page ko bhejne ke liye
      grossProfit,
      totalExpenses,
      netProfit
    };
  },

  // --- NAYA IZAFA: Reports Overview ke liye Data ---
  async getReportsOverview(startDateStr, endDateStr) {
    // --- PLAN GUARD: Free users ko dummy data do (Marketing) ---
    const settings = await db.user_settings.toCollection().first();
    if (!settings || settings.subscription_tier === 'free') return { totalRevenue: 155000, totalRefunds: 5000, totalCost: 95000, damagedLoss: 2000, grossProfit: 55000, totalExpenses: 15000, netProfit: 40000, totalReceivables: 85000, totalPayables: 42000, totalInventoryValue: 1250000 };
    // --------------------------------------------
    // 1. Profit & Loss ka data purane function se lein
    const plSummary = await this.getProfitLossSummary(startDateStr, endDateStr);

    // 2. Udhaar (Receivables & Payables) - Yeh current snapshot hota hai
    let totalReceivables = 0;
    let totalPayables = 0;
    
    // Customers jinhone hamare paise dene hain
    await db.customers.each(c => { 
        if ((c.balance || 0) > 0) totalReceivables += c.balance; 
    });
    
    // Suppliers jinko hamne paise dene hain
    await db.suppliers.each(s => { 
        if ((s.balance_due || 0) > 0) totalPayables += s.balance_due; 
    });

    // 3. Dukan mein is waqt kitne ka maal (Stock) para hai
    let totalInventoryValue = 0;
    await db.inventory.where('status').anyOf('Available', 'available').each(item => {
        if (item.available_qty > 0) {
            totalInventoryValue += (Number(item.purchase_price) || 0) * item.available_qty;
        }
    });

    return {
        ...plSummary,
        totalReceivables,
        totalPayables,
        totalInventoryValue
    };
  },

  // --- FINAL FIX: Synchronized Sales & Revenue Report (No Reference Errors) ---
  async getSalesAndRevenueReport(startDateStr, endDateStr) {
    // --- PLAN GUARD: Free users ko dummy data do (Marketing) ---
    const settings = await db.user_settings.toCollection().first();
    if (!settings || settings.subscription_tier === 'free') {
      const dummyTrend = Array.from({length: 15}, (_, i) => ({ date: `2024-01-${i+1}`, amount: Math.floor(Math.random() * 5000) + 2000, profit: Math.floor(Math.random() * 1000) + 500 }));
      return { categoryBreakdown: [{category: 'Smartphones', revenue: 85000, profit: 12000}, {category: 'Accessories', revenue: 25000, profit: 8000}], cashSales: 70000, bankSales: 40000, totalTaxCollected: 11000, totalTaxRefunded: 500, netTax: 10500, staffPerformance: [{name: 'Salesman A', total_sales: 50000, items_sold: 20}, {name: 'Salesman B', total_sales: 35000, items_sold: 15}], topProductsByQty: [], topProductsByRev: [], topProductsByProfit: [], salesTrend: dummyTrend };
    }
    // --------------------------------------------
    const start = new Date(startDateStr).getTime();
    const end = new Date(endDateStr).getTime() + (24 * 60 * 60 * 1000) - 1;

    // 1. Basic Data Fetching
    const allSales = await db.sales.toArray();
    const filteredSales = allSales.filter(s => {
      const d = new Date(s.sale_date || s.created_at).getTime();
      return d >= start && d <= end;
    });

    const allReturns = await db.sale_returns.toArray();
    const filteredReturns = allReturns.filter(r => {
      const d = new Date(r.created_at).getTime();
      return d >= start && d <= end;
    });

    const saleIds = filteredSales.map(s => s.id);
    const saleItems = await db.sale_items.where('sale_id').anyOf(saleIds).toArray();
    
    const returnIds = filteredReturns.map(r => r.id);
    const returnedItems = returnIds.length > 0 ? await db.sale_return_items.where('return_id').anyOf(returnIds).toArray() : [];

    // 2. Net Revenue Calculation (Subtracting Returns)
    const totalRefunds = filteredReturns.reduce((sum, r) => sum + ((r.total_refund_amount || 0) - (r.tax_refunded || 0)), 0);
    
    let cashSales = 0;
    let bankSales = 0;
    filteredSales.forEach(s => {
      const amount = (s.total_amount || 0) - (s.tax_amount || 0);
      if (s.payment_method === 'Cash') cashSales += amount;
      else bankSales += amount;
    });
    
    const totalRawSales = cashSales + bankSales;
    if (totalRawSales > 0) {
        const cashRatio = cashSales / totalRawSales;
        const bankRatio = bankSales / totalRawSales;
        cashSales -= (totalRefunds * cashRatio);
        bankSales -= (totalRefunds * bankRatio);
    }

    // 3. Tax Summary
    const totalTaxCollected = filteredSales.reduce((sum, s) => sum + (s.tax_amount || 0), 0);
    const totalTaxRefunded = filteredReturns.reduce((sum, r) => sum + (r.tax_refunded || 0), 0);
    const netTax = totalTaxCollected - totalTaxRefunded;

    // 4. Staff Performance Logic
    const staffMembers = await db.staff_members.toArray();
    const staffMap = {};
    staffMembers.forEach(st => { staffMap[st.id] = st.name; });

    const staffPerformanceMap = {};
    const saleToStaffMap = {};

    filteredSales.forEach(s => {
      const staffName = s.staff_id ? (staffMap[s.staff_id] || 'Unknown Staff') : 'Owner / Admin';
      saleToStaffMap[s.id] = staffName;
      if (!staffPerformanceMap[staffName]) {
        staffPerformanceMap[staffName] = { name: staffName, total_sales: 0, sale_count: 0, items_sold: 0, profit: 0 };
      }
      staffPerformanceMap[staffName].sale_count += 1;
      staffPerformanceMap[staffName].total_sales += ((s.total_amount || 0) - (s.tax_amount || 0));
    });

    // Returns ko staff se minus karein
    filteredReturns.forEach(r => {
        const staffName = r.staff_id ? (staffMap[r.staff_id] || 'Unknown Staff') : 'Owner / Admin';
        if (staffPerformanceMap[staffName]) {
            staffPerformanceMap[staffName].total_sales -= ((r.total_refund_amount || 0) - (r.tax_refunded || 0));
        }
    });

    saleItems.forEach(item => {
      const staffName = saleToStaffMap[item.sale_id];
      if (staffName && staffPerformanceMap[staffName]) {
          staffPerformanceMap[staffName].items_sold += (item.quantity || 1);
          const cost = (Number(item.purchase_price) || 0) * (item.quantity || 1);
          const revenue = (Number(item.price_at_sale) || 0) * (item.quantity || 1);
          staffPerformanceMap[staffName].profit += (revenue - cost);
      }
    });

    // Yeh line define karti hai staffPerformance ko (Jo pehle miss ho gayi thi)
    const staffPerformance = Object.values(staffPerformanceMap).sort((a, b) => b.total_sales - a.total_sales);

    // 5. Top Selling Products Logic
    const productSalesMap = {};
    const products = await db.products.toArray();
    const productMap = {};
    products.forEach(p => { 
      productMap[p.id] = p.name; 
      productMap[p.id + '_cat'] = p.category_id; 
    });
    
    const categoriesData = await db.categories.toArray();
    const catIdToNameMap = {};
    categoriesData.forEach(c => catIdToNameMap[c.id] = c.name);

    saleItems.forEach(item => {
      const pName = productMap[item.product_id] || item.product_name_snapshot || 'Unknown Product';
      if (!productSalesMap[pName]) {
        const catId = productMap[item.product_id + '_cat'];
        productSalesMap[pName] = { name: pName, qty: 0, revenue: 0, profit: 0, category: catIdToNameMap[catId] || 'Other' };
      }
      const qty = item.quantity || 1;
      const rev = qty * (Number(item.price_at_sale) || 0);
      const cost = qty * (Number(item.purchase_price) || 0);
      productSalesMap[pName].qty += qty;
      productSalesMap[pName].revenue += rev;
      productSalesMap[pName].profit += (rev - cost);
    });

    // Returned items ko products se minus karein
    for (const rItem of returnedItems) {
        const product = await db.products.get(rItem.product_id);
        const pName = product?.name || 'Unknown Product';
        if (productSalesMap[pName]) {
            const qty = rItem.quantity || 1;
            const rev = qty * (Number(rItem.price_at_return) || 0);
            const inv = await db.inventory.get(rItem.inventory_id);
            const cost = qty * (Number(inv?.purchase_price) || 0);
            productSalesMap[pName].qty -= qty;
            productSalesMap[pName].revenue -= rev;
            productSalesMap[pName].profit -= (rev - cost);
        }
    }

    const allProductStats = Object.values(productSalesMap);
    const topProductsByQty = [...allProductStats].sort((a, b) => b.qty - a.qty).slice(0, 10);
    const topProductsByRev = [...allProductStats].sort((a, b) => b.revenue - a.revenue).slice(0, 10);
    const topProductsByProfit = [...allProductStats].sort((a, b) => b.profit - a.profit).slice(0, 10);

    // 6. Category Breakdown Logic
    const categoryBreakdownMap = {};
    allProductStats.forEach(p => {
        if (!categoryBreakdownMap[p.category]) categoryBreakdownMap[p.category] = { revenue: 0, profit: 0 };
        categoryBreakdownMap[p.category].revenue += p.revenue;
        categoryBreakdownMap[p.category].profit += p.profit;
    });

    const categoryBreakdown = Object.keys(categoryBreakdownMap).map(name => ({
      category: name,
      revenue: categoryBreakdownMap[name].revenue,
      profit: categoryBreakdownMap[name].profit
    }));

    // 7. Daily Trend Logic (Continuous Timeline)
    const dailyMap = {};
    const dailyProfitMap = {};
    
    filteredSales.forEach(s => {
      const dateKey = new Date(s.sale_date || s.created_at).toISOString().split('T')[0];
      if (!dailyMap[dateKey]) { dailyMap[dateKey] = 0; dailyProfitMap[dateKey] = 0; }
      dailyMap[dateKey] += ((s.total_amount || 0) - (s.tax_amount || 0));
    });
    
    filteredReturns.forEach(r => {
        const dateKey = new Date(r.created_at).toISOString().split('T')[0];
        if (dailyMap[dateKey] !== undefined) dailyMap[dateKey] -= ((r.total_refund_amount || 0) - (r.tax_refunded || 0));
    });

    const salesTrend = [];
    let loopDate = new Date(startDateStr);
    let endLimit = new Date(endDateStr);
    while (loopDate <= endLimit) {
      const dateStr = loopDate.toISOString().split('T')[0];
      let dayProfit = 0;
      const daySales = filteredSales.filter(s => new Date(s.sale_date || s.created_at).toISOString().split('T')[0] === dateStr);
      const daySaleIds = daySales.map(s => s.id);
      const dayItems = saleItems.filter(si => daySaleIds.includes(si.sale_id));
      dayItems.forEach(i => { dayProfit += ((i.quantity || 1) * (i.price_at_sale - i.purchase_price)); });
      const dayReturns = filteredReturns.filter(r => new Date(r.created_at).toISOString().split('T')[0] === dateStr);
      dayReturns.forEach(r => { dayProfit -= ((r.total_refund_amount || 0) - (r.tax_refunded || 0)); });

      salesTrend.push({ date: dateStr, amount: dailyMap[dateStr] || 0, profit: dayProfit });
      loopDate.setDate(loopDate.getDate() + 1);
    }

    return {
      categoryBreakdown,
      cashSales,
      bankSales,
      totalTaxCollected,
      totalTaxRefunded,
      netTax,
      staffPerformance,
      topProductsByQty,
      topProductsByRev,
      topProductsByProfit,
      salesTrend
    };
  },

  // --- FINAL FIX: Professional Profit & Loss Report (No Reference Errors) ---
  async getDetailedProfitLossReport(startDateStr, endDateStr) {
    // --- PLAN GUARD: Free users ko dummy data do (Marketing) ---
    const settings = await db.user_settings.toCollection().first();
    if (!settings || settings.subscription_tier === 'free') {
      const dummyProfitTrend = Array.from({length: 10}, (_, i) => ({ date: `${i+1} Mar`, profit: Math.floor(Math.random() * 2000) + 1000, expense: Math.floor(Math.random() * 500) + 200 }));
      return { totalRevenue: 155000, totalRefunds: 5000, totalCost: 95000, damagedLoss: 2000, grossProfit: 55000, totalExpenses: 15000, netProfit: 40000, profitTrend: dummyProfitTrend, expenseBreakdown: [{category: 'Rent', amount: 8000}, {category: 'Electricity', amount: 3000}], profitMargin: 25.8 };
    }
    // --------------------------------------------
    const start = new Date(startDateStr);
    const end = new Date(endDateStr);
    const startTime = start.getTime();
    const endTime = end.getTime() + (24 * 60 * 60 * 1000) - 1;

    // 1. Basic P&L Summary (Revenue, COGS, Net Profit)
    const plSummary = await this.getProfitLossSummary(startDateStr, endDateStr);

    // 2. Fetch Sales Data (Profit Trend ke liye)
    const sales = await db.sales.where('created_at').between(new Date(startTime).toISOString(), new Date(endTime).toISOString()).toArray();
    const saleIds = sales.map(s => s.id);
    const saleItems = await db.sale_items.where('sale_id').anyOf(saleIds).toArray();
    
    const dailyProfitMap = {};
    const saleDateMap = {};
    sales.forEach(s => {
      saleDateMap[s.id] = new Date(s.sale_date || s.created_at).toISOString().split('T')[0];
    });

    saleItems.forEach(item => {
      const dateKey = saleDateMap[item.sale_id];
      if (dateKey) {
        const qty = item.quantity || 1;
        const rev = qty * (Number(item.price_at_sale) || 0);
        const cost = qty * (Number(item.purchase_price) || 0);
        dailyProfitMap[dateKey] = (dailyProfitMap[dateKey] || 0) + (rev - cost);
      }
    });

    // 3. Fetch Expense Data (Ab yeh sahi waqt par ho raha hai)
    const allExpenses = await db.expenses.toArray();
    const filteredExpenses = allExpenses.filter(e => {
      const d = new Date(e.expense_date).getTime();
      return d >= startTime && d <= endTime;
    });

    // Daily Expenses Map banana
    const dailyExpenseMap = {};
    filteredExpenses.forEach(e => {
      const dKey = new Date(e.expense_date).toISOString().split('T')[0];
      dailyExpenseMap[dKey] = (dailyExpenseMap[dKey] || 0) + (e.amount || 0);
    });

    // 4. Gaps fill karna (Trend Line ke liye) - Profit aur Expense dono shamil
    const profitTrend = [];
    let loopDate = new Date(start);
    while (loopDate <= end) {
      const dateStr = loopDate.toISOString().split('T')[0];
      profitTrend.push({
        date: dayjs(dateStr).format('DD MMM'),
        profit: dailyProfitMap[dateStr] || 0,
        expense: dailyExpenseMap[dateStr] || 0
      });
      loopDate.setDate(loopDate.getDate() + 1);
    }

    // 5. Expense Breakdown (Doughnut Chart ke liye)
    const expenseCategories = await db.expense_categories.toArray();
    const expenseCatMap = {};
    expenseCategories.forEach(c => expenseCatMap[c.id] = c.name);

    const expMap = {};
    const expCountMap = {}; // Naya map count ke liye
    filteredExpenses.forEach(e => {
      const catName = expenseCatMap[e.category_id] || 'Other';
      expMap[catName] = (expMap[catName] || 0) + (e.amount || 0);
      expCountMap[catName] = (expCountMap[catName] || 0) + 1; // Har entry par +1
    });

    const expenseBreakdown = Object.keys(expMap).map(name => ({
      category: name,
      amount: expMap[name],
      count: expCountMap[name] || 0 // Count bhi shamil kar liya
    })).sort((a, b) => b.amount - a.amount);

    // 6. Profit Margin (Number mein convert kiya taake UI warning na de)
    const profitMargin = plSummary.totalRevenue > 0 
        ? Number(((plSummary.netProfit / plSummary.totalRevenue) * 100).toFixed(1))
        : 0;

    return {
      ...plSummary,
      profitTrend,
      expenseBreakdown,
      profitMargin
    };
  },

  // --- UPDATED: Professional Inventory & Assets Report (With Potential Profit & Brand Logic) ---
  async getInventoryReport() {
    // --- PLAN GUARD: Free users ko dummy data do (Marketing) ---
    const settings = await db.user_settings.toCollection().first();
    if (!settings || settings.subscription_tier === 'free') return { totalUnits: 450, totalAssetValue: 1250000, totalPotentialProfit: 250000, totalDamagedLoss: 4500, categoryValuation: [{name: 'Android', value: 800000, qty: 30}, {name: 'iPhone', value: 400000, qty: 10}], brandValuation: [{name: 'Samsung', value: 500000}, {name: 'Apple', value: 400000}], lowStockItems: [], outOfStockItems: [], slowMovingItems: [] };
    // --------------------------------------------
    const products = await db.products.toArray();
    const categories = await db.categories.toArray();
    const inventory = await db.inventory.where('status').anyOf('Available', 'available').toArray();
    
    // 1. Basic Maps
    const catMap = {};
    categories.forEach(c => catMap[c.id] = c.name);
    
    const productMap = {};
    products.forEach(p => productMap[p.id] = p);

    // 2. Calculation Containers
    const catValuation = {};
    const brandValuation = {};
    let totalPotentialProfit = 0;
    let totalAssetValue = 0;
    let totalUnits = 0;
    const productStock = {};

    // 3. Process Inventory
    inventory.forEach(item => {
        const prod = productMap[item.product_id];
        if (!prod) return;

        const qty = Number(item.available_qty) || 0;
        if (qty <= 0) return; // Agar quantity 0 hai to isay total mein shamil na karein
        
        const purchasePrice = Number(item.purchase_price) || 0;
        const salePrice = Number(item.sale_price) || 0;
        const itemValue = purchasePrice * qty;
        const itemProfit = (salePrice - purchasePrice) * qty;

        totalAssetValue += itemValue;
        totalPotentialProfit += itemProfit;
        totalUnits += qty;

        // Category wise
        const catName = catMap[prod.category_id] || 'Uncategorized';
        if (!catValuation[catName]) catValuation[catName] = { name: catName, value: 0, qty: 0 };
        catValuation[catName].value += itemValue;
        catValuation[catName].qty += qty;

        // Brand wise (Normalized)
        let rawBrand = prod.brand ? prod.brand.trim() : 'No Brand';
        // Pehla harf bara karne ki logic (e.g. apple -> Apple)
        const brandName = rawBrand.charAt(0).toUpperCase() + rawBrand.slice(1).toLowerCase();
        
        if (!brandValuation[brandName]) brandValuation[brandName] = { name: brandName, value: 0, qty: 0, profit: 0 };
        brandValuation[brandName].value += itemValue;
        brandValuation[brandName].qty += qty;
        brandValuation[brandName].profit += itemProfit;

        // Stock tracking
        productStock[prod.id] = (productStock[prod.id] || 0) + qty;
    });

    // 4. Alerts & Lists
    const lowStockItems = products
        .filter(p => (productStock[p.id] || 0) > 0 && (productStock[p.id] || 0) <= 5)
        .map(p => ({ name: p.name, brand: p.brand, qty: productStock[p.id] }));

    const outOfStockItems = products
        .filter(p => p.is_active !== false && (productStock[p.id] || 0) === 0)
        .map(p => ({ name: p.name, brand: p.brand }));

    // Slow Moving: No sales in 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentSales = await db.sale_items.filter(si => new Date(si.created_at || Date.now()) > thirtyDaysAgo).toArray();
    const soldProductIds = new Set(recentSales.map(s => s.product_id));

    const slowMovingItems = products
        .filter(p => (productStock[p.id] || 0) > 0 && !soldProductIds.has(p.id))
        .map(p => ({ name: p.name, brand: p.brand, qty: productStock[p.id] }))
        .slice(0, 10);

    const damaged = await db.inventory.filter(i => Number(i.damaged_qty || 0) > 0).toArray();
    const totalDamagedLoss = damaged.reduce((sum, i) => {
        const qty = Number(i.damaged_qty) || 0;
        const price = Number(i.purchase_price) || 0;
        return sum + (price * qty);
    }, 0);

    return {
        totalUnits,
        totalAssetValue,
        totalPotentialProfit,
        totalDamagedLoss,
        categoryValuation: Object.values(catValuation).sort((a, b) => b.value - a.value),
        brandValuation: Object.values(brandValuation).sort((a, b) => b.value - a.value),
        lowStockItems,
        outOfStockItems,
        slowMovingItems
    };
  },

  // --- FINAL FIX: Professional Ledgers Report (Balanced Aging & Stats) ---
  async getLedgerReport() {
    // --- PLAN GUARD: Free users ko dummy data do (Marketing) ---
    const settings = await db.user_settings.toCollection().first();
    if (!settings || settings.subscription_tier === 'free') return { totalCustomerReceivable: 85000, totalSupplierPayable: 42000, totalCustomerCredits: 5000, staffReceivable: 2000, staffPayable: 15000, grandTotalReceivable: 87000, grandTotalPayable: 62000, netPosition: 25000, customerAging: { current: 50000, mid: 25000, old: 10000 }, supplierAging: { current: 30000, mid: 10000, old: 2000 }, topDebtors: [{name: 'Dummy Customer', balance: 15000}], topCreditCustomers: [], topCreditors: [], topSupplierCredits: [], staffBalances: [] };
    // --------------------------------------------
    const now = dayjs();
    
    // 1. Customers & Actual Balances
    const customers = await db.customers.toArray();
    let totalCustomerReceivable = 0;
    let customerAging = { current: 0, mid: 0, old: 0 };
    
    const debtors = customers
      .filter(c => (c.balance || 0) > 0)
      .map(c => {
        totalCustomerReceivable += c.balance;
        return { id: c.id, name: c.name, balance: c.balance };
      });

    // 2. Correct Aging Logic: Distribute ACTUAL balance across invoice dates
    // Hum har debtor customer ki sales check karenge
    for (const customer of debtors) {
        let remainingBalance = customer.balance;
        const customerSales = await db.sales
            .where('customer_id').equals(customer.id)
            .reverse() // Nayi sales pehle (FIFO for debt)
            .sortBy('created_at');

        for (const s of customerSales) {
            if (remainingBalance <= 0) break;
            
            const unpaidOnInvoice = Math.min(remainingBalance, (s.total_amount || 0));
            const days = now.diff(dayjs(s.created_at), 'day');

            if (days <= 30) customerAging.current += unpaidOnInvoice;
            else if (days <= 60) customerAging.mid += unpaidOnInvoice;
            else customerAging.old += unpaidOnInvoice;

            remainingBalance -= unpaidOnInvoice;
        }
        
        // Agar sales se zyada balance hai (yani koi purana opening balance), usay 'Old' mein daal dein
        if (remainingBalance > 0) {
            customerAging.old += remainingBalance;
        }
    }

    // 3. Suppliers & Aging
    const suppliers = await db.suppliers.toArray();
    let totalSupplierPayable = 0;
    let supplierAging = { current: 0, mid: 0, old: 0 };

    const creditors = suppliers
      .filter(s => (s.balance_due || 0) > 0)
      .map(s => {
        totalSupplierPayable += s.balance_due;
        return { id: s.id, name: s.name, balance: s.balance_due };
      });

    for (const supplier of creditors) {
        let remainingDebt = supplier.balance;
        const supplierPurchases = await db.purchases
            .where('supplier_id').equals(supplier.id)
            .reverse()
            .sortBy('purchase_date');

        for (const p of supplierPurchases) {
            if (remainingDebt <= 0) break;
            const unpaidOnBill = Math.min(remainingDebt, (p.total_amount || 0));
            const days = now.diff(dayjs(p.purchase_date), 'day');

            if (days <= 30) supplierAging.current += unpaidOnBill;
            else if (days <= 60) supplierAging.mid += unpaidOnBill;
            else supplierAging.old += unpaidOnBill;

            remainingDebt -= unpaidOnBill;
        }
        if (remainingDebt > 0) supplierAging.old += remainingDebt;
    }

    // 4. Staff Ledgers
    const staff = await db.staff_members.toArray();
    let staffReceivable = 0;
    let staffPayable = 0;
    staff.forEach(s => {
        const bal = s.balance || 0;
        if (bal < 0) staffReceivable += Math.abs(bal);
        else if (bal > 0) staffPayable += bal;
    });

    // Customer Credits (Negative balances) nikalna
    const customerCreditsData = customers.filter(c => (c.balance || 0) < 0);
    const totalCustomerCredits = Math.abs(customerCreditsData.reduce((sum, c) => sum + (c.balance || 0), 0));

    const grandTotalReceivable = totalCustomerReceivable + staffReceivable;
    // [FIX]: Payables mein Suppliers + Staff Salary + Customer Credits teeno shamil honge
    const grandTotalPayable = totalSupplierPayable + staffPayable + totalCustomerCredits;

    return {
      totalCustomerReceivable,
      totalSupplierPayable,
      totalCustomerCredits, // Yeh ab return hoga
      staffReceivable,
      staffPayable,
      grandTotalReceivable,
      grandTotalPayable,
      staffReceivable,
      staffPayable,
      grandTotalReceivable,
      grandTotalPayable,
      netPosition: grandTotalReceivable - grandTotalPayable,
      customerAging,
      supplierAging,
      topDebtors: debtors.sort((a, b) => b.balance - a.balance).slice(0, 10),
      // [NEW]: Credit Customers (Jin ko paise dene hain)
      topCreditCustomers: customers
        .filter(c => (c.balance || 0) < 0)
        .map(c => ({ id: c.id, name: c.name, balance: Math.abs(c.balance) }))
        .sort((a, b) => b.balance - a.balance).slice(0, 10),
      topCreditors: creditors.sort((a, b) => b.balance - a.balance).slice(0, 10),
      // [NEW]: Supplier Credits (Paisa jo Suppliers se wapis lena hai / Advance)
      topSupplierCredits: suppliers
        .filter(s => (s.credit_balance || 0) > 0)
        .map(s => ({ id: s.id, name: s.name, balance: s.credit_balance }))
        .sort((a, b) => b.balance - a.balance).slice(0, 10),
      // [NEW]: Staff Balances (Lene ya dene wale)
      staffBalances: staff
        .filter(s => (s.balance || 0) !== 0)
        .map(s => ({ id: s.id, name: s.name, balance: s.balance, role: s.role }))
        .sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance)).slice(0, 10)
    };
  },

  // --- UPDATED: Professional Cash & Audit Report (Investigation Grade) ---
  async getCashAuditReport(startDateStr, endDateStr) {
    const start = new Date(startDateStr);
    const end = new Date(endDateStr);
    const startTime = start.getTime();
    const endTime = end.getTime() + (24 * 60 * 60 * 1000) - 1;

    // 1. Fetch Basic Data
    const adjustments = await db.cash_adjustments.toArray();
    const filteredAdjustments = adjustments.filter(a => {
      const d = new Date(a.created_at).getTime();
      return d >= startTime && d <= endTime;
    });

    const closings = await db.register_sessions.filter(s => s.closed_at != null).toArray();
    const filteredClosings = closings.filter(c => {
      const d = new Date(c.closed_at).getTime();
      return d >= startTime && d <= endTime;
    });

    // 2. Cash Flow Categories (In vs Out Analysis)
    let totalIn = 0;
    let totalOut = 0;
    const adjustmentBreakdown = { in: {}, out: {} };

    filteredAdjustments.forEach(a => {
      const amt = Number(a.amount) || 0;
      const type = a.type === 'In' ? 'in' : 'out';
      const method = a.payment_method || 'Cash';
      
      if (a.type === 'In') totalIn += amt;
      else totalOut += amt;

      adjustmentBreakdown[type][method] = (adjustmentBreakdown[type][method] || 0) + amt;
    });

    // 3. Discrepancy Analysis (Shortage vs Surplus)
    let totalShortage = 0;
    let totalSurplus = 0;
    const dailyDiffTrend = [];

    // Loop through filtered closings to find daily trend
    filteredClosings.forEach(c => {
      const diff = Number(c.difference) || 0;
      if (diff < 0) totalShortage += Math.abs(diff);
      else totalSurplus += diff;

      dailyDiffTrend.push({
        date: dayjs(c.closed_at).format('DD MMM'),
        difference: diff
      });
    });

    // 4. Staff Ledger Activity
    const staffLedger = await db.staff_ledger.toArray();
    const filteredStaffLedger = staffLedger.filter(l => {
      const d = new Date(l.entry_date).getTime();
      return d >= startTime && d <= endTime;
    });

    return {
      totalIn,
      totalOut,
      totalShortage,
      totalSurplus,
      netDifference: totalSurplus - totalShortage,
      adjustmentBreakdown,
      dailyDiffTrend: dailyDiffTrend.sort((a, b) => dayjs(a.date).unix() - dayjs(b.date).unix()),
      staffTransactions: filteredStaffLedger.sort((a, b) => new Date(b.entry_date) - new Date(a.entry_date)).slice(0, 15),
      recentClosings: filteredClosings.sort((a, b) => new Date(b.closed_at) - new Date(a.closed_at)).slice(0, 10)
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
    return await db.expense_categories.toArray();
  },

  async addExpense(expenseData) {
    // ID aur User ID set karein
    if (!expenseData.id) expenseData.id = crypto.randomUUID();
    expenseData.local_id = expenseData.id;
    
    // Multi-Counter Binding (NAYA)
    if (!expenseData.register_id && localStorage.getItem('active_register_session')) {
      const session = JSON.parse(localStorage.getItem('active_register_session'));
      expenseData.register_id = session.register_id;
      expenseData.session_id = session.id;
    }

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
    // Local DB se data hamesha return hoga, chahe net ho ya na ho
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

  async getDashboardStats(threshold = 5, timeRange = 'today', customDates =[]) {
    // 1. Date Ranges (Wohi purana logic)
    const now = new Date();
    let currentStart = new Date();
    let currentEnd = new Date(); // NAYA: Custom range ke liye end date
    let previousStart = new Date();
    let previousEnd = new Date();

    if (timeRange === 'custom') {
        if (customDates && customDates.length === 2) {
            // Jab user ne dono dates select kar li hon
            currentStart = new Date(customDates[0]);
            currentStart.setHours(0,0,0,0);
            currentEnd = new Date(customDates[1]);
            currentEnd.setHours(23,59,59,999);
        } else {
            // Jab sirf 'Custom' par click kiya ho magar date select na ki ho (0 stats dikhane ke liye)
            currentStart = new Date('2099-01-01'); // Mustaqbil ki date jahan koi sale nahi
            currentEnd = new Date('2099-01-01');
        }
        previousStart = new Date(currentStart); // Option A: No comparison
        previousEnd = new Date(currentStart);
    } 
    else if (timeRange === 'week') {
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

    // 1. Customers ka hisaab
    await db.customers.each(c => {
        const bal = c.balance || 0;
        if (bal > 0) totalReceivables += bal; // Customer ne dene hain (Udhaar)
        else if (bal < 0) totalCustomerCredits += Math.abs(bal); // Hum ne wapis karne hain (Advance/Return)
        customerNameMap[c.id] = c.name;
    });

    // 2. NAYA: Staff ka hisaab (Salary Due vs Advance)
    let totalStaffPayables = 0;
    await db.staff_members.each(s => {
        const bal = s.balance || 0;
        if (bal > 0) totalStaffPayables += bal; // Salary Due (Hum ne deni hai -> Payable)
        else if (bal < 0) totalReceivables += Math.abs(bal); // Advance diya hua hai (Hum ne lena hai -> Receivable)
    });

    const suppliers = await db.suppliers.toArray();
    const products = await db.products.toArray();

    const inventoryMap = {}; 
    const stockCounts = {};
    let runningInventoryTotal = 0;

    await db.inventory.each(item => {
        const qty = Number(item.available_qty) || 0;
        const price = Number(item.purchase_price) || 0;
        
        // Profit calculation ke liye har item ka data map mein hona chahiye, chahe wo Sold ho ya Available
        inventoryMap[item.id] = item;

        // Lekin "Total Inventory Value" aur "Stock Count" mein sirf Available items ginein
        if (item.status === 'Available' && qty > 0) {
            runningInventoryTotal += (price * qty);
            const pid = item.product_id;
            stockCounts[pid] = (stockCounts[pid] || 0) + qty;
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
        if (sDate >= currentStart && sDate <= currentEnd) { // NAYA: <= currentEnd add kiya
            rawSalesCurrent += ((s.total_amount || 0) - (s.tax_amount || 0)); // <--- NAYA IZAFA (Tax Excluded)
            currentSalesData.push(s);
        } else if (sDate >= previousStart && sDate < (timeRange === 'today' ? previousEnd : currentStart)) {
            rawSalesPrevious += ((s.total_amount || 0) - (s.tax_amount || 0)); // <--- NAYA IZAFA (Tax Excluded)
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
        if (rDate >= currentStart && rDate <= currentEnd) { // NAYA: <= currentEnd add kiya
            rawReturnsCurrent += ((r.total_refund_amount || 0) - (r.tax_refunded || 0)); // <--- NAYA IZAFA (Tax Excluded)
            totalReturnFeesCurrent += (Number(r.return_fee) || 0);
            currentReturnsData.push(r);
        } else if (rDate >= previousStart && rDate < (timeRange === 'today' ? previousEnd : currentStart)) {
            rawReturnsPrevious += ((r.total_refund_amount || 0) - (r.tax_refunded || 0)); // <--- NAYA IZAFA (Tax Excluded)
        }
    });

    const currentExpensesData = expenses.filter(e => {
        const d = new Date(e.expense_date);
        return d >= currentStart && d <= currentEnd; // NAYA: <= currentEnd add kiya
    });
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
    
    // Sahi Logic: Net Sales mein se return pehle hi minus hai, is liye yahan dobara minus nahi karna
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

    // --- BANK LOGIC (Smart Fix for 'Bank' vs 'Bank Transfer') ---
    // Helper function taake dono spellings check ho sakein
    const isBank = (method) => method === 'Bank' || method === 'Bank Transfer';

    const bankSales = bankSalesTotal;
    const bankReceived = customerPayments.filter(p => isBank(p.payment_method)).reduce((sum, p) => sum + (p.amount_paid || 0), 0);
    const bankExpenses = expenses.filter(e => isBank(e.payment_method)).reduce((sum, e) => sum + (e.amount || 0), 0);
    const bankPaidToSuppliers = supplierPayments.filter(p => isBank(p.payment_method)).reduce((sum, p) => sum + (p.amount || 0), 0);
    const bankPayouts = creditPayouts.filter(p => isBank(p.payment_method)).reduce((sum, p) => sum + (p.amount_paid || 0), 0);
    const bankRefunds = supplierRefunds.filter(r => isBank(r.payment_method) || isBank(r.refund_method)).reduce((sum, r) => sum + (r.amount || 0), 0);

    const totalBankIn = cashAdjustments.filter(a => a.type === 'In' && isBank(a.payment_method)).reduce((sum, a) => sum + (a.amount || 0), 0);
    const totalBankOut = cashAdjustments.filter(a => a.type === 'Out' && isBank(a.payment_method)).reduce((sum, a) => sum + (a.amount || 0), 0);
    
    const bankTransfersIn = cashAdjustments.filter(a => a.type === 'Transfer' && isBank(a.transfer_to)).reduce((sum, a) => sum + (a.amount || 0), 0);
    const bankTransfersOut = cashAdjustments.filter(a => a.type === 'Transfer' && isBank(a.payment_method)).reduce((sum, a) => sum + (a.amount || 0), 0);

    const bankBalance = precise((bankSales + bankReceived + bankRefunds + totalBankIn + bankTransfersIn) - (bankExpenses + bankPaidToSuppliers + bankPayouts + totalBankOut + bankTransfersOut));


    // Suppliers ka udhaar (Payables)
    const totalSupplierPayables = suppliers.reduce((sum, s) => sum + (s.balance_due || 0), 0);

    // Total Payables (Suppliers + Customers + Staff Salary Due)
    // Business mein yeh sab "Liabilities" hain.
    const totalLiabilities = totalSupplierPayables + totalCustomerCredits + totalStaffPayables;

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

    // --- NAYA IZAFA: Counters Breakdown (All Counters) ---
    const allRegs = await db.registers.toArray();
    const countersBreakdown = [];
    
    for (const reg of allRegs) {
        // Naya Master Function jo open/close dono ka sahi hisaab rakhta hai
        const currentCash = await this.getRegisterCurrentCash(reg.id);
        countersBreakdown.push({ name: reg.name, cash: currentCash });
    }

    // --- NAYA IZAFA: Cash in Hand ko Counters ke sath sync karna ---
    // Ab dukan ka total cash wahi hoga jo tamam counters ke pass mila kar hai
    const totalCashInCounters = countersBreakdown.reduce((sum, c) => sum + (c.cash || 0), 0);

    return {
        totalSales: netSalesCurrent,
        countersBreakdown, 
        totalReturnFees: totalReturnFeesCurrent,
        salesGrowth,
        cashInHand: totalCashInCounters, // <--- Purani logic ki jagah counters ka sum use kiya
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
        totalStaffPayables, // NAYA: Staff ki raqam alag se bheji 
        
        lowStockItems,
        totalProducts: products.length,
        recentSales,
        topSellingProducts
    };
  },

  async getSalesChartData(timeRange = 'today', customDates =[]) {
    let start = new Date();
    let end = new Date();

    // 1. Dates Set Karein (Aap ke idea ke mutabiq)
    if (timeRange === 'custom' && customDates && customDates.length === 2) {
        start = new Date(customDates[0]); start.setHours(0,0,0,0);
        end = new Date(customDates[1]); end.setHours(23,59,59,999);
    } else if (timeRange === 'month') {
        start.setDate(1); start.setHours(0,0,0,0);
    } else if (timeRange === 'week') {
        const day = start.getDay() || 7;
        if (day !== 1) start.setHours(-24 * (day - 1)); else start.setHours(0,0,0,0);
    } else {
        // 'today' select hone par Graph hamesha pichle 7 din dikhayega (Aap ka behtareen idea!)
        start.setDate(start.getDate() - 6); // Aaj mila kar 7 din
        start.setHours(0,0,0,0);
    }

    const dateLimit = start.toISOString();
    
    // 2. Database se data layein
    const sales = await db.sales.where('created_at').aboveOrEqual(dateLimit).toArray();
    const returns = await db.sale_returns.where('created_at').aboveOrEqual(dateLimit).toArray();
    
    const map = {};
    
    // 3. Start aur End Date ke darmian tamam dinon ka map banayein
    let currentDate = new Date(start);
    while (currentDate <= end) {
        const dateStr = currentDate.toISOString().split('T')[0];
        map[dateStr] = 0;
        currentDate.setDate(currentDate.getDate() + 1);
    }

    // 4. Sales Jama (Add) karein
    sales.forEach(s => {
        const sDate = new Date(s.sale_date || s.created_at);
        if (sDate <= end) {
            const dateStr = sDate.toISOString().split('T')[0];
            if (map[dateStr] !== undefined) {
                map[dateStr] += ((s.total_amount || 0) - (s.tax_amount || 0)); // <--- NAYA IZAFA
            }
        }
    });

    // 5. Returns Manfi (Subtract) karein
    returns.forEach(r => {
        const rDate = new Date(r.created_at);
        if (rDate <= end) {
            const dateStr = rDate.toISOString().split('T')[0];
            if (map[dateStr] !== undefined) {
                map[dateStr] -= ((r.total_refund_amount || 0) - (r.tax_refunded || 0)); // <--- NAYA IZAFA
            }
        }
    });

    // 6. Graph ke liye data wapis bhejein
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
    const damagedItems = await db.inventory.filter(i => (i.damaged_qty || 0) > 0).toArray();
    
    // Pehle hi saare products, suppliers aur PURCHASES fetch kar lete hain
    const productIds = damagedItems.map(i => i.product_id).filter(id => id);
    const supplierIds = damagedItems.map(i => i.supplier_id).filter(id => id);
    const purchaseIds = damagedItems.map(i => i.purchase_id).filter(id => id); // <--- NAYA
    
    // Batch fetching logic (UUIDs ke saath)
    const[allProducts, allSuppliers, allPurchases] = await Promise.all([
        db.products.where('id').anyOf(productIds).toArray(),
        db.suppliers.where('id').anyOf(supplierIds).toArray(),
        db.purchases.where('id').anyOf(purchaseIds).toArray() // <--- NAYA
    ]);

    const productMap = {};
    allProducts.forEach(p => productMap[p.id] = p);
    const supplierMap = {};
    allSuppliers.forEach(s => supplierMap[s.id] = s);
    const purchaseMap = {}; // <--- NAYA
    allPurchases.forEach(p => purchaseMap[p.id] = p);

    const report = damagedItems.map((item) => {
      const product = productMap[item.product_id];
      const supplier = supplierMap[item.supplier_id];
      const purchase = purchaseMap[item.purchase_id]; // <--- NAYA
      
      return {
        ...item,
        product_name: product?.name || 'Unknown',
        brand: product?.brand || '',
        supplier_name: supplier?.name || 'N/A',
        // Yahan UUID ki bajaye asal Invoice ID set kar rahe hain
        invoice_id: purchase ? (purchase.invoice_id || purchase.id.slice(0,8)) : item.purchase_id,
        total_loss: (item.damaged_qty || 0) * (item.purchase_price || 0)
      };
    });
    return report.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
  },

  // 8. Damaged Stock ko wapis theek karna (Undo Adjustment)
  async revertDamagedStock(inventoryId, qtyToRevert, staffId = null) {
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
      status: 'Available', 
      staff_id: staffId, // <--- NAYA IZAFA
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

  // --- STAFF MANAGEMENT FUNCTIONS (New) ---

  // 1. Staff List Mangwana
  async getStaffMembers() {
    const staff = await db.staff_members.toArray();
    
    // --- NAYA: Har staff ki permissions ko wapis Decrypt karein ---
    const decryptedStaff = await Promise.all(staff.map(async (s) => {
        // Agar permission text (encrypted) hai, to chabi se khol lein
        if (s.permissions && typeof s.permissions === 'string') {
            s.permissions = await decryptData(s.permissions);
        }
        return s;
    }));

    // Javascript ke zariye naam ke hisaab se tartib (sort) kar rahe hain
    return decryptedStaff.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  },

  // 2. Naya Staff Add karna
  async addStaffMember(staffData) {
    if (!staffData.id) staffData.id = crypto.randomUUID();
    
    // PIN ko Hash (Encrypt) karein
    const hashedPassword = bcrypt.hashSync(staffData.pin_code, 10);

    // --- NAYA: Permissions ko Taala lagayen (Encrypt Karein) ---
    let encryptedPermissions = "";
    if (staffData.permissions) {
        encryptedPermissions = await encryptData(staffData.permissions);
    }

    // Default values set karein
    const newStaff = {
      ...staffData, // Yeh line khud hi Phone, CNIC, Bank waghera utha legi
      pin_code: hashedPassword, 
      salary: staffData.salary || 0, // Naya: Salary save karein
      joining_date: staffData.joining_date || new Date().toISOString().split('T')[0], // NAYA: Joining Date
      balance: 0, // Naya: Shuruat mein balance 0 hoga
      local_id: staffData.id,
      is_active: true,
      permissions: encryptedPermissions, // <--- NAYA: Ab yahan ajeeb sa text save hoga
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Local DB Save
    await db.staff_members.add(newStaff);

    // Sync Queue
    await db.sync_queue.add({
      table_name: 'staff_members',
      action: 'create',
      data: newStaff
    });

    return newStaff;
  },

  // 3. Staff Update karna
  async updateStaffMember(id, updates) {
    // Agar naya PIN aaya hai, to usay Hash karein
    if (updates.pin_code) {
        // Check karein ke kya ye pehle se hash to nahi? (Agar length < 20 hai to matlab plain text hai)
        if (updates.pin_code.length < 20) {
            updates.pin_code = bcrypt.hashSync(updates.pin_code, 10);
    }
  }
  
  // Naya: Salary ko update data mein shamil karna
  if (updates.salary !== undefined) updates.salary = Number(updates.salary);

  // --- NAYA: Agar permissions update ho rahi hain to unhein Encrypt karein ---
  if (updates.permissions) {
      updates.permissions = await encryptData(updates.permissions);
  }

  const updatedData = { ...updates, updated_at: new Date().toISOString() };
    
    // Local Update
    await db.staff_members.update(id, updatedData);

    // Sync Queue
    await db.sync_queue.add({
      table_name: 'staff_members',
      action: 'update',
      data: { id, ...updatedData }
    });

    return true;
  },

  // 4. Staff Delete karna
  async deleteStaffMember(id) {
    // Local Delete
    await db.staff_members.delete(id);

    // Sync Queue
    await db.sync_queue.add({
      table_name: 'staff_members',
      action: 'delete',
      data: { id }
    });

    return true;
  },

  // 5. PIN Verify karna (Login ke liye)
  async verifyStaffPin(pin) {
    // 1. Saare active staff members layein
    const activeStaffMembers = await db.staff_members
      .filter(s => s.is_active === true)
      .toArray();

    // 2. Har staff ka PIN check karein
    for (const staff of activeStaffMembers) {
      let isMatch = false;
      // Agar PIN Hash hai (bcrypt hashes aam tor par $2 se shuru hote hain)
      if (staff.pin_code && staff.pin_code.startsWith('$2')) {
         isMatch = bcrypt.compareSync(pin, staff.pin_code);
      } 
      // Agar Purana Plain Text PIN hai (Legacy support)
      else if (staff.pin_code === pin) {
         isMatch = true;
      }

      if (isMatch) {
          // --- NAYA: Login hone par permissions Decrypt karke wapis bhejein ---
          if (staff.permissions && typeof staff.permissions === 'string') {
              staff.permissions = await decryptData(staff.permissions);
          }
          return staff; // Kamyab Login
      }
    }
    
    return null; // Agar koi match na mile
  },

  // --- STAFF LEDGER FUNCTIONS (New) ---

  // 1. Ledger Entry Add karna
  async addStaffLedgerEntry(entryData) {
    if (!entryData.id) entryData.id = crypto.randomUUID();
    entryData.local_id = entryData.id;
    entryData.created_at = new Date().toISOString();
    entryData.updated_at = new Date().toISOString();

    // NAYA: Check for duplicate salary month
    if (entryData.type === 'Salary' && entryData.salary_month) {
      const existing = await db.staff_ledger
        .where('staff_id').equals(entryData.staff_id)
        .filter(e => e.type === 'Salary' && e.salary_month === entryData.salary_month)
        .first();
      
      if (existing) {
        throw new Error(`Salary for ${entryData.salary_month} is already added!`);
      }
    }

    // NAYA: Agar Payment ya Advance hai, to Expense bhi banao (Cash Out)
    if (entryData.type === 'Payment' || entryData.type === 'Advance') {
      // 1. Category dhoondo
      const salaryCat = await db.expense_categories
        .filter(c => c.name === 'Salaries & Wages')
        .first();
      
      if (salaryCat) {
        // 2. Staff ka naam dhoondo (Reference ke liye)
        const staffMember = await db.staff_members.get(entryData.staff_id);
        
        // 3. Expense ka data tayyar karo
        const expenseId = crypto.randomUUID();
        const expenseData = {
          id: expenseId,
          local_id: expenseId,
          user_id: entryData.user_id,
          staff_id: entryData.staff_id, // <--- NAYA IZAFA
          category_id: salaryCat.id,
          amount: Number(entryData.amount),
          title: `${entryData.type} to ${staffMember ? staffMember.name : 'Staff'}`, // e.g. Payment to Khalid
          expense_date: entryData.entry_date,
          payment_method: 'Cash', // Filhal Cash assume kar rahe hain
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        // 4. Expense save karo
        await db.expenses.add(expenseData);
        await db.sync_queue.add({ table_name: 'expenses', action: 'create', data: expenseData });

        // 5. Link save karo (Linking Pin)
        entryData.expense_id = expenseId;
      }
    }

    // Local DB Save
    await db.staff_ledger.add(entryData);

    // Sync Queue
    await db.sync_queue.add({
      table_name: 'staff_ledger',
      action: 'create',
      data: entryData
    });

    // NAYA: Balance foran update karein
    await this.recalculateStaffBalance(entryData.staff_id);

    return entryData;
  },

  // --- HELPER: Balance Recalculation (Local) ---
  async recalculateStaffBalance(staffId) {
    const entries = await db.staff_ledger.where('staff_id').equals(staffId).toArray();
    
    let newBalance = 0;
    entries.forEach(item => {
      const amount = Number(item.amount) || 0;
      if (item.type === 'Salary' || item.type === 'Commission') {
        newBalance += amount;
      } else {
        newBalance -= amount;
      }
    });

    await db.staff_members.update(staffId, { balance: newBalance });
    
    // Server ko bhi batayein ke balance update hua hai
    await db.sync_queue.add({
      table_name: 'staff_members',
      action: 'update',
      data: { id: staffId, balance: newBalance }
    });
  },

  // 2. Kisi khas staff ka ledger mangwana
  async getStaffLedger(staffId) {
    const entries = await db.staff_ledger
      .where('staff_id')
      .equals(staffId)
      .toArray();
    
    // Tarikh ke hisab se sort karein (Nayi entries upar)
    return entries.sort((a, b) => new Date(b.entry_date) - new Date(a.entry_date));
  },

  // 3. Ledger Entry Edit karna (SUPER SMART LOGIC)
  async updateStaffLedgerEntry(id, updates) {
    updates.updated_at = new Date().toISOString();
    
    const existingEntry = await db.staff_ledger.get(id);
    if (!existingEntry) return false;

    // Purani aur Nayi Type check karein
    const oldType = existingEntry.type;
    const newType = updates.type || oldType;

    // Check karein ke kisme Expense banta hai aur kisme nahi
    const oldNeedsExpense = (oldType === 'Payment' || oldType === 'Advance');
    const newNeedsExpense = (newType === 'Payment' || newType === 'Advance');

    const staffMember = await db.staff_members.get(existingEntry.staff_id);

    // SCENARIO 1: Expense tha, ab NAHI hai (e.g. Advance -> Salary) => DELETE EXPENSE
    if (oldNeedsExpense && !newNeedsExpense) {
      if (existingEntry.expense_id) {
        await db.expenses.delete(existingEntry.expense_id);
        await db.sync_queue.add({ table_name: 'expenses', action: 'delete', data: { id: existingEntry.expense_id } });
        updates.expense_id = null; // Link khatam kar dein
      }
    } 
    // SCENARIO 2: Expense nahi tha, ab HAI (e.g. Salary -> Advance) => CREATE EXPENSE
    else if (!oldNeedsExpense && newNeedsExpense) {
      const salaryCat = await db.expense_categories.filter(c => c.name === 'Salaries & Wages').first();
      if (salaryCat) {
        const expenseId = crypto.randomUUID();
        const expenseData = {
          id: expenseId,
          local_id: expenseId,
          user_id: existingEntry.user_id,
          staff_id: existingEntry.staff_id, // <--- NAYA IZAFA
          category_id: salaryCat.id,
          amount: Number(updates.amount || existingEntry.amount),
          title: `${newType} to ${staffMember ? staffMember.name : 'Staff'}`,
          expense_date: updates.entry_date || existingEntry.entry_date,
          payment_method: 'Cash',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        await db.expenses.add(expenseData);
        await db.sync_queue.add({ table_name: 'expenses', action: 'create', data: expenseData });
        updates.expense_id = expenseId; // Naya link save karein
      }
    } 
    // SCENARIO 3: Pehle bhi Expense tha, ab bhi HAI (e.g. Advance -> Payment, ya Amount change ki) => UPDATE EXPENSE
    else if (oldNeedsExpense && newNeedsExpense) {
      if (existingEntry.expense_id) {
        const expenseUpdates = {
          amount: Number(updates.amount || existingEntry.amount),
          expense_date: updates.entry_date || existingEntry.entry_date,
          title: `${newType} to ${staffMember ? staffMember.name : 'Staff'}`, // Naam bhi update karein
          updated_at: new Date().toISOString()
        };
        await db.expenses.update(existingEntry.expense_id, expenseUpdates);
        await db.sync_queue.add({ table_name: 'expenses', action: 'update', data: { id: existingEntry.expense_id, ...expenseUpdates } });
      }
    }
    // SCENARIO 4: Pehle bhi nahi tha, ab bhi nahi hai (e.g. Salary -> Commission) => KUCH MAT KARO

    // Aakhir mein Staff Ledger ko update karein
    await db.staff_ledger.update(id, updates);
    await db.sync_queue.add({ table_name: 'staff_ledger', action: 'update', data: { id, ...updates } });
    
    // Balance theek karein
    await this.recalculateStaffBalance(existingEntry.staff_id);

    return true;
  },

  // 4. Ledger Entry Delete karna
  async deleteStaffLedgerEntry(id) {
    // Pehle entry dhoond lein taake staff_id mil jaye
    const entry = await db.staff_ledger.get(id);

    if (entry) {
        // NAYA: Agar Expense juda hua hai to usay bhi delete karein
        if (entry.expense_id) {
            await db.expenses.delete(entry.expense_id);
            await db.sync_queue.add({ table_name: 'expenses', action: 'delete', data: { id: entry.expense_id } });
        }

        await db.staff_ledger.delete(id);
        await db.sync_queue.add({ table_name: 'staff_ledger', action: 'delete', data: { id } });
        
        // NAYA: Balance adjust karein
        await this.recalculateStaffBalance(entry.staff_id);
    }

    return true;
  },

  // --- HELD BILLS FUNCTIONS (Hold / Resume Bill Ke Liye Naya Izafa) ---

  // 1. Bill ko hold par daalna
  async holdBill(billData) {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    // Naya: Quotation ID generate karein (e.g. A1234)
    const { generateInvoiceId } = await import('./utils/idGenerator');
    const shortId = await generateInvoiceId();
    const quotationId = shortId; // Yahan se "Q-" hata diya gaya

    const newHeldBill = {
      id: id,
      quotation_id: quotationId,
      user_id: billData.user_id, 
      staff_id: billData.staff_id,
      created_at: now,
      updated_at: now, // Naya Izafa
      cart: billData.cart,
      customer_id: billData.customer_id,
      discount: billData.discount,
      discount_type: billData.discountType, // Yahan underscore (_) lagaya
      note: billData.note || 'Held Bill'
    };
    await db.held_bills.add(newHeldBill);
    
    // Sync Queue mein daalein taake Cloud par jaye
    await db.sync_queue.add({
      table_name: 'held_bills',
      action: 'create',
      data: newHeldBill
    });
    
    return id;
  },

  // 2. Rokay gaye bills ki list mangwana
  async getHeldBills() {
    const bills = await db.held_bills.toArray();
    // Naye rokay gaye bills upar nazar aayenge
    return bills.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  },

  // 3. Rokay gaye bill ko delete karna (jab resume ho jaye ya cancel karna ho)
  async deleteHeldBill(id) {
    // Pehle local se delete karein
    await db.held_bills.delete(id);
    
    // Ab Sync Queue mein daalein taake Cloud (Supabase) se bhi delete ho jaye
    await db.sync_queue.add({
      table_name: 'held_bills',
      action: 'delete',
      data: { id } // Sirf ID bhejna kafi hai delete ke liye
    });
    
    return true;
  },

  // --- ACTIVE CART PERSISTENCE (Auto-save on Refresh) ---

  // 1. Cart ko save karna
  async saveActiveCart(cartData) {
    // Hum hamesha 'current' ID istemal karenge taake purana data overwrite ho jaye
    await db.active_cart.put({
      id: 'current',
      ...cartData,
      updated_at: new Date().toISOString()
    });
  },

  // 2. Save hua cart wapis nikalna
  async getActiveCart() {
    return await db.active_cart.get('current');
  },

  // 3. Cart saaf karna (Sale khatam hone par)
  async clearActiveCart() {
    await db.active_cart.delete('current');
  },

  // --- CONFLICT RESOLUTION: Missing Stock Entry ---
  // Yeh function phansi hui sale ko theek karne ke liye missing purchase banayega
  async resolveSaleConflict(syncItemId, supplierId, purchasePrice, userId, staffId) {
    // 1. Sync Queue se phansi hui sale nikalain
    const syncItem = await db.sync_queue.get(syncItemId);
    if (!syncItem || !syncItem.data.items) throw new Error("Sale data not found in queue.");

    const saleRecord = syncItem.data.sale;
    const saleItems = [...syncItem.data.items];
    const inventoryUpdates = [...syncItem.data.inventory_ids];
    
    const purchaseId = crypto.randomUUID();
    const now = new Date().toISOString();

    // 2. Nayi Inventory aur Mapping tayyar karein
    const newInventoryItems = [];
    
    // Hum har item ke liye aik bilkul NAYI ID banayenge taake Server par takrao (conflict) na ho
    for (let i = 0; i < saleItems.length; i++) {
        const oldInvId = saleItems[i].inventory_id;
        const newInvId = crypto.randomUUID(); // Fresh ID for server

        // Naya Inventory Record
        newInventoryItems.push({
            id: newInvId,
            local_id: crypto.randomUUID(),
            product_id: saleItems[i].product_id,
            purchase_id: purchaseId,
            supplier_id: supplierId,
            purchase_price: purchasePrice,
            sale_price: saleItems[i].price_at_sale,
            quantity: saleItems[i].quantity,
            available_qty: saleItems[i].quantity,
            status: 'Available',
            user_id: userId,
            staff_id: staffId,
            created_at: now,
            updated_at: now
        });

        // 3. Stuck Sale ko update karein (Mapping)
        // Sale ko batayein ke ab tum ne purani ID nahi, yeh NAYI ID use karni hai
        saleItems[i].inventory_id = newInvId;
        
        // Inventory updates array mein bhi ID badlein
        const updateIdx = inventoryUpdates.findIndex(u => u.id === oldInvId);
        if (updateIdx > -1) {
            inventoryUpdates[updateIdx].id = newInvId;
        }
        
        // Local database (sale_items table) mein bhi update karein taake record sahi rahe
        await db.sale_items.update(saleItems[i].id, { inventory_id: newInvId });
    }

    const purchaseData = {
      id: purchaseId,
      local_id: purchaseId,
      invoice_id: `FIX-${Math.floor(1000 + Math.random() * 9000)}`,
      supplier_id: supplierId,
      purchase_date: now,
      total_amount: purchasePrice * saleItems.length,
      amount_paid: purchasePrice * saleItems.length,
      balance_due: 0,
      status: 'paid',
      user_id: userId,
      staff_id: staffId,
      notes: "Conflict Resolution: Missing stock added manually.",
      updated_at: now
    };

    // 4. Local DB mein save karein
    await db.purchases.put(purchaseData);
    await db.inventory.bulkPut(newInventoryItems);

    // 5. Sync Queue mein Purchase shamil karein
    await db.sync_queue.add({
      table_name: 'purchases',
      action: 'create_full_purchase',
      data: { purchase: purchaseData, items: newInventoryItems }
    });

    // 6. Stuck Sale ka data Queue mein update karein (Nayi IDs ke saath)
    await db.sync_queue.update(syncItemId, {
      status: 'pending',
      retry_count: 0,
      last_error: null,
      data: {
          ...syncItem.data,
          items: saleItems,
          inventory_ids: inventoryUpdates
      }
    });

    return true;
  },

  // --- MULTI-COUNTER FUNCTIONS (NAYA IZAFA) ---
  
  // 1. Saare counters (Registers) ki list mangwana
  async getRegisters() {
    return await db.registers.toArray();
  },

  // 2. Register/Counter kholna (Session shuru karna)
  async openRegisterSession(sessionData) {
    // --- NAYA IZAFA: Ghost Session Auto-Heal ---
    // Agar pehle se koi session open reh gaya tha (e.g. cache clear hone ki wajah se), to usay auto-close karein
    const ghostSessions = await db.register_sessions
        .filter(s => s.register_id === sessionData.register_id && !s.closed_at)
        .toArray();
    
    for (const ghost of ghostSessions) {
        await db.register_sessions.update(ghost.id, {
            closed_at: new Date().toISOString(),
            notes: (ghost.notes ? ghost.notes + ' | ' : '') + '[Auto-closed ghost session]'
        });
    }
    // -------------------------------------------

    const id = crypto.randomUUID();
    const session = {
      id: id,
      ...sessionData,
      opened_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    // Local DB mein session save karein
    await db.register_sessions.add(session);
    
    // Register ka status 'open' kar dein
    await db.registers.update(sessionData.register_id, { status: 'open' });

    // Sync Queue mein dalein taake cloud par jaye
    await db.sync_queue.add({ table_name: 'register_sessions', action: 'create', data: session });
    await db.sync_queue.add({ table_name: 'registers', action: 'update', data: { id: sessionData.register_id, status: 'open' } });
    
    return session;
  },

  // 2.5 Session ka Expected Balance nikalna (NAYA)
  async getSessionExpectedBalance(sessionId) {
    const session = await db.register_sessions.get(sessionId);
    if (!session) return 0;

    const opening = Number(session.opening_balance) || 0;
    const regId = session.register_id;

    // A. Cash Sales (Is session ki) - Bulletproof approach using register_id
    const sales = await db.sales.where('register_id').equals(regId).toArray();
    const cashSales = sales.filter(s => s.session_id === sessionId && s.payment_method === 'Cash').reduce((sum, s) => sum + (Number(s.amount_paid_at_sale) || 0), 0);

    // B. Cash Customer Payments (Wusooli)
    const payments = await db.customer_payments.where('register_id').equals(regId).toArray();
    const cashReceived = payments.filter(p => p.session_id === sessionId && p.payment_method === 'Cash').reduce((sum, p) => sum + (Number(p.amount_paid) || 0), 0);

    // C. Cash Expenses (Kharchay)
    const expenses = await db.expenses.where('register_id').equals(regId).toArray();
    const cashSpent = expenses.filter(e => e.session_id === sessionId && e.payment_method === 'Cash').reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    // D. Cash Adjustments (In/Out/Transfers) - NAYA IMPROVED MATH
    const allAdjustments = await db.cash_adjustments.toArray();
    
    // Helper: Check karega ke kya adjustment is shift ke waqt ke darmiyan hui hai
    const isWithinSession = (dateStr) => {
        const t = new Date(dateStr).getTime();
        const start = new Date(session.opened_at).getTime();
        const end = session.closed_at ? new Date(session.closed_at).getTime() : Infinity;
        return t >= start && t <= end;
    };

    // 1. Cash IN: Normal "In" + Wo Transfers jo is counter ki taraf aaye (transfer_to)
    const adjIn = allAdjustments.filter(a => {
      if (a.payment_method !== 'Cash') return false;
      if (a.type === 'In' && a.session_id === sessionId) return true;
      
      const isForThisCounter = (a.type === 'In' && a.register_id === regId) || (a.type === 'Transfer' && a.transfer_to === regId);
      if (isForThisCounter && isWithinSession(a.created_at)) return true;
      
      return false;
    }).reduce((sum, a) => sum + (Number(a.amount) || 0), 0);

    // 2. Cash OUT: Normal "Out" + Wo Transfers jo is counter se bahar gaye (register_id)
    const adjOut = allAdjustments.filter(a => {
      if (a.payment_method !== 'Cash') return false;
      if (a.type === 'Out' && a.session_id === sessionId) return true;
      
      const isFromThisCounter = (a.type === 'Out' || a.type === 'Transfer') && a.register_id === regId;
      if (isFromThisCounter && isWithinSession(a.created_at)) return true;
      
      return false;
    }).reduce((sum, a) => sum + (Number(a.amount) || 0), 0);

    // E. Supplier Payments (Cash)
    const supPayments = await db.supplier_payments.where('register_id').equals(regId).toArray();
    const supCashPaid = supPayments.filter(p => p.session_id === sessionId && p.payment_method === 'Cash').reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    // F. Credit Payouts (Cash) - NAYA IZAFA
    const payouts = await db.credit_payouts.where('register_id').equals(regId).toArray();
    const cashPayouts = payouts.filter(p => p.session_id === sessionId && p.payment_method === 'Cash').reduce((sum, p) => sum + (Number(p.amount_paid) || 0), 0);

    // G. Supplier Refunds (Cash) - NAYA IZAFA
    const supRefunds = await db.supplier_refunds.where('register_id').equals(regId).toArray();
    const supCashRefunds = supRefunds.filter(r => r.session_id === sessionId && r.payment_method === 'Cash').reduce((sum, r) => sum + (Number(r.amount) || 0), 0);

    // Final Calculation (Plus supCashRefunds)
    const expected = (opening + cashSales + cashReceived + adjIn + supCashRefunds) - (cashSpent + adjOut + supCashPaid + cashPayouts);
    return Math.round(expected * 100) / 100;
  },

  // NAYA IZAFA: Counter ka Asli Cash nikalna (Chahe open ho ya closed)
  async getRegisterCurrentCash(registerId) {
    // 1. Agar counter khula hai, to seedha session wala hisaab lagao
    const sessions = await db.register_sessions.where('register_id').equals(registerId).toArray();
    
    // NAYA IZAFA: Hamesha sab se latest (nayi) session ko pehle check karein
    sessions.sort((a, b) => new Date(b.opened_at || 0) - new Date(a.opened_at || 0));
    const openSession = sessions.find(s => !s.closed_at);
    
    if (openSession) {
        return await this.getSessionExpectedBalance(openSession.id);
    }

    // 2. Agar counter band hai, to uski Aakhri Closing dhoondo
    const lastSession = await db.register_sessions
        .where('register_id').equals(registerId)
        .filter(s => s.closed_at != null)
        .reverse()
        .sortBy('closed_at');

    let baseCash = 0;
    let timeFilter = new Date(0).toISOString(); // Shuruat se

    if (lastSession && lastSession.length > 0) {
        baseCash = lastSession[0].actual_closing || 0;
        timeFilter = lastSession[0].closed_at; // Aakhri closing ka waqt
    }

    // 3. Aakhri closing ke BAAD hone wali tamam transactions (Owner actions)
    const sales = await db.sales.where('register_id').equals(registerId).toArray();
    const recentSales = sales.filter(s => s.payment_method === 'Cash' && s.created_at > timeFilter).reduce((sum, s) => sum + (Number(s.amount_paid_at_sale) || 0), 0);

    const payments = await db.customer_payments.where('register_id').equals(registerId).toArray();
    const recentPayments = payments.filter(p => p.payment_method === 'Cash' && p.created_at > timeFilter).reduce((sum, p) => sum + (Number(p.amount_paid) || 0), 0);

    const supPayments = await db.supplier_payments.where('register_id').equals(registerId).toArray();
    const recentSupPayments = supPayments.filter(p => p.payment_method === 'Cash' && p.created_at > timeFilter).reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    const expenses = await db.expenses.where('register_id').equals(registerId).toArray();
    const recentExpenses = expenses.filter(e => e.payment_method === 'Cash' && e.created_at > timeFilter).reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    const allAdjs = await db.cash_adjustments.toArray();
    
    // Transfer logic shamil ki gayi
    const recentAdjIn = allAdjs.filter(a => 
      a.payment_method === 'Cash' && a.created_at > timeFilter &&
      ( (a.register_id === registerId && a.type === 'In') || (a.transfer_to === registerId && a.type === 'Transfer') )
    ).reduce((sum, a) => sum + (Number(a.amount) || 0), 0);

    const recentAdjOut = allAdjs.filter(a => 
      a.payment_method === 'Cash' && a.created_at > timeFilter &&
      ( (a.register_id === registerId && (a.type === 'Out' || a.type === 'Transfer')) )
    ).reduce((sum, a) => sum + (Number(a.amount) || 0), 0);

    // 4. Final Hisaab
    const currentCash = baseCash + recentSales + recentPayments + recentAdjIn - recentSupPayments - recentExpenses - recentAdjOut;
    return Math.round(currentCash * 100) / 100;
  },

  // 3. Register/Counter band karna (Shift khatam karna)
  async closeRegisterSession(sessionId, closingData) {
    // 1. Session DB se nikalain
    const session = await db.register_sessions.get(sessionId);

    // 2. Purane notes (Opening Anomaly) ko mehfooz rakhna
    const combinedNotes = session.notes 
      ? `${session.notes} | [Closing Note] ${closingData.notes || 'None'}` 
      : closingData.notes;

    const updates = {
      ...closingData,
      notes: combinedNotes, // Updated notes
      closed_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    // 3. Session update karein
    await db.register_sessions.update(sessionId, updates);
    
    // 4. Register ka status wapis 'closed' kar dein (Ab dobara fetch karne ki zaroorat nahi)
    if (session && session.register_id) {
      await db.registers.update(session.register_id, { status: 'closed' });
      await db.sync_queue.add({ table_name: 'registers', action: 'update', data: { id: session.register_id, status: 'closed' } });
    }

    // 5. Sync Queue update
    await db.sync_queue.add({ table_name: 'register_sessions', action: 'update', data: { id: sessionId, ...updates } });
    
    return true;
  },

  // Vault transfer logic removed

  // 5. Kisi makhsoos Register ka Ledger nikalna (NAYA IZAFA)
  async getRegisterLedger(registerId) {
    // A. Is register se honay wali saari adjustments (In/Out/Transfers)
    const adjustments = await db.cash_adjustments
      .filter(a => a.register_id === registerId || a.transfer_to === registerId)
      .toArray();

    // B. Is register se juray saare payments/expenses (Agar counter hai)
    const sales = await db.sales.where('register_id').equals(registerId).toArray();
    const expenses = await db.expenses.where('register_id').equals(registerId).toArray();
    const payments = await db.customer_payments.where('register_id').equals(registerId).toArray();
    const supPayments = await db.supplier_payments.where('register_id').equals(registerId).toArray();
    const payouts = await db.credit_payouts.where('register_id').equals(registerId).toArray(); 
    const supRefunds = await db.supplier_refunds.where('register_id').equals(registerId).toArray(); // NAYA IZAFA

    // In sab ko aik list mein jorna aur format karna
    let ledger = [];

    adjustments.forEach(a => {
      ledger.push({
        id: a.id,
        date: a.created_at,
        type: a.register_id === registerId ? 'Debit (Out)' : 'Credit (In)',
        amount: a.amount,
        notes: a.notes,
        source: 'Manual Adjustment / Transfer'
      });
    });

    sales.forEach(s => {
      if (s.payment_method === 'Cash') {
        ledger.push({ id: s.id, date: s.created_at, type: 'Credit (In)', amount: s.amount_paid_at_sale, notes: `Sale #${s.invoice_id || s.id.slice(0,8)}`, source: 'Sales' });
      }
    });

    payments.forEach(p => {
      if (p.payment_method === 'Cash') {
        ledger.push({ id: p.id, date: p.created_at, type: 'Credit (In)', amount: p.amount_paid, notes: 'Customer Payment Received', source: 'Collection' });
      }
    });

    supPayments.forEach(sp => {
      if (sp.payment_method === 'Cash') {
        ledger.push({ id: sp.id, date: sp.created_at, type: 'Debit (Out)', amount: sp.amount, notes: 'Paid to Supplier', source: 'Supplier Payment' });
      }
    });

    expenses.forEach(e => {
      if (e.payment_method === 'Cash') {
        ledger.push({ id: e.id, date: e.created_at, type: 'Debit (Out)', amount: e.amount, notes: e.title, source: 'Expense' });
      }
    });

    // NAYA IZAFA: Customer Payouts (Refunds) ko ledger mein shamil karna
    payouts.forEach(p => {
      if (p.payment_method === 'Cash') {
        ledger.push({ id: p.id, date: p.created_at, type: 'Debit (Out)', amount: p.amount_paid, notes: p.remarks || 'Customer Credit Payout', source: 'Credit Settlement' });
      }
    });

    // NAYA IZAFA: Supplier Refunds ko ledger mein shamil karna
    supRefunds.forEach(r => {
      if (r.payment_method === 'Cash') {
        ledger.push({ id: r.id, date: r.created_at, type: 'Credit (In)', amount: r.amount, notes: r.notes || 'Refund from Supplier', source: 'Supplier Refund' });
      }
    });

    // NAYA IZAFA: Shift Opening aur Closing ka Audit Trail
    const sessions = await db.register_sessions.where('register_id').equals(registerId).toArray();
    sessions.forEach(s => {
      // Notes ko alag alag karna (Opening vs Closing) taake clear nazar aaye
      let openNoteText = `Shift Opened. Declared Cash: ${s.opening_balance || 0}`;
      let closeNoteText = `Shift Closed. Expected: ${s.expected_closing}, Actual: ${s.actual_closing}. Diff: ${s.difference}`;
      
      if (s.notes) {
        if (s.notes.includes('[Opening Anomaly]')) {
          openNoteText = s.notes.split(' | [Closing Note]')[0]; // Sirf opening wala hissa
        }
        if (s.notes.includes('[Closing Note]')) {
          closeNoteText += ` - Remarks: ${s.notes.split('[Closing Note] ')[1]}`;
        } else if (!s.notes.includes('[Opening Anomaly]')) {
          // Agar sirf closing note tha
          closeNoteText += ` - Remarks: ${s.notes}`;
        }
      }

      // 1. Shift Open Record
      ledger.push({
        id: s.id + '_open',
        date: s.opened_at,
        type: 'Info',
        amount: s.opening_balance || 0,
        notes: openNoteText,
        source: 'System (Shift Open)'
      });

      // 2. Shift Close Record (Agar close ho chuki hai)
      if (s.closed_at) {
        ledger.push({
          id: s.id + '_close',
          date: s.closed_at,
          type: s.difference < 0 ? 'Debit (Out)' : (s.difference > 0 ? 'Credit (In)' : 'Info'),
          amount: Math.abs(s.difference || 0),
          notes: closeNoteText,
          source: 'System (Shift Close)'
        });
      }
    });

    // Tarikh ke hisab se sort karein
    return ledger.sort((a, b) => new Date(b.date) - new Date(a.date));
  },

};

export default DataService;