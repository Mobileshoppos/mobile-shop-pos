// src/context/SyncContext.jsx - FINAL COMPLETE VERSION

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { db } from '../db';
import { supabase } from '../supabaseClient';
import Logger from '../utils/logger';

const SyncContext = createContext();

export const useSync = () => useContext(SyncContext);

export const SyncProvider = ({ children }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [stuckCount, setStuckCount] = useState(0);
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
      const allItems = await db.sync_queue.toArray();
      const stuck = allItems.filter(item => (item.retry_count || 0) >= 3).length;
      setStuckCount(stuck);
      setPendingCount(allItems.length - stuck); // Sirf wo jo abhi koshish mein hain
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
      // 1. Check karein ke kya ye record sync queue mein to nahi?
      if (!pendingIds.has(record.id) && !pendingIds.has(record.local_id)) {
        
        // 2. DEDUPLICATION LOGIC: 
        // Agar record mein local_id mojood hai, to pehle purana UUID wala record dhoondein
        if (record.local_id) {
            const existingRecord = await db[tableName]
                .where('local_id')
                .equals(record.local_id)
                .first();

            // 3. SWAP LOGIC:
            // Agar purana record mil jaye aur uski asli ID server wali ID se mukhtalif ho
            if (existingRecord && existingRecord.id !== record.id) {
                await db[tableName].delete(existingRecord.id); // Purana UUID wala mita dein
            }
        }

        // 4. Naya server wala record (asli ID ke saath) save karein
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
      const { data: serverNow } = await supabase.rpc('get_server_time');
      
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
      const { data: supRefunds } = await supabase.from('supplier_refunds').select('*').eq('user_id', user.id).gt('updated_at', lastSyncTime);
      await smartPut('supplier_refunds', supRefunds, pendingIds);
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
      // Sale Items download logic (with fallback for missing updated_at)
      const { data: saleItems } = await supabase.from('sale_items')
        .select('*')
        .eq('user_id', user.id)
        .or(`updated_at.gt.${lastSyncTime},created_at.gt.${lastSyncTime}`);
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

      const { data: claims } = await supabase.from('warranty_claims').select('*').eq('user_id', user.id).gt('updated_at', lastSyncTime);
      await smartPut('warranty_claims', claims, pendingIds);

      // Professional Way: Agli dafa ke liye wahi waqt save karein jo sync shuru hone par server ne bataya tha
      await db.user_settings.put({ id: 'last_sync', value: serverNow });
      console.log('Syncing completed successfully!');
      // Naya: Agar koi data mismatch hai to local UI ko refresh karne ka signal dein
      if (categories?.length > 0 || products?.length > 0) {
        window.dispatchEvent(new CustomEvent('local-db-updated'));
      }
      
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
  if (!navigator.onLine || isSyncingRef.current) return;
  const startTime = Date.now();
  let allQueueItems = [];

  // 2. Lock lagayen (Ref aur State dono)
  isSyncingRef.current = true; // Foran Lock
  setIsSyncing(true); // UI ke liye

  try {
        allQueueItems = await db.sync_queue.toArray();
        // Sirf wo items lein jo 3 dafa se kam fail hue hain
        const queueItems = allQueueItems.filter(item => (item.retry_count || 0) < 3);
        setPendingCount(allQueueItems.length);
        
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

            // --- Products Create Sync (UUID Simplified) ---
            if (item.table_name === 'products' && item.action === 'create') {
                // Faltu UI columns nikaal dein jo database mein nahi hain
                const { quantity, min_sale_price, max_sale_price, category_name, variants, avg_purchase_price, ...cleanData } = item.data;
                const { error: supError } = await supabase
                    .from('products')
                    .upsert([cleanData], { onConflict: 'id' });
                error = supError;
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

            // --- Product Variants Update (UUID Simplified) ---
            else if (item.table_name === 'product_variants' && item.action === 'update') {
                const { id, ...updates } = item.data;
                const { error: supError } = await supabase.from('product_variants').update(updates).eq('id', id);
                error = supError;
            }
            
            // --- Suppliers Create Sync (UUID Simplified) ---
            else if (item.table_name === 'suppliers' && item.action === 'create') {
                const { balance_due, total_purchases, total_payments, ...cleanData } = item.data;
                const { error: supError } = await supabase
                    .from('suppliers')
                    .upsert([cleanData], { onConflict: 'id' });
                error = supError;
            }

            // --- Customers Create Sync (UUID Simplified) ---
            else if (item.table_name === 'customers' && item.action === 'create') {
                const { error: supError } = await supabase
                    .from('customers')
                    .upsert([item.data], { onConflict: 'id' });
                error = supError;
            }

            // Customer Update Sync
            else if (item.table_name === 'customers' && item.action === 'update') {
                const { id, ...updates } = item.data;
                const realId = idMappingRef.current[id] || id;
                const { error: supError } = await supabase.from('customers').update(updates).eq('id', realId);
                error = supError;
            }

            // Customer Delete Sync
            else if (item.table_name === 'customers' && item.action === 'delete') {
                const realId = idMappingRef.current[item.data.id] || item.data.id;
                const { error: supError } = await supabase.from('customers').delete().eq('id', realId);
                error = supError;
            }

            // --- Purchases Create Sync (UUID Simplified) ---
            else if (item.table_name === 'purchases' && item.action === 'create_full_purchase') {
                const { purchase, items } = item.data;
                const { error: supError } = await supabase.rpc('create_new_purchase', {
                    p_local_id: purchase.id,
                    p_supplier_id: purchase.supplier_id, 
                    p_notes: purchase.notes,
                    p_inventory_items: items
                });
                error = supError;
            }

            // --- Purchase Edit Sync (UUID Simplified) ---
            else if (item.action === 'update_full_purchase') {
                const { id, supplier_id, notes, amount_paid, items } = item.data;
                
                const { error: supError } = await supabase.rpc('update_purchase_inventory', {
                    p_purchase_id: id,
                    p_supplier_id: supplier_id,
                    p_notes: notes,
                    p_amount_paid: amount_paid,
                    p_items: items,
                    p_local_id: item.data.p_local_id
                });
                error = supError;
            }

            // 3. Sales Create (FINAL FIX: Custom Invoice ID + Auto Item IDs)
            // --- Sales Create Sync (UUID Simplified) ---
            else if (item.table_name === 'sales' && item.action === 'create_full_sale') {
                const { sale, items, inventory_ids } = item.data;
                
                const { error: rpcError } = await supabase.rpc('process_sale_atomic', {
                    p_sale_record: sale,
                    p_sale_items: items,
                    p_inventory_updates: inventory_ids
                });
                error = rpcError;
            }
            
            // --- OTHER TABLES (Standard Logic) ---
            
            // --- Customer Payments Sync (UUID Simplified) ---
            else if (item.table_name === 'customer_payments' && item.action === 'create') {
                const { error: supError } = await supabase
                    .from('customer_payments')
                    .upsert([item.data], { onConflict: 'id' });
                error = supError;
            }

            // --- Credit Payouts Sync (UUID Simplified) ---
            else if (item.table_name === 'credit_payouts' && item.action === 'create') {
                const { error: supError } = await supabase
                    .from('credit_payouts')
                    .upsert([item.data], { onConflict: 'id' });
                error = supError;
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

            // --- Supplier Bulk Payment Sync (UUID Simplified) ---
            else if (item.action === 'create_bulk_payment') {
                const { error: supError } = await supabase.rpc('record_bulk_supplier_payment', {
                    p_local_id: item.data.id, // Ab 'id' hi local_id hai
                    p_supplier_id: item.data.supplier_id,
                    p_amount: item.data.amount,
                    p_payment_method: item.data.payment_method,
                    p_payment_date: item.data.payment_date,
                    p_notes: item.data.notes
                });
                error = supError;
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

            // --- Supplier Refund Sync (UUID Simplified) ---
            else if (item.action === 'create_refund') {
                const { error: supError } = await supabase.rpc('record_supplier_refund', {
                    p_local_id: item.data.id || item.data.local_id,
                    p_supplier_id: item.data.supplier_id,
                    p_amount: item.data.amount,
                    p_refund_date: item.data.refund_date || item.data.payment_date,
                    p_method: item.data.payment_method || item.data.refund_method || 'Cash',
                    p_notes: item.data.notes
                });
                error = supError;
            }
            
            // --- Purchase Payment Sync (UUID Simplified) ---
            else if (item.action === 'create_purchase_payment') {
                const { error: supError } = await supabase.rpc('record_purchase_payment', {
                    p_local_id: item.data.local_id || item.data.id, // Dono check karein
                    p_supplier_id: item.data.supplier_id,
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

            // --- Purchase Return Sync (UUID Simplified) ---
            else if (item.action === 'process_purchase_return') {
                const { p_return_id, p_purchase_id, p_return_items, p_return_date, p_notes } = item.data;
                const { error: supError } = await supabase.rpc('process_purchase_return', {
                    p_return_id: p_return_id,
                    p_purchase_id: p_purchase_id,
                    p_return_items: p_return_items,
                    p_return_date: p_return_date,
                    p_notes: p_notes
                });
                error = supError;
            }
            

            // --- Cash Adjustments Sync (UUID Simplified) ---
            else if (item.table_name === 'cash_adjustments' && item.action === 'create') {
                const { error: supError } = await supabase
                    .from('cash_adjustments')
                    .upsert([item.data], { onConflict: 'id' });
                error = supError;
            }

            // --- Daily Closings Sync (UUID Simplified) ---
            else if (item.table_name === 'daily_closings' && item.action === 'create') {
                const { error: supError } = await supabase
                    .from('daily_closings')
                    .upsert([item.data], { onConflict: 'id' });
                error = supError;
            }

            // --- Expense Categories Create Sync (UUID Simplified) ---
            else if (item.table_name === 'expense_categories' && item.action === 'create') {
                const { error: supError } = await supabase
                    .from('expense_categories')
                    .upsert([item.data], { onConflict: 'id' });
                error = supError;
            }
            else if (item.table_name === 'expense_categories' && item.action === 'update') {
                const { id, name } = item.data;
                if (!isNaN(id)) {
                    const { error: supError } = await supabase.from('expense_categories').update({ name }).eq('id', id);
                    error = supError;
                }
            }
            // --- Expense Categories Delete Sync (UUID Fix) ---
            else if (item.table_name === 'expense_categories' && item.action === 'delete') {
                const { error: supError } = await supabase
                    .from('expense_categories')
                    .delete()
                    .eq('id', item.data.id);
                error = supError;
            }
            // --- Expenses Create Sync (UUID Simplified) ---
            else if (item.table_name === 'expenses' && item.action === 'create') {
                const { error: supError } = await supabase
                    .from('expenses')
                    .upsert([item.data], { onConflict: 'id' });
                error = supError;
            }
            else if (item.table_name === 'expenses' && item.action === 'update') {
                const { id, ...updates } = item.data;
                if (!isNaN(id)) {
                    const { error: supError } = await supabase.from('expenses').update(updates).eq('id', id);
                    error = supError;
                }
            }
            // --- Expenses Delete Sync (UUID Fix) ---
            else if (item.table_name === 'expenses' && item.action === 'delete') {
                const { error: supError } = await supabase
                    .from('expenses')
                    .delete()
                    .eq('id', item.data.id);
                error = supError;
            }

            // --- Categories Create Sync (UUID Simplified) ---
            else if (item.table_name === 'categories' && item.action === 'create') {
                const { error: supError } = await supabase
                    .from('categories')
                    .upsert([item.data], { onConflict: 'id' });
                error = supError;
            }
            
            else if (item.table_name === 'categories' && item.action === 'update') {
                const { id, ...updates } = item.data;
                if (!isNaN(id)) { 
                    const { error: supError } = await supabase.from('categories').update(updates).eq('id', id);
                    error = supError;
                }
            }
            // --- Categories Delete Sync (UUID Fix) ---
            else if (item.table_name === 'categories' && item.action === 'delete') {
                const { error: supError } = await supabase
                    .from('categories')
                    .delete()
                    .eq('id', item.data.id);
                error = supError;
            }
            
            // --- Category Attributes Create Sync (UUID Simplified) ---
            else if (item.table_name === 'category_attributes' && item.action === 'create') {
                const { error: supError } = await supabase
                    .from('category_attributes')
                    .upsert([item.data], { onConflict: 'id' });
                error = supError;
            }

            else if (item.table_name === 'category_attributes' && item.action === 'update') {
                const { id, ...updates } = item.data;
                if (!isNaN(id)) {
                    const { error: supError } = await supabase.from('category_attributes').update(updates).eq('id', id);
                    error = supError;
                }
            }
            // --- Category Attributes Delete Sync (UUID Fix) ---
            else if (item.table_name === 'category_attributes' && item.action === 'delete') {
                const { error: supError } = await supabase
                    .from('category_attributes')
                    .delete()
                    .eq('id', item.data.id);
                error = supError;
            }

            // --- Sale Returns Sync (UUID Simplified & Inventory Fix) ---
            else if (item.table_name === 'sale_returns' && item.action === 'create_full_return') {
                const { return_record, items, payment_record } = item.data;
                
                // 1. Save Return Record
                const { error: retError } = await supabase.from('sale_returns').upsert([return_record], { onConflict: 'id' });
                
                if (retError) { 
                    error = retError; 
                } else {
                    // 2. Save Return Items
                    await supabase.from('sale_return_items').upsert(items, { onConflict: 'id' });
                    // 3. Save Payment (Credit)
                    await supabase.from('customer_payments').upsert([payment_record], { onConflict: 'id' });

                    // 4. SERVER INVENTORY UPDATE (YEH HAI ASAL FIX JO MISSING THA)
                    for (const retItem of items) {
                        // Server se current status check karein
                        const { data: invItem } = await supabase
                            .from('inventory')
                            .select('id, imei, sold_qty, available_qty')
                            .eq('id', retItem.inventory_id)
                            .single();

                        if (invItem) {
                            if (invItem.imei) {
                                // IMEI Item: Wapis Available karein
                                await supabase.from('inventory')
                                    .update({ status: 'Available', available_qty: 1, sold_qty: 0 })
                                    .eq('id', retItem.inventory_id);
                            } else {
                                // Bulk Item: Quantity wapis jama karein
                                const qtyToReturn = retItem.quantity || 1;
                                const newAvail = (invItem.available_qty || 0) + qtyToReturn;
                                const newSold = Math.max(0, (invItem.sold_qty || 0) - qtyToReturn);
                                
                                await supabase.from('inventory')
                                    .update({ 
                                        available_qty: newAvail,
                                        sold_qty: newSold,
                                        status: 'Available' 
                                    })
                                    .eq('id', retItem.inventory_id);
                            }
                        }
                    }
                }
            }

            // --- Warranty Claims Sync (UUID Simplified) ---
            else if (item.table_name === 'warranty_claims' && (item.action === 'create' || item.action === 'update')) {
                const { error: supError } = await supabase
                    .from('warranty_claims')
                    .upsert([item.data], { onConflict: 'id' });
                error = supError;
            }

            // --- Warranty Claims Delete Sync ---
            else if (item.table_name === 'warranty_claims' && item.action === 'delete') {
                const realId = idMappingRef.current[item.data.id] || item.data.id;
                const { error: supError } = await supabase
                    .from('warranty_claims')
                    .delete()
                    .eq('id', realId);
                error = supError;
            }

            if (!error) {
              await db.sync_queue.delete(item.id);
              console.log(`Synced item ${item.id} successfully.`);
            } else {
              // --- SMART ERROR LOGGING START ---
              let userGuide = "Sync mein masla aaya hai, system dubara koshish karega.";
              
              if (error.message?.includes('foreign key')) {
                userGuide = "Kuch purana data (Category ya Supplier) abhi sync nahi hua. Aap thora intezar karein, app isay khud theek kar degi.";
              } else if (error.message?.includes('unique constraint') || error.code === '23505') {
                userGuide = "Yeh record pehle hi server par majood hai. System isay khud merge kar raha hai.";
              }

              // Naya: Error message mein ID bhi shamil karein taake user ko pata chale kaun sa record hai
              const recordId = item.data?.id || item.data?.local_id || 'Unknown ID';
              Logger.error('sync', `Sync failed for ${item.table_name} (ID: ${recordId})`, error, userGuide);
              // --- SMART ERROR LOGGING END ---

              await db.sync_queue.update(item.id, { 
                status: 'error', 
                last_error: error.message || 'Unknown error',
                retry_count: (item.retry_count || 0) + 1 // Ek ginti barha dein
              });
            }
          } catch (err) {
            console.error('Sync processing error:', err);
          }
        }
        
        await syncAllData();

    } catch (err) {
        console.error("Critical Sync Error:", err);
    } finally {
    const duration = Date.now() - startTime; // Kitna waqt laga

    
    // Agar queue mein items thay, tabhi performance report bhejein
    if (pendingCount > 0) {
      Logger.info('sync_performance', `Sync completed in ${duration}ms`, `Internet Speed: ${duration < 3000 ? 'Tez (Fast)' : 'Ahista (Slow)'}`);
    }

    isSyncingRef.current = false;
    setIsSyncing(false);

    // Phase 5: UI Polish - Agar koi ruka hua data sync ho jaye to notification dikhayein
    if (navigator.onLine && allQueueItems.length > 0 && stuckCount > 0) {
      const remainingStuck = await db.sync_queue.filter(item => (item.retry_count || 0) >= 3).count();
      if (remainingStuck === 0) {
         Logger.info('sync', 'All stuck items resolved!');
      }
    }
  }
};

const retryAll = async () => {
    // Tamam stuck items ki ginti wapis 0 kar dein
    await db.sync_queue.where('retry_count').aboveOrEqual(3).modify({ retry_count: 0, status: 'pending' });
    processSyncQueue(); // Dobara sync shuru karein
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
    <SyncContext.Provider value={{ isOnline, isSyncing, pendingCount, stuckCount, retryAll, syncAllData, processSyncQueue }}>
      {children}
    </SyncContext.Provider>
  );
};