// src/context/SyncContext.jsx - FINAL COMPLETE VERSION

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { db } from '../db';
import { supabase } from '../supabaseClient';

const SyncContext = createContext();

export const useSync = () => useContext(SyncContext);

export const SyncProvider = ({ children }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const isSyncingRef = useRef(false);
  const idMappingRef = useRef({});

  // --- DOWNLOAD FUNCTION ---
  const syncAllData = async () => {
    if (!navigator.onLine) return;
    
    setIsSyncing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      console.log('Syncing started (Downloading)...');

      // 1. Categories
      const { data: categories } = await supabase.rpc('get_user_categories_with_settings');
      if (categories) await db.categories.bulkPut(categories);

      // 2. Products
      const { data: baseProducts } = await supabase.from('products').select('*').eq('user_id', user.id);
      const { data: viewProducts } = await supabase.from('products_with_quantity').select('*'); 

      if (baseProducts) {
        const viewMap = {};
        if (viewProducts) {
            viewProducts.forEach(vp => { viewMap[vp.id] = vp; });
        }
        const mergedProducts = baseProducts.map(p => {
            const viewData = viewMap[p.id] || {};
            return {
                ...p,
                quantity: viewData.quantity || 0,
                min_sale_price: viewData.min_sale_price || p.sale_price,
                max_sale_price: viewData.max_sale_price || p.sale_price
            };
        });
        await db.products.bulkPut(mergedProducts);
      }

      const { data: variants } = await supabase.from('product_variants').select('*');
      if (variants) await db.product_variants.bulkPut(variants);

      // 3. Inventory
      const { data: inventoryItems } = await supabase.from('inventory').select('*').eq('user_id', user.id);
      if (inventoryItems) await db.inventory.bulkPut(inventoryItems);

      // 4. Customers
      const { data: customers } = await supabase.from('customers_with_balance').select('*');
      if (customers) await db.customers.bulkPut(customers);

      // 5. Suppliers & Expenses
      const { data: suppliers } = await supabase.from('suppliers_with_balance').select('*');
      if (suppliers) await db.suppliers.bulkPut(suppliers);
      const { data: supPayments } = await supabase.from('supplier_payments').select('*').eq('user_id', user.id);
      if (supPayments) await db.supplier_payments.bulkPut(supPayments);
      const { data: attributes } = await supabase.from('category_attributes').select('*');
      if (attributes) await db.category_attributes.bulkPut(attributes);
      const { data: expCats } = await supabase.from('expense_categories').select('*').or(`user_id.eq.${user.id},user_id.is.null`);
      if (expCats) await db.expense_categories.bulkPut(expCats);
      const { data: expenses } = await supabase.from('expenses').select('*').eq('user_id', user.id);
      if (expenses) await db.expenses.bulkPut(expenses);

      // 6. Purchases
      const { data: purchases } = await supabase.from('purchases').select('*').eq('user_id', user.id);
      if (purchases) await db.purchases.bulkPut(purchases);

      // 7. Sales & Items
      const { data: sales } = await supabase.from('sales').select('*').eq('user_id', user.id);
      if (sales) await db.sales.bulkPut(sales);
      const { data: saleItems } = await supabase.from('sale_items').select('*').eq('user_id', user.id);
      if (saleItems) await db.sale_items.bulkPut(saleItems);

      // 8. Payments, Returns & Payouts
      const { data: payments } = await supabase.from('customer_payments').select('*').eq('user_id', user.id);
      if (payments) await db.customer_payments.bulkPut(payments);
      
      const { data: returns } = await supabase.from('sale_returns').select('*').eq('user_id', user.id);
      if (returns) await db.sale_returns.bulkPut(returns);
      
      const { data: returnItems } = await supabase.from('sale_return_items').select('*');
      if (returnItems) await db.sale_return_items.bulkPut(returnItems);

      const { data: payouts } = await supabase.from('credit_payouts').select('*').eq('user_id', user.id);
      if (payouts) await db.credit_payouts.bulkPut(payouts);

      console.log('Syncing completed successfully!');
      
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      setIsSyncing(false);
    }
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
        
        if (queueItems.length === 0) {
            await syncAllData();
            return;
        }

        console.log(`Processing Sync Queue: ${queueItems.length} items found.`);

        // Ab hum nayi memory use kar rahe hain
        const idMap = idMappingRef.current; 

        for (const item of queueItems) {
          try {
            let error = null;

            // --- PRODUCTS (Already Fixed) ---
            if (item.table_name === 'products' && item.action === 'create') {
               const { id: localProdId, quantity, min_sale_price, max_sale_price, category_name, variants, ...cleanProductData } = item.data;
               
               const { data: insertedProduct, error: supError } = await supabase
                    .from('products')
                    .insert([cleanProductData])
                    .select()
                    .single();
               
               error = supError;

               if (!error && insertedProduct) {
                   const newServerId = insertedProduct.id;
                   idMap[localProdId] = newServerId;

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
            
            // --- SUPPLIERS (FIXED NOW) ---
            // Hum ne yahan wohi logic lagaya hai jo Products/Customers ke liye tha
            else if (item.table_name === 'suppliers' && item.action === 'create') {
                const { id: localId, balance_due, credit_balance, ...supplierData } = item.data;
                
                // A. Server par bhejein
                const { data: insertedSupplier, error: supError } = await supabase
                    .from('suppliers')
                    .insert([supplierData])
                    .select()
                    .single();
                
                error = supError;

                // B. Agar upload kamyab ho
                if (!error && insertedSupplier) {
                    const newServerId = insertedSupplier.id;
                    idMap[localId] = newServerId; // Map mein save karein

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
                    .insert([customerData])
                    .select()
                    .single();
                
                error = supError;

                // B. Agar upload kamyab ho jaye
                if (!error && insertedCustomer) {
                    const newServerId = insertedCustomer.id;
                    idMap[localId] = newServerId; 

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
                
                const updatedItems = items.map(i => ({
                    ...i,
                    product_id: idMap[i.product_id] || i.product_id
                }));
                const { error: supError } = await supabase.rpc('create_new_purchase', {
                    p_supplier_id: realSupplierId, // Updated Supplier ID
                    p_notes: purchase.notes,
                    p_inventory_items: updatedItems
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

                const { data: insertedSale, error: saleError } = await supabase
                    .from('sales')
                    .insert([saleData]) 
                    .select()
                    .single();

                if (saleError) throw saleError;

                // 2. ITEMS FIX (Yahan tabdeeli hai): 
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

                const { error: invError } = await supabase
                    .from('inventory')
                    .update({ status: 'sold' })
                    .in('id', inventory_ids);
                if (invError) throw invError;
                await db.sale_items.where('sale_id').equals(saleData.id).delete();
            }
            
            // --- OTHER TABLES (Standard Logic) ---
            
            // Customer Payments
            else if (item.table_name === 'customer_payments' && item.action === 'create') {
                const { id: localId, ...paymentData } = item.data;
                if (idMap[paymentData.customer_id]) paymentData.customer_id = idMap[paymentData.customer_id];
                const { error: supError } = await supabase.from('customer_payments').insert([paymentData]);
                error = supError;
                if (!error) await db.customer_payments.delete(localId);
            }

            // Credit Payouts
            else if (item.table_name === 'credit_payouts' && item.action === 'create') {
                const { id: localId, ...payoutData } = item.data;
                if (idMap[payoutData.customer_id]) payoutData.customer_id = idMap[payoutData.customer_id];
                const { error: supError } = await supabase.from('credit_payouts').insert([payoutData]);
                error = supError;
                if (!error) await db.credit_payouts.delete(localId);
            }

            // Suppliers Update/Delete
            else if (item.table_name === 'suppliers' && item.action === 'update') {
                const { id, ...updates } = item.data;
                // Agar ID map mein hai (matlab abhi change hui hai), to nayi ID use karein
                const realId = idMap[id] || id;
                if (!isNaN(realId)) {
                    const { error: supError } = await supabase.from('suppliers').update(updates).eq('id', realId);
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
                    p_supplier_id: realSupplierId,
                    p_amount: item.data.amount,
                    p_payment_method: item.data.payment_method,
                    p_payment_date: item.data.payment_date,
                    p_notes: item.data.notes
                });
                error = supError;
                if (!error && item.data.id) await db.supplier_payments.delete(item.data.id);
            }
            
            // Purchase Payment
            else if (item.action === 'create_purchase_payment') {
                const realSupplierId = idMap[item.data.supplier_id] || item.data.supplier_id;
                const { error: supError } = await supabase.rpc('record_purchase_payment', {
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

            // Purchase Return
            else if (item.table_name === 'purchase_returns' && item.action === 'create') {
                const { error: supError } = await supabase.rpc('process_purchase_return', {
                    p_purchase_id: item.data.purchase_id,
                    p_item_ids: item.data.item_ids,
                    p_return_date: item.data.return_date,
                    p_notes: item.data.notes
                });
                error = supError;
            }

            // Expense Categories & Expenses (Standard Logic)
            else if (item.table_name === 'expense_categories' && item.action === 'create') {
                const { id, ...catData } = item.data;
                const { error: supError } = await supabase.from('expense_categories').insert([catData]);
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
                const { error: supError } = await supabase.from('expenses').insert([expenseData]);
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

            // Product Categories & Attributes
            else if (item.table_name === 'categories' && item.action === 'create') {
                const { id, ...catData } = item.data;
                const { error: supError } = await supabase.from('categories').insert([catData]);
                error = supError;
                if (!error) await db.categories.delete(id);
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
            else if (item.table_name === 'category_attributes' && item.action === 'create') {
                const { id, ...attrData } = item.data;
                const { error: supError } = await supabase.from('category_attributes').insert([attrData]);
                error = supError;
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
                
                const { data: insertedReturn, error: retError } = await supabase.from('sale_returns').insert([returnData]).select().single();
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

                const { error: invError } = await supabase.from('inventory').update({ status: 'available' }).in('id', inventory_ids);
                if (invError) throw invError;

                await db.sale_returns.delete(localReturnId);
                await db.sale_return_items.where('return_id').equals(localReturnId).delete();
                await db.customer_payments.delete(localPayId);
            }

            if (!error) {
              await db.sync_queue.delete(item.id);
              console.log(`Synced item ${item.id} successfully.`);
            } else {
              console.error('Sync item failed:', error);
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
    <SyncContext.Provider value={{ isOnline, isSyncing, syncAllData, processSyncQueue }}>
      {children}
    </SyncContext.Provider>
  );
};