// src/DataService.js (Final Update for Purchase Details)

import { supabase } from './supabaseClient';

const DataService = {

  // =================================================================
  // INVENTORY & PRODUCT FUNCTIONS
  // =================================================================
  async getInventoryData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { return { productsData: [], categoriesData: [] }; }

    const { data: productsData, error: productsError } = await supabase
      .from('products_with_quantity')
      .select('*, categories(name)')
      .eq('user_id', user.id)
      .order('name', { ascending: true });
      
    if (productsError) { console.error('DataService Error:', productsError); throw productsError; }

    const formattedProducts = productsData.map(product => ({
      ...product,
      category_name: product.categories ? product.categories.name : null,
    }));

    const { data: categoriesData, error: categoriesError } = await supabase.rpc('get_user_categories_with_settings');
    if (categoriesError) { console.error('DataService Error:', categoriesError); throw categoriesError; }
    
    return { productsData: formattedProducts, categoriesData };
  },

  async addProduct(productData) {
    const { error } = await supabase.from('products').insert([productData]);
    if (error) { console.error('DataService Error:', error); throw error; }
    return true;
  },
  
  // ... baqi functions waise hi rahenge ...
  
  // =================================================================
  // SUPPLIER FUNCTIONS
  // =================================================================
  async getSuppliers() {
    const { data, error } = await supabase.from('suppliers_with_balance').select('*').order('name', { ascending: true });
    if (error) { console.error('DataService Error:', error); throw error; }
    return data;
  },

  async addSupplier(supplierData) {
    const { data, error } = await supabase.from('suppliers').insert([supplierData]).select().single();
    if (error) { console.error('DataService Error:', error); throw error; }
    return data;
  },

  async updateSupplier(id, updatedData) {
    const { data, error } = await supabase.from('suppliers').update(updatedData).eq('id', id).select().single();
    if (error) { console.error('DataService Error:', error); throw error; }
    return data;
  },

  async deleteSupplier(id) {
    const { error } = await supabase.from('suppliers').delete().eq('id', id);
    if (error) { console.error('DataService Error:', error); throw error; }
    return true;
  },

  async getSupplierLedgerDetails(supplierId) {
    const { data: supplierData, error: supplierError } = await supabase.from('suppliers').select('*, credit_balance').eq('id', supplierId).single();
    if (supplierError) { console.error('DataService Error:', supplierError); throw supplierError; }

    const { data: purchasesData, error: purchasesError } = await supabase.from('purchases').select('*').eq('supplier_id', supplierId).order('purchase_date', { ascending: false });
    if (purchasesError) { console.error('DataService Error:', purchasesError); throw purchasesError; }

    const { data: paymentsData, error: paymentsError } = await supabase.from('supplier_payments').select('*').eq('supplier_id', supplierId).order('payment_date', { ascending: false });
    if (paymentsError) { console.error('DataService Error:', paymentsError); throw paymentsError; }

    return { supplier: supplierData, purchases: purchasesData || [], payments: paymentsData || [] };
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
  
  // =================================================================
  // PURCHASE & PAYMENT FUNCTIONS
  // =================================================================
  async getPurchaseDetails(purchaseId) {
    const { data: purchaseData, error: purchaseError } = await supabase.from('purchases').select('*, suppliers(name)').eq('id', purchaseId).single();
    if (purchaseError) { console.error('DataService Error:', purchaseError); throw purchaseError; }
    
    const { data: itemsData, error: itemsError } = await supabase.from('inventory').select('*, products(name, brand)').eq('purchase_id', purchaseId);
    if (itemsError) { console.error('DataService Error:', itemsError); throw itemsError; }
    
    // --- YAHAN TABDEELI KI GAYI HAI ---
    // Data ko component ke liye saaf (flatten) karein
    const formattedItems = (itemsData || []).map(item => ({
        ...item,
        product_name: item.products ? item.products.name : 'Product Not Found',
        product_brand: item.products ? item.products.brand : '',
    }));

    return { purchase: purchaseData, items: formattedItems };
  },

  async getPurchases() {
    const { data, error } = await supabase.from('purchases').select(`id, purchase_date, total_amount, status, amount_paid, balance_due, suppliers ( name )`).order('purchase_date', { ascending: false });
    if (error) { console.error('DataService Error:', error); throw error; }
    return (data || []).map(p => ({ ...p, supplier_name: p.suppliers ? p.suppliers.name : 'N/A' }));
  },

  async createNewPurchase(purchasePayload) {
    const { data, error } = await supabase.rpc('create_new_purchase', purchasePayload);
    if (error) { console.error('DataService Error:', error); throw error; }
    return data;
  },

  async recordPurchasePayment(paymentData) {
    const { error } = await supabase.rpc('record_purchase_payment', {
        p_supplier_id: paymentData.supplier_id,
        p_purchase_id: paymentData.purchase_id,
        p_amount: paymentData.amount,
        p_payment_method: paymentData.payment_method,
        p_payment_date: paymentData.payment_date,
        p_notes: paymentData.notes
    });
    if (error) { 
      console.error('DataService Error:', error); 
      throw error; 
    }
    return true;
  },
  async updatePurchase(purchaseId, updatedData) {
    const { error } = await supabase.rpc('update_purchase', {
      p_purchase_id: purchaseId,
      p_notes: updatedData.notes,
      p_inventory_items: updatedData.items,
    });
    if (error) {
      console.error('DataService Error:', error);
      throw error;
    }
    return true;
  },
  async recordBulkSupplierPayment(paymentData) {
    const { error } = await supabase.rpc('record_bulk_supplier_payment', {
        p_supplier_id: paymentData.supplier_id,
        p_amount: paymentData.amount,
        p_payment_method: paymentData.payment_method,
        p_payment_date: paymentData.payment_date,
        p_notes: paymentData.notes
    });
    if (error) { 
      console.error('DataService Error:', error); 
      throw error; 
    }
    return true;
  },
  async createPurchaseReturn(returnData) {
    const { error } = await supabase.rpc('process_purchase_return', {
      p_purchase_id: returnData.purchase_id,
      p_item_ids: returnData.item_ids,
      p_return_date: returnData.return_date,
      p_notes: returnData.notes,
    });
    if (error) {
      console.error('DataService Error:', error);
      throw error;
    }
    return true;
  },
  async recordSupplierRefund(refundData) {
    const { error } = await supabase.rpc('record_supplier_refund', {
      p_supplier_id: refundData.supplier_id,
      p_amount: refundData.amount,
      p_refund_method: refundData.refund_method,
      p_refund_date: refundData.refund_date,
      p_notes: refundData.notes,
    });
    if (error) {
      console.error('DataService Error:', error);
      throw error;
    }
    return true;
  },
};

export default DataService;