import { supabase } from './supabaseClient';
import { db } from './db';

const DataService = {

  // src/DataService.js - Final getInventoryData
  async getInventoryData() {
    // 1. Sab cheezein Local DB se layein
    const products = await db.products.toArray();
    const categories = await db.categories.toArray();
    
    // Inventory se wo items layein jo BIKAY NAHI hain (Available)
    const allInventoryItems = await db.inventory.toArray();
    
    const availableItems = allInventoryItems.filter(item => {
        const status = (item.status || '').toLowerCase();
        return status === 'available'; 
    });

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

        // Stock ginnana
        if (!stockCountMap[item.product_id]) {
            stockCountMap[item.product_id] = 0;
        }
        stockCountMap[item.product_id]++;
    });

    // 4. Products ko format karein
    const formattedProducts = products.map(product => {
      const catName = categoryMap[product.category_id] || 'Uncategorized';
      const productVariants = variantsMap[product.id] || [];

      // --- NAYA CODE: Average Purchase Price Calculation ---
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
      // -----------------------------------------------------

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

  async addProduct(productData) {
  // 1. Agar ID nahi hai, to hum khud ek unique ID banayenge (UUID)
  if (!productData.id) {
    productData.id = crypto.randomUUID();
  }

  // 2. Local DB mein save karein (hum 'put' use karenge jo zyada mehfooz hai)
  await db.products.put(productData);
  
  // 3. Sync Queue mein daalein taake internet aane par upload ho sake
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

// --- NAYA DELETE FUNCTION ---
  async deleteProduct(id) {
    // 1. Check karein ke kya Stock (Inventory) mein yeh product majood hai?
    const hasInventory = await db.inventory.where('product_id').equals(id).count();
    if (hasInventory > 0) {
      throw new Error("Cannot delete: This product has stock items (Active or Sold).");
    }

    // 2. Check karein ke kya yeh kabhi Sale hua hai?
    // (Note: Agar inventory check pass ho gaya to sales check ki zaroorat kam hoti hai, 
    // lekin hifazat ke liye check kar lete hain agar sale_items mein record reh gaya ho)
    if (db.sale_items) {
        const hasSales = await db.sale_items.where('product_id').equals(id).count();
        if (hasSales > 0) {
             throw new Error("Cannot delete: This product has sales history.");
        }
    }

    // 3. Agar sab clear hai, to Local DB se delete karein
    await db.products.delete(id);

    // 4. Sync Queue mein 'delete' action daalein
    await db.sync_queue.add({
      table_name: 'products',
      action: 'delete',
      data: { id }
    });

    return true;
  },  
  
  async getSuppliers() {
    const suppliers = await db.suppliers.toArray();
    return suppliers.sort((a, b) => a.name.localeCompare(b.name));
  },

  async addSupplier(supplierData) {
    const newSupplier = { ...supplierData, id: crypto.randomUUID(), balance_due: 0, credit_balance: 0 };
    
    await db.suppliers.add(newSupplier);
    
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

  async deleteSupplier(id) {
    await db.suppliers.delete(id);
    
    await db.sync_queue.add({
        table_name: 'suppliers',
        action: 'delete',
        data: { id }
    });
    
    return true;
  },

  async getSupplierLedgerDetails(supplierId) {
    // 1. Supplier dhoondein
    let supplier = null;
    if (!isNaN(supplierId)) {
        supplier = await db.suppliers.get(parseInt(supplierId));
    } else {
        supplier = await db.suppliers.get(supplierId);
    }

    // 2. Purchases dhoondein
    const purchases = await db.purchases.where('supplier_id').equals(supplierId).toArray();

    // 3. Payments dhoondein
    let payments = [];
    if (db.supplier_payments) {
        payments = await db.supplier_payments.where('supplier_id').equals(supplierId).toArray();
    }

    // --- NAYA CODE: Khud Hisaab Lagayein (Calculation) ---
    // Hum database ke purane number par bharosa nahi karenge, khud total karenge
    const calculatedTotalBusiness = purchases.reduce((sum, p) => sum + (p.total_amount || 0), 0);
    const calculatedTotalPaid = payments.reduce((sum, p) => sum + (p.amount || 0), 0);

    // Supplier object mein yeh naye numbers jor dein
    const supplierWithStats = {
        ...supplier,
        total_purchases: calculatedTotalBusiness,
        total_payments: calculatedTotalPaid
    };

    return { supplier: supplierWithStats, purchases, payments };
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
    // 1. Purchase dhoondein
    let purchase = null;
    if (!isNaN(purchaseId)) {
        purchase = await db.purchases.get(parseInt(purchaseId));
    } else {
        purchase = await db.purchases.get(purchaseId);
    }

    if (!purchase) throw new Error("Purchase not found locally");

    // 2. Supplier dhoondein
    const supplier = await db.suppliers.get(purchase.supplier_id);
    
    // 3. Items dhoondein (CORRECTION: Inventory table se dhoondein)
    // Asal items 'inventory' table mein hotay hain jahan purchase_id match kare
    const itemsData = await db.inventory.where('purchase_id').equals(purchase.id).toArray();

    // 4. Product Names jorein
    const formattedItems = await Promise.all(itemsData.map(async (item) => {
        const product = await db.products.get(item.product_id);
        return {
            ...item,
            product_name: product ? product.name : 'Unknown Product',
            product_brand: product ? product.brand : '',
            // Edit/Return forms ke liye zaroori fields
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
  // 1. Purchase ID khud banayein
  const purchaseId = crypto.randomUUID();
  const userId = (await supabase.auth.getUser()).data.user?.id;

  // 2. Purchase Object banayein
  const purchaseData = {
    id: purchaseId,
    user_id: userId,
    supplier_id: purchasePayload.p_supplier_id,
    purchase_date: new Date().toISOString(),
    total_amount: purchasePayload.p_inventory_items.reduce((sum, item) => sum + (item.quantity * item.purchase_price), 0),
    amount_paid: 0,
    balance_due: purchasePayload.p_inventory_items.reduce((sum, item) => sum + (item.quantity * item.purchase_price), 0),
    status: 'received', // Filhal hum maan rahe hain ke maal mil gaya
    notes: purchasePayload.p_notes
  };

  // 3. Items Object banayein
  const itemsData = purchasePayload.p_inventory_items.map(item => ({
    id: crypto.randomUUID(),
    purchase_id: purchaseId,
    product_id: item.product_id,
    quantity: item.quantity,
    purchase_price: item.purchase_price,
    sale_price: item.sale_price,
    imei: item.imei || null,
    item_attributes: item.item_attributes,
    barcode: item.barcode || null
  }));

  // 4. Local DB mein save karein
  await db.purchases.add(purchaseData);
  // Note: Hum ne 'purchase_items' table db.js mein banaya tha, wahan bhi save karein
  if (db.purchase_items) {
      await db.purchase_items.bulkAdd(itemsData);
  }

  // --- NEW CODE: Update Supplier Balance Locally ---
  // Purchase add hote hi hum supplier ka balance update karenge taake UI foran change ho
  const supplier = await db.suppliers.get(purchasePayload.p_supplier_id);
  if (supplier) {
      const newBalance = (supplier.balance_due || 0) + purchaseData.total_amount;
      const newTotalPurchases = (supplier.total_purchases || 0) + purchaseData.total_amount;

      await db.suppliers.update(purchasePayload.p_supplier_id, {
          balance_due: newBalance,
          total_purchases: newTotalPurchases
      });
  }

  // 5. Sync Queue mein daalein (Poora payload ek sath)
  await db.sync_queue.add({
    table_name: 'purchases', // Hum isay special handle karenge
    action: 'create_full_purchase', // Special action name
    data: {
      purchase: purchaseData,
      items: itemsData
    }
  });

  return purchaseData;
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

  async processSale(salePayload) {
    // 1. IDs generate karein
    const saleId = crypto.randomUUID();
    const saleDate = new Date().toISOString();

    // 2. Sale Record banayein
    const saleData = {
      id: saleId,
      user_id: salePayload.user_id,
      customer_id: salePayload.customer_id,
      subtotal: salePayload.subtotal,
      discount: salePayload.discount,
      total_amount: salePayload.total_amount,
      amount_paid_at_sale: salePayload.amount_paid_at_sale,
      payment_status: salePayload.payment_status,
      sale_date: saleDate,
      created_at: saleDate
    };

    // 3. Sale Items banayein
    const saleItemsData = salePayload.items.map(item => ({
      id: crypto.randomUUID(),
      sale_id: saleId,
      inventory_id: item.inventory_id,
      product_id: item.product_id,
      quantity: 1, // POS mein usually 1 item 1 row hoti hai agar unique ho
      price_at_sale: item.price_at_sale,
      user_id: salePayload.user_id
    }));

    // 4. Inventory IDs ki list (jo bik chuki hain)
    const soldInventoryIds = salePayload.items.map(i => i.inventory_id);

    // --- LOCAL DB OPERATIONS ---
    
    // A. Sale Save karein
    await db.sales.add(saleData);
    if (db.sale_items) await db.sale_items.bulkAdd(saleItemsData);

    // B. Inventory ka status 'Sold' karein (Taake wo foran list se gayab ho jaye)
    await db.inventory.where('id').anyOf(soldInventoryIds).modify({ status: 'Sold' });

    // C. Sync Queue mein dalein
    await db.sync_queue.add({
      table_name: 'sales',
      action: 'create_full_sale',
      data: {
        sale: saleData,
        items: saleItemsData,
        inventory_ids: soldInventoryIds
      }
    });

    return saleData;
  },

  async recordPurchasePayment(paymentData) {
    // 1. Queue mein daalein (Upload ke liye)
    await db.sync_queue.add({
        table_name: 'supplier_payments',
        action: 'create_purchase_payment',
        data: paymentData
    });

    // 2. *** LOCAL DB UPDATE (Offline UI ke liye) ***
    const purchase = await db.purchases.get(paymentData.purchase_id);
    
    if (purchase) {
        const newAmountPaid = (purchase.amount_paid || 0) + paymentData.amount;
        const newBalance = purchase.total_amount - newAmountPaid;
        
        // Status bhi update karein
        let newStatus = 'unpaid';
        if (newBalance <= 0) newStatus = 'paid';
        else if (newAmountPaid > 0) newStatus = 'partially_paid';

        // Database mein save karein
        await db.purchases.update(paymentData.purchase_id, {
            amount_paid: newAmountPaid,
            balance_due: newBalance,
            status: newStatus
        });
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

  async recordBulkSupplierPayment(paymentData) {
    // 1. Ek aarzi (temporary) ID banayein
    const localId = crypto.randomUUID();
    const paymentWithId = { ...paymentData, id: localId };

    // 2. Local DB mein save karein (Taake Ledger mein foran nazar aaye)
    if (db.supplier_payments) {
        await db.supplier_payments.add(paymentWithId);
    }

    // 3. Queue mein daalein (Upload ke liye)
    await db.sync_queue.add({
        table_name: 'supplier_payments',
        action: 'create_bulk_payment',
        data: paymentWithId // Hum ID bhi bhej rahe hain taake baad mein delete kar sakein
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

  async createPurchaseReturn(returnData) {
    // Queue mein daalein
    await db.sync_queue.add({
        table_name: 'purchase_returns',
        action: 'create',
        data: returnData
    });
    return true;
  },

  async recordSupplierRefund(refundData) {
    // Queue mein daalein
    await db.sync_queue.add({
        table_name: 'supplier_refunds',
        action: 'create_refund',
        data: refundData
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
    const totalRevenueFromSales = filteredSales.reduce((sum, s) => sum + (s.total_amount || 0), 0);

    // B. Returns (Refunds)
    const allReturns = await db.sale_returns.toArray();
    const filteredReturns = allReturns.filter(r => {
      const d = new Date(r.created_at).getTime();
      return d >= start && d <= end;
    });
    const totalRefunds = filteredReturns.reduce((sum, r) => sum + (r.total_refund_amount || 0), 0);
    
    // Net Revenue
    const totalRevenue = totalRevenueFromSales - totalRefunds;

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
      const inv = inventoryMap[item.inventory_id];
      if (inv) {
        totalCostOfGoodsSold += (inv.purchase_price || 0);
      }
    });

    // D. Cost of Returns (Wapis aayi cheezon ki khareed qeemat minus karein)
    let totalCostOfReturns = 0;
    const returnIds = filteredReturns.map(r => r.id);
    if (returnIds.length > 0) {
        const returnItems = await db.sale_return_items.where('return_id').anyOf(returnIds).toArray();
        const returnInvIds = returnItems.map(i => i.inventory_id);
        const returnInventory = await db.inventory.where('id').anyOf(returnInvIds).toArray();
        
        returnInventory.forEach(inv => {
            totalCostOfReturns += (inv.purchase_price || 0);
        });
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
    return await db.expense_categories.toArray();
  },

  async addExpense(expenseData) {
    // ID aur User ID set karein
    if (!expenseData.id) expenseData.id = crypto.randomUUID();
    
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
    // ID generate karein
    if (!categoryData.id) categoryData.id = crypto.randomUUID();
    
    // Local DB mein save karein
    await db.expense_categories.add(categoryData);
    
    // Upload Queue mein dalein
    await db.sync_queue.add({
      table_name: 'expense_categories', // Note: Supabase table name
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
    // 1. Local Categories layein
    const categories = await db.categories.orderBy('name').toArray();
    
    // 2. Default Categories (Jinka user_id null ho) aur User ki Categories alag karein
    // Note: Local DB mein shayad 'null' user_id wale records na hon agar sync ne unhein download nahi kiya.
    // Lekin hum ne SyncContext mein 'or' condition laga di thi, to ab wo bhi honge.
    
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

    // 2. Data Fetching
    const sales = await db.sales.toArray();
    const returns = await db.sale_returns.toArray(); 
    const returnItems = await db.sale_return_items.toArray(); 
    const expenses = await db.expenses.toArray();
    const customers = await db.customers.toArray();
    const suppliers = await db.suppliers.toArray();
    const products = await db.products.toArray();
    const saleItems = await db.sale_items.toArray();
    const inventory = await db.inventory.toArray();

    // 3. Filtering Logic
    const currentSalesData = sales.filter(s => new Date(s.sale_date || s.created_at) >= currentStart);
    const previousSalesData = sales.filter(s => {
        const d = new Date(s.sale_date || s.created_at);
        return d >= previousStart && d < (timeRange === 'today' ? previousEnd : currentStart);
    });

    const currentReturnsData = returns.filter(r => new Date(r.created_at) >= currentStart);
    const previousReturnsData = returns.filter(r => {
        const d = new Date(r.created_at);
        return d >= previousStart && d < (timeRange === 'today' ? previousEnd : currentStart);
    });

    const currentExpensesData = expenses.filter(e => new Date(e.expense_date) >= currentStart);
    const previousExpensesData = expenses.filter(e => {
        const d = new Date(e.expense_date);
        return d >= previousStart && d < (timeRange === 'today' ? previousEnd : currentStart);
    });

    // 4. Net Sales Calculation
    const rawSalesCurrent = currentSalesData.reduce((sum, s) => sum + (s.total_amount || 0), 0);
    const rawReturnsCurrent = currentReturnsData.reduce((sum, r) => sum + (r.total_refund_amount || 0), 0);
    const netSalesCurrent = rawSalesCurrent - rawReturnsCurrent;

    const rawSalesPrevious = previousSalesData.reduce((sum, s) => sum + (s.total_amount || 0), 0);
    const rawReturnsPrevious = previousReturnsData.reduce((sum, r) => sum + (r.total_refund_amount || 0), 0);
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

    // 6. Profit Calculation
    const currentSaleIds = currentSalesData.map(s => s.id);
    const currentSoldItems = saleItems.filter(i => currentSaleIds.includes(i.sale_id));

    const inventoryMap = {};
    inventory.forEach(i => inventoryMap[i.id] = i);

    let totalCostOfSold = 0;
    currentSoldItems.forEach(item => {
        const invItem = inventoryMap[item.inventory_id];
        if (invItem) totalCostOfSold += (invItem.purchase_price || 0);
    });

    const currentReturnIds = currentReturnsData.map(r => r.id);
    const currentReturnedItems = returnItems.filter(i => currentReturnIds.includes(i.return_id));

    let totalCostOfReturns = 0;
    currentReturnedItems.forEach(item => {
        const invItem = inventoryMap[item.inventory_id];
        if (invItem) totalCostOfReturns += (invItem.purchase_price || 0);
    });

    const netCost = totalCostOfSold - totalCostOfReturns;
    const grossProfitCurrent = netSalesCurrent - netCost;
    const netProfitCurrent = grossProfitCurrent - totalExpensesCurrent;

    // --- 7. BUSINESS LOGIC FIX: Receivables vs Payables (Credits) ---
    
    let totalReceivables = 0;       // Jo paise LENE hain (Positive Balance)
    let totalCustomerCredits = 0;   // Jo paise WAPIS KARNE hain (Negative Balance)

    customers.forEach(c => {
        const bal = c.balance || 0;
        if (bal > 0) {
            totalReceivables += bal;
        } else if (bal < 0) {
            // Math.abs(-20) = 20. Hamein positive number chahiye display ke liye
            totalCustomerCredits += Math.abs(bal); 
        }
    });

    // Suppliers ka udhaar (Payables)
    const totalSupplierPayables = suppliers.reduce((sum, s) => sum + (s.balance_due || 0), 0);

    // Total Payables (Suppliers + Customers jinko wapis karna hai)
    // Business mein yeh dono "Liabilities" hain.
    const totalLiabilities = totalSupplierPayables + totalCustomerCredits;

    // ---------------------------------------------------------------

    // 8. Low Stock
    const stockCounts = {};
    inventory.forEach(item => {
        const status = (item.status || '').toLowerCase();
        if (status === 'available') {
            const qty = item.quantity ? Number(item.quantity) : 1;
            stockCounts[item.product_id] = (stockCounts[item.product_id] || 0) + qty;
        }
    });

    const lowStockItems = products
        .map(product => ({
            ...product,
            quantity: stockCounts[product.id] || 0 
        }))
        .filter(p => p.quantity <= threshold)
        .slice(0, 5);

    // 9. Recent Sales
    const recentSales = sales
        .sort((a, b) => new Date(b.sale_date || b.created_at) - new Date(a.sale_date || a.created_at))
        .slice(0, 5)
        .map(s => ({
            key: s.id,
            id: s.id,
            date: s.sale_date || s.created_at,
            amount: s.total_amount,
            payment_status: s.payment_status || 'paid',
            customer: customers.find(c => c.id === s.customer_id)?.name || 'Walk-in Customer'
        }));

    // 10. Top Selling
    const productSalesMap = {};
    saleItems.forEach(item => {
        const pid = item.product_id;
        if (!productSalesMap[pid]) productSalesMap[pid] = 0;
        productSalesMap[pid] += (item.quantity || 0);
    });

    const topSellingProducts = Object.keys(productSalesMap)
        .map(pid => {
            const prod = products.find(p => String(p.id) === String(pid));
            return {
                name: prod ? prod.name : 'Unknown Item',
                totalSold: productSalesMap[pid]
            };
        })
        .sort((a, b) => b.totalSold - a.totalSold)
        .slice(0, 5);

    return {
        totalSales: netSalesCurrent,
        salesGrowth,
        totalExpenses: totalExpensesCurrent,
        expensesGrowth,
        netProfit: netProfitCurrent,
        
        totalReceivables, // Sirf Lene wale paise
        totalPayables: totalLiabilities, // Suppliers + Customer Returns (Dene wale paise)
        totalCustomerCredits, // Alag se bhi bhej rahe hain agar future mein dikhana ho
        
        lowStockItems,
        totalProducts: products.length,
        recentSales,
        topSellingProducts
    };
  },

  async getLast7DaysSales() {
    // 1. Sales aur Returns dono layein
    const sales = await db.sales.toArray();
    const returns = await db.sale_returns.toArray(); // <--- NAYA: Returns bhi layein
    
    const map = {};
    
    // 2. Pichle 7 din ka map banayein
    for(let i=6; i>=0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0]; // Format: YYYY-MM-DD
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
  }

};

export default DataService;