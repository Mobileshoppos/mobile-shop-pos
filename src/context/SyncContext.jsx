// src/context/SyncContext.jsx - FINAL COMPLETE VERSION

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { db } from '../db';
import { supabase } from '../supabaseClient';

const SyncContext = createContext();

export const useSync = () => useContext(SyncContext);

export const SyncProvider = ({ children }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const isSyncingRef = useRef(false);
  const idMappingRef = useRef({});

  // Database se purani mappings load karne ke liye
  useEffect(() => {
    const loadMappings = async () => {
      try {
        const savedMappings = await db.id_mappings.toArray();
        savedMappings.forEach(m => {
          idMappingRef.current[m.local_id] = m.server_id;
        });
        console.log('Mappings restored from DB:', idMappingRef.current);
      } catch (err) {
        console.error('Failed to load mappings:', err);
      }
    };
    loadMappings();
  }, []);

  // Yeh code har waqt check karega ke queue mein kitne items hain
  useEffect(() => {
    const refreshCount = async () => {
      const count = await db.sync_queue.count();
      setPendingCount(count);
    };

    // Fauran check karein
    refreshCount();

    // Har 2 second baad dobara check karein (taake offline mein bhi count nazar aaye)
    const interval = setInterval(refreshCount, 2000);
    return () => clearInterval(interval);
  }, []);

  // Safety Lock: Agar data sync hona baqi ho to browser tab band karne se rokay
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (pendingCount > 0) {
        const message = "Sync in progress. To keep your records safe, please stay on this page and check your internet connection. Your data will be saved to the server shortly.";
        e.preventDefault();
        e.returnValue = message; // Purane browsers ke liye
        return message; // Naye browsers ke liye
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [pendingCount]);

  // Naya Helper: Yeh check karega ke record queue mein to nahi?
  const smartPut = async (tableName, data, pendingIds) => {
    if (!data || !Array.isArray(data)) return;
    for (const record of data) {
      // Agar yeh record abhi upload hona baqi hai (queue mein hai), to isay touch na karo
      if (!pendingIds.has(record.id) && !pendingIds.has(record.local_id)) {
        await db[tableName].put(record);
      }
    }
  };

  // --- DOWNLOAD FUNCTION ---
  const syncAllData = async () => {
    if (!navigator.onLine) return;
    
    setIsSyncing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      // 1. Aakhri sync ka waqt nikalna (Delta Sync)
      const settings = await db.user_settings.get('last_sync');
      const lastSyncTime = settings ? settings.value : new Date(0).toISOString();
      
      // 2. Queue mein majood IDs ki list (Conflict Handling)
      const queueItems = await db.sync_queue.toArray();
      const pendingIds = new Set(queueItems.map(item => item.data?.id || item.data?.local_id));

      console.log(`Syncing started (Delta Sync since: ${lastSyncTime})...`);

      console.log('Syncing started (Downloading)...');

      // 1. Categories
      const { data: categories } = await supabase.from('categories').select('*').or(`user_id.eq.${user.id},user_id.is.null`).gt('updated_at', lastSyncTime);
      await smartPut('categories', categories, pendingIds);

      // 2. Products
      const { data: products } = await supabase.from('products').select('*').eq('user_id', user.id).gt('updated_at', lastSyncTime);
      await smartPut('products', products, pendingIds);
      

      const { data: variants } = await supabase.from('product_variants').select('*');
      if (variants) await db.product_variants.bulkPut(variants);

      // 3. Inventory
      const { data: inventoryItems } = await supabase.from('inventory').select('*').eq('user_id', user.id).gt('updated_at', lastSyncTime);
      await smartPut('inventory', inventoryItems, pendingIds);

      // 4. Customers
      const { data: customers } = await supabase.from('customers_with_balance').select('*').eq('user_id', user.id).gt('updated_at', lastSyncTime);
      await smartPut('customers', customers, pendingIds);

      // 5. Suppliers & Expenses
      const { data: suppliers } = await supabase.from('suppliers_with_balance').select('*').eq('user_id', user.id).gt('updated_at', lastSyncTime);
      await smartPut('suppliers', suppliers, pendingIds);
      const { data: supPayments } = await supabase.from('supplier_payments').select('*').eq('user_id', user.id).gt('updated_at', lastSyncTime);
      await smartPut('supplier_payments', supPayments, pendingIds);
      const { data: attributes } = await supabase.from('category_attributes').select('*').gt('updated_at', lastSyncTime);
      await smartPut('category_attributes', attributes, pendingIds);
      const { data: expCats } = await supabase.from('expense_categories').select('*').or(`user_id.eq.${user.id},user_id.is.null`).gt('updated_at', lastSyncTime);
      await smartPut('expense_categories', expCats, pendingIds);
      const { data: expenses } = await supabase.from('expenses').select('*').eq('user_id', user.id).gt('updated_at', lastSyncTime);
      await smartPut('expenses', expenses, pendingIds);
      const { data: adjustments } = await supabase.from('cash_adjustments').select('*').eq('user_id', user.id).gt('updated_at', lastSyncTime);
      await smartPut('cash_adjustments', adjustments, pendingIds);
      const { data: closings } = await supabase.from('daily_closings').select('*').eq('user_id', user.id).gt('updated_at', lastSyncTime);
      await smartPut('daily_closings', closings, pendingIds);

      // 6. Purchases
      const { data: purchases } = await supabase.from('purchases').select('*').eq('user_id', user.id).gt('updated_at', lastSyncTime);
      await smartPut('purchases', purchases, pendingIds);

      // 7. Sales & Items
      const { data: sales } = await supabase.from('sales').select('*').eq('user_id', user.id).gt('updated_at', lastSyncTime);
      await smartPut('sales', sales, pendingIds);
      const { data: saleItems } = await supabase.from('sale_items').select('*').eq('user_id', user.id).gt('updated_at', lastSyncTime);
      await smartPut('sale_items', saleItems, pendingIds);

      // 8. Payments, Returns & Payouts
      const { data: payments } = await supabase.from('customer_payments').select('*').eq('user_id', user.id).gt('updated_at', lastSyncTime);
      await smartPut('customer_payments', payments, pendingIds);
      
      const { data: returns } = await supabase.from('sale_returns').select('*').eq('user_id', user.id).gt('updated_at', lastSyncTime);
      await smartPut('sale_returns', returns, pendingIds);
      
      const { data: returnItems } = await supabase.from('sale_return_items').select('*');
      if (returnItems) await db.sale_return_items.bulkPut(returnItems);

      const { data: purReturnItems } = await supabase.from('purchase_return_items').select('*');
      if (purReturnItems) await db.purchase_return_items.bulkPut(purReturnItems);

      const { data: payouts } = await supabase.from('credit_payouts').select('*').eq('user_id', user.id).gt('updated_at', lastSyncTime);
      await smartPut('credit_payouts', payouts, pendingIds);

      // Naya sync time save karein agli dafa ke liye
      await db.user_settings.put({ id: 'last_sync', value: new Date().toISOString() });
      console.log('Syncing completed successfully!');
      
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  // Nayi mapping ko memory aur database dono mein save karne ke liye
  const updateMapping = async (localId, serverId, tableName) => {
    idMappingRef.current[localId] = serverId;
    await db.id_mappings.put({
      local_id: localId,
      server_id: serverId,
      table_name: tableName
    });
  };

  // --- UPLOAD FUNCTION (Fixed: Lock + Suppliers Swap) ---
  const processSyncQueue = async () => {
  // 1. LOCK: Agar internet nahi hai YA Ref Lock laga hua hai, to ruk jayen.
  // Hum 'isSyncing' state ke bajaye 'isSyncingRef.current' check karenge jo foran kaam karta hai.
  if (!navigator.onLine || isSyncingRef.current) return;

  // 2. Lock lagayen (Ref aur State dono)
  isSyncingRef.current = true; // Foran Lock
  setIsSyncing(true); // UI ke liye

  try {
        const queueItems = await db.sync_queue.toArray();
        setPendingCount(queueItems.length);
        
        if (queueItems.length === 0) {
            await syncAllData();
            return;
        }

        console.log(`Processing Sync Queue: ${queueItems.length} items found.`);

        // Ab hum nayi memory use kar rahe hain
        const idMap = idMappingRef.current; 

        for (const item of queueItems) {
            // --- GLOBAL FILTER (Faltu columns saaf karne ke liye) ---
          if (item.data && typeof item.data === 'object') {
            delete item.data.balance_due;
            delete item.data.total_purchases;
            delete item.data.total_payments;
          }
          try {
            let error = null;

            // --- PRODUCTS (Already Fixed) ---
            if (item.table_name === 'products' && item.action === 'create') {
               const { id: localProdId, quantity, min_sale_price, max_sale_price, category_name, variants, ...cleanProductData } = item.data;
               
               const { data: insertedProduct, error: supError } = await supabase
                    .from('products')
                    .upsert([cleanProductData], { onConflict: 'local_id' })
                    .select()
                    .single();
               
               error = supError;

               if (!error && insertedProduct) {
                   const newServerId = insertedProduct.id;
                   await updateMapping(localProdId, newServerId, 'products');

                   await db.inventory.where('product_id').equals(localProdId).modify({ product_id: newServerId });
                   if (db.sale_items) await db.sale_items.where('product_id').equals(localProdId).modify({ product_id: newServerId });

                   const productToSave = { ...item.data, id: newServerId, ...insertedProduct };
                   await db.products.put(productToSave);
                   await db.products.where('id').equals(localProdId).delete();
               }
            }

            // --- PRODUCT DELETE (NAYA CODE) ---
        else if (item.table_name === 'products' && item.action === 'delete') {
            const realId = idMap[item.data.id] || item.data.id;
            // Server se delete karein
            const { error: supError } = await supabase
                .from('products')
                .delete()
                .eq('id', realId);
            
            error = supError;
        }

         // Product Update
            else if (item.table_name === 'products' && item.action === 'update') {
                // Yahan hum faaltu fields (min/max/quantity) nikaal rahe hain taake error na aaye
                const { id, min_sale_price, max_sale_price, quantity, ...updates } = item.data;
                
                const realId = idMap[id] || id;
                const { error: supError } = await supabase.from('products').update(updates).eq('id', realId);
                error = supError;
            }

            // Inventory Update
            else if (item.table_name === 'inventory' && item.action === 'update') {
                const { id, ...updates } = item.data;
                const { error: supError } = await supabase.from('inventory').update(updates).eq('id', id);
                error = supError;
            }
            
            // --- SUPPLIERS (FIXED NOW) ---
            // Hum ne yahan wohi logic lagaya hai jo Products/Customers ke liye tha
            else if (item.table_name === 'suppliers' && item.action === 'create') {
                const { id: localId, balance_due, credit_balance, ...supplierData } = item.data;
                
                // A. Server par bhejein
                const { data: insertedSupplier, error: supError } = await supabase
                    .from('suppliers')
                    .upsert([supplierData], { onConflict: 'local_id' })
                    .select()
                    .single();
                
                error = supError;

                // B. Agar upload kamyab ho
                if (!error && insertedSupplier) {
                    const newServerId = insertedSupplier.id;
                    await updateMapping(localId, newServerId, 'suppliers');

                    // 1. References Update Karein (Purchases & Payments)
                    // Taake agar is supplier ki koi purchase offline hui thi to wo link ho jaye
                    await db.purchases.where('supplier_id').equals(localId).modify({ supplier_id: newServerId });
                    if (db.supplier_payments) {
                        await db.supplier_payments.where('supplier_id').equals(localId).modify({ supplier_id: newServerId });
                    }

                    // 2. Local Record Swap Karein (Naya save, Purana delete)
                    const supplierToSave = { ...item.data, id: newServerId, ...insertedSupplier };
                    await db.suppliers.put(supplierToSave);
                    await db.suppliers.delete(localId);
                }
            }

            // 4. Customers Create (FIXED: Swap Logic Added)
            else if (item.table_name === 'customers' && item.action === 'create') {
                const { id: localId, ...customerData } = item.data;
                
                // A. Server par upload karein
                const { data: insertedCustomer, error: supError } = await supabase
                    .from('customers')
                    .upsert([customerData], { onConflict: 'local_id' })
                    .select()
                    .single();
                
                error = supError;

                // B. Agar upload kamyab ho jaye
                if (!error && insertedCustomer) {
                    const newServerId = insertedCustomer.id;
                    await updateMapping(localId, newServerId, 'customers'); 

                    // 1. References Update Karein (Jahan jahan yeh customer use hua hai)
                    await db.sales.where('customer_id').equals(localId).modify({ customer_id: newServerId });
                    await db.customer_payments.where('customer_id').equals(localId).modify({ customer_id: newServerId });
                    await db.sale_returns.where('customer_id').equals(localId).modify({ customer_id: newServerId });
                    if (db.credit_payouts) await db.credit_payouts.where('customer_id').equals(localId).modify({ customer_id: newServerId });
                    
                    // 2. SWAP LOGIC (Yahan tabdeeli ki hai)
                    // Naya Customer (Server ID ke sath) Local DB mein save karein
                    const customerToSave = { 
                        ...item.data,       // Purana data (balance waghera)
                        id: newServerId,    // Nayi ID
                        ...insertedCustomer // Server ka data
                    };
                    await db.customers.put(customerToSave);
                    
                    // 3. Purana Customer (Local ID wala) delete karein
                    await db.customers.delete(localId);
                }
            }

            // --- PURCHASES (Already Fixed) ---
            else if (item.table_name === 'purchases' && item.action === 'create_full_purchase') {
                const { purchase, items } = item.data;
                // Supplier ID check karein (Agar abhi change hui hai)
                const realSupplierId = idMap[purchase.supplier_id] || purchase.supplier_id;
                if (typeof realSupplierId === 'string') {
                  console.log("Waiting for Supplier ID mapping..."); continue;
                }
                
                const updatedItems = items.map(i => ({
                    ...i,
                    product_id: idMap[i.product_id] || i.product_id
                }));
                const { error: supError } = await supabase.rpc('create_new_purchase', {
                    p_local_id: item.data.p_local_id,
                    p_supplier_id: realSupplierId, 
                    p_notes: purchase.notes,
                    p_inventory_items: updatedItems
                });
                error = supError;
            }

            // --- NAYA CODE: Purchase Edit Sync ---
            else if (item.action === 'update_full_purchase') {
                const { id, supplier_id, notes, amount_paid, items } = item.data;

                // 1. IDs ko Map karein (Agar pehle sync ho chuki hain to Asli Server ID use karein)
                const realPurchaseId = idMap[id] || id;
                const realSupplierId = idMap[supplier_id] || supplier_id;

                // 2. Items ko saaf karein (UUIDs hatayein)
                const cleanItems = items.map(i => {
                    // Agar ID number nahi hai (yani UUID hai), to null bhejein
                    // Taake server samjhe yeh naya item hai
                    let serverItemId = i.id;
                    if (serverItemId && isNaN(serverItemId)) {
                        serverItemId = null;
                    }

                    return {
                        ...i,
                        id: serverItemId, // Ab yeh ya to Number hoga ya Null
                        product_id: idMap[i.product_id] || i.product_id
                    };
                });

                // 3. Server RPC call karein
                const { error: supError } = await supabase.rpc('update_purchase_inventory', {
                    p_purchase_id: realPurchaseId,
                    p_supplier_id: realSupplierId,
                    p_notes: notes,
                    p_amount_paid: amount_paid,
                    p_items: cleanItems,
                    p_local_id: item.data.p_local_id
                });

                error = supError;
            }

            // 3. Sales Create (FINAL FIX: Custom Invoice ID + Auto Item IDs)
            // 3. Sales Create (FINAL FIX: Custom Invoice ID + Auto Item IDs)
            else if (item.table_name === 'sales' && item.action === 'create_full_sale') {
                const { sale, items, inventory_ids } = item.data;
                
                // 1. Sale ID (Invoice Number) ko waise hi rakhein
                const saleData = { ...sale }; 

                // *** YEH HAI WOH FIX ***
                // Agar Customer ID hamari memory mein hai, to naya wala ID use karein
                if (idMap[saleData.customer_id]) {
                    saleData.customer_id = idMap[saleData.customer_id];
                }
                if (typeof saleData.customer_id === 'string' && saleData.customer_id !== '1') {
                  console.log("Waiting for Customer ID mapping..."); continue;
                }

                const { data: insertedSale, error: saleError } = await supabase
                    .from('sales')
                    .upsert([saleData], { onConflict: 'local_id' }) 
                    .select()
                    .single();

                if (saleError) throw saleError;

                // Hum Item ki 'id' nikaal denge, taake Supabase error na de.
                const itemsWithRealId = items.map(i => {
                    // 'id' aur 'sale_id' dono nikaal dein
                    const { id, sale_id, ...itemData } = i;
                    
                    const realProductId = idMap[itemData.product_id] || itemData.product_id;

                    return { 
                        ...itemData, // Is mein ab 'id' nahi hai (Good!)
                        product_id: realProductId, 
                        sale_id: saleData.id // Link wohi Invoice ID se hoga
                    };
                });

                const { error: itemsError } = await supabase.from('sale_items').insert(itemsWithRealId);
                if (itemsError) throw itemsError;

                // Inventory Update on Server (Bulk System Logic - FIXED)
                for (const updateInfo of inventory_ids) {
                  // Check karein ke data ID hai ya Object
                  const invId = typeof updateInfo === 'object' ? updateInfo.id : updateInfo;
                  const qtyToMinus = typeof updateInfo === 'object' ? updateInfo.qtySold : 1;

                  const { data: currentInv } = await supabase
                    .from('inventory')
                    .select('available_qty, sold_qty, imei')
                    .eq('id', invId)
                    .single();
                  
                  if (currentInv) {
                    if (currentInv.imei) {
                      await supabase.from('inventory')
                        .update({ status: 'Sold', available_qty: 0, sold_qty: 1 })
                        .eq('id', invId);
                    } else {
                      const newAvail = Math.max(0, (currentInv.available_qty || 0) - qtyToMinus);
                      const newSold = (currentInv.sold_qty || 0) + qtyToMinus;
                      await supabase.from('inventory')
                        .update({ 
                          available_qty: newAvail, 
                          sold_qty: newSold,
                          status: newAvail === 0 ? 'Sold' : 'Available'
                        })
                        .eq('id', invId);
                    }
                  }
                }
                await db.sale_items.where('sale_id').equals(saleData.id).delete();
            }
            
            // --- OTHER TABLES (Standard Logic) ---
            
            // Customer Payments
            else if (item.table_name === 'customer_payments' && item.action === 'create') {
                const { id: localId, ...paymentData } = item.data;
                if (idMap[paymentData.customer_id]) paymentData.customer_id = idMap[paymentData.customer_id];
                const { error: supError } = await supabase.from('customer_payments').upsert([paymentData], { onConflict: 'local_id' });
                error = supError;
                if (!error) await db.customer_payments.delete(localId);
            }

            // Credit Payouts
            else if (item.table_name === 'credit_payouts' && item.action === 'create') {
                const { id: localId, ...payoutData } = item.data;
                if (idMap[payoutData.customer_id]) payoutData.customer_id = idMap[payoutData.customer_id];
                const { error: supError } = await supabase.from('credit_payouts').upsert([payoutData], { onConflict: 'local_id' });
                error = supError;
                if (!error) await db.credit_payouts.delete(localId);
            }

            // Suppliers Update (Safety Filter Added)
            else if (item.table_name === 'suppliers' && item.action === 'update') {
                // Hum 'balance_due', 'total_purchases', aur 'total_payments' ko nikaal rahe hain
                // taake server par sirf asli columns (name, phone, etc.) jayein.
                const { id, balance_due, total_purchases, total_payments, ...updates } = item.data;
                
                const realId = idMap[id] || id;
                if (!isNaN(realId)) {
                    const { error: supError } = await supabase
                        .from('suppliers')
                        .update(updates) // Ab is mein koi faltu column nahi hai
                        .eq('id', realId);
                    error = supError;
                }
            }
            else if (item.table_name === 'suppliers' && item.action === 'delete') {
                const realId = idMap[item.data.id] || item.data.id;
                if (!isNaN(realId)) {
                    const { error: supError } = await supabase.from('suppliers').delete().eq('id', realId);
                    error = supError;
                }
            }

            // Supplier Bulk Payment
            else if (item.action === 'create_bulk_payment') {
                const realSupplierId = idMap[item.data.supplier_id] || item.data.supplier_id;
                const { error: supError } = await supabase.rpc('record_bulk_supplier_payment', {
                    p_local_id: item.data.local_id,
                    p_supplier_id: realSupplierId,
                    p_amount: item.data.amount,
                    p_payment_method: item.data.payment_method,
                    p_payment_date: item.data.payment_date,
                    p_notes: item.data.notes
                });
                error = supError;
                if (!error && item.data.id) await db.supplier_payments.delete(item.data.id);
            }

            // --- Edit Supplier Payment Sync (UPDATED) ---
            else if (item.action === 'edit_supplier_payment') {
                const { p_payment_id, p_new_amount, p_new_notes } = item.data;
                
                // 1. Server RPC call karein
                const { error: supError } = await supabase.rpc('edit_supplier_payment', {
                    p_payment_id: p_payment_id,
                    p_new_amount: p_new_amount,
                    p_new_notes: p_new_notes
                });
                error = supError;

                // 2. AGAR KAMYAB HO, TO SUPPLIER KA NAYA DATA DOWNLOAD KAREIN (YEH HAI FIX)
                if (!error) {
                    // Payment ID se Supplier ID nikalein (Local DB se)
                    const payment = await db.supplier_payments.get(p_payment_id);
                    if (payment && payment.supplier_id) {
                        // Server se is Supplier ka taza data layein
                        const { data: freshSupplier } = await supabase
                            .from('suppliers_with_balance')
                            .select('*')
                            .eq('id', payment.supplier_id)
                            .single();
                        
                        // Local DB update karein
                        if (freshSupplier) {
                            await db.suppliers.put(freshSupplier);
                        }
                    }
                }
            }

            // Supplier Refund Sync
            else if (item.action === 'create_refund') {
                const { error: supError } = await supabase.rpc('record_supplier_refund', {
                    p_supplier_id: item.data.supplier_id,
                    p_amount: item.data.amount,
                    p_refund_date: item.data.refund_date,
                    p_method: item.data.refund_method,
                    p_notes: item.data.notes
                });
                error = supError;
            }
            
            // Purchase Payment
            else if (item.action === 'create_purchase_payment') {
                const realSupplierId = idMap[item.data.supplier_id] || item.data.supplier_id;
                const { error: supError } = await supabase.rpc('record_purchase_payment', {
                    p_local_id: item.data.local_id,
                    p_supplier_id: realSupplierId,
                    p_purchase_id: item.data.purchase_id,
                    p_amount: item.data.amount,
                    p_payment_method: item.data.payment_method,
                    p_payment_date: item.data.payment_date,
                    p_notes: item.data.notes
                });
                error = supError;
            }

            // Purchase Update
            else if (item.table_name === 'purchases' && item.action === 'update') {
                const { error: supError } = await supabase.rpc('update_purchase', {
                    p_purchase_id: item.data.id,
                    p_notes: item.data.notes,
                    p_inventory_items: item.data.items
                });
                error = supError;
            }

            // --- NAYA CODE: Return Sync (Bulk Quantity Support) ---
            else if (item.action === 'process_purchase_return') {
                
                const { p_purchase_id, p_return_items, p_return_date, p_notes } = item.data;

                // 1. Asli Purchase ID dhoondein
                const realPurchaseId = idMap[p_purchase_id] || p_purchase_id;
                
                // 2. Har item ki inventory_id ko map karein (agar wo local UUID thi)
                const mappedReturnItems = p_return_items.map(retItem => ({
                    ...retItem,
                    inventory_id: idMap[retItem.inventory_id] || retItem.inventory_id
                }));

                // 3. Server RPC Call (Naye Parameters ke sath)
                const { error: supError } = await supabase.rpc('process_purchase_return', {
                    p_purchase_id: realPurchaseId,
                    p_return_items: mappedReturnItems,
                    p_return_date: p_return_date,
                    p_notes: p_notes
                });
                error = supError;
            }
            

            // --- CASH ADJUSTMENTS SYNC ---
            else if (item.table_name === 'cash_adjustments' && item.action === 'create') {
                const { id, ...adjustmentData } = item.data;
                const { error: supError } = await supabase.from('cash_adjustments').upsert([adjustmentData], { onConflict: 'local_id' });
                error = supError;
                if (!error) await db.cash_adjustments.delete(id);
            }

            else if (item.table_name === 'daily_closings' && item.action === 'create') {
                const { id, ...closingData } = item.data;
                const { error: supError } = await supabase.from('daily_closings').upsert([closingData], { onConflict: 'local_id' });
                error = supError;
                if (!error) await db.daily_closings.delete(id);
            }

            // Expense Categories & Expenses (Standard Logic)
            else if (item.table_name === 'expense_categories' && item.action === 'create') {
                const { id, ...catData } = item.data;
                const { error: supError } = await supabase.from('expense_categories').upsert([catData], { onConflict: 'local_id' });
                error = supError;
                if (!error) await db.expense_categories.delete(id);
            }
            else if (item.table_name === 'expense_categories' && item.action === 'update') {
                const { id, name } = item.data;
                if (!isNaN(id)) {
                    const { error: supError } = await supabase.from('expense_categories').update({ name }).eq('id', id);
                    error = supError;
                }
            }
            else if (item.table_name === 'expense_categories' && item.action === 'delete') {
                if (!isNaN(item.data.id)) {
                    const { error: supError } = await supabase.from('expense_categories').delete().eq('id', item.data.id);
                    error = supError;
                }
            }
            else if (item.table_name === 'expenses' && item.action === 'create') {
                const { id, ...expenseData } = item.data;
                const { error: supError } = await supabase.from('expenses').upsert([expenseData], { onConflict: 'local_id' });
                error = supError;
                if (!error) await db.expenses.delete(id);
            }
            else if (item.table_name === 'expenses' && item.action === 'update') {
                const { id, ...updates } = item.data;
                if (!isNaN(id)) {
                    const { error: supError } = await supabase.from('expenses').update(updates).eq('id', id);
                    error = supError;
                }
            }
            else if (item.table_name === 'expenses' && item.action === 'delete') {
                if (!isNaN(item.data.id)) {
                    const { error: supError } = await supabase.from('expenses').delete().eq('id', item.data.id);
                    error = supError;
                }
            }

            // --- FIX: Categories Create Logic Updated ---
            else if (item.table_name === 'categories' && item.action === 'create') {
                const { id: localId, ...catData } = item.data;
                
                // 1. Insert karein aur Naya Data wapis mangwayein (.select().single())
                const { data: insertedCat, error: supError } = await supabase
                    .from('categories')
                    .insert([catData])
                    .select()
                    .single();
                
                error = supError;

                if (!error && insertedCat) {
                    // 2. YAHAN HAI FIX: Nayi ID ko Map mein save karein
                    // Taake agle items (Attributes) ko pata chal sake ke Abba ki nayi ID kya hai
                    await updateMapping(localId, insertedCat.id, 'categories');

                    // 3. Local DB se purani ID wala record delete karein
                    await db.categories.delete(localId);
                }
            }
            
            else if (item.table_name === 'categories' && item.action === 'update') {
                const { id, ...updates } = item.data;
                if (!isNaN(id)) { 
                    const { error: supError } = await supabase.from('categories').update(updates).eq('id', id);
                    error = supError;
                }
            }
            else if (item.table_name === 'categories' && item.action === 'delete') {
                 if (!isNaN(item.data.id)) {
                    const { error: supError } = await supabase.from('categories').delete().eq('id', item.data.id);
                    error = supError;
                 }
            }
            
            // --- FIX: Attributes Sync Logic Updated ---
            else if (item.table_name === 'category_attributes' && item.action === 'create') {
                const { id, ...attrData } = item.data;
                
                // Yahan hum check kar rahe hain ke kya Category ID server wali ID se replace honi chahiye?
                // idMap wo list hai jisme hum ne nayi IDs save ki hoti hain
                if (idMap[attrData.category_id]) {
                    attrData.category_id = idMap[attrData.category_id];
                }

                const { error: supError } = await supabase.from('category_attributes').insert([attrData]);
                error = supError;
                
                // Agar kamyab ho jaye to local ID delete kar dein
                if (!error) await db.category_attributes.delete(id);
            }

            else if (item.table_name === 'category_attributes' && item.action === 'update') {
                const { id, ...updates } = item.data;
                if (!isNaN(id)) {
                    const { error: supError } = await supabase.from('category_attributes').update(updates).eq('id', id);
                    error = supError;
                }
            }
            else if (item.table_name === 'category_attributes' && item.action === 'delete') {
                 if (!isNaN(item.data.id)) {
                    const { error: supError } = await supabase.from('category_attributes').delete().eq('id', item.data.id);
                    error = supError;
                 }
            }

            // Sale Returns
            else if (item.table_name === 'sale_returns' && item.action === 'create_full_return') {
                const { return_record, items, payment_record, inventory_ids } = item.data;
                const { id: localReturnId, ...returnData } = return_record;
                if (idMap[returnData.customer_id]) returnData.customer_id = idMap[returnData.customer_id];
                
                const { data: insertedReturn, error: retError } = await supabase
                    .from('sale_returns')
                    .upsert([returnData], { onConflict: 'local_id' })
                    .select()
                    .single();
                if (retError) throw retError;

                const itemsWithRealId = items.map(i => {
                    const { id, return_id, ...itemData } = i;
                    const realProductId = idMap[itemData.product_id] || itemData.product_id;
                    return { ...itemData, product_id: realProductId, return_id: insertedReturn.id };
                });
                const { error: itemsError } = await supabase.from('sale_return_items').insert(itemsWithRealId);
                if (itemsError) throw itemsError;

                const { id: localPayId, ...payData } = payment_record;
                if (idMap[payData.customer_id]) payData.customer_id = idMap[payData.customer_id];
                const { error: payError } = await supabase.from('customer_payments').insert([payData]);
                if (payError) throw payError;

                // Server Inventory Update for Returns (Bulk Logic)
                for (const retItem of items) {
                  const { data: currentInv } = await supabase
                    .from('inventory')
                    .select('available_qty, sold_qty, imei')
                    .eq('id', retItem.inventory_id)
                    .single();
                  
                  if (currentInv) {
                    const qtyToReturn = retItem.quantity || 1;
                    if (currentInv.imei) {
                      await supabase.from('inventory').update({ status: 'Available', available_qty: 1, sold_qty: 0 }).eq('id', retItem.inventory_id);
                    } else {
                      await supabase.from('inventory').update({ 
                        available_qty: (currentInv.available_qty || 0) + qtyToReturn, 
                        sold_qty: Math.max(0, (currentInv.sold_qty || 0) - qtyToReturn),
                        status: 'Available'
                      }).eq('id', retItem.inventory_id);
                    }
                  }
                }

                await db.sale_returns.delete(localReturnId);
                await db.sale_return_items.where('return_id').equals(localReturnId).delete();
                await db.customer_payments.delete(localPayId);
            }

            if (!error) {
              await db.sync_queue.delete(item.id);
              console.log(`Synced item ${item.id} successfully.`);
            } else {
              console.error('Sync item failed:', error); await db.sync_queue.update(item.id, { status: 'error', last_error: error.message || 'Unknown error' });
            }
          } catch (err) {
            console.error('Sync processing error:', err);
          }
        }
        
        await syncAllData();

    } catch (err) {
        console.error("Critical Sync Error:", err);
    } finally {
    // 3. LOCK KHOL DEIN
    isSyncingRef.current = false; // Ref Lock khol dein
    setIsSyncing(false);
  }
};

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      processSyncQueue();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // --- NAYA CODE: Auto-Sync (Har 3 second baad check karega) ---
  useEffect(() => {
    const interval = setInterval(async () => {
      // Agar internet chal raha hai
      if (navigator.onLine) {
        // Check karein ke kya Queue mein koi kaam ruka hua hai?
        const count = await db.sync_queue.count();
        if (count > 0) {
          console.log('Auto-Sync: Found items in queue, processing...');
          processSyncQueue();
        }
      }
    }, 3000); // Har 3000ms (3 second) baad chalega

    return () => clearInterval(interval);
  }, []);

  return (
    <SyncContext.Provider value={{ isOnline, isSyncing, pendingCount, syncAllData, processSyncQueue }}>
      {children}
    </SyncContext.Provider>
  );
};